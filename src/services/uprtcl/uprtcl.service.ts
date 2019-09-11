import dotenv from "dotenv";
import { Context, PropertyOrder, Perspective } from "./types";
import { ipldService } from "../ipld/ipldService";
import { localCidConfig } from "../ipld";
import { DGraphService } from "../../db/dgraphService";

dotenv.config();

export class UprtclService {

  private db: DGraphService;

  constructor(_host: string) {
    this.db = new DGraphService(_host);
  }

  async createContext(context: Context, loggedUserId: string): Promise<string> {
    if (context.id !== '') {
      let valid = await ipldService.validateCid(
        context.id,
        context,
        PropertyOrder.Context
      );
      if (!valid) {
        throw new Error(`Invalid cid ${context.id}`);
      }
    } else {
      context.id = await ipldService.generateCidOrdered(
        context,
        localCidConfig,
        PropertyOrder.Context
      );
    }
    let uid = await this.db.createContext(context);
    return uid;
  };

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

  async getPerspective(perspectiveId: string, loggedUserId: string): Promise<Context> {
    let perspective = await this.db.getPerspective(perspectiveId);
    return perspective;
  };
}

