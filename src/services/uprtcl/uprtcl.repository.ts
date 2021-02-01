import { Entity } from '@uprtcl/evees';
import { DGraphService } from '../../db/dgraph.service';
import { UserRepository } from '../user/user.repository';
import { DataRepository } from '../data/data.repository';
import {
  Perspective,
  PerspectiveDetails,
  Commit,
  Secured,
  Proof,
  NewPerspectiveData,
  Upsert,
  UpdateDetails,
} from './types';
import {
  PERSPECTIVE_SCHEMA_NAME,
  PROOF_SCHEMA_NAME,
  COMMIT_SCHEMA_NAME,
} from './uprtcl.schema';
import { format } from 'path';
import { ipldService } from '../ipld/ipldService';

const dgraph = require('dgraph-js');

export interface DgRef {
  [x: string]: string;
  uid: string;
}

interface DgPerspective {
  uid?: string;
  xid: string;
  name: string;
  context: string;
  remote: string;
  path: string;
  creator: DgRef;
  timextamp: number;
  'dgraph.type'?: string;
  stored: boolean;
  deleted: boolean;
  proof: DgProof;
}

interface DgProof {
  signature: string;
  proof_type: string;
}

interface DgCommit {
  uid?: string;
  xid: string;
  creators: DgRef[];
  timextamp: number;
  message: string;
  parents: Array<DgRef>;
  data: DgRef;
  'dgraph.type'?: string;
  stored: boolean;
  proof: DgProof;
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
    newPerspective: NewPerspectiveData,
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

    nquads = nquads.concat(`\nuid(persp${id}) <xid> "${id}" .`);
    nquads = nquads.concat(`\nuid(persp${id}) <stored> "true" .`);
    nquads = nquads.concat(`\nuid(persp${id}) <creator> uid(profile${did}) .`);
    nquads = nquads.concat(
      `\nuid(persp${id}) <timextamp> "${timestamp}"^^<xs:int> .`
    );
    nquads = nquads.concat(`\nuid(persp${id}) <context> "${context}" .`);
    nquads = nquads.concat(`\nuid(persp${id}) <deleted> "false" .`);
    nquads = nquads.concat(`\nuid(persp${id}) <remote> "${remote}" .`);
    nquads = nquads.concat(`\nuid(persp${id}) <path> "${path}" .`);
    nquads = nquads.concat(
      `\nuid(persp${id}) <dgraph.type> "${PERSPECTIVE_SCHEMA_NAME}" .`
    );

    nquads = nquads.concat(
      `\n_:proof${id} <dgraph.type> "${PROOF_SCHEMA_NAME}" .`
    );
    nquads = nquads.concat(`\n_:proof${id} <signature> "${proof.signature}" .`);
    nquads = nquads.concat(`\n_:proof${id} <proof_type> "${proof.type}" .`);

    nquads = nquads.concat(`\nuid(persp${id}) <proof> _:proof${id} .`);

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

    if (newPerspective.parentId) {
      // We need to bring that parentId if it is external
      if (externalParentIds.includes(newPerspective.parentId)) {
        /** This perspective is an external perspective and has a parentId that already
         * exists on the database */

        query = query.concat(`\nparentOfExt${id} as var(func: eq(xid, ${newPerspective.parentId})) {
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
          `\nuid(persp${id}) <delegateTo> uid(persp${newPerspective.parentId}) .`
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
    newPerspectives: NewPerspectiveData[],
    loggedUserId: string | null
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
      if (p.parentId !== null) {
        if (p.parentId !== undefined) {
          if (!perspectiveIds.includes(p.parentId)) {
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
      ...new Set(externalParentPerspectives.map((p) => p.parentId)),
    ];

    for (let i = 0; i < newPerspectives.length; i++) {
      const newPerspective = newPerspectives[i];
      const upsertString = this.createPerspectiveUpsert(
        upsertedProfiles,
        externalParentIds as string[],
        upsert,
        newPerspective
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

  async updatePerspectives(updates: UpdateDetails[]): Promise<void> {
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
      const ecoUpsertString = this.updateEcosystem(updates[i], ecoUpsert);

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

  updatePerspectiveUpsert(update: UpdateDetails, upsert: Upsert) {
    let { query, nquads, delNquads } = upsert;
    const { id } = update;

    // WARNING: IF THE PERSPECTIVE ENDS UP HAVING TWO HEADS, CHECK DGRAPH DOCS FOR RECENT UPDATES
    // IF NO SOLUTION, THEN BATCH DELETE ALL HEADS BEFORE BATCH UPDATE THEM

    // We update the current xid.
    query = query.concat(`\npersp${id} as var(func: eq(xid, "${id}"))`);
    nquads = nquads.concat(`\nuid(persp${id}) <xid> "${id}" .`);

    // If the current perspective we are seeing isn't headless, we proceed to update the ecosystem and its head.
    if (update.details !== undefined) {
      if (update.details.headId !== undefined) {
        const { headId, addedChildren, removedChildren } = update.details;

        // We set the head for previous created perspective.
        query = query.concat(
          `\nheadOf${id} as var(func: eq(xid, "${headId}"))`
        );
        nquads = nquads.concat(`\nuid(headOf${id}) <xid> "${headId}" .`);
        nquads = nquads.concat(`\nuid(persp${id} ) <head> uid(headOf${id}) .`);

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

  updateEcosystem(update: UpdateDetails, upsert: Upsert) {
    let { query, nquads, delNquads } = upsert;
    const { id } = update;

    query = query.concat(
      `\npersp${id} as var(func: eq(xid, ${id})) 
       @recurse
       @filter(gt(count(~children), 1))  
       {
         revEcosystem${id} as ~children
       }
       \nperspEl${id} as var(func: eq(xid, ${id}))
       @recurse
       @filter(gt(count(children), 1)) 
       {
         ecosystemOfUref${id} as children
       }`
    );

    nquads = nquads.concat(
      `\nuid(perspEl${id}) <ecosystem> uid(ecosystemOfUref${id}) .
       \nuid(revEcosystem${id}) <ecosystem> uid(persp${id}) .`
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
        `\n_:proof${id} <dgraph.type> "${PROOF_SCHEMA_NAME}" .`
      );
      nquads = nquads.concat(
        `\n_:proof${id} <signature> "${proof.signature}" .`
      );
      nquads = nquads.concat(`\n_:proof${id} <proof_type> "${proof.type}" .`);

      nquads = nquads.concat(`\nuid(commit${id}) <proof> _:proof${id} .`);

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

  async getPerspective(perspectiveId: string): Promise<Secured<Perspective>> {
    await this.db.ready();
    const query = `query {
      perspective(func: eq(xid, ${perspectiveId})) {
        xid
        name
        context
        remote
        path
        creator {
          did
        }
        timextamp
        nonce
        stored
        deleted
        proof {
          signature
          type
        }
      }
    }`;

    const result = await this.db.client.newTxn().query(query);
    console.log(
      '[DGRAPH] getPerspective',
      { query },
      JSON.stringify(result.getJson())
    );
    const dperspective: DgPerspective = result.getJson().perspective[0];
    if (!dperspective)
      throw new Error(`Perspective with id ${perspectiveId} not found`);
    if (!dperspective.stored)
      throw new Error(`Perspective with id ${perspectiveId} not stored`);
    if (dperspective.deleted)
      throw new Error(`Perspective with id ${perspectiveId} deleted`);

    const perspective: Perspective = {
      remote: dperspective.remote,
      path: dperspective.path,
      creatorId: dperspective.creator.did,
      timestamp: dperspective.timextamp,
      context: dperspective.context,
    };

    const proof: Proof = {
      signature: dperspective.proof.signature,
      type: dperspective.proof.proof_type,
    };

    const securedPerspective: Secured<Perspective> = {
      id: dperspective.xid,
      object: {
        payload: perspective,
        proof: proof,
      },
    };
    return securedPerspective;
  }

  async findPerspectives(context: string): Promise<string[]> {
    await this.db.ready();
    const query = `query {
      perspective(func: eq(stored, "true")) @filter(eq(context, "${context}")) {
        xid
        name
        context
        authority
        creator {
          did
        }
        timextamp
        nonce
        proof {
          signature
          type
        }
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
          context: dperspective.context,
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

  async getPerspectiveDetails(
    perspectiveId: string
  ): Promise<PerspectiveDetails> {
    await this.db.ready();

    const query = `query {
      perspective(func: eq(xid, ${perspectiveId})) {
        name
        context
        head {
          xid
        }
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    let json = result.getJson();
    console.log(
      '[DGRAPH] getPerspectiveDetails',
      { query },
      JSON.stringify(json)
    );
    if (json.perspective.length === 0) {
      return {
        name: '',
        headId: '',
      };
    }

    const details = json.perspective[0];
    return {
      name: details.name,
      headId: details.head ? details.head.xid : undefined,
    };
  }

  async getCommit(commitId: string): Promise<Secured<Commit>> {
    await this.db.ready();
    const query = `query {
      commit(func: eq(xid, ${commitId})) {
        xid
        message
        creators {
          did
        }
        data {
          xid
        }
        parents {
          xid
        }
        timextamp
        stored
        proof {
          signature
          type
        }
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

    const proof: Proof = {
      signature: dcommit.proof.signature,
      type: dcommit.proof.proof_type,
    };

    const securedCommit: Secured<Commit> = {
      id: dcommit.xid,
      object: {
        payload: commit,
        proof: proof,
      },
    };
    return securedCommit;
  }
}
