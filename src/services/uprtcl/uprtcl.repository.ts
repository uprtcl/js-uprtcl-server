import { DGraphService } from "../../db/dgraph.service";
import { PropertyOrder, Perspective, Commit } from "./types";
import { ipldService } from "../ipld/ipldService";
import { localCidConfig } from "../ipld";
import { PERSPECTIVE_SCHEMA_NAME, COMMIT_SCHEMA_NAME } from "../../db/schema";
import { UserRepository } from "../user/user.repository";
import { LOCAL_PROVIDER } from "../knownsources/knownsources.repository";

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
  stored: boolean
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
  stored: boolean
}

export class UprtclRepository {
  
  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository) {
  }

  async createPerspective(perspective: Perspective) {
    await this.db.ready();

    if (perspective.id !== '') {
      let valid = await ipldService.validateCid(
        perspective.id,
        perspective,
        PropertyOrder.Perspective
      );
      if (!valid) {
        throw new Error(`Invalid cid ${perspective.id}`);
      }
    } else {
      perspective.id = await ipldService.generateCidOrdered(
        perspective,
        localCidConfig,
        PropertyOrder.Perspective
      );
    }

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** make sure creatorId exist */
    await this.userRepo.upsertProfile(perspective.creatorId);
    
    let query = `profile as var(func: eq(did, "${perspective.creatorId.toLowerCase()}"))`;
    req.setQuery(`query{${query}}`);

    let nquads = `_:perspective <xid> "${perspective.id}" .`;
    nquads = nquads.concat(`\n_:perspective <stored> "true" .`);
    nquads = nquads.concat(`\n_:perspective <name> "${perspective.name}" .`);
    nquads = nquads.concat(`\n_:perspective <context> "${perspective.context}" .`);
    nquads = nquads.concat(`\n_:perspective <creator> uid(profile) .`);
    nquads = nquads.concat(`\n_:perspective <timestamp> "${perspective.timestamp}"^^<xs:int> .`);
    nquads = nquads.concat(`\n_:perspective <origin> "${LOCAL_PROVIDER}" .`);
    nquads = nquads.concat(`\n_:perspective <dgraph.type> "${PERSPECTIVE_SCHEMA_NAME}" .`);

    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    
    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] createPerspective', {query}, {nquads}, result.getUidsMap().toArray());
    return perspective.id;
  }

  async updatePerspective(perspectiveId: string, headId: string):Promise<void> {
    await this.db.ready();

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

    /**  */
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query = `perspective as var(func: eq(xid, "${perspectiveId}"))`;
    query = query.concat(`\nhead as var(func: eq(xid, "${headId}"))`)
    req.setQuery(`query{${query}}`);

    let nquads = `uid(perspective) <xid> "${perspectiveId}" .`;
    nquads = nquads.concat(`\nuid(perspective) <head> uid(head) .`);
    /** set the head xid in case its was not created */
    nquads = nquads.concat(`\nuid(head) <xid> "${headId}" .`);+
    
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] updatePerspective', {query}, {nquads}, result.getUidsMap().toArray());
  }

  async createCommit(commit: Commit) {
    await this.db.ready();
    
    if (commit.id !== '') {
      let valid = await ipldService.validateCid(
        commit.id,
        commit,
        PropertyOrder.Commit
      );
      if (!valid) {
        throw new Error(`Invalid cid ${commit.id}`);
      }
    } else {
      commit.id = await ipldService.generateCidOrdered(
        commit,
        localCidConfig,
        PropertyOrder.Commit
      );
    }

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** make sure creatorId exist */
    await this.userRepo.upsertProfile(commit.creatorId);
    
    /** commit object might exist because of parallel update head call */
    let query = `\ncommit as var(func: eq(xid, ${commit.id}))`;
    
    query = query.concat(`\ndata as var(func: eq(xid, "${commit.dataId}"))`);
    query = query.concat(`\nprofile as var(func: eq(did, "${commit.creatorId.toLowerCase()}"))`);
  
    let nquads = `uid(commit) <xid> "${commit.id}" .`;
    nquads = nquads.concat(`\nuid(commit) <stored> "true" .`);
    nquads = nquads.concat(`\nuid(commit) <dgraph.type> "${COMMIT_SCHEMA_NAME}" .`);
    nquads = nquads.concat(`\nuid(commit) <message> "${commit.message}" .`);
    nquads = nquads.concat(`\nuid(commit) <creator> uid(profile) .`);
    nquads = nquads.concat(`\nuid(commit) <timestamp> "${commit.timestamp}"^^<xs:int> .`);
    nquads = nquads.concat(`\nuid(commit) <data> uid(data) .`)

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
    return commit.id;
  }

  async getPerspective(perspectiveId: string): Promise<Perspective | null> {
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
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    console.log('[DGRAPH] getPerspective', {query}, result.getJson());
    let dperspective: DgPerspective = result.getJson().perspective[0];
    if (!dperspective) return null;
    if (!dperspective.stored) return null;

    let perspective: Perspective = {
      id: dperspective.xid,
      name: dperspective.name,
      context: dperspective.context,
      origin: dperspective.origin,
      creatorId: dperspective.creator.did,
      timestamp: dperspective.timestamp,
    }
    return perspective;
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
        id: dperspective.xid,
        name: dperspective.name,
        context: dperspective.context,
        origin: dperspective.origin,
        creatorId: dperspective.creator.did,
        timestamp: dperspective.timestamp,
      }
    })
    
    return perspectives;
  }

  async getPerspectiveHead(perspectiveId: string): Promise<string> {
    await this.db.ready();

    const query = `query {
      perspective(func: eq(xid, ${perspectiveId})) {
       head {
         xid
       }
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    let perspectivehead = result.getJson().perspective[0];
    console.log('[DGRAPH] getPerspectiveHead', {query}, result.getJson(), perspectivehead);
    return perspectivehead.head.xid;
  }

  async getCommit(commitId: string): Promise<Commit | null> {
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
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    let dcommit: DgCommit = result.getJson().commit[0];
    console.log('[DGRAPH] getCommit', {query}, result.getJson());
    if (!dcommit) return null;
    if (!dcommit.stored) return null;

    let commit: Commit = {
      id: dcommit.xid,
      creatorId: dcommit.creator.did,
      dataId: dcommit.data.xid,
      timestamp: dcommit.timestamp,
      message: dcommit.message,
      parentsIds: dcommit.parents ? dcommit.parents.map(parent => parent.xid) : []
    }
    return commit;
  }

  async getOrigin():Promise<string> {
    return LOCAL_PROVIDER;
  }
}