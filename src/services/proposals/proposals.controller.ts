import { Request, Response } from "express";
import { checkJwt } from "../../middleware/jwtCheck";
export class ProposalsController {
    routes() {
        return [

           {
               path: "/uprtcl/1/proposal",
               method: "post",
               handler: [
                   checkJwt,
                   async (req: Request, res: Response) => {                       
                       res.status(200).send('Create proposal...');
                   }
               ]
           },

           {
               path: "/uprtcl/1/proposal/:proposalId",
               method: "get",
               handler: [
                   checkJwt,
                   async (req: Request, res: Response) => {
                       res.status(200).send('Get proposal...');
                   }
               ]
           },

           {
               path: "/uprtcl/1/proposal/:proposalId/head",
               method: "put",
               handler: [
                   checkJwt,
                   async (req: Request, res: Response) => {
                       res.status(200).send('Update proposal...');
                       //addUpdatesToProposal -> createHeadUpdate 
                   }
               ]
           },

           {
               path: "/uprtcl/1/proposal/:proposalId/accept",
               method: "put",
               handler: [
                   checkJwt,
                   async(req: Request, res: Response) => {
                       res.status(200).send('Accept proposal...');
                       // -> acceptProposal (depends on permissions) (modify state) -> executeProposal            
                   }
               ]
           },

           {
               path: "/uprtcl/1/proposal/:proposalId/cancel",
               method: "put",
               handler: [
                   checkJwt,
                   async(req: Request, res: Response) => {
                       res.status(200).send('Cancel proposal...');
                       //-> cancelProposal (modifies proposal state)
                   }
               ]
           },

           {
               path: "/uprtcl/1/proposal/:proposalId/freeze",
               method: "put",
               handler: [
                   checkJwt,
                   async (req: Request, res: Response) => {
                       res.status(200).send('Freeze proposal...');
                       // What is the proper operation for this situation?
                       // To set "close proposal" status?
                       //-> freezeProposal (modifies proposal state to close?)
                   }
               ]
           },

           {
               path: "/uprtcl/1/proposal/:proposalId/reject",
               method: "put",
               handler: [
                   checkJwt,
                   async (req: Request, res: Response) => {
                        res.status(200).send('Reject proposal...');
                       // Does rejecting a proposal means to set "Reject state" to a proposal?
                       // -> rejectProposal (modifies proposal state to rejected?)
                   }
               ]
           },
           
           {
               path: "/uprtcl/1/proposal/:proposalId",
               method: "delete",
               handler: [
                   checkJwt,
                   async (req: Request, res: Response) => {
                        res.status(200).send('Delete proposal...');
                       //pulls proposal from the DB?
                       // -> deleteProposal (pulls proposal from the DB?)
                   }
               ]
           }
        ]
    }
}
