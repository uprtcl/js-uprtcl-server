import { Perspective, Commit, DataDto } from "./types";
import { DGraphService, PermissionType } from "../../db/dgraph.service";
import { AccessService } from "../access/access.service";
import { NOT_AUTHORIZED_MSG, SUCCESS } from "./uprtcl.controller";

export class UprtclService {

  constructor(protected db: DGraphService, protected access: AccessService) {
  }

  async createPerspective(
    perspective: Perspective, 
    loggedUserId: string | null): Promise<string> {

    console.log('[UPRTCL-SERVICE] createPerspective', {perspective, loggedUserId});
    let perspId = await this.db.createPerspective(perspective);
    await this.access.createAccessConfig(perspId, loggedUserId);
    return perspId;
  };

  async getPerspective(perspectiveId: string, loggedUserId: string | null): Promise<Perspective | null> {
    console.log('[UPRTCL-SERVICE] getPerspective', {perspectiveId, loggedUserId});
    if (!(await this.access.can(perspectiveId, loggedUserId, PermissionType.Read))) return null;
    let perspective = await this.db.getPerspective(perspectiveId);
    return perspective;
  };

  async getContextPerspectives(context: string): Promise<Perspective[]> {
    console.log('[UPRTCL-SERVICE] getContextPerspectives', {context});
    // TODO filter by canRead (obvisouly...)
    let perspectives = await this.db.getContextPerspectives(context);
    return perspectives;
  };

  async updatePerspective(perspectiveId: string, headId: string, loggedUserId: string | null): Promise<string> {
    console.log('[UPRTCL-SERVICE] updatePerspective', {perspectiveId}, {headId});
    if (!(await this.access.can(perspectiveId, loggedUserId, PermissionType.Write))) return NOT_AUTHORIZED_MSG;
    await this.db.updatePerspective(perspectiveId, headId);
    return SUCCESS;
  };

  async getPerspectiveHead(perspectiveId: string, loggedUserId: string | null): Promise<string | null> {
    console.log('[UPRTCL-SERVICE] getPerspectiveHead', {perspectiveId});
    if (!(await this.access.can(perspectiveId, loggedUserId, PermissionType.Read))) return null;
    let perspectiveHead = await this.db.getPerspectiveHead(perspectiveId);
    return perspectiveHead;
  };  

  async createCommit(
    commit: Commit, 
    loggedUserId: string | null): Promise<string> {

    console.log('[UPRTCL-SERVICE] createCommit', commit);
    let commitId = await this.db.createCommit(commit);
    await this.access.createAccessConfig(commitId, loggedUserId);
    return commitId;
  };

  async getCommit(commitId: string, loggedUserId: string | null): Promise<Commit | null> {
    console.log('[UPRTCL-SERVICE] getCommit', {commitId});
    if (!(await this.access.can(commitId, loggedUserId, PermissionType.Read))) return null;
    let commit = await this.db.getCommit(commitId);
    return commit;
  };

  async createData(
    data: DataDto, 
    loggedUserId: string | null): Promise<string> {

    console.log('[UPRTCL-SERVICE] createData', data);
    let dataId = await this.db.createData(data);
    await this.access.createAccessConfig(dataId, loggedUserId);

    return dataId;
  };

  async getData(dataId: string, loggedUserId: string | null): Promise<any> {
    console.log('[UPRTCL-SERVICE] getData', dataId);
    if (!(await this.access.can(dataId, loggedUserId, PermissionType.Read))) return null;
    let data = await this.db.getData(dataId);
    return data;
  };

  async addKnownSources(elementId: string, sources: Array<string>) {
    console.log('[UPRTCL-SERVICE] addKnownSources', {elementId}, {sources});
    await this.db.addKnownSources(elementId, sources);
  }

  async getKnownSources(elementId: string):Promise<Array<string>> {
    console.log('[UPRTCL-SERVICE] getKnownSources', {elementId});
    let sources = this.db.getKnownSources(elementId);
    return sources;
  }

  getOrigin():Promise<string> {
    console.log('[UPRTCL-SERVICE] getOrigin');
    return this.db.getOrigin();
  }
}

