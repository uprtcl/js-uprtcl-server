import dotenv from "dotenv";
import { Context, PropertyOrder } from "./types";
import { ipldService } from "../ipld/ipldService";
import { localCidConfig } from "../ipld";

dotenv.config();

export class UprtclService {

  private db: any;

  constructor(_db: any) {
    this.db = _db;
  }

  async createContext(context: Context, loggedUserId: string) {
    if (context.id) {
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
    console.log(uid);
  };
}

