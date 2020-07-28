import { DGraphService } from "../../db/dgraph.service";
import { NewProposalData } from "../uprtcl/types";
import { UserRepository } from "../user/user.repository";
import { PROPOSALS_SCHEMA_NAME } from "../proposals/proposals.schema";
import { Perspective, Proposal, UpdateRequest } from "../uprtcl/types";

const dgraph = require("dgraph-js");
require("dotenv").config();

export class ProposalsRepository {
    constructor(protected db: DGraphService) {}

    errorProposalId() {        
        throw new Error(`proposalId is empty`);        
    }

    async createOrUpdateProposal(proposalData: NewProposalData) {        
        await this.db.ready();

       /** 
         *  Needs to validate if proposal exists to update instead
         */        

        const mu = new dgraph.Mutation();
        const req = new dgraph.Request();

        let query = `\ntoPerspective as var(func: eq(xid, ${proposalData.toPerspectiveId}))`;
        query = query.concat(`\nfromPerspective as var(func: eq(xid, ${proposalData.fromPerspectiveId}))`);
        
        let nquads = `_:proposal  <toPerspective> uid(toPerspective) .`;
        nquads = nquads.concat(`\n_:proposal <fromPerspective> uid(fromPerspective) .`);
        nquads = nquads.concat(`\n_:proposal <state>  "Open".`);
        nquads = nquads.concat(`\n_:proposal <dgraph.type> "${PROPOSALS_SCHEMA_NAME}" .`);
      

        req.setQuery(`query{${query}}`);
        mu.setSetNquads(nquads);
        req.setMutationsList([mu]);

        const result = await this.db.callRequest(req);        

        return result.getUidsMap().get("proposal");
    }

    async getProposal(proposalId: string): Promise<Proposal> {
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
    }

    async getProposalsToPerspective(perspectiveId: string): Promise<Array<Proposal>> {
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
    }

    async addUpdatesToProposal(proposalId: string, updates: UpdateRequest[]): Promise<void> {
        return;
    } 

    async acceptProposal(proposalId: string): Promise<void> {
        // let acceptProposal = {
        //     proposalId: (proposalId == undefined || proposalId == '') ? this.errorProposalId() : proposalId
        // }
        return;
    } 

    async cancelProposal(proposalId: string): Promise<void> {
        return;
    }
    
    async declineProposal(proposalId: string): Promise<void> {
        return;
    } 


}