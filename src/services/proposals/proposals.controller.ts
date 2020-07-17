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
                       // TODO: Call createOrUpdateProposal from service.   
                       // Should return an array as a result.   
                       /**
                        *  Requires:
                        *   -> toPerspectiveId: string
                        *   -> fromPerspectiveId: string
                        *   -> headUpdates: Array<HeadUpdate>
                        */           
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
                       // TODO: Call getProposal from service.
                       // Should return a proposal object.
                       /**
                        * Requires:
                        *   -> ProposalId: string
                        */
                       res.status(200).send('Get proposal...');
                   }
               ]
           },

           {
               path: "/uprtcl/1/proposal/:proposalId/heads",
               method: "put",
               handler: [
                   checkJwt,
                   async (req: Request, res: Response) => {
                       // TODO: Call createOrUpdate from service.
                       // Should return an array as a result.
                       /**
                        *  Requires:
                        *   -> toPerspectiveId: string
                        *   -> fromPerspectiveId: string
                        *   -> headUpdates: Array<HeadUpdate>
                        */       
                       res.status(200).send('Update proposal...');                       
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
                       // TODO: Call acceptProposal from service.
                       // Should not return information since it is a void type function.  
                       /**
                        *  Requires:
                        *   -> proposalId: string
                        */          
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
                       // TODO: Call cancelProposal from proposal service.
                       // Should not return information since it is a void type function.
                       /**
                        *  Requires:
                        *   -> proposalId: string
                        */
                   }
               ]
           },

           {
               path: "/uprtcl/1/proposal/:proposalId/decline",
               method: "put",
               handler: [
                   checkJwt,
                   async (req: Request, res: Response) => {
                        res.status(200).send('Reject proposal...');
                        // TODO: Call declineProposal from proposal service.
                        // Should not return information since it is a void type function.
                       /**
                        *  Requires:
                        *   -> proposalId: string
                        */    
                   }
               ]
           }
        ]
    }
}
