import { DGraphService } from "../../db/dgraph.service";
import { KnownSourcesRepository } from "./knownsources.repository";
import { DATA_SCHEMA_NAME } from "../data/data.schema";
import { PERSPECTIVE_SCHEMA_NAME, COMMIT_SCHEMA_NAME } from "../uprtcl/uprtcl.schema";
import { DataService } from "../data/data.service";
import { UprtclService } from "../uprtcl/uprtcl.service";

export class KnownSourcesService {
  constructor(
    protected db: DGraphService, 
    protected knownSourcesRepo: KnownSourcesRepository,
    protected dataService: DataService,
    protected uprtclService: UprtclService) {}

  async getGeneric(
    elementId: string,
    loggedUserId: string | null
  ): Promise<any> {
    console.log("[UPRTCL-SERVICE] genericGet", { elementId, loggedUserId });
    let types = await this.knownSourcesRepo.getTypes(elementId);

    const data_types = [DATA_SCHEMA_NAME];

    if (types.length === 0) {
      throw new Error('Element not found');
    }

    if (types.some((type: string) => data_types.includes(type))) {
      return this.dataService.getData(elementId);
    }

    if (types.includes(PERSPECTIVE_SCHEMA_NAME)) {
      return this.uprtclService.getPerspective(elementId, loggedUserId);
    }

    if (types.includes(COMMIT_SCHEMA_NAME)) {
      return this.uprtclService.getCommit(elementId, loggedUserId);
    }

    throw new Error('Element not found');
  }

  async addKnownSources(elementId: string, casIDs: Array<string>) {
    console.log("[UPRTCL-SERVICE] addKnownSources", { elementId }, { casIDs });
    await this.knownSourcesRepo.addKnownSources(elementId, casIDs);
  }

  async getKnownSources(elementId: string): Promise<Array<string>> {
    console.log("[UPRTCL-SERVICE] getKnownSources", { elementId });
    let casIDs = this.knownSourcesRepo.getKnownSources(elementId);
    return casIDs;
  }
}
