import { Request, Response } from "express";
import { checkJwt } from "../../middleware/jwtCheck";
import { AccessService } from "./access.service";
import { PostResult } from "../uprtcl/types";
import { getUserFromReq, SUCCESS, ERROR } from "../../utils";

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

            try {
              await this.accessService.updateAccessConfig(
                inputs.elementId,
                inputs.accessConfig,
                inputs.userId);
  
              console.log('[ACCESS CONTROLLER] updateAccessConfig', 
                JSON.stringify(inputs));
  
              let result: PostResult = {
                result: SUCCESS,
                message: 'accessConfig updated',
                elementIds: []
              }
  
              res.status(200).send(result);
            } catch (error) {
              console.log('[ACCESS CONTROLLER] ERROR updateAccessConfig', 
                JSON.stringify(inputs));
  
              let result: PostResult = {
                result: ERROR,
                message: error.message,
                elementIds: []
              }
  
              res.status(200).send(result);
            }            
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
              console.log('[ACCESS CONTROLLER] ERROR addPermission', 
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
      },

      {
        path: "/uprtcl/1/permissions/:elementId/public",
        method: "put",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            let inputs: any = {
              elementId: req.params.elementId, 
              type: req.body.type,
              value: req.body.value,
              userId: getUserFromReq(req)};

            try {
              await this.accessService.setPublic(
                inputs.elementId,
                inputs.type,
                inputs.value,
                inputs.userId);

              let result: PostResult = {
                result: SUCCESS,
                message: 'public access set',
                elementIds: []
              }

              console.log('[ACCESS CONTROLLER] setPublic', 
                JSON.stringify(inputs));
  
              res.status(200).send(result);
            } catch (error) {
              console.log('[ACCESS CONTROLLER] ERROR setPublic', 
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