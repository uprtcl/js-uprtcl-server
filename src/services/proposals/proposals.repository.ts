import { DGraphService } from "../../db/dgraph.service";
import { NewProposalData, NewPerspectiveData, ProposalState } from "../uprtcl/types";
import { UserRepository } from "../user/user.repository";
import { UprtclService } from '../uprtcl/uprtcl.service';
import { PROPOSALS_SCHEMA_NAME, HEAD_UPDATE_SCHEMA_NAME } from "../proposals/proposals.schema";
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
   
    async createProposal(proposalData: NewProposalData): Promise <string> {        
        await this.db.ready();

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

    async getProposal(proposalUId: string): Promise<Proposal> {
        
        await this.db.ready();

        let query = `query {
            proposal(func: uid(${proposalUId})) {                
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

        if(!dproposal) throw new Error(`Proposal with id ${proposalUId} not found`);        

        const { 
                creator: { did: creatorId },
                fromPerspective: { xid: fromPerspectiveId },
                toPerspective: { xid: toPerspectiveId },
                fromHead: { xid: fromHeadId },
                toHead: { xid: toHeadId },
                state
              } = dproposal;                            

        const proposal: Proposal = {                    
            id: proposalUId,
            creatorId: creatorId,
            toPerspectiveId: toPerspectiveId,
            fromPerspectiveId: fromPerspectiveId,
            fromHeadId: fromHeadId,
            toHeadId: toHeadId,
            state: state
        }                

        return proposal;
    }

    async addUpdatesToProposal(proposalUid: string, updateRequests: Array<UpdateRequest>): Promise<void> {
        await this.db.ready();         

        const mu = new dgraph.Mutation();
        const req = new dgraph.Request();   

        let query = `proposal as var(func: uid(${proposalUid}))`;
        let nquads = '';

        const updatePromises = updateRequests.map(async (updateRequest, i) => {
            // Create HeadUpdates      
            const updateId = await this.createHeadUpdate(updateRequest);

            // Add updates to proposal
            
            query = query.concat(`\nupdate${i} as var(func: uid(${updateId}))`);

            nquads = nquads.concat(`\nuid(proposal) <updates> uid(update${i}) .`);
            
        });

        const updates = await Promise.all(updatePromises);

        req.setQuery(`query{${query}}`);
        mu.setSetNquads(nquads);
        req.setMutationsList([mu]);        

        const result = await this.db.callRequest(req);
    }

    async createHeadUpdate(update: UpdateRequest): Promise<string> {
        const mu = new dgraph.Mutation();
        const req = new dgraph.Request();        
        
        let query = `perspective as var(func: eq(xid, ${update.perspectiveId}))`;
        query = query.concat(`\nnewHead as var(func: eq(xid, ${update.newHeadId}))`);
        query = query.concat(`\noldHead as var(func: eq(xid, ${update.oldHeadId}))`);

        let nquads = `_:HeadUpdate <perspective>  uid(perspective) .`;
        nquads = nquads.concat(`\n_:HeadUpdate <newHead> uid(newHead) .`);
        nquads = nquads.concat(`\n_:HeadUpdate <oldHead> uid(oldHead) .`);
        nquads = nquads.concat(`\n_:HeadUpdate <dgraph.type> "${HEAD_UPDATE_SCHEMA_NAME}" .`);

        req.setQuery(`query{${query}}`);
        mu.setSetNquads(nquads);
        req.setMutationsList([mu]);

        const result = await this.db.callRequest(req);    

        return result.getUidsMap().get("HeadUpdate");        
        
    }

    async getProposalsToPerspective(perspectiveId: string): Promise<string[]> {
        const proposals = ['0x25' , '0x451'];

        return proposals;
    }

    async acceptProposal(proposalUid: string): Promise<void> {
        // let acceptProposal = {
        //     proposalId: (proposalId == undefined || proposalId == '') ? this.errorProposalId() : proposalId
        // }
        return;
    } 

    async cancelProposal(proposalUid: string): Promise<void> {
        return;
    }
    
    async declineProposal(proposalUid: string, loggedUserId: string): Promise<void> {
        await this.db.ready();        

        const mu = new dgraph.Mutation();
        const req = new dgraph.Request();

        /*
            Let query = `loggedUser as var(func:eq(did, "${loggedUserId}"))`;
            let query = `proposal as var(func:uid(${proposalUid}))`;
            query = query.concat(`\n@filter(uid_in(creator, "0x56"))`);

            const nquads = `uid(proposal) <state> "${ProposalState.Declined}" .`;

            req.setQuery(`query{${query}}`);
            mu.setSetNquads(nquads);
            req.setMutationsList([mu]);

            const result = await this.db.callRequest(req);                

            return;
        */

        let query = `query {            
            proposal(func: uid(${proposalUid})) {
                creator {
                    did
                }
                state
            }
        }`;

        const result = await this.db.client.newTxn().query(query);

        const dproposal: DgProposal = result.getJson().proposal[0];

        if(!dproposal) throw new Error(`Proposal with UID ${proposalUid} is not found`);
          
        const { creator: { did: creatorId }, state } = dproposal;        

        if(creatorId != loggedUserId) {
            throw new Error(`User with id ${loggedUserId}, is not the creator of this proposal`);
        }

        if(state == ProposalState.Declined) throw new Error(`Proposal with UID ${proposalUid} has been already declined.`);
        

        const query1 = `proposal as var(func:uid(${proposalUid}))`;
        const nquads = `uid(proposal) <state> "${ProposalState.Declined}" .`;

        req.setQuery(`query{${query1}}`);
        mu.setSetNquads(nquads);
        req.setMutationsList([mu]);

        return await this.db.callRequest(req);
    } 


}