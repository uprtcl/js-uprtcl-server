import {
  Perspective,
  Commit,
  PerspectiveDetails,
  Secured,
  NewPerspectiveData,
  DgUpdate,
} from './types';
import { DGraphService } from '../../db/dgraph.service';
import { AccessService } from '../access/access.service';
import { UprtclRepository } from './uprtcl.repository';
import { PermissionType } from '../access/access.schema';
import { NOT_AUTHORIZED_MSG } from '../../utils';
import { DataService } from '../data/data.service';

export class UprtclService {
  constructor(
    protected db: DGraphService,
    protected uprtclRepo: UprtclRepository,
    protected access: AccessService,
    protected dataService: DataService
  ) {}

  private async createPerspective(
    perspective: Secured<Perspective>,
    loggedUserId: string | null
  ): Promise<string> {
    console.log('[UPRTCL-SERVICE] createPerspective', {
      perspective,
      loggedUserId,
    });
    return this.uprtclRepo.createPerspective(perspective);
  }

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

  async createAndInitPerspective(
    perspectiveData: NewPerspectiveData,
    loggedUserId: string | null
  ): Promise<string> {
    if (loggedUserId === null)
      throw new Error('Anonymous user. Cant create a perspective');

    let perspId = await this.createPerspective(
      perspectiveData.perspective,
      loggedUserId
    );

    if (perspectiveData.parentId) {
      await this.access.createAccessConfig(
        perspId,
        perspectiveData.parentId,
        loggedUserId
      );
    } else {
      await this.access.createAccessConfig(perspId, undefined, loggedUserId);
    }

    if (perspectiveData.details) {
      /** Bypass update perspective ACL because this is perspective inception */
      await this.updatePerspective(
        perspId,
        perspectiveData.details,
        loggedUserId
      );
    }

    return perspId;
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

    if (oldDetails.headId && oldDetails.headId !== '' && details.headId) {
      const oldDataId = (await this.getCommit(oldDetails.headId, loggedUserId))
        .object.payload.dataId;
      const newDataId = (await this.getCommit(details.headId, loggedUserId))
        .object.payload.dataId;

      const oldData = (await this.dataService.getData(oldDataId)).object;
      const newData = (await this.dataService.getData(newDataId)).object;

      const currentChildren: Array<string> = this.getDataChildren(oldData);
      const updatedChildren: Array<string> = this.getDataChildren(newData);

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

  async createCommit(
    commit: Secured<Commit>,
    _loggedUserId: string | null
  ): Promise<string> {
    console.log('[UPRTCL-SERVICE] createCommit', commit);
    let commitId = await this.uprtclRepo.createCommit(commit);

    return commitId;
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
