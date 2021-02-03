import {
  Entity,
  Perspective,
  Secured,
  NewPerspective,
  PerspectiveDetails,
  Update,
  Commit,
} from '@uprtcl/evees';

import { PermissionType } from './types';
import { DGraphService } from '../../db/dgraph.service';
import { AccessService } from '../access/access.service';
import { UprtclRepository } from './uprtcl.repository';
import { NOT_AUTHORIZED_MSG } from '../../utils';
import { DataService } from '../data/data.service';

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
    of: NewPerspective,
    all: NewPerspective[],
    loggedUserId: string
  ) {
    /** top first traverse the tree of new perspectives*/
    await this.access.createAccessConfig(
      of.perspective.id,
      of.update.details.guardianId,
      loggedUserId
    );

    /** recursively call on all children */
    const children = all.filter(
      (p) => p.update.details.guardianId === of.perspective.id
    );
    for (const child of children) {
      await this.createAclRecursively(child, all, loggedUserId);
    }
  }

  async createAndInitPerspectives(
    perspectivesData: NewPerspective[],
    loggedUserId: string | null
  ): Promise<string[]> {
    // TEMP

    if (loggedUserId === null)
      throw new Error('Anonymous user. Cant create a perspective');

    await this.uprtclRepo.createPerspectives(perspectivesData, loggedUserId);

    await this.uprtclRepo.updatePerspectives(
      perspectivesData.map((newPerspective) => newPerspective.update)
    );

    return [];
  }

  async updatePerspectives(
    updates: Update[],
    loggedUserId: string | null
  ): Promise<void> {
    /**
     * What about the access control? We might need to find a way to check
     * if the user can write a perspective, we used to call access.can(id, userId, permisstions)
     */
    await this.uprtclRepo.updatePerspectives(updates);
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
    const canUpdate = await this.access.can(
      perspectiveId,
      loggedUserId,
      PermissionType.Write
    );

    const canAdmin = await this.access.can(
      perspectiveId,
      loggedUserId,
      PermissionType.Admin
    );

    let guardianId;
    if (canAdmin) {
      const aclDetails = await this.access.getAccessConfigDetails(
        perspectiveId,
        loggedUserId as string
      );
      guardianId = aclDetails.delegate
        ? aclDetails.delegateTo
          ? aclDetails.delegateTo
          : undefined
        : undefined;
    }

    details = {
      ...details,
      canUpdate,
      guardianId,
    };
    return details;
  }

  async createCommits(
    commits: Secured<Commit>[],
    _loggedUserId: string | null
  ): Promise<Entity<any>[]> {
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
}
