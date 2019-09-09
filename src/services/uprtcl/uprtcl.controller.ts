import { Request, Response } from "express";
import { checksPlaceholder } from "../../middleware/checks";
import { UprtclService } from "./uprtcl.service";

export class UprtclController {

  uprtclService: UprtclService;

  constructor() {
    this.uprtclService = new UprtclService('localhost:9080')
  }

  routes() {
    return [
      {
        path: "/uprtcl/1/ctx",
        method: "post",
        handler: [
          checksPlaceholder,
          async ({ body }: Request, res: Response) => {
            const result = await this.uprtclService.createContext(body, '');
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/ctx/:contextId",
        method: "get",
        handler: [
          checksPlaceholder,
          async ({ params }: Request, res: Response) => {
            const result = await this.uprtclService.getContext(params.contextId, '');
            res.status(200).send(result);
          }
        ]
      }
    ]
  }
};

export const controller = new UprtclController();