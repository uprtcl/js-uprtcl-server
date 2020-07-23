import { Request, Response } from "express";
import { checkJwt } from "../../middleware/jwtCheck";
import { Proposal, Secured } from "../uprtcl/types"
import { ProposalsService } from "./proposals.service";
import { getUserFromReq, GetResult, SUCCESS, PostResult, ERROR } from "../../utils";
export class ProposalsController {

    constructor(protected proposalService: ProposalsService) {}

    routes() {
        return [  

            /**
             * Calls:
             *  -> createProposal() from service
             * Returns:
             *  -> String proposalId
             * Requires:
             *  -> Type NewProposalData
             *  -> Logged user
             */   

           {
               path: "/uprtcl/1/proposal",
               method: "post",
               handler: [
                   checkJwt,
                   async (req: Request, res: Response) => {        
                       try {
                        const elementId = await this.proposalService.createProposal(
                            req.body,
                            getUserFromReq(req));

                        let result: PostResult = {
                            result: SUCCESS,
                            message: '',
                            elementIds: [elementId]
                        }

                        res.status(200).send(result);
                       } catch (error) {
                           let result: PostResult = {
                               result: ERROR,
                               message: error.message,
                               elementIds: []
                           }

                           res.status(400).send(result);
                       }                                                                  
                   }
               ]
           },

           /**
             * Calls:
             *  -> createAndPropose() from service
             * Returns:
             *  -> String proposalId           
             * Requires:
             *  -> type NewPerspectiveData[]
             *  -> Type NewProposalData
             *  -> Logged user
             */   

            {
                path: "/uprtcl/1/proposal/propose",
                method: "post",
                handler: [
                    checkJwt,
                    async (req: Request, res: Response) => {        
                        try {
                         const elementId = await this.proposalService.createAndPropose(
                             req.body.NewPerspectiveData,
                             req.body.proposal,
                             getUserFromReq(req)
                        );
 
                         let result: PostResult = {
                             result: SUCCESS,
                             message: '',
                             elementIds: [elementId]
                         }
 
                         res.status(200).send(result);
                        } catch (error) {
                            let result: PostResult = {
                                result: ERROR,
                                message: error.message,
                                elementIds: []
                            }
 
                            res.status(400).send(result);
                        }                                                                  
                    }
                ]
            },

            /**
             * Calls:
             *  -> getProposal() from service
             * Returns:
             *  -> Proposal as Proposal type           
             * Requires:
             *  -> proposalId: string
             */      

           {
               path: "/uprtcl/1/proposal/:proposalId",
               method: "get",
               handler: [
                   checkJwt,
                   async (req: Request, res: Response) => {                                          
                    try {
                        const proposal = await this.proposalService.getProposal(
                            req.params.proposalId
                        );
                        
                        let result: GetResult <Proposal> = {
                            result: SUCCESS,
                            message: '',
                            data: proposal
                        }

                        res.status(200).send(result);
                        
                    } catch(error) {
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
             *  -> addUpdatesToProposal() from service
             * Returns:
             *  -> Does not return anything  since it is only a remote call procedure.      
             * Requires:
             *  -> proposalId: string
             * ->  updates: UpdateRequest[]
             *  -> Logged user
             */   

           {
               path: "/uprtcl/1/proposal/:proposalId",
               method: "put",
               handler: [
                   checkJwt,
                   async (req: Request, res: Response) => {
                    try {
                        await this.proposalService.addUpdatesToProposal(
                            req.params.proposalId,
                            req.body,
                            getUserFromReq(req)
                        );

                        let result: PostResult = {
                            result: SUCCESS,
                            message: 'proposal updated',
                            elementIds: []
                        }

                        res.status(200).send(result);
                    } catch (error) {
                        let result: PostResult ={
                            result: ERROR,
                            message: error.message,
                            elementIds: []
                        }

                        res.status(400).send(result);
                    }                      
                   }
               ]
           },

           /**
             * Calls:
             *  -> acceptProposal() from service
             * Returns:
             *  -> Does not return anything  since it is only a remote call procedure.       
             * Requires:
             *  -> proposalId: string
             *  -> Logged user
             */      

           {
               path: "/uprtcl/1/proposal/:proposalId/accept",
               method: "put",
               handler: [
                   checkJwt,
                   async(req: Request, res: Response) => {
                    try {
                        await this.proposalService.acceptProposal(
                            req.params.proposalId,
                            getUserFromReq(req)
                        );

                        let result: PostResult = {
                            result:  SUCCESS,
                            message: 'proposal accepted',
                            elementIds: []
                        }
                        res.status(200).send(result);
                         
                    } catch(error) {
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

           /**
             * Calls:
             *  -> cancelProposal() from service
             * Returns:
             *  -> Does not return anything  since it is only a remote call procedure.       
             * Requires:
             *  -> proposalId: string
             *  -> Logged user
             */      

           {
               path: "/uprtcl/1/proposal/:proposalId/cancel",
               method: "put",
               handler: [
                   checkJwt,
                   async(req: Request, res: Response) => {
                    try {
                        await this.proposalService.cancelProposal(
                            req.params.proposalId,
                            getUserFromReq(req)
                        );

                        let result: PostResult = {
                            result:  SUCCESS,
                            message: 'proposal cancelled',
                            elementIds: []
                        }
                        res.status(200).send(result);
                         
                    } catch(error) {
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

           /**
             * Calls:
             *  -> declineProposal() from service
             * Returns:
             *  -> Does not return anything  since it is only a remote call procedure.       
             * Requires:
             *  -> proposalId: string
             *  -> Logged user
             */      

           {
               path: "/uprtcl/1/proposal/:proposalId/decline",
               method: "put",
               handler: [
                   checkJwt,
                   async(req: Request, res: Response) => {
                    try {
                        await this.proposalService.declineProposal(
                            req.params.proposalId,
                            getUserFromReq(req)
                        );

                        let result: PostResult = {
                            result:  SUCCESS,
                            message: 'proposal declined',
                            elementIds: []
                        }
                        res.status(200).send(result);
                         
                    } catch(error) {
                        let result: PostResult = {
                            result:  ERROR,
                            message: error.message,
                            elementIds: []
                        }
                        res.status(400).send(result);
                    }                       
                   }
               ]
           }
        ]
    }
}
