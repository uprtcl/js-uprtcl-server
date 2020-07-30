import { DGraphService } from "../../db/dgraph.service";
import { NewProposalData, NewPerspectiveData, ProposalState } from "../uprtcl/types";
import { UserRepository } from "../user/user.repository";
import { UprtclService } from '../uprtcl/uprtcl.service';
import { PROPOSALS_SCHEMA_NAME } from "../proposals/proposals.schema";
import { Perspective, Proposal, UpdateRequest } from "../uprtcl/types";

const dgraph = require("dgraph-js");
require("dotenv").config();

interface DgProposal {
    creator: DgCreator
    state: ProposalState
    fromPerspective: DgPerspective
    toPerspective: DgPerspective
    fromHead: DgHead
    toHead: DgHead
    updates?: Array<string>    
}

interface DgPerspective {
    xid: string
}

interface DgCreator {
    did: string
}

interface DgHead {
    xid: string
}

export class ProposalsRepository {
    constructor(
        protected db: DGraphService,
        protected userRepo: UserRepository
    ) {}

    async createOrUpdateProposal(proposalData: NewProposalData): Promise <string> {        
        await this.db.ready();

       /** 
         *  Needs to validate if proposal exists to update instead
         */                 

        const mu = new dgraph.Mutation();
        const req = new dgraph.Request();
        
        /** make sure creatorId exist */
        await this.userRepo.upsertProfile(proposalData.creatorId);

        // Gets creator
        let query = `profile as var(func: eq(did, "${proposalData.creatorId.toLowerCase()}"))`;

        // Gets perspectives
        query = query.concat(`\ntoPerspective as var(func: eq(xid, ${proposalData.toPerspectiveId})){
                                head {
                                    toHead as uid
                                }
                            }`);
        query = query.concat(`\nfromPerspective as var(func: eq(xid, ${proposalData.fromPerspectiveId})){
                                head {
                                    fromHead as uid
                                }
                            }`);
        
        let nquads = `_:proposal <creator> uid(profile) .`;
        
        nquads = nquads.concat(`\n_:proposal <toPerspective> uid(toPerspective) .`);
        nquads = nquads.concat(`\n_:proposal <fromPerspective> uid(fromPerspective) .`);        
        nquads = nquads.concat(`\n_:proposal <toHead> uid(toHead) .`);
        nquads = nquads.concat(`\n_:proposal <fromHead> uid(fromHead) .`);
        nquads = nquads.concat(`\n_:proposal <state>  "${ProposalState.Open}" .`);
        nquads = nquads.concat(`\n_:proposal <dgraph.type> "${PROPOSALS_SCHEMA_NAME}" .`);
      

        req.setQuery(`query{${query}}`);
        mu.setSetNquads(nquads);
        req.setMutationsList([mu]);

        const result = await this.db.callRequest(req);        

        return result.getUidsMap().get("proposal");
    }

    async getProposal(proposalId: string): Promise<Proposal> {
        
        await this.db.ready();

        let query = `query {
            proposal(func: uid(${proposalId})) {                
                creator {
                    did
                }
                fromPerspective {
                    xid
                }
                toPerspective {
                    xid
                }
                fromHead {
                    xid
                }
                toHead {
                    xid
                }
                state
            }
        }`;

        const result = await this.db.client.newTxn().query(query);

        const dproposal: DgProposal = result.getJson().proposal[0];

        if(!dproposal) throw new Error(`Proposal with id ${proposalId} not found`);        

        const { 
                creator: { did: creatorId },
                fromPerspective: { xid: fromPerspectiveId },
                toPerspective: { xid: toPerspectiveId },
                fromHead: { xid: fromHeadId },
                toHead: { xid: toHeadId },
                state
              } = dproposal;                            

        const proposal: Proposal = {                    
            id: proposalId,
            creatorId: creatorId,
            toPerspectiveId: toPerspectiveId,
            fromPerspectiveId: fromPerspectiveId,
            fromHeadId: fromHeadId,
            toHeadId: toHeadId,
            state: state
        }                

        return proposal;
    }

    async getProposalsToPerspective(perspectiveId: string): Promise<string[]> {
        const proposals = ['0x25' , '0x451'];

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