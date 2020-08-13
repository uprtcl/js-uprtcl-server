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

    async createProposal(proposalData: NewProposalData, loggedUserId: string | null): Promise<string> {
        if (loggedUserId === null) throw new Error('Anonymous user. Cant create a proposal');
                
        return await this.proposalRepo.createProposal(proposalData, loggedUserId);
    };

    async getProposal(proposalUid: string, loggedUserId: string|null): Promise<Proposal> {
        if(proposalUid == undefined || proposalUid == '') {
            throw new Error(`proposalUid is empty`);
        }

        const proposal = await this.proposalRepo.getProposal(proposalUid, loggedUserId);

        return proposal;
    };

    async getProposalsToPerspective(perspectiveId: string): Promise<string[]> {
        if(perspectiveId == undefined || perspectiveId == '') {
            throw new Error(`perspectiveId is empty`);
        }

        const proposals = await this.proposalRepo.getProposalsToPerspective(perspectiveId);

        return proposals;
    };

    async addUpdatesToProposal(proposalUid: string, updates: UpdateRequest[], loggedUserId: string | null): Promise<void> {
        if (loggedUserId === null) throw new Error('Anonymous user. Cant update a proposal');           

        await this.proposalRepo.addUpdatesToProposal(proposalUid, updates, loggedUserId);
    };

    async rejectProposal(proposalUid: string, loggedUserId: string | null): Promise<void> {
        if (loggedUserId === null) throw new Error('Anonymous user. Cant cancel a proposal');
                
        return await this.proposalRepo.rejectProposal(proposalUid, loggedUserId);
    };

    async declineProposal(proposalUid: string, loggedUserId: string | null): Promise<void> {        
        if (loggedUserId === null) throw new Error('Anonymous user. Cant decline a proposal');

        return await this.proposalRepo.declineProposal(proposalUid, loggedUserId);
    };

    async acceptProposal(proposalUid: string, loggedUserId: string | null): Promise<void> {        
        if (loggedUserId === null) throw new Error('Anonymous user. Cant decline a proposal');

        // Get the proposals updates to provide to canAuthorize function
        const dproposal = await this.proposalRepo.findProposal(proposalUid, true, false);
        const { updates } = dproposal;

        if(!updates) {
            throw new Error("Can't accept proposal. No updates added yet.");
        } 

        const canAuthorize = await this.proposalRepo.canAuthorizeProposal(loggedUserId, updates);

        if(!canAuthorize) {
            throw new Error(NOT_AUTHORIZED_MSG);
        }

        const perspectivePromises = updates.map(async (update, i) => {
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