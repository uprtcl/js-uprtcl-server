import { Proposal, 
         UpdateRequest, 
         NewProposalData, 
         PerspectiveDetails, 
         ProposalState } from "../uprtcl/types"
import { UprtclService } from "../uprtcl/uprtcl.service";
import { ProposalsRepository } from "./proposals.repository";
import { NOT_AUTHORIZED_MSG } from "../../utils";

export class ProposalsService {

    constructor(
        protected proposalRepo: ProposalsRepository,
        protected uprtclService: UprtclService) {    
    }

    async createProposal(
        proposalData: NewProposalData, 
        loggedUserId: string | null
    ): Promise<string> {
        if (loggedUserId === null) throw new Error('Anonymous user. Cant create a proposal');
                
        return await this.proposalRepo.createProposal(proposalData, loggedUserId);
    };

    async getProposal(
        proposalUid: string, 
        loggedUserId: string|null
    ): Promise<Proposal> {
        if(proposalUid == undefined || proposalUid == '') {
            throw new Error(`proposalUid is empty`);
        }
        
        let canAuthorize:boolean = false;
        let updatesArr: UpdateRequest[] = [];

        const dproposal = await this.proposalRepo.findProposal(proposalUid, true, true);                    

        const { 
                creator: { did: creatorId },
                fromPerspective: { xid: fromPerspectiveId },
                toPerspective: { xid: toPerspectiveId },
                fromHead: { xid: fromHeadId },
                toHead: { xid: toHeadId },
                state,
                updates
              } = dproposal;        

        if(updates) {
            updates.map(update => {    
              const {
                  oldHead,
                  newHead: {
                      xid: newHeadId
                  },
                  perspective: {
                      xid: perspectiveId
                  },
                  fromPerspective: {
                      xid: fromPerspectiveId
                  }
              } = update || {};

              const updateEl: UpdateRequest = {
                  fromPerspectiveId: fromPerspectiveId,
                  oldHeadId: oldHead?.xid,
                  perspectiveId: perspectiveId,
                  newHeadId: newHeadId
              }

              updatesArr.push(updateEl);
            });

            if(loggedUserId !== null) {
                canAuthorize = await this.uprtclService.canAuthorizeProposal(updates, loggedUserId);     
            }    
        }

        const proposal: Proposal = {                    
            id: proposalUid,
            creatorId: creatorId,
            toPerspectiveId: toPerspectiveId,
            fromPerspectiveId: fromPerspectiveId,
            fromHeadId: fromHeadId,
            toHeadId: toHeadId,
            state: state,
            updates: updatesArr,
            canAuthorize: canAuthorize
        }                        

        return proposal;
    };

    async getProposalsToPerspective(
        perspectiveId: string
    ): Promise<string[]> {
        if(perspectiveId == undefined || perspectiveId == '') {
            throw new Error(`perspectiveId is empty`);
        }

        const proposals = await this.proposalRepo.getProposalsToPerspective(perspectiveId);

        return proposals;
    };

    async addUpdatesToProposal(
        proposalUid: string, 
        updates: UpdateRequest[], 
        loggedUserId: string | null
    ): Promise<void> {
        if (loggedUserId === null) throw new Error('Anonymous user. Cant update a proposal');           

        await this.proposalRepo.addUpdatesToProposal(proposalUid, updates, loggedUserId);
    };

    // This method assumes that a user won't be able to reject a proposal if it doesn't have updates at all.
    // Can the owner of a toPerspective or from an update perspective be authorized?

    async rejectProposal(
        proposalUid: string, 
        loggedUserId: string | null
    ): Promise<void> {
        if (loggedUserId === null) throw new Error('Anonymous user. Cant cancel a proposal');

        // Get the proposals updates to provide to canAuthorize function and check current state.
        const dproposal = await this.proposalRepo.findProposal(proposalUid, true, false);
        const { state, updates } = dproposal;    

        if(state != ProposalState.Open) throw new Error(`Can't modify a ${state} proposal`);

        if(!updates) {
            throw new Error("Can't accept proposal. No updates added yet.");
        }        

        const canAuthorize = await this.uprtclService.canAuthorizeProposal(updates, loggedUserId)

        // Check if the user is authorized to perform this action.                        
        if(!canAuthorize) {
            throw new Error(NOT_AUTHORIZED_MSG);
        }        
                
        return await this.proposalRepo.rejectProposal(proposalUid);
    };

    async declineProposal(
        proposalUid: string, 
        loggedUserId: string | null
    ): Promise<void> {        
        if (loggedUserId === null) throw new Error('Anonymous user. Cant decline a proposal');

        const dproposal = await this.proposalRepo.findProposal(proposalUid, false, false);        

        const { creator: { did: creatorId }, state } = dproposal;        

        if(creatorId != loggedUserId) {
            throw new Error(NOT_AUTHORIZED_MSG);
        }        

        if(state != ProposalState.Open) throw new Error(`Can't modify ${state} proposals`);

        return await this.proposalRepo.declineProposal(proposalUid);
    };

    async acceptProposal(
        proposalUid: string, 
        loggedUserId: string | null
    ): Promise<void> {        
        if (loggedUserId === null) throw new Error('Anonymous user. Cant decline a proposal');

        // Get the proposals updates to provide to canAuthorize function
        const dproposal = await this.proposalRepo.findProposal(proposalUid, true, false);
        const { updates } = dproposal;

        if(!updates) {
            throw new Error("Can't accept proposal. No updates added yet.");
        } 

        const canAuthorize = await this.uprtclService.canAuthorizeProposal(updates, loggedUserId);

        if(!canAuthorize) {
            throw new Error(NOT_AUTHORIZED_MSG);
        }

        const perspectivePromises = updates.map(async update => {
            const { newHead: { xid: newHeadId }, 
                    perspective: { xid: perspectiveId } } = update;

            const details: PerspectiveDetails = {
                headId: newHeadId
            }

            await this.uprtclService.updatePerspective(perspectiveId, details, loggedUserId);
        });

        // Updates perspective
        await Promise.all(perspectivePromises);
        // Changes proposal state
        await this.proposalRepo.modifyProposalState(proposalUid, ProposalState.Executed);                                        
    };
}