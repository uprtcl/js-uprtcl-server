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
} from '@uprtcl/evees';
import { DGraphService } from '../../db/dgraph.service';
import { UserRepository } from '../user/user.repository';
import { DataRepository } from '../data/data.repository';
import { Upsert } from './types';
import { PERSPECTIVE_SCHEMA_NAME, COMMIT_SCHEMA_NAME } from './uprtcl.schema';
import { ipldService } from '../ipld/ipldService';
import { decodeData } from '../data/utils';

const dgraph = require('dgraph-js');

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

const COMMIT_PROPERTIES = `
message
creators {
  did
}
parents {
  xid
}
timextamp
stored
signature
type
`;

const assembleCommit = (dcommit: DgCommit): Secured<Commit> => {
  const commit: Commit = {
    creatorsIds: dcommit.creators
      ? dcommit.creators.map((creator: any) => creator.did)
      : [],
    dataId: dcommit.data.xid,
    timestamp: dcommit.timextamp,
    message: dcommit.message,
    parentsIds: dcommit.parents
      ? dcommit.parents.map((parent) => parent.xid)
      : [],
  };

  return {
    id: dcommit.xid,
    object: {
      payload: commit,
      proof: {
        signature: dcommit.signature,
        type: dcommit.proof_type,
      },
    },
  };
};

const assemblePerspective = (dperspective: DgPerspective) => {
  if (!dperspective) throw new Error(`Perspective not found`);
  if (!dperspective.stored)
    throw new Error(`Perspective with id ${dperspective.xid} not stored`);
  if (dperspective.deleted)
    throw new Error(`Perspective with id ${dperspective.xid} deleted`);

  const perspective: Perspective = {
    remote: dperspective.remote,
    path: dperspective.path,
    creatorId: dperspective.creator.did,
    timestamp: dperspective.timextamp,
    context: dperspective.context.name,
  };

  const securedPerspective: Secured<Perspective> = {
    id: dperspective.xid,
    object: {
      payload: perspective,
      proof: {
        signature: dperspective.signature,
        type: dperspective.proof_type,
      },
    },
  };
  return securedPerspective;
};

export interface FetchResult {
  perspectiveIds: string[];
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

    const did = this.userRepo.formatDid(creatorId);

    query = query.concat(`\npersp${id} as var(func: eq(xid, "${id}"))`);
    query = query.concat(
      `\ncontextOf${id} as var(func: eq(name, "${context}"))`
    );

    nquads = nquads.concat(`\nuid(persp${id}) <xid> "${id}" .`);
    nquads = nquads.concat(`\nuid(persp${id}) <stored> "true" .`);
    nquads = nquads.concat(`\nuid(persp${id}) <creator> uid(profile${did}) .`);
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
       \nuid(persp${id}) <canRead> uid(profile${did}) .
       \nuid(persp${id}) <canWrite> uid(profile${did}) .
       \nuid(persp${id}) <canAdmin> uid(profile${did}) .`
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

      await this.db.callRequest(childrenRequest);

      // Secondly, we perform the ecosystem transaction | TRX #4
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

      await this.db.callRequest(ecoRequest);
    }
  }

  updatePerspectiveUpsert(update: Update, upsert: Upsert) {
    let { query, nquads, delNquads } = upsert;
    const { perspectiveId: id } = update;

    // WARNING: IF THE PERSPECTIVE ENDS UP HAVING TWO HEADS, CHECK DGRAPH DOCS FOR RECENT UPDATES
    // IF NO SOLUTION, THEN BATCH DELETE ALL HEADS BEFORE BATCH UPDATE THEM

    // We update the current xid.
    query = query.concat(`\npersp${id} as var(func: eq(xid, "${id}"))`);
    nquads = nquads.concat(`\nuid(persp${id}) <xid> "${id}" .`);

    // If the current perspective we are seeing isn't headless, we proceed to update the ecosystem and its head.
    if (update.details !== undefined) {
      if (update.details.headId !== undefined) {
        const { details, linkChanges, text } = update;

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
        nquads = nquads.concat(`\nuid(persp${id} ) <head> uid(headOf${id}) .`);

        if (text)
          nquads = nquads.concat(`\nuid(persp${id}) <text> "${text}" .`);

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
            `\nuid(persp${id} ) <children> uid(addedChildOf${id}${ix}) .`
          );
        });

        // We remove the possible external children for an existing perspective.
        removedChildren?.forEach((child, ix) => {
          query = query.concat(
            `\nremovedChildOf${id}${ix} as var(func: eq(xid, ${child}))`
          );
          delNquads = delNquads?.concat(
            `\nuid(persp${id} ) <children> uid(removedChildOf${id}${ix}) .`
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
      `\npersp${id}(func: eq(xid, ${id})) 
       @recurse
       {
         revEcosystem${id} as ~children
       }
       \nperspEl${id} as var(func: eq(xid, ${id}))
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

      const id =
        securedCommit.id !== ''
          ? securedCommit.id
          : await ipldService.validateSecured(securedCommit);

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

  async getOtherIndpPerspectives(
    perspectiveId: string,
    ecosystem: boolean,
    loggedUserId: string
  ): Promise<Array<string>> {
    // TODO: Update based on context being a Node and not a string
    await this.db.ready();

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
      query = query.concat(`\nrefPersp(func: uid(eco)) {
        targetCon as context
        parents: ~children {
          refParent as context
        }
      }`);
    } else {
      // Otherwise, only look for independent perspective for the indicated persp.
      query = `refPersp(func: eq(xid, ${perspectiveId})) { 
        targetCon as context
        parents: ~children {
          refParent as context
        }
      }`;
    }

    // Verify permissions on the perspectives found
    query = query.concat(`\niPublicRead as var(func: eq(context, val(targetCon)))
    @cascade {
      xid
      accessConfig {
        permissions @filter(eq(publicRead, true)) {
          publicRead
        }
      }
    }`);

    query = query.concat(`\n iCanRead as var(func: eq(context, val(targetCon)))
    @cascade {
      xid
      accessConfig {
        permissions {
          canRead @filter(eq(did, "${loggedUserId.toLowerCase()}")) {
            did
          }
        }
      }
    }`);

    // Verify indepent perspectives criteria with orphan perspective as reference.
    query = query.concat(`\norphanRef(func: eq(context, val(targetCon))) 
    @filter(gt(count(~children), 0) AND (uid(iPublicRead) OR uid(iCanRead)) AND not(val(refParent)))
    @cascade {
      xid
    }`);

    // Verify independent perspectives criteria without parents.
    query = query.concat(`\nnoParent(func: eq(context, val(targetCon)))
    @filter(eq(count(~children), 0) AND (uid(iPublicRead) OR uid(iCanRead)))
    {
      xid
    }`);

    // Verify independent perspectives criteria with parents.
    query = query.concat(`\niPersp(func: eq(context, val(targetCon))) 
    @filter(gt(count(~children), 0) AND (uid(iPublicRead) OR uid(iCanRead)) AND val(refParent))
    @cascade {
      xid
      ~children @filter(not(eq(context, val(refParent) ) ) ) {
        context
      }
    }`);

    let result = (
      await this.db.client.newTxn().query(`query{${query}}`)
    ).getJson();

    return result.noParent
      .map((p: any) => p.xid)
      .concat(result.iPersp.map((p: any) => p.xid));
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

  async setDeletedPerspective(
    perspectiveId: string,
    deleted: boolean
  ): Promise<void> {
    await this.db.ready();

    /**  */
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query = `perspective as var(func: eq(xid, "${perspectiveId}"))`;
    req.setQuery(`query{${query}}`);

    let nquads = '';
    nquads = nquads.concat(`\nuid(perspective) <xid> "${perspectiveId}" .`);
    nquads = nquads.concat(`\nuid(perspective) <deleted> "${deleted}" .`);

    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] deletePerspective',
      { query },
      { nquads },
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

    const parentsPortion = `
    {
      xid
      ~children {
        xid
        finDelegatedTo {
          canRead @filter(eq(did, "${loggedUserId}")) {
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
    const { levels, entities } = getPerspectiveOptions;

    if (levels !== 0 && levels !== -1) {
      throw new Error(
        `Levels can only be 0 (shallow get) or -1, fully recusvie`
      );
    }

    /** The query uses ecosystem if levels === -1 and get the head and data json objects if entities === true */
    const elementQuery = `
      xid
      context {
        name
      }
      remote
      path
      creator {
        did
      }
      timextamp
      stored
      deleted
      head {
        xid
        data {
          xid
          ${entities ? `jsonString` : ''}
        }
        ${entities ? COMMIT_PROPERTIES : ''}
      }
      delegate
      delegateTo {
        xid
      }
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

    /**
     * We build the function depending on how the method is implemented.
     * For searching or for grabbing an specific perspective.
     */

    const DgraphACL = `\nprivate as aclPriv(func: uid(filtered)) @cascade {
      finDelegatedTo {
        canRead @filter(eq(did, "${loggedUserId}")) {
          count(uid)
        }
      }
    }
    public as aclPub(func: uid(filtered)) @cascade {
      finDelegatedTo @filter(eq(publicRead, true)) {
        uid
      }
    }`;

    if(searchOptions) {
      const exclusiveLinksToSearch = `linksTo(func:eq(xid, "${(searchOptions.linksTo.length > 0) ? searchOptions.linksTo[0].id : ''}")) { filtered as ~linksTo }${DgraphACL}`
      const normalSearch = `filtered as search(func: eq(dgraph.type, "Perspective")) @cascade 
          ${
            searchOptions.query
              ? `@filter(anyoftext(text, "${searchOptions.query}")) {`
              : '{'
          }
          ${
            searchOptions.linksTo.length > 0
              ? `linksTo @filter(eq(xid, "${searchOptions.linksTo[0].id}"))`
              : ''
          }
          ${
            searchOptions.under
              ? searchOptions.under.length > 0
                ? `ecosystem @filter(eq(xid, "${searchOptions.under[0].id}"))`
                : ''
              : ''
          }
        }${DgraphACL}`;

        query = query.concat(
          `${ !searchOptions.under && !searchOptions.query
                ? `${exclusiveLinksToSearch}`
                : searchOptions.under || searchOptions.query
                  ? searchOptions.under?.length === 0 && searchOptions.query === ''
                    ? `${exclusiveLinksToSearch}`
                    : `${normalSearch}`
                  : `${normalSearch}`
            }`
        );
      } else {
        query = query.concat(`filtered as search(func: eq(xid, ${perspectiveId}))`);
      }

    query = query.concat(
      `\nperspectives(func: uid(filtered)) ${searchOptions ? `@filter(uid(private) OR uid(public))` : ``} {
          ${levels === -1 ? `ecosystem {${elementQuery}}` : `${elementQuery}`}
        }`
    );

    let dbResult = await this.db.client.newTxn().query(`query{${query}}`);
    let json = dbResult.getJson();

    const perspectives = json.perspectives;

    // initalize the returned result with empty values
    const result: FetchResult = {
      details: {},
      perspectiveIds: [],
      slice: {
        perspectives: [],
        entities: [],
      },
    };

    // then loop over the dgraph results and fill the function output result
    perspectives.forEach((persp: any) => {
      const all = levels === -1 ? persp.ecosystem : [persp];

      all.forEach((element: any) => {
        if (element) {
          /** check access control, if user can't read, simply return undefined head  */
          result.perspectiveIds.push(element.xid);

          const canRead = !element.finDelegatedTo.publicRead
            ? element.finDelegatedTo.canRead
              ? element.finDelegatedTo.canRead[0].count > 0
              : false
            : true;

          const elementDetails = {
            headId: canRead ? element.head.xid : undefined,
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

          if (entities) {
            const commit = assembleCommit(element.head);

            const data: Entity<any> = {
              id: element.head.data.xid,
              object: decodeData(element.head.data.jsonString),
            };

            result.slice.entities.push(commit, data);

            if (element.xid !== perspectiveId) {
              // add the perspective entity only if a subperspective
              const perspective = assemblePerspective(element);
              result.slice.entities.push(perspective);
            }
          }
        }
      });
    });

    return result;
  }

  async getCommit(commitId: string): Promise<Secured<Commit>> {
    await this.db.ready();
    const query = `query {
      commit(func: eq(xid, ${commitId})) {
        xid
        data {
          xid
        }
        ${COMMIT_PROPERTIES}
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    let dcommit: DgCommit = result.getJson().commit[0];
    console.log(
      '[DGRAPH] getCommit',
      { query },
      JSON.stringify(result.getJson())
    );
    if (!dcommit) new Error(`Commit with id ${commitId} not found`);
    if (!dcommit.stored) new Error(`Commit with id ${commitId} not found`);

    return assembleCommit(dcommit);
  }

  async explore(
    searchOptions: SearchOptions,
    getPerspectiveOptions: GetPerspectiveOptions = {
      levels: 0,
      entities: true,
    },
    loggedUserId: string | null
  ): Promise<SearchResult> {
    return  await this.explorePerspectives(
      searchOptions,
      loggedUserId,
      getPerspectiveOptions
    );
  }
}
