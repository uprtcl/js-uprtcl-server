import {
  Perspective,
  Commit,
  PerspectiveDetails,
  Secured,
  NewPerspectiveData,
  DgUpdate,
  UpdateRequest,
  UpdateDetails,
} from './types';
import { DGraphService } from '../../db/dgraph.service';
import { AccessService } from '../access/access.service';
import { UprtclRepository } from './uprtcl.repository';
import { PermissionType } from '../access/access.schema';
import { NOT_AUTHORIZED_MSG } from '../../utils';
import { DataService } from '../data/data.service';
import { ipldService } from '../ipld/ipldService';

export class UprtclService {
  constructor(
    protected db: DGraphService,
    protected uprtclRepo: UprtclRepository,
    protected access: AccessService,
    protected dataService: DataService
  ) {}

  async getPerspective(
    perspectiveId: string,
    loggedUserId: string | null
  ): Promise<Secured<Perspective>> {
    console.log('[UPRTCL-SERVICE] getPerspective', {
      perspectiveId,
      loggedUserId,
    });
    if (perspectiveId == undefined || perspectiveId === '') {
      throw new Error(`perspectiveId is empty`);
    }
    // perspectives are hashed objects, not risky to retrieve them. The protection is in getPerspectiveDetails.
    let perspective = await this.uprtclRepo.getPerspective(perspectiveId);
    return perspective;
  }

  async findIndPerspectives(
    perspectiveId: string,
    includeEcosystem: boolean,
    loggedUserId: string | null
  ): Promise<string[]> {
    if (loggedUserId === null)
      throw new Error('Anonymous user. Cant get independent perspectives');

    return await this.uprtclRepo.getOtherIndpPerspectives(
      perspectiveId,
      includeEcosystem,
      loggedUserId
    );
  }

  async findPerspectives(
    context: string,
    loggedUserId: string | null
  ): Promise<string[]> {
    console.log('[UPRTCL-SERVICE] findPerspectives', { context });
    // TODO filter on query not by code...
    const perspectivesIds = await this.uprtclRepo.findPerspectives(context);

    const accessiblePerspectivesPromises = perspectivesIds.map(
      async (perspectiveId) => {
        if (
          !(await this.access.can(
            perspectiveId,
            loggedUserId,
            PermissionType.Read
          ))
        ) {
          return '';
        } else {
          return perspectiveId;
        }
      }
    );

    const accessiblePerspectives = await Promise.all(
      accessiblePerspectivesPromises
    );

    return accessiblePerspectives.filter((e: string) => e !== '');
  }

  async createAclRecursively(
    of: NewPerspectiveData,
    all: NewPerspectiveData[],
    loggedUserId: string
  ) {
    /** top first traverse the tree of new perspectives*/
    await this.access.createAccessConfig(
      of.perspective.id,
      of.parentId,
      loggedUserId
    );

    /** recursively call on all children */
    const children = all.filter((p) => p.parentId === of.perspective.id);
    for (const child of children) {
      await this.createAclRecursively(child, all, loggedUserId);
    }
  }

  async createAndInitPerspectives(
    perspectivesData: NewPerspectiveData[],
    loggedUserId: string | null
  ): Promise<string[]> {
    if (loggedUserId === null)
      throw new Error('Anonymous user. Cant create a perspective');

    await this.uprtclRepo.createPerspectives(
      perspectivesData.map((p) => p.perspective)
    );

    /** find perspectives whose parent is NOT in the batch of new perspectives */
    const idPromises = await perspectivesData.map(async (p) => {
        return (p.perspective.id !== '') ? p.perspective.id : (await ipldService.validateSecured(p.perspective))
      }
    );

    const allIds = await Promise.all(idPromises);
    perspectivesData.map((p, i) => { 
      if (p.perspective.id === '') {
        p.perspective.id = allIds[i];
      } 
    });

    const external = perspectivesData.filter((p) => {
      return !p.parentId || !allIds.includes(p.parentId);
    });

    /** recursively create acls starting from external perspectives until
     * all perspectives have been created */
    for (const newPerspective of external) {
      await this.createAclRecursively(
        newPerspective,
        perspectivesData,
        loggedUserId
      );
    }

    return allIds;
  }

  getDataChildren(data: any) {
    if (data.pages !== undefined) {
      return data.pages;
    }
    if (data.links !== undefined) {
      return data.links;
    }
    if (data.value !== undefined) {
      return [data.description];
    }
  }

  async updatePerspectives(
    updates: UpdateDetails[],
    loggedUserId: string | null
  ): Promise<void> {
    // update needs to be done one by one to manipulate the ecosystem links
    await Promise.all(
      updates.map(async (update) => {
        /** Bypass update perspective ACL because this is perspective inception */
        await this.updatePerspective(update.id, update.details, loggedUserId);
      })
    );
  }

  async updatePerspective(
    perspectiveId: string,
    details: PerspectiveDetails,
    loggedUserId: string | null
  ): Promise<void> {
    console.log(
      '[UPRTCL-SERVICE] updatePerspective',
      { perspectiveId },
      { details }
    );
    if (
      !(await this.access.can(
        perspectiveId,
        loggedUserId,
        PermissionType.Write
      ))
    )
      throw new Error(NOT_AUTHORIZED_MSG);

    const oldDetails = await this.getPerspectiveDetails(
      perspectiveId,
      loggedUserId
    );
    let addedChildren: Array<string> = [];
    let removedChildren: Array<string> = [];

    let currentChildren: Array<string> = [];
    let updatedChildren: Array<string> = [];

    if(details.headId) {
      if (oldDetails.headId && oldDetails.headId !== '') {
        const oldDataId = (await this.getCommit(oldDetails.headId, loggedUserId))
          .object.payload.dataId;
        const newDataId = (await this.getCommit(details.headId, loggedUserId))
          .object.payload.dataId;

        const oldData = (await this.dataService.getData(oldDataId)).object;
        const newData = (await this.dataService.getData(newDataId)).object;

        currentChildren = oldData.pages
          ? oldData.pages
          : oldData.links;
        updatedChildren = newData.pages
          ? newData.pages
          : newData.links;
      } else if(!oldDetails.headId) {
        const perspTimestamp = (await this.getPerspective(perspectiveId, loggedUserId)).object.payload.timestamp;

        if(perspTimestamp === 0) {   
          const newDataId = (await this.getCommit(details.headId, loggedUserId))
          .object.payload.dataId;
          const newData = (await this.dataService.getData(newDataId)).object;
          updatedChildren = newData.pages
          ? newData.pages
          : newData.links;
        }
      }

      const difference = currentChildren
              .filter((oldChild: string) => !updatedChildren.includes(oldChild))
              .concat(
                updatedChildren.filter(
                  (newChild: string) => !currentChildren.includes(newChild)
                )
              );

      difference.map((child) => {
        if (currentChildren.includes(child)) {
          removedChildren.push(child);
        }

        if (updatedChildren.includes(child)) {
          addedChildren.push(child);
        }
      });
    }

    await this.uprtclRepo.updatePerspective(perspectiveId, details, {
      addedChildren: addedChildren,
      removedChildren: removedChildren,
    });
  }

  async deletePerspective(
    perspectiveId: string,
    loggedUserId: string | null
  ): Promise<void> {
    console.log('[UPRTCL-SERVICE] deletePerspective', { perspectiveId });
    if (
      !(await this.access.can(
        perspectiveId,
        loggedUserId,
        PermissionType.Admin
      ))
    )
      throw new Error(NOT_AUTHORIZED_MSG);
    await this.uprtclRepo.setDeletedPerspective(perspectiveId, true);
  }

  async getPerspectiveDetails(
    perspectiveId: string,
    loggedUserId: string | null
  ): Promise<PerspectiveDetails> {
    console.log('[UPRTCL-SERVICE] getPerspectiveDetails', { perspectiveId });
    if (
      !(await this.access.can(perspectiveId, loggedUserId, PermissionType.Read))
    ) {
      throw new Error(NOT_AUTHORIZED_MSG);
    }
    let details = await this.uprtclRepo.getPerspectiveDetails(perspectiveId);
    return details;
  }

  async createCommits(
    commits: Secured<Commit>[],
    _loggedUserId: string | null
  ): Promise<string[]> {
    console.log('[UPRTCL-SERVICE] createCommits', commits);
    return await this.uprtclRepo.createCommits(commits);
  }

  async getCommit(
    commitId: string,
    loggedUserId: string | null
  ): Promise<Secured<Commit>> {
    console.log('[UPRTCL-SERVICE] getCommit', { commitId });
    let commit = await this.uprtclRepo.getCommit(commitId);
    return commit;
  }

  async canAuthorizeProposal(
    proposalUpdates: DgUpdate[],
    loggedUserId: string
  ): Promise<boolean> {
    if (loggedUserId === null)
      throw new Error("Anonymous user. Can't authorize a proposal");

    return this.access.canAuthorizeProposal(proposalUpdates, loggedUserId);
  }
}
