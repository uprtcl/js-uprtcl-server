import { DGraphService } from "../../db/dgraph.service";
import { NewProposalData, NewPerspectiveData, ProposalState } from "../uprtcl/types";
import { AccessRepository } from "../access/access.repository";
import { PermissionType } from '../access/access.schema';
import { UserRepository } from "../user/user.repository";
import { UprtclService } from '../uprtcl/uprtcl.service';
import { PROPOSALS_SCHEMA_NAME, HEAD_UPDATE_SCHEMA_NAME } from "../proposals/proposals.schema";
import { Perspective, Proposal, UpdateRequest } from "../uprtcl/types";
import { NOT_AUTHORIZED_MSG } from "../../utils";

const dgraph = require("dgraph-js");
require("dotenv").config();

interface DgProposal {
    creator: DgCreator
    state: ProposalState
    fromPerspective: DgPerspective
    toPerspective: DgPerspective
    fromHead: DgHead
    toHead: DgHead    
    updates?: Array<DgUpdate>    
}

interface DgUpdate {
    perspective: DgPerspective
    fromPerspectiveId: string
    oldHeadId: string
    newHeadId: string
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
        protected userRepo: UserRepository,
        protected accessRepo: AccessRepository
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

        // TODO: Send the canAuthorized field. See if the user is able to authorized the proposal he/she is requesting.
        // TODO: Send updates
        
        await this.db.ready();


        // TODO: Adapt to findProposal method
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

        // TODO: Check if the one that is adding updates is the proposal's creator.

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
        return [''];
    }

    async acceptProposal(proposalUid: string): Promise<void> {
        return;
    } 

    // This method assumes that a user won't be able to reject a proposal if it doesn't have updates at all.
    // Can the owner of a toPerspective or from an update perspective be authorized?

    async rejectProposal(proposalUid: string, loggedUserId: string): Promise<void> {

        await this.db.ready();

        const mu = new dgraph.Mutation();
        const req = new dgraph.Request();

        const dproposal = await this.findProposal(proposalUid, true);

        const { state, updates } = dproposal;        

        if(state != ProposalState.Open) throw new Error(`Can't modify a ${state} proposal`);

        // Check if proposal has updates
        if(!updates) {
            throw new Error("Can't reject proposal. No updates added yet.");
        }               

        // Check if the user is authorized to perform this action.                

        const canAuthorize = await this.canAuthorizeProposal(loggedUserId, updates);

        if(!canAuthorize) {
            throw new Error(NOT_AUTHORIZED_MSG);
        }

        // Ready to perform rejection
        await this.modifyProposalState(proposalUid, ProposalState.Rejected);
    }
    
    async declineProposal(proposalUid: string, loggedUserId: string): Promise<void> {

        await this.db.ready();        

        const mu = new dgraph.Mutation();
        const req = new dgraph.Request();

        const dproposal = await this.findProposal(proposalUid, false);        

        const { creator: { did: creatorId }, state } = dproposal;        

        if(creatorId != loggedUserId) {
            throw new Error(NOT_AUTHORIZED_MSG);
        }        

        if(state != ProposalState.Open) throw new Error(`Can't modify ${state} proposals`);

        // Ready to perform declination      
        await this.modifyProposalState(proposalUid, ProposalState.Declined);
    }

    // Util methods 

    async findProposal(proposalUid: string, updates: boolean): Promise<DgProposal> {

        let query = `query {            
            proposal(func: uid(${proposalUid})) {
                creator {
                    did
                }
                state`;

        // If the client needs updates, provide them
        if(updates) {
            query = query.concat(`
                toPerspective {                    
                    xid
                }
                updates {
                    perspective {                        
                        xid
                    }
                }
             `)
        }

        // Closes the query.
        query = query.concat(`\n }}`);
        
        const result = await this.db.client.newTxn().query(query);

        const dproposal: DgProposal = result.getJson().proposal[0];                

        if(!dproposal) throw new Error(`Proposal with UID ${proposalUid} was not found`);

        return dproposal;
    }

    async canAuthorizeProposal(loggedUserId: string, proposalUpdates: DgUpdate[]): Promise<Boolean> {
        const authorizePromises = proposalUpdates.map(async update => {
            const { perspective: { xid: perspectiveId } } = update;            

            return {
                canAdmin: await this.accessRepo.can(perspectiveId, loggedUserId, PermissionType.Admin),
                canWrite: await this.accessRepo.can(perspectiveId, loggedUserId, PermissionType.Write)
            }
        });

        const authorizations = await Promise.all(authorizePromises);

        const authorizedUpdates = authorizations.filter(auth => {
            return auth.canAdmin || auth.canWrite;
        })                

        return (authorizedUpdates.length == proposalUpdates.length);
    }

    async modifyProposalState(proposalUid: string, state: ProposalState): Promise<void> {
        await this.db.ready();        

       const mu = new dgraph.Mutation();
       const req = new dgraph.Request();

       const query = `proposal as var(func:uid(${proposalUid}))`;
       const nquads = `uid(proposal) <state> "${state}" .`;

       req.setQuery(`query{${query}}`);
       mu.setSetNquads(nquads);
       req.setMutationsList([mu]);

       await this.db.callRequest(req);
    }
}