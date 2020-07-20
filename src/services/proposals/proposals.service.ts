import { Proposal, UpdateRequest, NewProposalData, NewPerspectiveData } from "../uprtcl/types"

export class ProposalsService {

    constructor(
        protected proposalRepo: ProposalsRepository) {    
    }

    async createProposal(proposalData: NewProposalData, loggedUserId: string | null): Promise<string> {
        if (loggedUserId === null) throw new Error('Anonymous user. Cant create a perspective');
                
        // Call createOrUpdate from repository
        let proposalId = 'uewhiu34';                

        return proposalId;
    };

    async createAndPropose(newPerspectivesData: NewPerspectiveData[], proposalData: NewProposalData, loggedUserId: string | null): Promise<string> {
        if (loggedUserId === null) throw new Error('Anonymous user. Cant create a perspective');

        // Call createOrUpdate from repository
        let proposalId = 'her89g89g';

        return proposalId;
    } 

    async getProposal(proposalId: string): Promise<Proposal> {

        // TODO: Call getProposal from repository.

        const proposal: Proposal = {    
            id: 'id9430',        
            fromPerspectiveId: 'perspectiveModifying',
            updates: [
                { perspectiveId: 'testId',
                  newHeadId: 'headId' }
            ],
            executed: true
        }

        return proposal;
    };

    async addUpdatesToProposal(proposalId: string, updates: UpdateRequest[], loggedUserId: string | null): Promise<void> {
        if (loggedUserId === null) throw new Error('Anonymous user. Cant create a perspective');
        // TODO: Call createOrUpdate from repository.
        return;
    }

    async getProposalsToPerspective(perspectiveId: string): Promise<Array<Proposal>> {
        // TODO: Call getProposalsToPerspective from repository.
        const proposals: Array<Proposal> = [
            {    
                id: 'id9430',        
                fromPerspectiveId: 'perspectiveModifying',
                updates: [
                    { perspectiveId: 'testId',
                      newHeadId: 'headId' }
                ],
                executed: true
            }
        ];

        return proposals;
    };

    async acceptProposal(proposalId: string): Promise<void> {
        // TODO: Call acceptProposal from repository
        return;
    };

    async cancelProposal(proposalId: string): Promise<void> {
        // TODO: Call cancelProposal from repository
        return;
    };

    async declineProposal(proposalId: string): Promise<void> {
        // TODO: Call declineProposal from repository
        return;
    };
}