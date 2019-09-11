import dotenv from "dotenv";
import { PropertyOrder, Perspective } from "./types";
import { ipldService } from "../ipld/ipldService";
import { localCidConfig } from "../ipld";
import { DGraphService } from "../../db/dgraphService";

dotenv.config();

export class UprtclService {

  private db: DGraphService;

  constructor(_host: string) {
    this.db = new DGraphService(_host);
  }

  async createPerspective(perspective: Perspective, loggedUserId: string): Promise<string> {
    if (perspective.id !== '') {
      let valid = await ipldService.validateCid(
        perspective.id,
        perspective,
        PropertyOrder.Perspective
      );
      if (!valid) {
        throw new Error(`Invalid cid ${perspective.id}`);
      }
    } else {
      perspective.id = await ipldService.generateCidOrdered(
        perspective,
        localCidConfig,
        PropertyOrder.Perspective
      );
    }
    let uid = await this.db.createPerspective(perspective);
    return uid;
  };

  async getPerspective(perspectiveId: string, loggedUserId: string): Promise<Perspective> {
    let perspective = await this.db.getPerspective(perspectiveId);
    return perspective;
  };
}

