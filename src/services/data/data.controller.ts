import { Request, Response } from "express";
import { DataService } from "./data.service";
import { UprtclService } from "../uprtcl/uprtcl.service";
import { checkJwt } from "../../middleware/jwtCheck";
import { Hashed, Secured, Commit, Signed, NewPerspectiveData, Perspective } from "../uprtcl/types";
import { getUserFromReq, SUCCESS, PostResult, GetResult } from "../../utils";

const propertyOrder = ['creatorsIds', 'dataId', 'message', 'timestamp', 'parentsIds'];
const perspectivePropertyOrder = ['remote', 'path', 'creatorId', 'context', 'timestamp'];
declare global {
  namespace Express {
    interface Request {
      user: string
    }
  }
}

export class DataController {

  constructor(protected dataService: DataService,
              protected uprtclService: UprtclService) {
  }

  routes() {
    return [

      {
        path: "/uprtcl/1/data",
        method: "post",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const data = req.body;
            let elementId:string = '';

            if((data.object as Signed<any>).payload !== undefined) {
              if(propertyOrder.every((p) => (data.object as Signed<any>).payload.hasOwnProperty(p))) {
                console.log('[UPRTCL-SERVICE] commitPatternDetected', data);
                elementId = await this.uprtclService.createCommit(data as Secured<Commit>, getUserFromReq(req));
              }

              if(perspectivePropertyOrder.every((p) => (data.object as Signed<any>).payload.hasOwnProperty(p))) {
                console.log('[UPRTCL-SERVICE] commitPatternDetected', data);
        
                const newPerspective: NewPerspectiveData = {
                  perspective: data as Secured<Perspective>
                }
          
                elementId = await this.uprtclService.createAndInitPerspective(newPerspective, getUserFromReq(req)); 
              }
            } else {
              elementId = await this.dataService.createData(
                data, 
                getUserFromReq(req));
            }

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