import { Request, Response } from "express";
import { checkJwt } from "../../middleware/jwtCheck";
import { getUserFromReq, GetResult, SUCCESS, PostResult, ERROR } from "../../utils";
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

            let inputs: any = {
              hash: req.params.hash,
              userId: getUserFromReq(req)
            };

            try {
              const data = await this.knownSourcesService.getGeneric(inputs.hash, inputs.userId);
              let result: GetResult<string[]> = {
                result: SUCCESS,
                message: '',
                data: data
              }
              res.status(200).send(result);

              console.log('[KNOWNSOURCES CONTROLLER] getGeneric', 
                { inputs: JSON.stringify(inputs), result: JSON.stringify(result) });
  
              res.status(200).send(result);
            } catch (error) {
              console.log('[UPRTCL CONTROLLER] getGeneric - Error', 
                JSON.stringify(inputs), error);
  
              let result: GetResult<null> = {
                result: ERROR,
                message: error.message,
                data: null
              }
  
              res.status(200).send(result);
            }
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
            let result: GetResult<string[]> = {
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