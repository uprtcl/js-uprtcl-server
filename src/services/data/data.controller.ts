import { Request, Response } from "express";
import { DataService } from "./data.service";
import { checkJwt } from "../../middleware/jwtCheck";
import { getUserFromReq, SUCCESS, PostResult, GetResult } from "../../utils";

declare global {
  namespace Express {
    interface Request {
      user: string
    }
  }
}

export class DataController {

  constructor(protected dataService: DataService) {
  }

  routes() {
    return [

      {
        path: "/uprtcl/1/data",
        method: "post",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const elementId = await this.dataService.createData(
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
        path: "/uprtcl/1/data/:dataId",
        method: "get",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const data = await this.dataService.getData(
              req.params.dataId);
            let result: GetResult<any> = {
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