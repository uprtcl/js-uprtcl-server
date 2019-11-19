import { Request, Response } from "express";
import { checksPlaceholder } from "../../middleware/checks";
import { UprtclService } from "./uprtcl.service";
import { checkJwt } from "../../middleware/jwtCheck";
import { getUserFromReq, GetResult, SUCCESS, PostResult, ERROR } from "../../utils";

declare global {
  namespace Express {
    interface Request {
      user: string
    }
  }
}

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
          async (req: Request, res: Response) => {
            const elementId = await this.uprtclService.createPerspective(
              req.body, 
              getUserFromReq(req));

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
          async (req: Request, res: Response) => {
            const data = await this.uprtclService.getPerspective(req.params.perspectiveId, getUserFromReq(req));
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
        path: "/uprtcl/1/persp/:perspectiveId/details",
        method: "get",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const data = await this.uprtclService.getPerspectiveDetails(
              req.params.perspectiveId,
              getUserFromReq(req));
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
        path: "/uprtcl/1/persp/:perspectiveId/details",
        method: "put",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            try {
              await this.uprtclService.updatePerspective(
                req.params.perspectiveId, 
                req.body, 
                getUserFromReq(req));
  
              let result: PostResult = {
                result:  SUCCESS,
                message: 'perspective head updated',
                elementIds: []
              }
              res.status(200).send(result);
            } catch (error) {
              let result: PostResult = {
                result:  ERROR,
                message: error.message,
                elementIds: []
              }
              res.status(400).send(result);
            }
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
        path: "/uprtcl/1/commit",
        method: "post",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const elementId = await this.uprtclService.createCommit(
              req.body,
              getUserFromReq(req));
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
          async (req: Request, res: Response) => {
            const data = await this.uprtclService.getCommit(req.params.commitId, getUserFromReq(req));
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