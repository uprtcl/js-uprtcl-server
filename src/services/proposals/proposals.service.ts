import { Proposal, UpdateRequest, NewProposalData, NewPerspectiveData } from "../uprtcl/types"
import { ProposalsRepository } from "./proposals.repository";

export class ProposalsService {

    constructor(
        protected proposalRepo: ProposalsRepository) {    
    }

    async createProposal(proposalData: NewProposalData, loggedUserId: string | null): Promise<string> {
        if (loggedUserId === null) throw new Error('Anonymous user. Cant create a proposal');
                
        return await this.proposalRepo.createProposal(proposalData, loggedUserId);
    };

    async getProposal(proposalUid: string, loggedUserId: string|null): Promise<Proposal> {
        if(proposalUid == undefined || proposalUid == '') {
            throw new Error(`proposalId is empty`);
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
    }

    async rejectProposal(proposalUid: string, loggedUserId: string | null): Promise<void> {
        if (loggedUserId === null) throw new Error('Anonymous user. Cant cancel a proposal');
                
        return await this.proposalRepo.rejectProposal(proposalUid, loggedUserId);
    };

    async declineProposal(proposalId: string, loggedUserId: string | null): Promise<void> {        
        if (loggedUserId === null) throw new Error('Anonymous user. Cant decline a proposal');

        return await this.proposalRepo.declineProposal(proposalId, loggedUserId);
    };
}