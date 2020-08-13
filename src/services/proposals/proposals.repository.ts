import { DGraphService } from "../../db/dgraph.service";
import { NewProposalData, ProposalState } from "../uprtcl/types";
import { AccessRepository } from "../access/access.repository";
import { PermissionType } from '../access/access.schema';
import { UserRepository } from "../user/user.repository";
import { PROPOSALS_SCHEMA_NAME, HEAD_UPDATE_SCHEMA_NAME } from "../proposals/proposals.schema";
import { Proposal, UpdateRequest } from "../uprtcl/types";
import { NOT_AUTHORIZED_MSG } from "../../utils";

const dgraph = require("dgraph-js");
require("dotenv").config();

interface DgProposal {
    uid?: string
    creator: DgCreator
    state: ProposalState
    fromPerspective: DgPerspective
    toPerspective: DgPerspective
    fromHead: DgHead
    toHead: DgHead    
    updates?: Array<DgUpdate>    
}

interface DgUpdate {
    fromPerspective: DgPerspective
    perspective: DgPerspective
    oldHead?: DgOldHead
    newHead: DgNewHead
}

interface DgOldHead {
    xid: string
}

interface DgNewHead {
    xid: string
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
   
    async createProposal(proposalData: NewProposalData, loggedUserId: string): Promise <string> {        
        await this.db.ready();

        const mu = new dgraph.Mutation();
        const req = new dgraph.Request();
        
        /** make sure creatorId exist */
        await this.userRepo.upsertProfile(loggedUserId);

        // Gets creator
        let query = `profile as var(func: eq(did, "${loggedUserId.toLowerCase()}"))`;

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

        const updatesSetup = await this.setUpdates(proposalData.updates, '_:proposal', nquads, query);

        nquads = updatesSetup.nquads;        
        nquads = nquads.concat(`\n_:proposal <dgraph.type> "${PROPOSALS_SCHEMA_NAME}" .`);
        query = updatesSetup.query;      

        req.setQuery(`query{${query}}`);
        mu.setSetNquads(nquads);
        req.setMutationsList([mu]);

        const result = await this.db.callRequest(req);                

        return result.getUidsMap().get("proposal");
    }

    async getProposal(proposalUid: string, loggedUserId: string | null): Promise<Proposal> {

        let canAuthorize:boolean = false;
        let updatesArr: UpdateRequest[] = [];

        const dproposal = await this.findProposal(proposalUid, true, true);                    

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
                canAuthorize = await this.canAuthorizeProposal(loggedUserId, updates);     
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
    }

    async addUpdatesToProposal(proposalUid: string, updateRequests: Array<UpdateRequest>, loggedUserId:string): Promise<void> {                
        const dproposal = await this.findProposal(proposalUid, false, false);   

        const { creator: { did: proposalCreatorId } } = dproposal;

        if(proposalCreatorId !== loggedUserId) throw new Error(NOT_AUTHORIZED_MSG);

        await this.db.ready();         

        const mu = new dgraph.Mutation();
        const req = new dgraph.Request();   

        let query = `proposal as var(func: uid(${proposalUid}))`;
        let nquads = '';                

        const updatesSetup = await this.setUpdates(updateRequests, 'uid(proposal)', nquads, query);

        nquads = updatesSetup.nquads;
        query = updatesSetup.query;

        req.setQuery(`query{${query}}`);
        mu.setSetNquads(nquads);
        req.setMutationsList([mu]);        

        await this.db.callRequest(req);
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

        if(update.fromPerspectiveId) {
            query = query.concat(`\nfromPerspective as var(func: eq(xid, ${update.fromPerspectiveId}))`);
            nquads = nquads.concat(`\n_:HeadUpdate <fromPerspective> uid(fromPerspective) .`);
        }

        nquads = nquads.concat(`\n_:HeadUpdate <dgraph.type> "${HEAD_UPDATE_SCHEMA_NAME}" .`);

        req.setQuery(`query{${query}}`);
        mu.setSetNquads(nquads);
        req.setMutationsList([mu]);

        const result = await this.db.callRequest(req);    

        return result.getUidsMap().get("HeadUpdate");        
        
    }

    async getProposalsToPerspective(perspectiveId: string): Promise<string[]> {             
        const query = `query {
            proposals(func: has(toPerspective))
            @cascade
            @filter(eq(state, "OPEN") OR eq(state, "EXECUTED"))
            {   uid
                toPerspective @filter(eq(xid, "${perspectiveId}")) {
                    xid
                }
            }
        }`;

        const result = await this.db.client.newTxn().query(query);

        const proposals: DgProposal[] = result.getJson().proposals;              

        const ids = proposals.map(proposal => proposal.uid!);        

        if(!ids || ids.length === 0) {
           return []
        }        

        return ids;
    }

    // This method assumes that a user won't be able to reject a proposal if it doesn't have updates at all.
    // Can the owner of a toPerspective or from an update perspective be authorized?

    async rejectProposal(proposalUid: string, loggedUserId: string): Promise<void> {    
        const dproposal = await this.findProposal(proposalUid, true, false);

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

        const dproposal = await this.findProposal(proposalUid, false, false);        

        const { creator: { did: creatorId }, state } = dproposal;        

        if(creatorId != loggedUserId) {
            throw new Error(NOT_AUTHORIZED_MSG);
        }        

        if(state != ProposalState.Open) throw new Error(`Can't modify ${state} proposals`);

        // Ready to perform declination      
        await this.modifyProposalState(proposalUid, ProposalState.Declined);
    }

    // Methods that can be reused 

    /**
     * Gets updates ready to be added to the proposal.
     * @param updates - The incoming updates.
     * @param dgproposal - The proposal in the dgraph query language to which the DB needs to point.
     * @param nquads - The mutations coming from the parent process.
     * @param query - The query coming from the parent process.
     */

    async setUpdates(updates: UpdateRequest[], dgproposal: string, nquads: string, query:string) {
        const updatePromises = updates.map(async (updateRequest, i) => {
            // Create HeadUpdates
            const updateId = await this.createHeadUpdate(updateRequest);

            // Find HeadUpdates that belongs to the new updates
            query = query.concat(`\nupdate${i} as var(func: uid(${updateId}))`);

            // Add updates to proposal
            nquads = nquads.concat(`\n${dgproposal} <updates> uid(update${i}) .`);
        });

        await Promise.all(updatePromises);

        return {
            nquads, query
        };
    }

    /**
     * Find a proposal
     * @param {string} proposalUid - The proposal uid that needs to be returned.
     * @param {boolean} updates - True if you need the updates of the proposal.
     * @param {boolean} perspectives - True if you need the perspectives of the proposal.
     */

    async findProposal(proposalUid: string, updates: boolean, perspectives: boolean): Promise<DgProposal> {

        let query = `query {            
            proposal(func: uid(${proposalUid})) {
                creator {
                    did
                }`;

        query = query.concat(`state`);

        // If the client needs perspectives, provide them
        if(perspectives) {
           query = query.concat(`
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
           `);
        }

        // If the client needs updates, provide them
        if(updates) {
            query = query.concat(`
                updates {
                    fromPerspective {
                        xid
                    }
                    perspective {                        
                        xid
                    }
                    newHead {
                        xid
                    }
                    oldHead {
                        xid
                    }
                }
            `);
        }

        // Closes the query.
        query = query.concat(`\n }}`);
        
        const result = await this.db.client.newTxn().query(query);

        const dproposal: DgProposal = result.getJson().proposal[0];                

        if(!dproposal) throw new Error(`Proposal with UID ${proposalUid} was not found`);

        return dproposal;
    }

    async canAuthorizeProposal(loggedUserId: string, proposalUpdates: DgUpdate[]): Promise<boolean> {
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