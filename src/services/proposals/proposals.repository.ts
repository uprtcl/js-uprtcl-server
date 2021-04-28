import { DGraphService } from '../../db/dgraph.service';
import { UserRepository } from '../user/user.repository';
import {
  PROPOSALS_SCHEMA_NAME,
  HEAD_UPDATE_SCHEMA_NAME,
  NEW_PERSPECTIVE_PROPOSAL_SCHEMA_NAME,
} from '../proposals/proposals.schema';
import { NOT_AUTHORIZED_MSG } from '../../utils';
import { DgProposal, NewProposalData, ProposalState } from './types';
import { Update, NewPerspective } from '@uprtcl/evees';

const dgraph = require('dgraph-js');
require('dotenv').config();

export class ProposalsRepository {
  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository
  ) {}

  async createProposal(
    proposalData: NewProposalData,
    loggedUserId: string
  ): Promise<string> {
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
    nquads = nquads.concat(
      `\n_:proposal <fromPerspective> uid(fromPerspective) .`
    );
    nquads = nquads.concat(`\n_:proposal <toHead> uid(toHead) .`);
    nquads = nquads.concat(`\n_:proposal <fromHead> uid(fromHead) .`);
    nquads = nquads.concat(`\n_:proposal <state>  "${ProposalState.Open}" .`);

    const updatesSetup = await this.setDetails(
      proposalData.details.updates,
      proposalData.details.newPerspectives,
      '_:proposal',
      nquads,
      query
    );

    nquads = updatesSetup.nquads;
    nquads = nquads.concat(
      `\n_:proposal <dgraph.type> "${PROPOSALS_SCHEMA_NAME}" .`
    );
    query = updatesSetup.query;

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    const result = await this.db.callRequest(req);

    return result.getUidsMap().get('proposal');
  }

  async addUpdatesToProposal(
    proposalUid: string,
    updateRequests: Array<Update>,
    loggedUserId: string
  ): Promise<void> {
    const dproposal = await this.getProposal(proposalUid, false, false);

    const {
      creator: { did: proposalCreatorId },
    } = dproposal;

    if (proposalCreatorId !== loggedUserId) throw new Error(NOT_AUTHORIZED_MSG);

    await this.db.ready();

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query = `proposal as var(func: uid(${proposalUid}))`;
    let nquads = '';

    const updatesSetup = await this.setDetails(
      updateRequests,
      [],
      'uid(proposal)',
      nquads,
      query
    );

    nquads = updatesSetup.nquads;
    query = updatesSetup.query;

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    await this.db.callRequest(req);
  }

  async createHeadUpdate(update: Update): Promise<string> {
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query = `perspective as var(func: eq(xid, ${update.perspectiveId}))`;
    query = query.concat(
      `\nnewHead as var(func: eq(xid, ${update.details.headId}))`
    );

    let nquads = `_:HeadUpdate <perspective>  uid(perspective) .`;

    nquads = nquads.concat(`\n_:HeadUpdate <newHead> uid(newHead) .`);
    nquads = nquads.concat(`\n_:HeadUpdate <oldHead> uid(oldHead) .`);

    if (update.fromPerspectiveId) {
      query = query.concat(
        `\nfromPerspective as var(func: eq(xid, ${update.fromPerspectiveId}))`
      );
      nquads = nquads.concat(
        `\n_:HeadUpdate <fromPerspective> uid(fromPerspective) .`
      );
    }

    nquads = nquads.concat(
      `\n_:HeadUpdate <dgraph.type> "${HEAD_UPDATE_SCHEMA_NAME}" .`
    );

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    const result = await this.db.callRequest(req);

    return result.getUidsMap().get('HeadUpdate');
  }

  async createNewPerspectiveProposal(
    newPerspective: NewPerspective
  ): Promise<string> {
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let nquads = `_:NewPerspective <NEWP_perspectiveId>  "${newPerspective.perspective.hash}" .`;
    if (newPerspective.update.details.guardianId)
      nquads = nquads.concat(
        `\n_:NewPerspective <NEWP_parentId> "${newPerspective.update.details.guardianId}" .`
      );
    if (newPerspective.update.details && newPerspective.update.details.headId)
      nquads = nquads.concat(
        `\n_:NewPerspective <NEWP_headId> "${newPerspective.update.details.headId}" .`
      );

    nquads = nquads.concat(
      `\n_:NewPerspective <dgraph.type> "${NEW_PERSPECTIVE_PROPOSAL_SCHEMA_NAME}" .`
    );
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    const result = await this.db.callRequest(req);

    return result.getUidsMap().get('NewPerspective');
  }

  async getProposalsToPerspective(perspectiveId: string): Promise<string[]> {
    const query = `query {
            proposals(func: has(toPerspective))
            @cascade
            @filter(eq(state, "OPEN") OR eq(state, "EXECUTED"))
            {   
                uid
                toPerspective @filter(eq(xid, "${perspectiveId}")) {
                    xid
                }
            }
        }`;

    const result = await this.db.client.newTxn().query(query);

    const proposals: DgProposal[] = result.getJson().proposals;

    const ids = proposals.map((proposal) => proposal.uid!);

    return !ids || ids.length == 0 ? [] : ids;
  }

  // Methods that can be reused

  /**
   * Gets updates ready to be added to the proposal.
   * @param updates - The incoming updates.
   * @param dgproposal - The proposal in the dgraph query language to which the DB needs to point.
   * @param nquads - The mutations coming from the parent process.
   * @param query - The query coming from the parent process.
   */

  async setDetails(
    updates: Update[],
    newPerspectives: NewPerspective[],
    dgproposal: string,
    nquads: string,
    query: string
  ) {
    const updatePromises = updates.map(async (Update, i) => {
      // Create HeadUpdates
      const updateId = await this.createHeadUpdate(Update);

      // Find HeadUpdates that belongs to the new updates
      query = query.concat(`\nupdate${i} as var(func: uid(${updateId}))`);

      // Add updates to proposal
      nquads = nquads.concat(`\n${dgproposal} <updates> uid(update${i}) .`);
    });

    await Promise.all(updatePromises);

    const newPerspectivesPromises = newPerspectives.map(
      async (newPerspective, i) => {
        const newPerspectiveProposalId = await this.createNewPerspectiveProposal(
          newPerspective
        );

        // Find HeadUpdates that belongs to the new updates
        query = query.concat(
          `\nnewPerspective${i} as var(func: uid(${newPerspectiveProposalId}))`
        );

        // Add updates to proposal
        nquads = nquads.concat(
          `\n${dgproposal} <newPerspectives> uid(newPerspective${i}) .`
        );
      }
    );

    await Promise.all(newPerspectivesPromises);

    return {
      nquads,
      query,
    };
  }

  /**
   * Find a proposal
   * @param {string} proposalUid - The proposal uid that needs to be returned.
   * @param {boolean} updates - True if you need the updates of the proposal.
   * @param {boolean} perspectives - True if you need the perspectives of the proposal.
   */

  async getProposal(
    proposalUid: string,
    updates: boolean,
    perspectives: boolean
  ): Promise<DgProposal> {
    let query = `query {            
            proposal(func: uid(${proposalUid})) {
                creator {
                    did
                }`;

    query = query.concat(`state`);

    // If the client needs perspectives, provide them
    if (perspectives) {
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
    if (updates) {
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
                newPerspectives {
                    NEWP_perspectiveId
                    NEWP_parentId
                    NEWP_headId
                }
            `);
    }

    // Closes the query.
    query = query.concat(`\n }}`);

    const result = await this.db.client.newTxn().query(query);

    const dproposal: DgProposal = result.getJson().proposal[0];

    if (!dproposal)
      throw new Error(`Proposal with UID ${proposalUid} was not found`);

    return dproposal;
  }

  async modifyProposalState(
    proposalUid: string,
    state: ProposalState
  ): Promise<void> {
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
