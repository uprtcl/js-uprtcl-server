import { DGraphService } from "../../db/dgraph.service";
import { ipldService } from "../ipld/ipldService";
import { PERSPECTIVE_SCHEMA_NAME, COMMIT_SCHEMA_NAME, TEXT_SCHEMA_NAME, DOCUMENT_NODE_SCHEMA_NAME, TEXT_NODE_SCHEMA_NAME, DATA_SCHEMA_NAME, PROOF_SCHEMA_NAME } from "../../db/schema";
import { UserRepository } from "../user/user.repository";
import { LOCAL_PROVIDER } from "../knownsources/knownsources.repository";
import { DataRepository } from "../data/data.repository";
import { Perspective, PerspectiveDetails, Commit, Secured, Proof } from "./types";

const dgraph = require("dgraph-js");

interface DgRef {
  [x: string]: string;
  uid: string
}

interface DgPerspective {
  uid?: string,
  xid: string,
  name: string,
  context: string,
  origin: string,
  creator: DgRef,
  timestamp: number,
  'dgraph.type'?: string,
  stored: boolean,
  proof: DgProof
}

interface DgProof {
  signature: string,
  proof_type: string
}

interface DgCommit {
  uid?: string,
  xid: string,
  creator: DgRef,
  timestamp: number,
  message: string,
  parents: Array<DgRef>,
  data: DgRef,
  'dgraph.type'?: string,
  stored: boolean,
  proof: DgProof
}

export class UprtclRepository {
  
  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository, 
    protected dataRepo: DataRepository) {
  }

  async createPerspective(securedPerspective: Secured<Perspective>) {
    await this.db.ready();

    const id = await ipldService.validateSecured(securedPerspective);

    /** throw if perspective exist */
    const existQuery = `perspective(func: eq(xid, ${id})) { count(uid) }`;
    const res = await this.db.client.newTxn().query(`query{${existQuery}}`);

    if(res.getJson().perspective.count > 0) {
      throw new Error(`Perspective with id ${id} already exist`);
    }

    const perspective = securedPerspective.object.payload;
    const proof = securedPerspective.object.proof;

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** make sure creatorId exist */
    await this.userRepo.upsertProfile(perspective.creatorId);
    
    let query = `profile as var(func: eq(did, "${perspective.creatorId.toLowerCase()}"))`;
    req.setQuery(`query{${query}}`);

    let nquads = `_:perspective <xid> "${id}" .`;
    nquads = nquads.concat(`\n_:perspective <stored> "true" .`);
    nquads = nquads.concat(`\n_:perspective <creator> uid(profile) .`);
    nquads = nquads.concat(`\n_:perspective <timestamp> "${perspective.timestamp}"^^<xs:int> .`);
    nquads = nquads.concat(`\n_:perspective <origin> "${LOCAL_PROVIDER}" .`);
    nquads = nquads.concat(`\n_:perspective <dgraph.type> "${PERSPECTIVE_SCHEMA_NAME}" .`);

    nquads = nquads.concat(`\n_:proof <dgraph.type> "${PROOF_SCHEMA_NAME}" .`);
    nquads = nquads.concat(`\n_:proof <signature> "${proof.signature}" .`);
    nquads = nquads.concat(`\n_:proof <type> "${proof.type}" .`);

    nquads = nquads.concat(`\n_:perspective <proof> _:proof .`);

    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    
    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] createPerspective', {query}, {nquads}, result.getUidsMap().toArray());
    return securedPerspective.id;
  }

  async createCommit(securedCommit: Secured<Commit>) {
    await this.db.ready();

    const id = await ipldService.validateSecured(securedCommit);

    const commit = securedCommit.object.payload;
    const proof = securedCommit.object.proof;

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** make sure creatorId exist */
    await this.userRepo.upsertProfile(commit.creatorId);
    
    /** commit object might exist because of parallel update head call */
    let query = `\ncommit as var(func: eq(xid, ${id}))`;
    
    query = query.concat(`\ndata as var(func: eq(xid, "${commit.dataId}"))`);
    query = query.concat(`\nprofile as var(func: eq(did, "${commit.creatorId.toLowerCase()}"))`);
  
    let nquads = `uid(commit) <xid> "${id}" .`;
    nquads = nquads.concat(`\nuid(commit) <stored> "true" .`);
    nquads = nquads.concat(`\nuid(commit) <dgraph.type> "${COMMIT_SCHEMA_NAME}" .`);
    nquads = nquads.concat(`\nuid(commit) <message> "${commit.message}" .`);
    nquads = nquads.concat(`\nuid(commit) <creator> uid(profile) .`);
    nquads = nquads.concat(`\nuid(commit) <timestamp> "${commit.timestamp}"^^<xs:int> .`);
    nquads = nquads.concat(`\nuid(commit) <data> uid(data) .`)

    nquads = nquads.concat(`\n_:proof <dgraph.type> "${PROOF_SCHEMA_NAME}" .`);
    nquads = nquads.concat(`\n_:proof <signature> "${proof.signature}" .`);
    nquads = nquads.concat(`\n_:proof <type> "${proof.type}" .`);

    nquads = nquads.concat(`\nuid(commit) <proof> _:proof .`);

    /** get and set the uids of the links */
    for (let ix = 0; ix < commit.parentsIds.length; ix++) {
      query = query.concat(`\nparents${ix} as var(func: eq(xid, ${commit.parentsIds[ix]}))`);
      nquads = nquads.concat(`\nuid(commit) <parents> uid(parents${ix}) .`);
      /** set the parent xid in case it was not created */
      nquads = nquads.concat(`\nuid(parents${ix}) <xid> "${commit.parentsIds[ix]}" .`);
    }
    
    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] createCommit', {query}, {nquads}, result.getUidsMap().toArray());
    return id;
  }

  async updatePerspective(perspectiveId: string, details: PerspectiveDetails):Promise<void> {
    await this.db.ready();

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
    if (details.headId !== undefined) query = query.concat(`\nhead as var(func: eq(xid, "${details.headId}"))`)
    
    req.setQuery(`query{${query}}`);
    let nquads = '';
    nquads = nquads.concat(`\nuid(perspective) <xid> "${perspectiveId}" .`);

    if (details.headId !== undefined)  {
      /** set xid in case the perspective did not existed */
      nquads = nquads.concat(`\nuid(head) <xid> "${details.headId}" .`);
      nquads = nquads.concat(`\nuid(perspective) <head> uid(head) .`);
    }
    if (details.name !== undefined) nquads = nquads.concat(`\nuid(perspective) <name> "${details.name}" .`);
    if (details.context !== undefined) nquads = nquads.concat(`\nuid(perspective) <context> "${details.context}" .`);
    
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] updatePerspective', {query}, {nquads}, result.getUidsMap().toArray());
  }

  async getGeneric(elementId: string) {
    await this.db.ready();

    const query = `query {
      element(func: eq(xid, ${elementId})) {
        dgraph.type
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    let json = result.getJson();
    console.log('[DGRAPH] getGeneric', {query}, JSON.stringify(json));
    
    let types: string[] = json.element[0]['dgraph.type'];

    let dataTypes = [
      DATA_SCHEMA_NAME,
      TEXT_SCHEMA_NAME, 
      TEXT_NODE_SCHEMA_NAME, 
      DOCUMENT_NODE_SCHEMA_NAME
    ]

    /** if object is data */
    if (dataTypes.includes(types[0])) {
      return this.dataRepo.getData(elementId);
    } else {
      switch (types[0]) {
        case PERSPECTIVE_SCHEMA_NAME:
          return this.getPerspective(elementId);
        
        case COMMIT_SCHEMA_NAME:
          return this.getCommit(elementId);
      }
    }
    return null;
 }

  async getPerspective(perspectiveId: string): Promise<Secured<Perspective>> {
    await this.db.ready();
    const query = `query {
      perspective(func: eq(xid, ${perspectiveId})) {
        xid
        name
        context
        origin
        creator {
          did
        }
        timestamp
        nonce
        stored
        proof {
          signature
          type
        }
      }
    }`;

    const result = await this.db.client.newTxn().query(query);
    console.log('[DGRAPH] getPerspective', {query}, result.getJson());
    const dperspective: DgPerspective = result.getJson().perspective[0];
    if (!dperspective) throw new Error(`Perspective with id ${perspectiveId} not found`);
    if (!dperspective.stored) throw new Error(`Perspective with id ${perspectiveId} not found`);

    const perspective: Perspective = {
      origin: dperspective.origin,
      creatorId: dperspective.creator.did,
      timestamp: dperspective.timestamp      
    }

    const proof: Proof = {
      signature: dperspective.proof.signature,
      type: dperspective.proof.proof_type
    }

    const securedPerspective: Secured<Perspective> = {
      id: dperspective.xid,
      object: {
        payload: perspective,
        proof: proof
      }
    }
    return securedPerspective;
  }

  async getContextPerspectives(context: string):Promise<Perspective[]> {
    await this.db.ready();
    const query = `query {
      perspective(func: eq(context, ${context})) {
        xid
        name
        context
        origin
        creator {
          did
        }
        timestamp
        nonce
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    console.log('[DGRAPH] getContextPerspectives', {query}, result.getJson());
    let perspectives = result.getJson().perspective.map((dperspective: DgPerspective):Perspective => {
      return {
        origin: dperspective.origin,
        creatorId: dperspective.creator.did,
        timestamp: dperspective.timestamp,
      }
    })
    
    return perspectives;
  }

  async getPerspectiveDetails(perspectiveId: string): Promise<PerspectiveDetails> {
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
    console.log('[DGRAPH] getPerspectiveDetails', {query}, JSON.stringify(json));
    if (json.perspective.length === 0) {
      return {
        name: '',
        context: '',
        headId: ''
      };
    }

    const details = json.perspective[0];
    return {
      name: details.name,
      context: details.context,
      headId: details.head.xid
    }
  }

  async getCommit(commitId: string): Promise<Secured<Commit>> {
    await this.db.ready();
    const query = `query {
      commit(func: eq(xid, ${commitId})) {
        xid
        message
        creator {
          did
        }
        data {
          xid
        }
        parents {
          xid
        }
        timestamp
        stored
        proof {
          signature
          type
        }
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    let dcommit: DgCommit = result.getJson().commit[0];
    console.log('[DGRAPH] getCommit', {query}, result.getJson());
    if (!dcommit) new Error(`Commit with id ${commitId} not found`);
    if (!dcommit.stored) new Error(`Commit with id ${commitId} not found`);

    const commit: Commit = {
      creatorId: dcommit.creator.did,
      dataId: dcommit.data.xid,
      timestamp: dcommit.timestamp,
      message: dcommit.message,
      parentsIds: dcommit.parents ? dcommit.parents.map(parent => parent.xid) : []
    }

    const proof: Proof = {
      signature: dcommit.proof.signature,
      type: dcommit.proof.proof_type
    }

    const securedCommit: Secured<Commit> = {
      id: dcommit.xid,
      object: {
        payload: commit,
        proof: proof
      }
    }
    return securedCommit;
  }

  async getOrigin():Promise<string> {
    return LOCAL_PROVIDER;
  }
}