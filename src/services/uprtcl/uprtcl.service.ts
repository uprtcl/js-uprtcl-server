import dotenv from "dotenv";
import { Perspective, Commit, DataDto } from "./types";
import { DGraphService } from "../../db/dgraphService";

dotenv.config();

export class UprtclService {

  private db: DGraphService;

  constructor(_host: string) {
    this.db = new DGraphService(_host);
  }

  async createPerspective(perspective: Perspective, loggedUserId: string): Promise<string> {
    let uid = await this.db.createPerspective(perspective);
    return uid;
  };

  async getPerspective(perspectiveId: string, loggedUserId: string): Promise<Perspective> {
    let perspective = await this.db.getPerspective(perspectiveId);
    return perspective;
  };

  async createCommit(commit: Commit, loggedUserId: string): Promise<string> {
    let uid = await this.db.createCommit(commit);
    return uid;
  };

  async getCommit(commitId: string, loggedUserId: string): Promise<Commit> {
    let commit = await this.db.getCommit(commitId);
    return commit;
  };

  async createData(data: DataDto, loggedUserId: string): Promise<string> {
    let uid = await this.db.createData(data);
    return uid;
  };

  async getData(dataId: string): Promise<any> {
    let uid = await this.db.getData(dataId);
    return uid;
  };
}

