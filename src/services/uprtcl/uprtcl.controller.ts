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
        path: "/uprtcl/1/persp",
        method: "post",
        handler: [
          checksPlaceholder,
          async ({ body }: Request, res: Response) => {
            const result = await this.uprtclService.createPerspective(body, '');
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/ctx/:perspectiveId",
        method: "get",
        handler: [
          checksPlaceholder,
          async ({ params }: Request, res: Response) => {
            const result = await this.uprtclService.getPerspective(params.perspectiveId, '');
            res.status(200).send(result);
          }
        ]
      }
    ]
  }
};

export const controller = new UprtclController();