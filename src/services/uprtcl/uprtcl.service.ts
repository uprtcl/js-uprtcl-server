import {
  Entity,
  Secured,
  NewPerspective,
  Update,
  Commit,
  PerspectiveGetResult,
  GetPerspectiveOptions,
  ParentAndChild,
  SearchOptions,
  SearchResult,
  condensateUpdates,
  EntityResolver,
  SearchForkOptions,
} from '@uprtcl/evees';

import { PermissionType } from './types';
import { DGraphService } from '../../db/dgraph.service';
import { AccessService } from '../access/access.service';
import { UprtclRepository } from './uprtcl.repository';
import { NOT_AUTHORIZED_MSG } from '../../utils';
import { DataService } from '../data/data.service';
import { LocalEntityResolver } from './local.entity.resolver';

export class UprtclService {
  entityResolver: EntityResolver;

  constructor(
    protected db: DGraphService,
    protected uprtclRepo: UprtclRepository,
    protected access: AccessService,
    protected dataService: DataService
  ) {
    this.entityResolver = new LocalEntityResolver(this.dataService);
  }

  async createAclRecursively(
    of: NewPerspective,
    all: NewPerspective[],
    loggedUserId: string
  ) {
    /** top first traverse the tree of new perspectives*/
    await this.access.createAccessConfig(
      of.perspective.hash,
      of.update.details.guardianId,
      loggedUserId
    );

    /** recursively call on all children */
    const children = all.filter(
      (p) => p.update.details.guardianId === of.perspective.hash
    );
    for (const child of children) {
      await this.createAclRecursively(child, all, loggedUserId);
    }
  }

  async createAndInitPerspectives(
    newPerspectives: NewPerspective[],
    loggedUserId: string | null
  ): Promise<string[]> {
    // TEMP

    if (loggedUserId === null)
      throw new Error('Anonymous user. Cant create a perspective');

    await this.dataService.createDatas(
      newPerspectives.map((newPerspective) => newPerspective.perspective),
      loggedUserId
    );

    await this.uprtclRepo.createPerspectives(newPerspectives, loggedUserId);

    await this.uprtclRepo.updatePerspectives(
      newPerspectives.map((newPerspective) => newPerspective.update)
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
    if (loggedUserId === null)
      throw new Error('Anonymous user. Cant update a perspective');

    /** combine updates to the same perspective */
    const updatesSingle = await condensateUpdates(updates, this.entityResolver);

    const canUpdate = await this.access.canAll(
      updatesSingle.map((u) => u.perspectiveId),
      loggedUserId,
      PermissionType.Write
    );

    if (!canUpdate)
      throw new Error('Anonymous user. Cant update a perspective');

    const result = await this.uprtclRepo.updatePerspectives(updatesSingle);
    console.log('[UPRTCL-SERVICE] updatePerspectives', { result });
  }

  async deletePerspective(
    perspectiveIds: string[],
    loggedUserId: string | null
  ): Promise<void> {
    console.log('[UPRTCL-SERVICE] deletePerspective', { perspectiveIds });
    if (loggedUserId === null)
      throw new Error('Anonymous user. Cant delete a perspective');
    if (
      !(await this.access.canAll(
        perspectiveIds,
        loggedUserId,
        PermissionType.Admin
      ))
    )
      throw new Error(NOT_AUTHORIZED_MSG);

    await this.uprtclRepo.setDeletedPerspectives(perspectiveIds, true);
  }

  async getPerspective(
    perspectiveId: string,
    loggedUserId: string | null,
    options?: GetPerspectiveOptions
  ): Promise<PerspectiveGetResult> {
    console.log('[UPRTCL-SERVICE] getPerspectiveDetails', { perspectiveId });
    let result = await this.uprtclRepo.getPerspective(
      perspectiveId,
      loggedUserId,
      options
    );

    return result;
  }

  async createCommits(
    commits: Secured<Commit>[],
    _loggedUserId: string | null
  ): Promise<Entity<any>[]> {
    console.log('[UPRTCL-SERVICE] createCommits', commits);
    return await this.uprtclRepo.createCommits(commits);
  }

  /** Search engine methods */
  async locatePerspective(
    perspectiveId: string,
    includeForks: boolean,
    loggedUserId: string | null
  ): Promise<ParentAndChild[]> {
    return await this.uprtclRepo.locatePerspective(
      perspectiveId,
      includeForks,
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

  async explore(
    searchOptions: SearchOptions,
    getPerspectiveOptions: GetPerspectiveOptions,
    loggedUserId: string | null
  ): Promise<SearchResult> {
    return await this.uprtclRepo.explore(
      searchOptions,
      getPerspectiveOptions,
      loggedUserId
    );
  }
}
