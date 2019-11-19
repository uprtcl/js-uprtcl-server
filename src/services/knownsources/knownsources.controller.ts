import { Request, Response } from "express";
import { checkJwt } from "../../middleware/jwtCheck";
import { getUserFromReq, GetResult, SUCCESS, PostResult } from "../../utils";
import { KnownSourcesService } from "./knownsources.service";

declare global {
  namespace Express {
    interface Request {
      user: string
    }
  }
}

export class KnownSourcesController {

  constructor(protected knownSourcesService: KnownSourcesService) {
  }

  routes() {
    return [

      {
        path: "/uprtcl/1/get/:hash",
        method: "get",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const data = await this.knownSourcesService.getGeneric(req.params.hash, getUserFromReq(req));
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
            await this.knownSourcesService.addKnownSources(params.elementId, body);
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
            const data = await this.knownSourcesService.getKnownSources(params.elementId);
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
            const data = await this.knownSourcesService.getOrigin();
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