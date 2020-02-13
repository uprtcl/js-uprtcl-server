import { Perspective, Commit, PerspectiveDetails, Secured, NewPerspectiveData } from "./types";
import { DGraphService } from "../../db/dgraph.service";
import { AccessService } from "../access/access.service";
import { UprtclRepository } from "./uprtcl.repository";
import { PermissionType } from "../access/access.schema";
import { NOT_AUTHORIZED_MSG } from "../../utils";

export class UprtclService {

  constructor(
    protected db: DGraphService, 
    protected uprtclRepo: UprtclRepository, 
    protected access: AccessService) {
  }

  private async createPerspective(
    perspective: Secured<Perspective>, 
    loggedUserId: string | null): Promise<string> {

    console.log('[UPRTCL-SERVICE] createPerspective', {perspective, loggedUserId});
    return this.uprtclRepo.createPerspective(perspective);
  };

  async getPerspective(perspectiveId: string, loggedUserId: string | null): Promise<Secured<Perspective>> {
    console.log('[UPRTCL-SERVICE] getPerspective', {perspectiveId, loggedUserId});
    if (perspectiveId == undefined || perspectiveId === '') {
      throw new Error(`perspectiveId is empty`)
    }
    if (!(await this.access.can(perspectiveId, loggedUserId, PermissionType.Read))) {
      throw new Error(`access to ${perspectiveId} denied to ${loggedUserId}`);
    }
    let perspective = await this.uprtclRepo.getPerspective(perspectiveId);
    return perspective;
  };

  async findPerspectives(details: PerspectiveDetails, loggedUserId: string | null): Promise<string[]> {
    console.log('[UPRTCL-SERVICE] findPerspectives', {details});
    // TODO filter on query not by code...
    const perspectivesIds = await this.uprtclRepo.findPerspectives(details);

    const accessiblePerspectivesPromises = perspectivesIds.map(async (perspectiveId) => {
      if (!(await this.access.can(perspectiveId, loggedUserId, PermissionType.Read))) {
        return '';
      } else {
        return perspectiveId;
      }
    })

    const accessiblePerspectives = await Promise.all(accessiblePerspectivesPromises);
    
    return accessiblePerspectives.filter((e: string) => e !=='');
  };

  async createAndInitPerspective(perspectiveData: NewPerspectiveData, loggedUserId: string | null): Promise<string> {
    let perspId = await this.createPerspective(perspectiveData.perspective, loggedUserId);
    
    if (perspectiveData.details) {
      await this.updatePerspective(perspId, perspectiveData.details, loggedUserId);
    }
    
    if (perspectiveData.parentId) {
      await this.access.createAccessConfig(perspId, perspectiveData.parentId, loggedUserId);
    } else {
      await this.access.createAccessConfig(perspId, undefined, loggedUserId);
    }

    return perspId;
  }

  async updatePerspective(perspectiveId: string, details: PerspectiveDetails, loggedUserId: string | null): Promise<void> {
    console.log('[UPRTCL-SERVICE] updatePerspective', {perspectiveId}, {details});
    if (!(await this.access.can(perspectiveId, loggedUserId, PermissionType.Write))) throw new Error(NOT_AUTHORIZED_MSG);
    await this.uprtclRepo.updatePerspective(perspectiveId, details);
  };

  async getPerspectiveDetails(perspectiveId: string, loggedUserId: string | null): Promise<PerspectiveDetails> {
    console.log('[UPRTCL-SERVICE] getPerspectiveDetails', {perspectiveId});
    if (!(await this.access.can(perspectiveId, loggedUserId, PermissionType.Read))) {
      throw new Error(NOT_AUTHORIZED_MSG);
    }
    let details = await this.uprtclRepo.getPerspectiveDetails(perspectiveId);
    return details;
  };  

  async createCommit(
    commit: Secured<Commit>, 
    _loggedUserId: string | null): Promise<string> {

    console.log('[UPRTCL-SERVICE] createCommit', commit);
    let commitId = await this.uprtclRepo.createCommit(commit);
    
    return commitId;
  };

  async getCommit(commitId: string, loggedUserId: string | null): Promise<Secured<Commit>> {
    console.log('[UPRTCL-SERVICE] getCommit', {commitId});
    let commit = await this.uprtclRepo.getCommit(commitId);
    return commit;
  };
}

