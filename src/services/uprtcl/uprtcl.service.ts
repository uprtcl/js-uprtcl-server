import { Perspective, Commit, DataDto, PerspectiveDetails, Secured } from "./types";
import { DGraphService } from "../../db/dgraph.service";
import { AccessService } from "../access/access.service";
import { NOT_AUTHORIZED_MSG, SUCCESS } from "./uprtcl.controller";
import { UserService } from "../user/user.service";
import { UprtclRepository } from "./uprtcl.repository";
import { PermissionType } from "../access/access.repository";
import { KnownSourcesRepository } from "../knownsources/knownsources.repository";
import { DataRepository } from "../data/data.repository";

export class UprtclService {

  constructor(
    protected db: DGraphService, 
    protected uprtclRepo: UprtclRepository, 
    protected dataRepo: DataRepository, 
    protected knownSourcesRepo: KnownSourcesRepository, 
    protected access: AccessService) {
  }

  async getGeneric(elementId: string, loggedUserId: string | null): Promise<Object | null> {
    console.log('[UPRTCL-SERVICE] genericGet', {elementId, loggedUserId});
    let object = await this.uprtclRepo.getGeneric(elementId);
    return object;
  };

  async createPerspective(
    perspective: Secured<Perspective>, 
    loggedUserId: string | null): Promise<string> {

    console.log('[UPRTCL-SERVICE] createPerspective', {perspective, loggedUserId});
    let perspId = await this.uprtclRepo.createPerspective(perspective);
    await this.access.createAccessConfig(perspId, loggedUserId);
    return perspId;
  };

  async getPerspective(perspectiveId: string, loggedUserId: string | null): Promise<Secured<Perspective>> {
    console.log('[UPRTCL-SERVICE] getPerspective', {perspectiveId, loggedUserId});
    if (!(await this.access.can(perspectiveId, loggedUserId, PermissionType.Read))) {
      throw new Error(`access to ${perspectiveId} denied to ${loggedUserId}`);
    }
    let perspective = await this.uprtclRepo.getPerspective(perspectiveId);
    return perspective;
  };

  async getContextPerspectives(context: string): Promise<Perspective[]> {
    console.log('[UPRTCL-SERVICE] getContextPerspectives', {context});
    // TODO filter by canRead
    let perspectives = await this.uprtclRepo.getContextPerspectives(context);
    return perspectives;
  };

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
    if (!(await this.access.can(commitId, loggedUserId, PermissionType.Read))) {
      throw new Error(NOT_AUTHORIZED_MSG);
    }
    let commit = await this.uprtclRepo.getCommit(commitId);
    return commit;
  };

  async createData(
    data: DataDto, 
    _loggedUserId: string | null): Promise<string> {

    console.log('[UPRTCL-SERVICE] createData', data);
    let dataId = await this.dataRepo.createData(data);
    
    return dataId;
  };

  async getData(dataId: string): Promise<any> {
    console.log('[UPRTCL-SERVICE] getData', dataId);
    let data = await this.dataRepo.getData(dataId);
    return data;
  };

  async addKnownSources(elementId: string, sources: Array<string>) {
    console.log('[UPRTCL-SERVICE] addKnownSources', {elementId}, {sources});
    await this.knownSourcesRepo.addKnownSources(elementId, sources);
  }

  async getKnownSources(elementId: string):Promise<Array<string>> {
    console.log('[UPRTCL-SERVICE] getKnownSources', {elementId});
    let sources = this.knownSourcesRepo.getKnownSources(elementId);
    return sources;
  }

  getOrigin():Promise<string> {
    console.log('[UPRTCL-SERVICE] getOrigin');
    return this.uprtclRepo.getOrigin();
  }
}

