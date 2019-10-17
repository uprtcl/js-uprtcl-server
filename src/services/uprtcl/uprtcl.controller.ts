import { Request, Response } from "express";
import { checksPlaceholder } from "../../middleware/checks";
import { UprtclService } from "./uprtcl.service";
import { checkJwt } from "../../middleware/jwtCheck";

interface PostResult {
  result: string;
  message: string;
  elementIds: string[];
}

interface GetResult {
  result: string;
  message: string;
  data: any;
}

const SUCCESS = 'success';

export class UprtclController {

  constructor(protected uprtclService: UprtclService) {
  }

  routes() {
    return [
      
      {
        path: "/uprtcl/1/persp",
        method: "post",
        handler: [
          checkJwt,
          async ({ body }: Request, res: Response) => {
            const elementId = await this.uprtclService.createPerspective(body, '');
            let result: PostResult = {
              result: SUCCESS,
              message: '',
              elementIds: [elementId]
            }
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/persp/:perspectiveId",
        method: "get",
        handler: [
          checkJwt,
          async ({ params }: Request, res: Response) => {
            const data = await this.uprtclService.getPerspective(params.perspectiveId, '');
            let result: GetResult = {
              result: SUCCESS,
              message: '',
              data: data
            }
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/persp/:perspectiveId/head",
        method: "get",
        handler: [
          checkJwt,
          async ({ params }: Request, res: Response) => {
            const data = await this.uprtclService.getPerspectiveHead(params.perspectiveId);
            let result: GetResult = {
              result: SUCCESS,
              message: '',
              data: data
            }
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/persp/:perspectiveId",
        method: "put",
        handler: [
          checkJwt,
          async ({ params, query }: Request, res: Response) => {
            await this.uprtclService.updatePerspective(params.perspectiveId, query.headId);
            let result: PostResult = {
              result: SUCCESS,
              message: '',
              elementIds: []
            }
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/persp",
        method: "get",
        handler: [
          checkJwt,
          async ({ query }: Request, res: Response) => {
            let perspectives = await this.uprtclService.getContextPerspectives(query.context);
            let result: GetResult = {
              result: SUCCESS,
              message: '',
              data: perspectives
            }
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/data",
        method: "post",
        handler: [
          checkJwt,
          async ({ body }: Request, res: Response) => {
            const elementId = await this.uprtclService.createData(body, '');
            let result: PostResult = {
              result: SUCCESS,
              message: '',
              elementIds: [elementId]
            }
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/data/:dataId",
        method: "get",
        handler: [
          checkJwt,
          async ({ params }: Request, res: Response) => {
            const data = await this.uprtclService.getData(params.dataId);
            let result: GetResult = {
              result: SUCCESS,
              message: '',
              data: data
            }
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/commit",
        method: "post",
        handler: [
          checkJwt,
          async ({ body }: Request, res: Response) => {
            const elementId = await this.uprtclService.createCommit(body, '');
            let result: PostResult = {
              result: SUCCESS,
              message: '',
              elementIds: [elementId]
            }
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/commit/:commitId",
        method: "get",
        handler: [
          checkJwt,
          async ({ params }: Request, res: Response) => {
            const data = await this.uprtclService.getCommit(params.commitId, '');
            let result: GetResult = {
              result: SUCCESS,
              message: '',
              data: data
            }
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/discovery/:elementId",
        method: "put",
        handler: [
          checkJwt,
          async ({ params, body }: Request, res: Response) => {
            await this.uprtclService.addKnownSources(params.elementId, body);
            let result: PostResult = {
              result: SUCCESS,
              message: '',
              elementIds: []
            }
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/discovery/:elementId",
        method: "get",
        handler: [
          checkJwt,
          async ({ params, }: Request, res: Response) => {
            const data = await this.uprtclService.getKnownSources(params.elementId);
            let result: GetResult = {
              result: SUCCESS,
              message: '',
              data: data
            }
            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/discovery/you",
        method: "get",
        handler: [
          checkJwt,
          async ({ params }: Request, res: Response) => {
            const data = await this.uprtclService.getOrigin();
            let result: GetResult = {
              result: SUCCESS,
              message: '',
              data: data
            }
            res.status(200).send(result);
          }
        ]
      }
    ]
  }
};