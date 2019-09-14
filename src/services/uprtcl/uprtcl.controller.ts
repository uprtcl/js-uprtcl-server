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
        path: "/uprtcl/1/persp/:perspectiveId",
        method: "get",
        handler: [
          checksPlaceholder,
          async ({ params }: Request, res: Response) => {
            const result = await this.uprtclService.getPerspective(params.perspectiveId, '');
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/persp/:perspectiveId/head",
        method: "get",
        handler: [
          checksPlaceholder,
          async ({ params }: Request, res: Response) => {
            const result = await this.uprtclService.getPerspectiveHead(params.perspectiveId);
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/persp/:perspectiveId",
        method: "put",
        handler: [
          checksPlaceholder,
          async ({ params, query }: Request, res: Response) => {
            const result = await this.uprtclService.updatePerspective(params.perspectiveId, query.headId);
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/data",
        method: "post",
        handler: [
          checksPlaceholder,
          async ({ body }: Request, res: Response) => {
            const result = await this.uprtclService.createData(body, '');
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/data/:dataId",
        method: "get",
        handler: [
          checksPlaceholder,
          async ({ params }: Request, res: Response) => {
            const result = await this.uprtclService.getData(params.dataId);
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/commit",
        method: "post",
        handler: [
          checksPlaceholder,
          async ({ body }: Request, res: Response) => {
            const result = await this.uprtclService.createCommit(body, '');
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/commit/:commitId",
        method: "get",
        handler: [
          checksPlaceholder,
          async ({ params }: Request, res: Response) => {
            const result = await this.uprtclService.getCommit(params.commitId, '');
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/discovery/:elementId",
        method: "put",
        handler: [
          checksPlaceholder,
          async ({ params, body }: Request, res: Response) => {
            const result = await this.uprtclService.addKnownSources(params.elementId, body);
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/discovery/:elementId",
        method: "get",
        handler: [
          checksPlaceholder,
          async ({ params, }: Request, res: Response) => {
            const result = await this.uprtclService.getKnownSources(params.elementId);
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/discovery/you",
        method: "get",
        handler: [
          checksPlaceholder,
          async ({ params }: Request, res: Response) => {
            const result = this.uprtclService.getOrigin();
            res.status(200).send(result);
          }
        ]
      }
    ]
  }
};

export const controller = new UprtclController();