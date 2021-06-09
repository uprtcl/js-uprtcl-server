import {
  Commit,
  Entity,
  GetPerspectiveOptions,
  NewPerspective,
  Perspective,
  PerspectiveDetails,
  PerspectiveGetResult,
  Secured,
  Update,
  Slice,
  ParentAndChild,
  SearchOptions,
  SearchResult,
  ForkOf,
  JoinTree,
} from '@uprtcl/evees';
import { DGraphService } from '../../db/dgraph.service';
import { UserRepository } from '../user/user.repository';
import { DataRepository } from '../data/data.repository';
import { Upsert } from './types';
import { PERSPECTIVE_SCHEMA_NAME, COMMIT_SCHEMA_NAME } from './uprtcl.schema';
import { ipldService } from '../ipld/ipldService';
import { decodeData } from '../data/utils';
import e from 'express';

const dgraph = require('dgraph-js');

export enum Join {
  inner = 'INNER_JOIN',
  full = 'FULL_JOIN',
}

export enum SearchType {
  linksTo = 'linksTo',
  under = 'under',
  above = 'above',
}

export interface Text {
  value: string;
  levels: number;
}

export interface SearchUpsert {
  startQuery: string;
  internalWrapper: string;
  optionalWrapper: string;
}
export interface DgRef {
  [x: string]: string;
  uid: string;
}

interface DgPerspective {
  uid?: string;
  xid: string;
  name: string;
  context: DgContext;
  remote: string;
  path: string;
  creator: DgRef;
  timextamp: number;
  'dgraph.type'?: string;
  stored: boolean;
  deleted: boolean;
  signature: string;
  proof_type: string;
  delegate: boolean;
  delegateTo: DgPerspective;
  finDelegatedTo: DgPerspective;
  publicRead: boolean;
  publicWrite: boolean;
  canRead: DgRef[];
  canWrite: DgRef[];
  canAdmin: DgRef[];
}

interface DgContext {
  name: string;
  perspectives: DgPerspective[];
}
interface DgCommit {
  uid?: string;
  xid: string;
  creators: DgRef[];
  timextamp: number;
  message: string;
  parents: DgRef[];
  data: DgRef;
  'dgraph.type'?: string;
  stored: boolean;
  signature: string;
  proof_type: string;
}

const defaultFirst = 10;

export interface FetchResult {
  perspectiveIds: string[];
  ended?: boolean;
  details: PerspectiveDetails;
  slice: Slice;
  forksDetails?: ForkOf[];
}

export class UprtclRepository {
  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository,
    protected dataRepo: DataRepository
  ) {}

  createPerspectiveUpsert(
    upsertedProfiles: string[],
    externalParentIds: string[],
    upsert: Upsert,
    newPerspective: NewPerspective,
    loggedUserId: string
  ) {
    // Perspective object destructuring
    const {
      hash: id,
      object: {
        payload: { creatorId, timestamp, context, remote, path },
        proof,
      },
    } = newPerspective.perspective;

    let { query, nquads } = upsert;

    if (!upsertedProfiles.includes(creatorId)) {
      upsertedProfiles.push(creatorId);
      const creatorSegment = this.userRepo.upsertQueries(creatorId);
      query = query.concat(creatorSegment.query);
      nquads = nquads.concat(creatorSegment.nquads);
    }

    if (loggedUserId !== creatorId) {
      throw new Error(
        `Can only store perspectives whose creatorId is the creator, but ${creatorId} is not ${loggedUserId}`
      );
    }

    query = query.concat(`\npersp${id} as var(func: eq(xid, "${id}"))`);
    query = query.concat(
      `\ncontextOf${id} as var(func: eq(name, "${context}"))`
    );

    nquads = nquads.concat(`\nuid(persp${id}) <xid> "${id}" .`);
    nquads = nquads.concat(`\nuid(persp${id}) <stored> "true" .`);
    nquads = nquads.concat(
      `\nuid(persp${id}) <creator> uid(profile${this.userRepo.formatDid(
        creatorId
      )}) .`
    );
    nquads = nquads.concat(
      `\nuid(persp${id}) <timextamp> "${timestamp}"^^<xs:int> .`
    );

    nquads = nquads.concat(`\nuid(contextOf${id}) <name> "${context}" .`);
    nquads = nquads.concat(
      `\nuid(contextOf${id}) <perspectives> uid(persp${id}) .`
    );
    nquads = nquads.concat(`\nuid(persp${id}) <context> uid(contextOf${id}) .`);

    nquads = nquads.concat(`\nuid(persp${id}) <deleted> "false" .`);
    nquads = nquads.concat(`\nuid(persp${id}) <remote> "${remote}" .`);
    nquads = nquads.concat(`\nuid(persp${id}) <path> "${path}" .`);
    nquads = nquads.concat(
      `\nuid(persp${id}) <dgraph.type> "${PERSPECTIVE_SCHEMA_NAME}" .`
    );

    nquads = nquads.concat(
      `\nuid(persp${id}) <signature> "${proof.signature}" .`
    );
    nquads = nquads.concat(`\nuid(persp${id}) <proof_type> "${proof.type}" .`);

    // Permissions and ACL
    //-----------------------------//

    /** Sets default permissions */
    nquads = nquads.concat(
      `\nuid(persp${id}) <publicRead> "false" .
       \nuid(persp${id}) <publicWrite> "false" .
       \nuid(persp${id}) <canRead> uid(profile${this.userRepo.formatDid(
        creatorId
      )}) .
       \nuid(persp${id}) <canWrite> uid(profile${this.userRepo.formatDid(
        creatorId
      )}) .
       \nuid(persp${id}) <canAdmin> uid(profile${this.userRepo.formatDid(
        creatorId
      )}) .`
    );

    /** add itself as its ecosystem */
    nquads = nquads.concat(`\nuid(persp${id}) <ecosystem> uid(persp${id}) .`);

    if (newPerspective.update.details.guardianId) {
      // We need to bring that parentId if it is external
      if (
        externalParentIds.includes(newPerspective.update.details.guardianId)
      ) {
        /** This perspective is an external perspective and has a parentId that already
         * exists on the database */

        query = query.concat(`\nparentOfExt${id} as var(func: eq(xid, ${newPerspective.update.details.guardianId})) {
          finDelOfParentOfExt${id} as finDelegatedTo
        }`);

        nquads = nquads.concat(
          `\nuid(persp${id}) <delegateTo> uid(parentOfExt${id}) .`
        );
        nquads = nquads.concat(
          `\nuid(persp${id}) <finDelegatedTo> uid(finDelOfParentOfExt${id}) .`
        );
      } else {
        nquads = nquads.concat(
          `\nuid(persp${id}) <delegateTo> uid(persp${newPerspective.update.details.guardianId}) .`
        );
        /** because the parent is in the batch, we cannot set the finDelegateTo and
         * have to postpone it to another subsequent query */
      }

      nquads = nquads.concat(`\nuid(persp${id}) <delegate> "true" .`);
    } else {
      // Assings itself as finalDelegatedTo
      nquads = nquads.concat(
        `\nuid(persp${id}) <finDelegatedTo> uid(persp${id}) .
         \nuid(persp${id}) <delegate> "false" .`
      );
    }

    return { query, nquads };
  }

  async createPerspectives(
    newPerspectives: NewPerspective[],
    loggedUserId: string
  ) {
    if (newPerspectives.length === 0) return;
    await this.db.ready();

    let upsert: Upsert = {
      query: ``,
      nquads: ``,
    };

    let ACLupsert: Upsert = {
      query: ``,
      nquads: ``,
    };

    let upsertedProfiles: string[] = [];
    let perspectiveIds = newPerspectives.map((p) => p.perspective.hash);

    const externalParentPerspectives = newPerspectives.filter((p) => {
      if (p.update.details.guardianId !== null) {
        if (p.update.details.guardianId !== undefined) {
          if (!perspectiveIds.includes(p.update.details.guardianId)) {
            return p;
          }
        } else {
          return p;
        }
      } else {
        return p;
      }
    });

    const externalParentIds = [
      ...new Set(
        externalParentPerspectives.map((p) => p.update.details.guardianId)
      ),
    ];

    for (let i = 0; i < newPerspectives.length; i++) {
      const newPerspective = newPerspectives[i];
      const upsertString = this.createPerspectiveUpsert(
        upsertedProfiles,
        externalParentIds as string[],
        upsert,
        newPerspective,
        loggedUserId
      );

      if (i < 1) {
        upsert.query = upsert.query.concat(upsertString.query);
        upsert.nquads = upsert.nquads.concat(upsertString.nquads);
      }

      upsert = upsertString;
    }

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    req.setQuery(`query{${upsert.query}}`);
    mu.setSetNquads(upsert.nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);

    // Keep the ACL redundant layer updated.
    for (let i = 0; i < externalParentPerspectives.length; i++) {
      const externalPerspective = externalParentPerspectives[i];
      const aclUpsertString = this.recurseACLupdateUpsert(
        externalPerspective.perspective.hash,
        ACLupsert
      );

      if (i < 1) {
        ACLupsert.query = ACLupsert.query.concat(aclUpsertString.query);
        ACLupsert.nquads = ACLupsert.nquads.concat(aclUpsertString.nquads);
      }

      ACLupsert = aclUpsertString;
    }

    const ACLmu = new dgraph.Mutation();
    const ACLreq = new dgraph.Request();

    ACLreq.setQuery(`query{${ACLupsert.query}}`);
    ACLmu.setSetNquads(ACLupsert.nquads);
    ACLreq.setMutationsList([ACLmu]);

    let ACLresult = await this.db.callRequest(ACLreq);
    console.log(
      '[DGRAPH] createPerspective',
      { upsert, ACLupsert },
      result.getUidsMap().toArray(),
      ACLresult.getUidsMap().toArray()
    );
  }

  recurseACLupdateUpsert(externalPerspectiveId: string, upsert: Upsert) {
    let { query, nquads } = upsert;
    query = query.concat(
      `\nexternal${externalPerspectiveId}(func: eq(xid, ${externalPerspectiveId}))
        @recurse {
          inheritingFrom${externalPerspectiveId} as ~delegateTo
          uid
        }`
    );

    query = query.concat(`\nexternalForFinDel${externalPerspectiveId}(func: eq(xid, ${externalPerspectiveId})) {
      finalDelegateOf${externalPerspectiveId} as finDelegatedTo
    }`);

    nquads = nquads.concat(
      `\nuid(inheritingFrom${externalPerspectiveId}) <finDelegatedTo> uid(finalDelegateOf${externalPerspectiveId}) .`
    );

    return { query, nquads };
  }

  async updatePerspectives(updates: Update[]): Promise<void> {
    let childrenUpsert: Upsert = { nquads: ``, delNquads: ``, query: `` };
    let ecoUpsert: Upsert = { query: ``, nquads: ``, delNquads: `` };

    /**
     * The reason why we have a second loop, is beacuse the first one
     * is to collect the external children. Once collected,
     * we'll resuse that data inside this loop.
     */
    for (let i = 0; i < updates.length; i++) {
      /**
       * We start building the DB query by calling the upsert function.
       * First, we start by the children.
       */
      const childrenUpsertString = this.updatePerspectiveUpsert(
        updates[i],
        childrenUpsert
      );

      /**
       * Consequently, we start calling the ecosystem upsert function.
       */
      const ecoUpsertString = this.updateEcosystemUpsert(updates[i], ecoUpsert);

      /**
       * To have in mind: The 2 previous functions are synchronous, which
       * means that, we do not actually talk to the db, we just build the
       * strings that will be send to perform the actual transactions.
       */

      //---------

      /**
       * We start concatenating the strings after having initialized the variables
       * with the first call, so we accumulate as the loop goes forward.
       */
      if (i < 1) {
        childrenUpsert.query = childrenUpsert.query.concat(
          childrenUpsertString.query
        );
        childrenUpsert.nquads = childrenUpsert.nquads.concat(
          childrenUpsertString.nquads
        );

        ecoUpsert.query = ecoUpsert.query.concat(ecoUpsertString.query);
        ecoUpsert.nquads = ecoUpsert.nquads.concat(ecoUpsertString.nquads);
      }

      childrenUpsert = childrenUpsertString;
      ecoUpsert = ecoUpsertString;
    }

    if (childrenUpsert.query && childrenUpsert.nquads !== '') {
      // We call the db to be prepared for transactions
      await this.db.ready();
      // We perform first, the children transaction | TRX #3
      const childrenMutation = new dgraph.Mutation();
      const childrenRequest = new dgraph.Request();

      childrenRequest.setQuery(`query{${childrenUpsert.query}}`);
      childrenMutation.setSetNquads(childrenUpsert.nquads);
      childrenMutation.setDelNquads(childrenUpsert.delNquads);

      childrenRequest.setMutationsList([childrenMutation]);

      console.log('[DGRAPH] updatePerspectives - childrenRequest', {
        childrenUpsert,
      });
      await this.db.callRequest(childrenRequest);

      // Consequently, we perform the ecosystem transaction | TRX #4
      /**
       * We need to perforn TXR #4 after TXR #3, because the ecosystem query will rely
       * on the children of each perspective that already exists inside the database.
       * Think of the ecosystem as the geonological tree of a human.
       */
      const ecoMutation = new dgraph.Mutation();
      const ecoRequest = new dgraph.Request();

      ecoRequest.setQuery(`query{${ecoUpsert.query}}`);
      ecoMutation.setSetNquads(ecoUpsert.nquads);
      ecoMutation.setDelNquads(ecoUpsert.delNquads);

      ecoRequest.setMutationsList([ecoMutation]);

      console.log('[DGRAPH] updatePerspectives - ecoRequest', {
        ecoUpsert,
      });
      const result = await this.db.callRequest(ecoRequest);
      console.log('[DGRAPH] updatePerspectives - result', { result });
    }
  }

  updatePerspectiveUpsert(update: Update, upsert: Upsert) {
    let { query, nquads, delNquads } = upsert;
    const { perspectiveId: id } = update;

    // WARNING: IF THE PERSPECTIVE ENDS UP HAVING TWO HEADS, CHECK DGRAPH DOCS FOR RECENT UPDATES
    // IF NO SOLUTION, THEN BATCH DELETE ALL HEADS BEFORE BATCH UPDATE THEM

    query = query.concat(
      `\npersp${id} as var(func: eq(xid, ${id})) {
          xid
        }`
    );

    // We update the current xid.
    nquads = nquads.concat(`\nuid(persp${id}) <xid> "${id}" .`);

    // If the current perspective we are seeing isn't headless, we proceed to update the ecosystem and its head.
    if (update.details !== undefined) {
      if (update.details.headId !== undefined) {
        const { details } = update;

        const linkChanges = update.indexData?.linkChanges;
        const text = update.indexData?.text;
        const headId = details.headId;
        const addedLinksTo = linkChanges?.linksTo?.added;
        const removedLinksTo = linkChanges?.linksTo?.removed;
        const addedChildren = linkChanges?.children?.added;
        const removedChildren = linkChanges?.children?.removed;

        // We set the head for previous created perspective.
        query = query.concat(
          `\nheadOf${id} as var(func: eq(xid, "${headId}"))`
        );
        nquads = nquads.concat(`\nuid(headOf${id}) <xid> "${headId}" .`);
        nquads = nquads.concat(`\nuid(persp${id}) <head> uid(headOf${id}) .`);

        if (text)
          nquads = nquads.concat(
            `\nuid(persp${id}) <text> "${text
              .toString()
              .replace(/"/g, '\\"')}" .`
          );

        // The linksTo edges are generic links from this perspective to any another perspective.
        // Once created, they can be used by the searchEngine to query the all perspectives that
        // have a linkTo another one.

        // linksTo[] to be added.
        addedLinksTo?.forEach((link, ix) => {
          query = query.concat(
            `\naddedLinkToOf${id}${ix} as var(func: eq(xid, ${link}))`
          );
          // create a stub xid in case the link does not exist locally
          nquads = nquads.concat(
            `\nuid(addedLinkToOf${id}${ix}) <xid> "${link}" .`
          );
          nquads = nquads.concat(
            `\nuid(persp${id}) <linksTo> uid(addedLinkToOf${id}${ix}) .`
          );
        });

        // linksTo[] to be removed.
        removedLinksTo?.forEach((link, ix) => {
          query = query.concat(
            `\nremovedLinksToOf${id}${ix} as var(func: eq(xid, ${link}))`
          );
          delNquads = delNquads?.concat(
            `\nuid(persp${id} ) <linksTo> uid(removedLinksToOf${id}${ix}) .`
          );
        });

        // Children links are a special case of linkTo and a first-class citizen in _Prtcl.
        // When forking and merging perpsectives of an evee, the children links are recursively forked and
        // merged (while linksTo are not). In addition, the children of a perspective build its "ecosystem"
        // (the set of itself, all its children and their children, recursively).
        // The ecosystem can be used by the searchEngine to search "under" a given perspective and it is
        // expected that searchEngine implementations will optimize for these kind of queries.

        // We set the external children for the previous created persvective.
        addedChildren?.forEach((child, ix) => {
          query = query.concat(
            `\naddedChildOf${id}${ix} as var(func: eq(xid, ${child}))`
          );
          nquads = nquads.concat(
            `\nuid(persp${id}) <children> uid(addedChildOf${id}${ix}) .`
          );
        });

        // We remove the possible external children for an existing perspective.
        removedChildren?.forEach((child, ix) => {
          query = query.concat(
            `\nremovedChildOf${id}${ix} as var(func: eq(xid, ${child}))`
          );
          delNquads = delNquads?.concat(
            `\nuid(persp${id}) <children> uid(removedChildOf${id}${ix}) .`
          );
        });
      }
    }

    return { query, nquads, delNquads };
  }

  updateEcosystemUpsert(update: Update, upsert: Upsert) {
    let { query, nquads, delNquads } = upsert;
    const { perspectiveId: id } = update;

    query = query.concat(
      `\npersp${id} as var(func: eq(xid, ${id}))
        @recurse
        {
          revEcosystem${id} as ~children
        }
       \nperspEl${id} as var(func: uid(persp${id}))
        @recurse
        {
          ecosystemOfUref${id} as children
        }`
    );

    nquads = nquads.concat(
      `\nuid(perspEl${id}) <ecosystem> uid(ecosystemOfUref${id}) .
       \nuid(revEcosystem${id}) <ecosystem> uid(ecosystemOfUref${id}) .`
    );

    return { query, nquads, delNquads };
  }

  async createCommits(commits: Secured<Commit>[]): Promise<Entity<any>[]> {
    if (commits.length === 0) return [];
    await this.db.ready();

    let query = ``;
    let nquads = ``;
    let enitites: Entity<any>[] = [];
    const addedUsers: string[] = [];

    for (let securedCommit of commits) {
      const commit = securedCommit.object.payload;
      const proof = securedCommit.object.proof;

      const id = await ipldService.validateSecured(securedCommit);

      /** make sure creatorId exist */
      for (let ix = 0; ix < commit.creatorsIds.length; ix++) {
        const did = commit.creatorsIds[ix];
        if (!addedUsers.includes(did)) {
          addedUsers.push(did);
          const segment = this.userRepo.upsertQueries(did);
          query = query.concat(segment.query);
          nquads = nquads.concat(segment.nquads);
        }
      }

      /** commit object might exist because of parallel update head call */
      query = query.concat(`\ncommit${id} as var(func: eq(xid, ${id}))`);
      query = query.concat(
        `\ndataof${id} as var(func: eq(xid, "${commit.dataId}"))`
      );
      nquads = nquads.concat(`\nuid(dataof${id}) <xid> "${commit.dataId}" .`);

      nquads = nquads.concat(`\nuid(commit${id}) <xid> "${id}" .`);
      nquads = nquads.concat(`\nuid(commit${id}) <stored> "true" .`);
      nquads = nquads.concat(
        `\nuid(commit${id}) <dgraph.type> "${COMMIT_SCHEMA_NAME}" .`
      );
      nquads = nquads.concat(
        `\nuid(commit${id}) <message> "${commit.message}" .`
      );

      for (let creatorDid of commit.creatorsIds) {
        nquads = nquads.concat(
          `\nuid(commit${id}) <creators> uid(profile${this.userRepo.formatDid(
            creatorDid
          )}) .`
        );
      }

      nquads = nquads.concat(
        `\nuid(commit${id}) <timextamp> "${commit.timestamp}"^^<xs:int> .`
      );
      nquads = nquads.concat(`\nuid(commit${id}) <data> uid(dataof${id}) .`);

      nquads = nquads.concat(
        `\nuid(commit${id}) <signature> "${proof.signature}" .`
      );
      nquads = nquads.concat(
        `\nuid(commit${id}) <proof_type> "${proof.type}" .`
      );

      /** get and set the uids of the links */
      for (let ix = 0; ix < commit.parentsIds.length; ix++) {
        query = query.concat(
          `\nparents${id}${ix} as var(func: eq(xid, ${commit.parentsIds[ix]}))`
        );
        nquads = nquads.concat(
          `\nuid(commit${id}) <parents> uid(parents${id}${ix}) .`
        );
        /** set the parent xid in case it was not created */
        nquads = nquads.concat(
          `\nuid(parents${id}${ix}) <xid> "${commit.parentsIds[ix]}" .`
        );
      }

      enitites.push({
        hash: id,
        object: securedCommit.object,
        remote: '',
      });
    }

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] createCommit',
      { query },
      { nquads },
      result.getUidsMap().toArray()
    );

    return enitites;
  }

  async getPerspectiveRelatives(
    perspectiveId: string,
    relatives: 'ecosystem' | 'children'
  ): Promise<Array<string>> {
    await this.db.ready();
    const query = `query {
      perspective(func: eq(xid, ${perspectiveId})) {
        ${relatives} {
          xid
        }
      }
    }`;

    const result = await this.db.client.newTxn().query(query);

    return result.getJson().perspective[0]
      ? result
          .getJson()
          .perspective[0][`${relatives}`].map((persp: any) => persp.xid)
      : [];
  }

  setDeletedUpsert(perspectiveId: string, value: boolean, upsert: Upsert) {
    upsert.query = upsert.query.concat(
      `\nperspective as var(func: eq(xid, "${perspectiveId}"))`
    );

    upsert.nquads = upsert.nquads.concat(
      `\nuid(perspective) <xid> "${perspectiveId}" .`
    );
    upsert.nquads = upsert.nquads.concat(
      `\nuid(perspective) <deleted> "${value ? 'true' : 'false'}" .`
    );
  }

  async setDeletedPerspectives(
    perspectiveIds: string[],
    deleted: boolean
  ): Promise<void> {
    await this.db.ready();

    /**  */

    let upsert: Upsert = {
      query: ``,
      nquads: ``,
    };

    for (let i = 0; i < perspectiveIds.length; i++) {
      this.setDeletedUpsert(perspectiveIds[i], deleted, upsert);
    }

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    req.setQuery(`query{${upsert.query}}`);
    mu.setSetNquads(upsert.nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] deletePerspective',
      { upsert },
      result.getUidsMap().toArray()
    );
  }

  async findPerspectives(context: string): Promise<string[]> {
    await this.db.ready();
    const query = `query {
      perspective(func: eq(stored, "true")) {
        xid
        name
        context @filter(eq(name, "${context}")) {
          name
        }
        authority
        creator {
          did
        }
        timextamp
        nonce
        signature
        type
      }
    }`;

    const result1 = await this.db.client.newTxn().query(query);
    console.log(
      '[DGRAPH] getContextPerspectives',
      { query },
      result1.getJson()
    );
    let perspectives = result1.getJson().perspective.map(
      (dperspective: DgPerspective): Perspective => {
        return {
          remote: dperspective.remote,
          path: dperspective.path,
          creatorId: dperspective.creator.did,
          timestamp: dperspective.timextamp,
          context: dperspective.context.name,
        };
      }
    );

    const result2 = await this.db.client.newTxn().query(query);
    const json = result2.getJson();
    console.log('[DGRAPH] findPerspectives', { query }, json);
    const securedPerspectives = json.perspective.map(
      (dperspective: DgPerspective): string => dperspective.xid
    );

    return securedPerspectives;
  }

  async locatePerspective(
    perspectiveId: string,
    forks: boolean = false,
    loggedUserId: string | null
  ): Promise<ParentAndChild[]> {
    await this.db.ready();
    const userId = loggedUserId !== null ? loggedUserId : '';

    const parentsPortion = `
    {
      xid
      ~children {
        xid
        finDelegatedTo {
          canRead @filter(eq(did, "${userId}")) {
            count(uid)
          }
          publicRead
        }
      }
    }
    `;

    const query = `query {
      perspective(func: eq(xid, "${perspectiveId}")) {
        ${
          forks
            ? `
          context {
            perspectives {
              ${parentsPortion}
            }    
          }`
            : parentsPortion
        }
      }
    }`;

    const result = await this.db.client.newTxn().query(query);
    console.log('[DGRAPH] getContextPerspectives', { query }, result.getJson());

    const data = result.getJson();

    if (data.perspective.length === 0) {
      return [];
    }

    const perspectives: DgPerspective[] = forks
      ? data.perspective[0].context.perspectives
      : data.perspective;

    /** A map to de-duplicate parents entries */
    const parentsAndChildrenMap = new Map<string, ParentAndChild[]>();

    perspectives.forEach((perspective: any) => {
      if (perspective['~children']) {
        perspective['~children'].forEach((parent: any) => {
          const current = parentsAndChildrenMap.get(parent.xid) || [];
          current.push({
            parentId: parent.xid,
            childId: perspective.xid,
          });
          parentsAndChildrenMap.set(parent.xid, current);
        });
      }
    });

    // concatenate all the parents of all perspectives
    return Array.prototype.concat.apply(
      [],
      Array.from(parentsAndChildrenMap.values())
    );
  }

  async getPerspective(
    perspectiveId: string,
    loggedUserId: string | null,
    getPerspectiveOptions: GetPerspectiveOptions = {}
  ): Promise<PerspectiveGetResult> {
    /** getPerspective is about getting the details */
    getPerspectiveOptions.details = true;

    const exploreResult = await this.fetchPerspectives(
      loggedUserId,
      getPerspectiveOptions,
      perspectiveId
    );
    return {
      details: exploreResult.details,
      slice: exploreResult.slice,
    };
  }

  async explorePerspectives(
    searchOptions: SearchOptions,
    loggedUserId: string | null,
    getPerspectiveOptions: GetPerspectiveOptions = {}
  ): Promise<SearchResult> {
    const exploreResult = await this.fetchPerspectives(
      loggedUserId,
      getPerspectiveOptions,
      undefined,
      searchOptions
    );
    return {
      perspectiveIds: exploreResult.perspectiveIds,
      ended: exploreResult.ended ? exploreResult.ended : false,
      slice: exploreResult.slice,
      forksDetails: exploreResult.forksDetails,
    };
  }

  /** A reusable function that can get a perspective or search perspectives while fetching the perspective ecosystem and
  its entities */
  private async fetchPerspectives(
    loggedUserId: string | null,
    getPerspectiveOptions: GetPerspectiveOptions = {},
    perspectiveId?: string,
    searchOptions?: SearchOptions
  ): Promise<FetchResult> {
    let query = ``;
    const { levels, entities, details } = getPerspectiveOptions;

    // Search options
    const start = searchOptions?.start;
    // - LinksTo
    const linksTo = searchOptions?.linksTo;
    // - Text
    const text = searchOptions?.text;

    // - Pagination
    let pagination = searchOptions?.pagination;
    let first = defaultFirst;
    let offset = 0;

    if (searchOptions) {
      // If start, get JoinTree
      if (start) {
        query = query.concat(this.startQuery(start.elements, start.joinType));
      } else {
        query = query.concat(`\ntreeResult as var(func: type(Perspective))`);
      }

      if (linksTo) {
        query = query.concat(
          this.linksToQuery(linksTo.elements, linksTo.joinType)
        );
      } else {
        query = query.concat(`\nlinksResult as var(func: uid(treeResult))`);
      }

      if (text) {
        query = query.concat(this.textSearchQuery(text.value, text.textLevels));
      } else {
        query = query.concat(`\nfiltered as var(func: uid(linksResult))`);
      }

      first = pagination ? pagination.first : defaultFirst;
      offset = pagination ? pagination.offset : 0;

      // Set ACL to search result
      const DgraphACL = `
        private as aclPriv(func: uid(filtered)) @filter(eq(deleted, false)) @cascade {
          finDelegatedTo {
            canRead @filter(eq(did, "${loggedUserId}"))
          }
        }
        public as aclPub(func: uid(filtered)) @filter(eq(deleted, false)) @cascade {
          finDelegatedTo @filter(eq(publicRead, true))
        }
        `;

      query = query.concat(DgraphACL);
    } else {
      query = query.concat(`filtered as var(func: eq(xid, ${perspectiveId}))`);
    }

    /**
     * Order by subnode has been clarified here:
     * https://discuss.dgraph.io/t/sort-query-results-by-any-edge-property/12989
     */

    /** The query uses ecosystem if levels === -1 and get the head and data json objects if entities === true */
    let elementQuery = `
      xid
      stored
      jsonString
      deleted
      finDelegatedTo {
        canWrite @filter(eq(did, "${loggedUserId}")) {
          count(uid)
        }
        canRead @filter(eq(did, "${loggedUserId}")) {
          count(uid)
        }
        publicWrite
        publicRead
      }
    `;

    if (details) {
      elementQuery = elementQuery.concat(
        `\nhead {
          xid
          data {
            xid
            ${entities ? `jsonString` : ''}
          }
          ${entities ? `jsonString` : ''}
        }
        delegate
        delegateTo {
          xid
        }`
      );
    }

    query = query.concat(`
      \nelements as var(func: uid(filtered)) {
        head {
          date as timextamp
        }
        datetemp as max(val(date))
      }
    `);

    if (levels !== undefined && levels > 0) {
      query = query.concat(
        `\ntopElements as var(func: uid(elements), orderdesc: val(datetemp)
            ${searchOptions ? `,first: ${first}, offset: ${offset}` : ''})
            ${
              searchOptions ? `@filter(uid(private) OR uid(public))` : ''
            } @recurse(depth: ${levels}) {
              recurseIds as children
            }

        perspectives(func: uid(topElements)) {
          ${elementQuery}
        }
        recurseChildren(func: uid(recurseIds)) {
          ${elementQuery}
        }`
      );
    } else {
      query = query.concat(
        `\nperspectives(func: uid(elements), orderdesc: val(datetemp)
          ${searchOptions ? `,first: ${first}, offset: ${offset}` : ''})
          ${searchOptions ? `@filter(uid(private) OR uid(public))` : ''} {
            ${
              levels === -1
                ? `xid ecosystem {${elementQuery}}`
                : `${elementQuery}`
            }
          }`
      );
    }

    let dbResult = await this.db.client.newTxn().query(`query{${query}}`);
    let json = dbResult.getJson();

    const perspectives = json.perspectives;
    // initalize the returned result with empty values
    let result: FetchResult = {
      details: {},
      perspectiveIds: [],
      slice: {
        perspectives: [],
        entities: [],
      },
      forksDetails: [],
    };

    if (first && perspectives.length < first) {
      result.ended = true;
    }

    // then loop over the dgraph results and fill the function output result
    perspectives.forEach((persp: any) => {
      let all = [];
      if (levels !== undefined && levels > 0) {
        all = [persp].concat(json.recurseChildren);
      } else {
        all = levels !== undefined && levels > -1 ? [persp] : persp.ecosystem;
      }

      result.perspectiveIds.push(persp.xid);

      all.forEach((element: any) => {
        if (element) {
          /** check access control, if user can't read, simply return undefined head  */

          const canRead = !element.finDelegatedTo.publicRead
            ? element.finDelegatedTo.canRead
              ? element.finDelegatedTo.canRead[0].count > 0
              : false
            : true;

          if (details) {
            const elementDetails = {
              headId:
                canRead && !element.deleted ? element.head.xid : undefined,
              guardianId: element.delegate ? element.delegateTo.xid : undefined,
              canUpdate: !element.finDelegatedTo.publicWrite
                ? element.finDelegatedTo.canWrite
                  ? element.finDelegatedTo.canWrite[0].count > 0
                  : false
                : true,
            };

            if (element.xid === perspectiveId) {
              result.details = elementDetails;
            } else {
              result.slice.perspectives.push({
                id: element.xid,
                details: elementDetails,
              });
            }
          }

          if (entities) {
            const commit = {
              hash: element.head.xid,
              object: decodeData(element.head.jsonString),
              remote: '',
            };

            const data: Entity<any> = {
              hash: element.head.data.xid,
              object: decodeData(element.head.data.jsonString),
              remote: '',
            };

            result.slice.entities.push(commit, data);

            if (element.xid !== perspectiveId) {
              // add the perspective entity only if a subperspective
              const perspective = {
                hash: element.xid,
                object: decodeData(element.jsonString),
                remote: '',
              };
              result.slice.entities.push(perspective);
            }
          }
        }
      });
    });

    // We avoid duplicated results
    result.perspectiveIds = Array.from(new Set(result.perspectiveIds));
    result.slice.perspectives = Array.from(new Set(result.slice.perspectives));
    result.slice.entities = Array.from(new Set(result.slice.entities));

    start?.elements.map((el) => {
      if (el.forks) {
        result.forksDetails!.push({
          forkIds: json[`forksResult${el.id}`].map((fork: any) => fork.forkId),
          ofPerspectiveId: el.id,
        });
      }
    });
    return result;
  }

  async explore(
    searchOptions: SearchOptions,
    getPerspectiveOptions: GetPerspectiveOptions = {
      levels: 0,
      details: false,
      entities: false,
    },
    loggedUserId: string | null
  ): Promise<SearchResult> {
    return await this.explorePerspectives(
      searchOptions,
      loggedUserId,
      getPerspectiveOptions
    );
  }

  private linksToQuery(elements: string[], type?: Join): string {
    let query = ``;
    if (type === Join.full || !type) {
      return `
        linksResult as var(func: uid(treeResult)) @cascade {
          linksTo @filter(eq(xid, ${elements}))
        }
      `;
    } else if (type === Join.inner) {
      for (let i = 0; i < elements.length; i++) {
        query = query.concat(`
        \nvar(func: eq(xid, ${elements[i]})) {
          perspectives${i} as ~linksTo 
          ${i > 0 ? `@filter(uid(perspectives${i - 1}))` : ''}
        }`);
      }

      query.concat(`
        linkResult as var(func: uid(perspectives${elements.length - 1}))
        @filter(uid(treeResult))
      `);
    }
    return query;
  }

  private textSearchQuery(value: string, levels?: number): string {
    if ((levels !== undefined && levels > 0) || levels === -1) {
      // We return the depth of the perspective found.
      return `
        search(func: uid(linksResult))
        ${
          levels > 0
            ? `@recurse(depth: ${levels}) {
            filtered as children  @filter(anyoftext(text, "${value}")) 
          }`
            : `{
            filtered as ecosystem  @filter(anyoftext(text, "${value}")) 
          }`
        }
      `;
    } else {
      return `filtered as var(func: uid(linksResult)) @filter(anyoftext(text, "${value}"))`;
    }
  }

  private startQuery(elements: JoinTree[], type?: Join): string {
    let query = ``;
    let ids: string[] = [];

    // Retreive the JoinTree and collect Ids
    for (let i = 0; i < elements.length; i++) {
      query = query.concat(this.retrieveJoinTree(elements[i]));

      ids.push(elements[i].id);
    }

    if (type === Join.full || !type) {
      query = query.concat(`
        treeResult as var(func: type(Perspective)) @filter(uid(element${ids[0]}
      `);
      for (let i = 1; i < ids.length; i++) {
        query = query.concat(`, element${ids[i]}`);
      }
      query = query.concat(`))`);
    } else if (type === Join.inner) {
      query = query.concat(`
        eco0 as var(func: type(Perspective)) @filter(uid(element${ids[0]}))
      `);
      for (let i = 1; i < ids.length; i++) {
        query = query.concat(`
          eco${i} as var(func: uid(eco${i - 1})) @filter(uid(element${ids[i]}))
        `);
      }

      query = query.concat(
        `\ntreeResult as var(func:uid(eco${ids.length - 1}))`
      );
    }

    return query;
  }

  private retrieveJoinTree(element: JoinTree): string {
    const forks = element.forks;
    const under =
      element.direction === undefined || element.direction === 'under';
    const levels = element.levels;
    const id = element.id;
    let query = ``;

    if (levels === 0) {
      // Define ecoPersp as empty for Dgraph purposes
      query = `
        topElement${id} as var(func: eq(xid, ${id}))
        ecoPersps${id} as var(func: has(undefined))
      `;
    } else {
      query = `\ntopElement${id} as var(func: eq(xid, ${id}))
      ${
        levels !== undefined && levels > 0
          ? `@recurse (depth: ${levels}) {
            ecoPersps${id} as ${under ? `children` : `~children`}
          }`
          : `{
            ecoPersps${id} as ${under ? `ecosystem` : `~ecosystem`}
          }`
      }`;
    }
    // Consequently, we check for forks regarding the given element.
    if (forks) {
      query = query.concat(
        this.getForksUpsert(id, forks.independent, forks.independentOf, levels)
      );
    } else {
      /**
       * We define @forksOf as empty in order to be used as a placeholder.
       */
      query = query.concat(`\nforksOf${id} as var(func: has(undefined))`);
    }

    query = query.concat(`\nelement${id} as var(func:uid(
      ${
        !forks || !forks.exclusive
          ? `topElement${id}, ecoPersps${id}, forksOf${id}`
          : `forksOf${id}`
      }))`);

    return query;
  }

  private getForksUpsert(
    perspectiveId: string,
    independent?: boolean,
    independentOf?: string,
    levels?: number
  ): string {
    let query = ``;
    independent = independent === undefined ? true : independent;

    // We set a provisional use in case of no further use.
    query = query.concat(`
      context${perspectiveId}(func: uid(topElement${perspectiveId})) {
        officialTopContext${perspectiveId} as context
      }
      provisionalUse${perspectiveId}(func:uid(officialTopContext${perspectiveId})) {
        name
      }
    `);

    if (independentOf) {
      query = query.concat(`
        indOf${perspectiveId}(func:eq(xid, ${independentOf})) {
          independentOfContext${perspectiveId} as context
        }

        normalOf${perspectiveId}(func: uid(officialTopContext${perspectiveId})) {
          normalIndependentOf${perspectiveId} as ~context @filter(
            not(uid(topElement${perspectiveId}))
          ) @cascade {
            ~children {
              context @filter(not(uid(independentOfContext${perspectiveId})))
            }
          }
        }

        orphantOf${perspectiveId}(func: uid(officialTopContext${perspectiveId})) {
          orphanIndependentOf${perspectiveId} as ~context @filter(
            not(uid(topElement${perspectiveId}))
            AND
            eq(count(~children), 0)
          )
        }

        independentOf${perspectiveId} as var(func: uid(normalIndependentOf${perspectiveId}, orphanIndependentOf${perspectiveId})) {
          xid
        }
      `);
    } else {
      query = query.concat(
        `independentOf${perspectiveId} as var(func: uid(0x01))`
      );
    }

    // eveeContext = ecoContext (same meaning)
    if (levels === 0) {
      query = query.concat(`
        independent${perspectiveId} as var(func: uid(0x01))
        eveeContext${perspectiveId}(func: uid(officialTopContext${perspectiveId})) {
          allForks${perspectiveId} as ~context @filter(not(uid(topElement${perspectiveId}))) {
            xid
          }
        }
      `);
    } else {
      if (independent) {
        query = query.concat(`
          forks${perspectiveId}(func: uid(ecoPersps${perspectiveId})) 
          @filter(not(uid(topElement${perspectiveId}))) {
            officialEcoContext${perspectiveId} as context
            ~children {
              parentEcoContext${perspectiveId} as context
            }
          }
          allForks${perspectiveId} as var(func:uid(0x01))
          normalInd${perspectiveId}(func: uid(officialEcoContext${perspectiveId})) {
            normalIndependent${perspectiveId} as ~context @filter(
              not(
                uid(topElement${perspectiveId}, ecoPersps${perspectiveId})
              )
            ) @cascade {
              ~children {
                context @filter(not(uid(parentEcoContext${perspectiveId})))
              }
            }
          }

          orphInd${perspectiveId}(func: uid(officialEcoContext${perspectiveId})) {
            orphanIndependent${perspectiveId} as ~context @filter(
              not(
                uid(topElement${perspectiveId})
                AND
                uid(ecoPersps${perspectiveId})
              )
              AND
              eq(count(~children), 0)
            )
          }

          independent${perspectiveId} as var(func: uid(normalIndependent${perspectiveId}, orphanIndependent${perspectiveId})) {
            xid
          }
        `);
      } else {
        /**
         * We set an empty placeholder for unsused @parentEcoContext variable.
         * We define @independent as empty in order to be used as a placeholder.
         */
        query = query.concat(`
          forks${perspectiveId}(func: uid(ecoPersps${perspectiveId})) {
            officialEcoContext${perspectiveId} as context
            ~children {
              parentEcoContext${perspectiveId} as context
            }
          }
          emptyPlaceHolder${perspectiveId}(func: uid(parentEcoContext${perspectiveId}))
           independent${perspectiveId} as var(func: uid(0x01))
           eveeContext${perspectiveId}(func: uid(officialEcoContext${perspectiveId}, officialTopContext${perspectiveId})) {
              allForks${perspectiveId} as ~context @filter(not(uid(topElement${perspectiveId}, ecoPersps${perspectiveId}))) {
                xid
              }
            }`);
      }
    }

    // We join every fork result
    query = query.concat(`
      forksOf${perspectiveId} as var(func: uid(independentOf${perspectiveId}, independent${perspectiveId}, allForks${perspectiveId}))
      forksResult${perspectiveId}(func: uid(forksOf${perspectiveId})) {
        forkId: xid
      }
    `);
    return query;
  }
}
