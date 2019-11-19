import { DGraphService } from "../../db/dgraph.service";
import { KnownSourcesRepository } from "./knownsources.repository";

export class KnownSourcesService {
  constructor(
    protected db: DGraphService, 
    protected knownSourcesRepo: KnownSourcesRepository) {}

  async getGeneric(
    elementId: string,
    loggedUserId: string | null
  ): Promise<Object | null> {
    console.log("[UPRTCL-SERVICE] genericGet", { elementId, loggedUserId });
    let object = await this.knownSourcesRepo.getGeneric(elementId);
    return object;
  }

  async addKnownSources(elementId: string, sources: Array<string>) {
    console.log("[UPRTCL-SERVICE] addKnownSources", { elementId }, { sources });
    await this.knownSourcesRepo.addKnownSources(elementId, sources);
  }

  async getKnownSources(elementId: string): Promise<Array<string>> {
    console.log("[UPRTCL-SERVICE] getKnownSources", { elementId });
    let sources = this.knownSourcesRepo.getKnownSources(elementId);
    return sources;
  }

  getOrigin(): Promise<string> {
    console.log("[UPRTCL-SERVICE] getOrigin");
    return this.knownSourcesRepo.getOrigin();
  }
}
