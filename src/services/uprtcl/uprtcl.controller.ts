import { Request, Response } from "express";
import { checksPlaceholder } from "../../middleware/checks";
import { UprtclService } from "./uprtcl.service";
import { ProposalsService } from "../proposals/proposals.service";
import { checkJwt } from "../../middleware/jwtCheck";
import { getUserFromReq, GetResult, SUCCESS, PostResult, ERROR } from "../../utils";
import { Secured, Perspective, PerspectiveDetails, Commit, Proposal } from "./types";

declare global {
  namespace Express {
    interface Request {
      user: string
    }
  }
}

export class UprtclController {

  constructor(protected uprtclService: UprtclService, protected proposalsService: ProposalsService) {
  }

  routes() {
    return [

      {
        path: "/uprtcl/1/persp",
        method: "post",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            const elementId = await this.uprtclService.createAndInitPerspective(
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

            let inputs: any = {
              perspectiveId: req.params.perspectiveId, 
              userId: getUserFromReq(req)
            };

            try {
              const perspective = await this.uprtclService.getPerspective(inputs.perspectiveId, inputs.userId);
              let result: GetResult <Secured<Perspective>> = {
                result: SUCCESS,
                message: '',
                data: perspective
              }

              console.log('[UPRTCL CONTROLLER] getPerspective', 
                { inputs: JSON.stringify(inputs), result: JSON.stringify(result) });
  
              res.status(200).send(result);
            } catch (error) {
              console.log('[UPRTCL CONTROLLER] getPerspective - Error', 
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
        path: "/uprtcl/1/persp/:perspectiveId/details",
        method: "get",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {

            let inputs: any = {
              perspectiveId: req.params.perspectiveId, 
              userId: getUserFromReq(req)
            };

            try {
              const data = await this.uprtclService.getPerspectiveDetails(
                inputs.perspectiveId,
                inputs.userId);

              let result: GetResult<PerspectiveDetails> = {
                result: SUCCESS,
                message: '',
                data: data
              }

              console.log('[UPRTCL CONTROLLER] getPerspectiveDetails', 
                { inputs: JSON.stringify(inputs), result: JSON.stringify(result) });

              res.status(200).send(result);
            } catch (error) {
              console.log('[UPRTCL CONTROLLER] getPerspectiveDetails - Error', 
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

      /**
       * Calls:
       *  -> getProposalsToPerspective() from proposals service.
       * Returns:
       *  -> Proposals[]           
       * Requires:
       *  -> perspectiveId: string
       */ 

      {
        path: "/uprctl/1/persp/:perspectiveId/proposals",
        method: "get",
        handler: [
          checkJwt,
          async(req: Request, res: Response) => {
            try {
              const proposals = await this.proposalsService.getProposalsToPerspective(
                req.params.perspectiveId
              );

              let result: GetResult <Proposal[]> = {
                result: SUCCESS,
                message: '',
                data: proposals
              }

              res.status(200).send(result);
            } catch (error) {
              let result: GetResult<null> = {
                result: ERROR,
                message: error.message,
                data: null
              }

              res.status(400).send(result);
            }
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
        path: "/uprtcl/1/persp/:perspectiveId",
        method: "delete",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            try {
              await this.uprtclService.deletePerspective(
                req.params.perspectiveId, 
                getUserFromReq(req));
  
              let result: PostResult = {
                result:  SUCCESS,
                message: 'perspective deleted',
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
        method: "put",
        handler: [
          checkJwt,
          async (req: Request, res: Response) => {
            try {
              let perspectives = await this.uprtclService.findPerspectives(
                req.body, 
                getUserFromReq(req));
                
              let result: GetResult<string[]> = {
                result: SUCCESS,
                message: 'perspectives found',
                data: perspectives
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
            let result: GetResult<Secured<Commit>> = {
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