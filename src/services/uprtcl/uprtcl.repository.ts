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
  SearchOptionsJoin,
  SearchOptionsEcoJoin,
  SearchResult,
} from '@uprtcl/evees';
import { DGraphService } from '../../db/dgraph.service';
import { UserRepository } from '../user/user.repository';
import { DataRepository } from '../data/data.repository';
import { Upsert } from './types';
import { PERSPECTIVE_SCHEMA_NAME, COMMIT_SCHEMA_NAME } from './uprtcl.schema';
import { ipldService } from '../ipld/ipldService';
import { decodeData } from '../data/utils';

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
      id,
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
    let perspectiveIds = newPerspectives.map((p) => p.perspective.id);

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
        externalPerspective.perspective.id,
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
        id,
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

  getOtherIndpPerspectivesUpsert(
    perspectiveId: string[],
    ecosystem: boolean,
    loggedUserId?: string
  ) {
    // TODO: Check permissions to properly return a response.
    let query = ``;

    if (ecosystem) {
      // If independent perspectives from an ecosystem are needed
      query = `
        persp(func: eq(xid, ${perspectiveId})) {
          eco as ecosystem
        }
      `;

      // Look for independent perspectives for every element of an ecosystem, in this case
      // the perspective ecosystem
      query = query.concat(`\nperspectiveRef as var(func: uid(eco)) {
        context {
          targetCon as uid
        }
        ~children {
          context {
            parentContext as uid
          }
        }
      }`);
    } else {
      // Otherwise, only look for independent perspective for the indicated persp.
      query = `perspectiveRef as var(func: eq(xid, ${perspectiveId})) { 
        context {
          targetCon as uid
        }
        parents: ~children {
          context {
            parentContext as uid
          }
        }
      }`;
    }

    // Verify indepent perspectives criteria with parents
    query = query.concat(`\nnormalRef(func: uid(targetCon)) {
       normalPersps as ~context @filter(
         not(uid(perspectiveRef))
        ) @cascade {
          ~children {
            context @filter(not(uid(parentContext)))
          }
        }
    }`);

    // Verify indepent perspectives criteria without parents
    query = query.concat(`\norphanRef(func: uid(targetCon)) {
      orphanPersps as ~context @filter(
        not(uid(perspectiveRef))
        AND
        eq(count(~children), 0)
       )
   }`);

    // Add access control layer before delivering perspectives

    // Collect result first
    query = query.concat(
      `\nindPersp as var(func: uid(normalPersps, orphanPersps))`
    );

    if (loggedUserId) {
      query = query.concat(
        `\npublicAccess as var(func: uid(indPersp)) @filter(eq(publicRead, true))`
      );
      query = query.concat(`\npublicRead(func: uid(publicAccess)) {
        xid
      }`);
      // If loggedUserId is provided, return accessible perspectives
      // to this user as well.
      query = query.concat(`\nuserRead(func: uid(indPersp)) @filter(not(uid(publicAccess))) @cascade {
        xid
        canRead @filter(eq(did, "${loggedUserId}"))
      }`);
    } else {
      // Return only those perspectives publicly accessible.
      query = query.concat(`\npublicRead(func: uid(indPersp)) @filter(eq(publicRead, true)) {
        xid
      }`);
    }
    return query;
  }

  async getOtherIndpPerspectives(
    perspectiveId: string,
    ecosystem: boolean,
    loggedUserId: string
  ): Promise<Array<string>> {
    const query = this.getOtherIndpPerspectivesUpsert(
      [perspectiveId],
      ecosystem,
      loggedUserId
    );

    await this.db.ready();

    let result = (
      await this.db.client.newTxn().query(`query{${query}}`)
    ).getJson();

    let publicRead = [];
    let userRead = [];

    if (result.userRead) {
      userRead = result.userRead.map((persp: any) => {
        return persp.xid;
      });
    }

    if (result.publicRead) {
      publicRead = result.publicRead.map((persp: any) => {
        return persp.xid;
      });
    }

    return [].concat(...userRead).concat([].concat(...publicRead));
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

    if (searchOptions && searchOptions.forks) {
      if (!searchOptions.under || searchOptions.linksTo) {
        throw new Error(
          'forks currently support a single mandatory "under" property'
        );
      }
    }

    if (!details && entities) {
      throw new Error('Entities can not be provided without details...');
    }

    /** -------------------------------------------------------------------------
     * TEMPORARY PATCH TO GET INDEPENDENT PERSPECTIVES WHEN FORKS IS PROVIDED
     * -------------------------------------------------------------------------- */
    // if (searchOptions && searchOptions.forks) {
    //   if (!searchOptions.under) {
    //     throw new Error(
    //       'forks currently support a single mandatory "under" property'
    //     );
    //   }

    //   if (loggedUserId == null) {
    //     throw new Error('forks currently supports for logged user');
    //   }

    //   const ecosystem =
    //     searchOptions.under.levels === undefined
    //       ? true
    //       : searchOptions.under.levels === -1;

    //   // TODO: Combine the search for independent forks with this search query ! :)
    //   const perspectiveIds = await this.getOtherIndpPerspectives(
    //     searchOptions.under.elements[0].id,
    //     ecosystem,
    //     loggedUserId
    //   );

    //   return {
    //     perspectiveIds,
    //     details: {},
    //     slice: {
    //       entities: [],
    //       perspectives: [],
    //     },
    //   };
    // }

    /**
     * We build the function depending on how the method is implemented.
     * For searching or for grabbing an specific perspective.
     */

    let startQuery = '';
    let internalWrapper = '';
    let optionalWrapper = '';

    if (searchOptions) {
      const searchText = searchOptions.text ? searchOptions.text.value : '';

      const textLevels = searchOptions.text
        ? searchOptions.text.levels
          ? searchOptions.text.levels
          : 0
        : 0;

      const above = searchOptions.above
        ? searchOptions.above
        : {
            elements: [],
            type: Join.inner,
          };

      /** optional type, full by default */
      if (!above.type) above.type = Join.full;

      const under = searchOptions.under
        ? searchOptions.under
        : {
            elements: [],
            type: Join.inner,
          };

      /** optional type, full by default */
      if (!under.type) under.type = Join.full;

      const linksTo = searchOptions.linksTo
        ? searchOptions.linksTo
        : {
            elements: [],
            type: Join.inner,
          };

      /** optional type, full by default */
      if (!linksTo.type) linksTo.type = Join.full;

      enum StartCase {
        all = 'all',
        above = 'above',
        under = 'under',
        linksTo = 'linksTo',
        searchText = 'searchText',
      }

      const aboveCase = above.elements && above.elements.length > 0;
      const underCase = under.elements && under.elements.length > 0;
      const linksToCase = linksTo.elements && linksTo.elements.length > 0;

      if (underCase && aboveCase) {
        throw new Error(
          `Search can only look whether under or above a given perspective`
        );
      }

      const start: StartCase = underCase
        ? StartCase.under
        : aboveCase
        ? StartCase.above
        : linksToCase
        ? StartCase.linksTo
        : searchText !== ''
        ? StartCase.searchText
        : StartCase.all;

      const text: Text = {
        value: searchText,
        levels: textLevels,
      };

      switch (start) {
        case StartCase.all:
          startQuery = `filtered as search(func: eq(dgraph.type, "Perspective"))`;
          break;

        case StartCase.above:
          const ecoSearchA = this.ecosystemSearchUpsert(
            above,
            linksTo,
            SearchType.above,
            searchOptions.forks ? true : false,
            text,
            {
              startQuery,
              internalWrapper,
              optionalWrapper,
            },
            loggedUserId
          );

          startQuery = ecoSearchA.startQuery;

          internalWrapper = ecoSearchA.internalWrapper;

          optionalWrapper = ecoSearchA.optionalWrapper;

          break;

        case StartCase.searchText:
          startQuery = `filtered as search(func: anyoftext(text, "${searchText}"))`;
          break;

        case StartCase.under:
          const ecoSearch = this.ecosystemSearchUpsert(
            under,
            linksTo,
            SearchType.under,
            searchOptions.forks ? true : false,
            text,
            {
              startQuery,
              internalWrapper,
              optionalWrapper,
            },
            loggedUserId
          );

          startQuery = ecoSearch.startQuery;

          internalWrapper = ecoSearch.internalWrapper;

          optionalWrapper = ecoSearch.optionalWrapper;

          break;

        case StartCase.linksTo:
          const linksToIds = linksTo.elements.map((el) => el.id);
          // We first define the starting query according to each type
          if (linksTo.type === Join.full) {
            startQuery = `filtered as search(func: eq(dgraph.type, "Perspective")) @cascade`;
            internalWrapper = `linksTo @filter(eq(xid, ${linksToIds}))`;

            if (searchText !== '') {
              if (textLevels === -1) {
                // We move the filtered variable to the internal wrapper instead.
                startQuery = startQuery.replace('filtered as', '');
                internalWrapper = internalWrapper.concat(
                  `@cascade {
                    ~linksTo  @filter(anyoftext(text, "${searchText}")) {
                      filtered as ecosystem
                    }
                  }`
                );
              } else {
                // We move the filtered variable to the internal wrapper instead.
                startQuery = startQuery.replace('filtered as', '');
                internalWrapper = internalWrapper.concat(
                  `@cascade {
                      filtered as ~linksTo @filter(anyoftext(text, "${searchText}"))
                    }`
                );
              }
            }
          } else if (linksTo.type === Join.inner) {
            for (let i = 0; i < linksTo.elements.length; i++) {
              startQuery = startQuery.concat(
                `\nvar(func: eq(xid, ${linksToIds[i]})) {
                  perspectives${i} as ~linksTo ${
                  i > 0 ? `@filter(uid(perspectives${i - 1}))` : ''
                }
                }`
              );
            }

            // We leave the filter open for more options
            startQuery = startQuery.concat(
              `\nfiltered as search(func: uid(perspectives${
                linksToIds.length - 1
              })) @filter(type(Perspective)`
            );

            if (searchText !== '') {
              if (textLevels === -1) {
                startQuery = startQuery.replace('filtered as', '');
                startQuery = startQuery.concat(
                  ` AND anyoftext(text, "${searchText}")) {
                    filtered as ecosystem 
                  }`
                );
              } else {
                startQuery = startQuery.concat(
                  `AND anyoftext(text, "${searchText}"))`
                );
              }
            } else {
              // We close the filter if no more options are needed.
              startQuery = startQuery.concat(')');
            }
          } else {
            throw new Error(
              'LinksTo operation type must be specified. INNER_JOIN or FULL_JOIN'
            );
          }
          break;
      }
    } else {
      startQuery = `filtered as search(func: eq(xid, ${perspectiveId}))`;
    }

    query = query.concat(`
      ${startQuery} ${
      internalWrapper !== ''
        ? `{
          ${internalWrapper}
        }`
        : ''
    }
      ${optionalWrapper}`);

    if (searchOptions) {
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
    }

    // Initializes pagination parameters
    const { first, offset } = {
      first:
        searchOptions && searchOptions.pagination
          ? searchOptions.pagination.first
          : defaultFirst,
      offset:
        searchOptions && searchOptions.pagination
          ? searchOptions.pagination.offset
          : 0,
    };

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

    if (levels && levels > 0) {
      query = query.concat(
        `\ntopElements as var(func: uid(elements), orderdesc: val(datetemp) 
                      ${
                        searchOptions
                          ? `,first: ${first}, offset: ${offset}`
                          : ''
                      })
                      ${
                        searchOptions
                          ? `@filter(uid(private) OR uid(public))`
                          : ''
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
    };

    if (first && perspectives.length < first) {
      result.ended = true;
    }

    // then loop over the dgraph results and fill the function output result
    perspectives.forEach((persp: any) => {
      let all = [];
      if (levels && levels > 0) {
        all = [persp].concat(json.recurseChildren);
      } else {
        all = levels === -1 ? persp.ecosystem : [persp];
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
              id: element.head.xid,
              object: decodeData(element.head.jsonString),
              remote: '',
            };

            const data: Entity<any> = {
              id: element.head.data.xid,
              object: decodeData(element.head.data.jsonString),
              remote: '',
            };

            result.slice.entities.push(commit, data);

            if (element.xid !== perspectiveId) {
              // add the perspective entity only if a subperspective
              const perspective = {
                id: element.xid,
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

  private ecosystemSearchUpsert(
    searchEcoOption: SearchOptionsEcoJoin,
    linksTo: SearchOptionsJoin,
    searchType: SearchType.above | SearchType.under,
    forks: boolean,
    searchText: Text,
    searchUpsert: SearchUpsert,
    loggedUserId: string | null
  ): SearchUpsert {
    const ids = searchEcoOption.elements.map((el) => el.id);
    let { startQuery, internalWrapper, optionalWrapper } = searchUpsert;

    if (searchEcoOption.type === Join.full) {
      startQuery = `search(func: eq(xid, ${ids})) @cascade`;
    } else if (searchEcoOption.type === Join.inner) {
      for (let i = 0; i < ids.length; i++) {
        startQuery = startQuery.concat(
          `\nvar(func: eq(xid, ${ids[i]})) {
            eco${i} as ecosystem ${i > 0 ? `@filter(uid(eco${i - 1}))` : ''}
          }`
        );
      }
      startQuery = startQuery.concat(
        `\nsearch(func: uid(eco${ids.length - 1})) @filter(type(Perspective))`
      );
    } else {
      throw new Error(
        'Ecosystem operation type must be specified. INNER_JOIN or FULL_JOIN'
      );
    }

    if (linksTo.elements && linksTo.elements.length > 0) {
      // under and linksTo
      const linksToIds = linksTo.elements.map((el) => el.id);
      if (linksTo.type === Join.full) {
        internalWrapper = `linkingTo as ecosystem {
          linksTo @filter(eq(xid, ${linksToIds}))
        }`;
      } else if (linksTo.type === Join.inner) {
        internalWrapper = `link0 as ecosystem`;

        for (let i = 0; i < linksToIds.length; i++) {
          optionalWrapper = optionalWrapper.concat(
            `\nvar(func: eq(xid, ${linksToIds[i]})) {
              link${i + 1} as ~linksTo @filter(uid(link${i}))
            }`
          );
        }
        optionalWrapper = optionalWrapper.concat(
          `linkingTo as var(func: uid(link${linksToIds.length})) @filter(type(Perspective))`
        );
      } else {
        throw new Error(
          'LinksTo operation type must be specified. INNER_JOIN or FULL_JOIN'
        );
      }

      if (searchText.value !== '') {
        // under and linksTo and textSearch
        if (searchText.levels === -1) {
          // in ecosystem of each linkTo matched
          // WARNING THIS IS SAMPLE CODE. How can it be fixed without changing its logic/spirit?
          optionalWrapper = optionalWrapper.concat(`
            \noptionalWrapper(func: uid(linkingTo)) @filter(anyoftext(text, "${searchText.value}")) {
              filtered as ecosystem
            }`);
        } else {
          optionalWrapper = optionalWrapper.concat(
            `\nfiltered as var(func: uid(linkingTo)) @filter(anyoftext(text, "${searchText.value}"))`
          );
        }
      } else {
        // only under and linksTo
        internalWrapper = internalWrapper.replace('linkingTo', 'filtered');
        optionalWrapper = optionalWrapper.replace('linkingTo', 'filtered');
      }
      // Under and search
    } else if (searchText.value !== '') {
      if (searchText.levels === -1) {
        internalWrapper = `
          ecosystem @filter(anyoftext(text, "${searchText.value}")) {
            filtered as ecosystem
          }
        `;
      } else {
        internalWrapper = `
          filtered as ecosystem @filter(anyoftext(text, "${searchText.value}"))
        `;
      }
    } else if (forks) {
      // if only under or above and fork
      let independentUpsert = this.getOtherIndpPerspectivesUpsert(
        ids,
        true,
        loggedUserId !== null ? loggedUserId : undefined
      );

      if (searchEcoOption.levels === 0) {
        independentUpsert = independentUpsert.replace('persp', 'persp as var');
        independentUpsert = independentUpsert.replace(
          'eco as ecosystem',
          'eco as children'
        );
        independentUpsert = independentUpsert.replace(
          'uid(eco)',
          'uid(persp, eco)'
        );
      }

      if (loggedUserId !== null) {
        independentUpsert = independentUpsert.replace(
          'publicRead(',
          'publicRead as var ('
        );
        independentUpsert = independentUpsert.replace(
          'userRead(',
          'userRead as var ('
        );
        optionalWrapper = optionalWrapper.concat(independentUpsert);
        optionalWrapper = optionalWrapper.concat(
          `\nfiltered as var(func: uid(publicRead, userRead))`
        );
      } else {
        independentUpsert = independentUpsert.replace(
          'publicRead(',
          'publicRead as var ('
        );
        optionalWrapper = optionalWrapper.concat(independentUpsert);
        optionalWrapper = optionalWrapper.concat(
          `\nfiltered as var(func: uid(publicRead))`
        );
      }
    } else {
      internalWrapper = 'filtered as ecosystem';
    }

    if (searchType === SearchType.above) {
      startQuery = startQuery.replace('ecosystem', '~ecosystem');
      internalWrapper = internalWrapper.replace('ecosystem', '~ecosystem');
      optionalWrapper = optionalWrapper.replace('ecosystem', '~ecosystem');
    }

    return {
      startQuery,
      internalWrapper,
      optionalWrapper,
    };
  }
}
