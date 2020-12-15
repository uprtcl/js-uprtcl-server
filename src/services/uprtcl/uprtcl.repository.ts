import { DGraphService } from '../../db/dgraph.service';
import { ipldService } from '../ipld/ipldService';
import { UserRepository } from '../user/user.repository';
import { LOCAL_EVEES_PROVIDER } from '../providers';
import { DataRepository } from '../data/data.repository';
import {
  Perspective,
  PerspectiveDetails,
  Commit,
  Secured,
  Proof,
  getAuthority,
  EcosystemUpdates,
} from './types';
import {
  PERSPECTIVE_SCHEMA_NAME,
  PROOF_SCHEMA_NAME,
  COMMIT_SCHEMA_NAME,
} from './uprtcl.schema';

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

interface DbContent {
  query: string;
  nquads: string;
  delNquads: string;
}

export class UprtclRepository {
  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository,
    protected dataRepo: DataRepository
  ) {}

  async createPerspectives(securedPerspectives: Secured<Perspective>[]) {
    if (securedPerspectives.length === 0) return;
    await this.db.ready();

    let query = ``;
    let nquads = ``;
    let upsertedProfiles: string[] = [];
    for (const securedPerspective of securedPerspectives) {
      const id = await ipldService.validateSecured(securedPerspective);

      const perspective = securedPerspective.object.payload;
      const proof = securedPerspective.object.proof;

      if (!upsertedProfiles.includes(perspective.creatorId)) {
        upsertedProfiles.push(perspective.creatorId);
        const creatorSegment = this.userRepo.upsertQueries(
          perspective.creatorId
        );
        query = query.concat(creatorSegment.query);
        nquads = nquads.concat(creatorSegment.nquads);
      }

      query = query.concat(`\npersp${id} as var(func: eq(xid, "${id}"))`);

      nquads = nquads.concat(`\nuid(persp${id}) <xid> "${id}" .`);
      nquads = nquads.concat(`\nuid(persp${id}) <stored> "true" .`);
      nquads = nquads.concat(
        `\nuid(persp${id}) <creator> uid(profile${perspective.creatorId}) .`
      );
      nquads = nquads.concat(
        `\nuid(persp${id}) <timextamp> "${perspective.timestamp}"^^<xs:int> .`
      );
      nquads = nquads.concat(
        `\nuid(persp${id}) <context> "${perspective.context}" .`
      );
      nquads = nquads.concat(`\nuid(persp${id}) <deleted> "false" .`);
      nquads = nquads.concat(
        `\nuid(persp${id}) <remote> "${perspective.remote}" .`
      );
      nquads = nquads.concat(
        `\nuid(persp${id}) <path> "${perspective.path}" .`
      );
      nquads = nquads.concat(
        `\nuid(persp${id}) <dgraph.type> "${PERSPECTIVE_SCHEMA_NAME}" .`
      );

      nquads = nquads.concat(
        `\n_:proof${id} <dgraph.type> "${PROOF_SCHEMA_NAME}" .`
      );
      nquads = nquads.concat(
        `\n_:proof${id} <signature> "${proof.signature}" .`
      );
      nquads = nquads.concat(`\n_:proof${id} <proof_type> "${proof.type}" .`);

      nquads = nquads.concat(`\nuid(persp${id}) <proof> _:proof${id} .`);

      /** add itself as its ecosystem */
      nquads = nquads.concat(`\nuid(persp${id}) <ecosystem> uid(persp${id}) .`);
    }

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] createPerspective',
      { query },
      { nquads },
      result.getUidsMap().toArray()
    );
  }

  async createCommits(commits: Secured<Commit>[]) {
    if (commits.length === 0) return;
    await this.db.ready();

    // const id = await ipldService.validateSecured(securedCommit);
    let query = ``;
    let nquads = ``;

    for (let securedCommit of commits) {
      const commit = securedCommit.object.payload;
      const proof = securedCommit.object.proof;
      const id = securedCommit.id;

      /** make sure creatorId exist */
      const addedUsers: string[] = [];
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
          `\nuid(commit${id}) <creators> uid(profile${creatorDid}) .`
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
  }

  async updatePerspective(
    perspectiveId: string,
    details: PerspectiveDetails,
    ecosystem: EcosystemUpdates
  ): Promise<void> {
    await this.db.ready();

    details.headId = !details.headId ? undefined : details.headId;

    if (details.headId !== undefined) {
      /** delete the current head */
      const delMu = new dgraph.Mutation();
      let queryDel = `perspective as var(func: eq(xid, "${perspectiveId}"))`;
      let delNquads = `uid(perspective) <head> * .`;
      delMu.setDelNquads(delNquads);

      const delReq = new dgraph.Request();
      delReq.setQuery(`query{${queryDel}}`);
      delReq.setCommitNow(true);
      delReq.setMutationsList([delMu]);

      await this.db.client.newTxn().doRequest(delReq);
    }

    /**  */
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query = `perspective as var(func: eq(xid, "${perspectiveId}"))`;
    if (details.headId !== undefined)
      query = query.concat(`\nhead as var(func: eq(xid, "${details.headId}"))`);

    let nquads = '';
    nquads = nquads.concat(`\nuid(perspective) <xid> "${perspectiveId}" .`);

    let delNquads = '';

    if (details.headId !== undefined) {
      /** set xid in case the perspective did not existed */
      nquads = nquads.concat(`\nuid(head) <xid> "${details.headId}" .`);
      nquads = nquads.concat(`\nuid(perspective) <head> uid(head) .`);
    }
    if (details.name !== undefined)
      nquads = nquads.concat(`\nuid(perspective) <name> "${details.name}" .`);

    const dbContent: DbContent = {
      query: query,
      nquads: nquads,
      delNquads: delNquads,
    };

    // Updates the ecosystem and children
    const ecosystemUpdated = await this.updateEcosystem(
      ecosystem,
      perspectiveId,
      dbContent
    );

    req.setQuery(`query{${ecosystemUpdated.query}}`);
    mu.setSetNquads(ecosystemUpdated.nquads);
    mu.setDelNquads(ecosystemUpdated.delNquads);

    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);

    console.log(
      '[DGRAPH] updatePerspective',
      { query },
      { nquads },
      result.getUidsMap().toArray()
    );
  }

  async updateEcosystem(
    ecosystem: EcosystemUpdates,
    perspectiveId: string,
    dbContent: DbContent
  ) {
    let { query, nquads, delNquads } = dbContent;

    ecosystem.addedChildren.map((addedChild, i) => {
      query = query.concat(`\n
        addedChild${i} as var(func: eq(xid, ${addedChild}))        
        {
          ecoAdd${i} as ecosystem            
        }
      `);
      nquads = nquads.concat(
        `\nuid(perspective) <ecosystem> uid(ecoAdd${i}) .`
      );
      nquads = nquads.concat(
        `\nuid(perspective) <children> uid(addedChild${i}) .`
      );

      query = query.concat(`\n
        ecs${i}(func: eq(xid, ${perspectiveId}))        
        {
          revEcoAdd${i} as ~ecosystem            
        }
      `);
      nquads = nquads.concat(
        `\nuid(revEcoAdd${i}) <ecosystem> uid(ecoAdd${i}) .`
      );
    });

    ecosystem.removedChildren.map((removedChild, i) => {
      query = query.concat(`\n
        removedChild${i} as var(func: eq(xid, ${removedChild}))        
        {
          ecoDelete${i} as ecosystem            
        }
      `);
      delNquads = delNquads.concat(
        `\nuid(perspective) <ecosystem> uid(ecoDelete${i}) .`
      );
      delNquads = delNquads.concat(
        `\nuid(perspective) <children> uid(removedChild${i}) .`
      );

      query = query.concat(`\n
        qs${i}(func: eq(xid, ${perspectiveId}))        
        {
          revEcoDelete${i} as ~ecosystem            
        }
      `);
      delNquads = delNquads.concat(
        `\nuid(revEcoDelete${i}) <ecosystem> uid(ecoDelete${i}) .`
      );
    });
    return { query, nquads, delNquads };
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
          canRead @filter(eq(did, ${loggedUserId.toLowerCase()})) {
            did
          }
        }
      }
    }`);

    // Verify independent perspectives criteria with parents.
    query = query.concat(`\niPersp(func: has(xid)) 
    @filter(uid(iPublicRead) OR uid(iCanRead))
    @cascade {
      xid
      ~children @filter(not(eq(context, val(refParent) ) ) ) {
        context
      }
    }`);

    // Verify independent perspectives criteria without parents.
    query = query.concat(`\nnoParent(func: has(xid)) 
    @filter(eq(count(~children), 0) AND (uid(iPublicRead) OR uid(iCanRead)))
    {
      xid
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
