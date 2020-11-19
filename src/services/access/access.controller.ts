import { Request, Response } from "express";
import { checkJwt } from "../../middleware/jwtCheck";
import { AccessService } from "./access.service";
import { getUserFromReq, SUCCESS, ERROR, PostResult, GetResult } from "../../utils";
import { AccessConfigInherited, UserPermissions } from "./access.repository";

export class AccessController {

  constructor(protected accessService: AccessService) {
  }

  routes() {
    return [
      
      {
        path: "/uprtcl/1/permissions/:elementId/delegate",
        method: "put",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            let inputs: any = {
              elementId: req.params.elementId, 
              delegate: req.query.delegate,
              delegateTo: req.query.delegateTo,
              userId: getUserFromReq(req)};                                        

            try {              
              await this.accessService.toggleDelegate(
                inputs.elementId,
                (inputs.delegate === 'false') ? 
                  false : 
                (inputs.delegate === 'true') ? 
                  true : false,             
                (inputs.delegateTo === '' || inputs.delegateTo === 'undefined') ? 
                  undefined : inputs.delegateTo,
                inputs.userId
              );
  
              console.log('[ACCESS CONTROLLER] toggleDelegateTo', 
                JSON.stringify(inputs));
  
              let result: PostResult = {
                result: SUCCESS,
                message: 'accessConfig updated',
                elementIds: []
              }
  
              res.status(200).send(result);
            } catch (error) {
              console.log(error);
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
        path: "/uprtcl/1/permissions/:elementId/can",
        method: "get",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            let inputs: any = {
              elementId: req.params.elementId, 
              userId: getUserFromReq(req)};

            try {
              const permissions = await this.accessService.getUserPermissions(
                inputs.elementId,
                inputs.userId);
  
              console.log('[ACCESS CONTROLLER] getUserPermissions', 
                JSON.stringify(inputs));
  
              let result: GetResult<UserPermissions> = {
                result: SUCCESS,
                message: '',
                data: permissions
              }

              console.log('[ACCESS CONTROLLER] getUserPermissions', 
                { inputs: JSON.stringify(inputs), result: JSON.stringify(result) });
  
              res.status(200).send(result);
            } catch (error) {
              console.log('[ACCESS CONTROLLER] ERROR getUserPermissions', 
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
        method: "get",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            let inputs: any = {
              elementId: req.params.elementId, 
              userId: getUserFromReq(req)};

            try {
              const permissions = await this.accessService.getAccessConfigEffective(
                inputs.elementId,
                inputs.userId);
  
              console.log('[ACCESS CONTROLLER] getAccessConfigEffective', 
                JSON.stringify(inputs));
  
              let result: GetResult<AccessConfigInherited> = {
                result: SUCCESS,
                message: '',
                data: permissions
              }

              console.log('[ACCESS CONTROLLER] getAccessConfigEffective', 
                { inputs: JSON.stringify(inputs), result: JSON.stringify(result) });
  
              res.status(200).send(result);
            } catch (error) {
              console.log('[ACCESS CONTROLLER] ERROR getAccessConfigEffective', 
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
        path: "/uprtcl/1/permissions/:elementId/single",
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
        path: "/uprtcl/1/permissions/:elementId/single/:userId",
        method: "delete",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            let inputs: any = {
              elementId: req.params.elementId, 
              toUserId: req.params.userId,
              userId: getUserFromReq(req)};

            try {
              await this.accessService.deletePermission(
                inputs.elementId,
                inputs.toUserId,
                inputs.userId);

              let result: PostResult = {
                result: SUCCESS,
                message: 'permission deleted',
                elementIds: []
              }

              console.log('[ACCESS CONTROLLER] deletePermission', 
                JSON.stringify(inputs));
  
              res.status(200).send(result);
            } catch (error) {
              console.log('[ACCESS CONTROLLER] ERROR deletePermission', 
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
          },
        ]
      }
    ]}
};