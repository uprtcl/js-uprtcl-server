import { Request, Response } from "express";
import { checkJwt } from "../../middleware/jwtCheck";
import { getUserFromReq, SUCCESS, ERROR } from "../uprtcl/uprtcl.controller";
import { AccessService } from "./access.service";
import { PostResult } from "../uprtcl/types";

export class AccessController {

  constructor(protected accessService: AccessService) {
  }

  routes() {
    return [
      
      {
        path: "/uprtcl/1/accessConfig/:elementId",
        method: "put",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            let inputs: any = {
              elementId: req.params.elementId, 
              accessConfig: req.body,
              userId: getUserFromReq(req)};

            let message = await this.accessService.updateAccessConfig(
              inputs.elementId,
              inputs.accessConfig,
              inputs.userId);

            console.log('[ACCESS CONTROLLER] updateAccessConfig', 
              JSON.stringify(inputs), {message});

            let result: PostResult = {
              result: message === SUCCESS ? SUCCESS : ERROR,
              message: message,
              elementIds: []
            }

            res.status(200).send(result);
          }
        ]
      },

      {
        path: "/uprtcl/1/permissions/:elementId",
        method: "put",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            let inputs: any = {
              elementId: req.params.elementId, 
              type: req.body.type,
              toUserId: req.body.userId,
              userId: getUserFromReq(req)};

            try {
              await this.accessService.addPermission(
                inputs.elementId,
                inputs.type,
                inputs.toUserId,
                inputs.userId);

              let result: PostResult = {
                result: SUCCESS,
                message: 'permission added',
                elementIds: []
              }

              console.log('[ACCESS CONTROLLER] addPermission', 
                JSON.stringify(inputs));
  
              res.status(200).send(result);
            } catch (error) {
              console.log('[ACCESS CONTROLLER] addPermission', 
                JSON.stringify(inputs), {error});

              let result: PostResult = {
                result: ERROR,
                message: error.message,
                elementIds: []
              }

              res.status(200).send(result);
            }
          }
        ]
      }
    ]}
};