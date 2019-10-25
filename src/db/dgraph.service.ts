import { Perspective, Commit, PropertyOrder, DataDto, dataTypeOrder, DataType } from "../services/uprtcl/types";
import { ipldService } from "../services/ipld/ipldService";
import { localCidConfig } from "../services/ipld";
import { 
  SCHEMA, 
  PROFILE_SCHEMA_NAME, 
  PERSPECTIVE_SCHEMA_NAME, 
  COMMIT_SCHEMA_NAME, 
  TEXT_SCHEMA_NAME, 
  TEXT_NODE_SCHEMA_NAME, 
  DOCUMENT_NODE_SCHEMA_NAME, 
  DATA_SCHEMA_NAME,
  KNOWN_SOURCES_SCHEMA_NAME,
  ACCESS_CONFIG_SCHEMA_NAME,
  PERMISSIONS_SCHEMA_NAME} from "./schema";

const dgraph = require("dgraph-js");
const grpc = require("grpc");
let ready = false;

const LOCAL_PROVIDER = 'https://www.collectiveone.org/uprtcl/1';

export enum PermissionType {
  Read = 'Read',
  Write = 'Write',
  Admin = 'Admin'
}

export interface PermissionConfig {
  publicRead: boolean,
  publicWrite: boolean,
  canRead?: string[],
  canWrite?: string[],
  canAdmin?: string[],
}

export interface AccessConfig {
  uid?: string,
  delegate: boolean,
  delegateTo?: string,
  finDelegatedTo?: string,
  permissionsUid: string
}

export interface DataC1If {
  id: string;
  type: string;
  jsonData: string;
}

interface DgRef {
  [x: string]: string;
  uid: string
}

interface DgProfile {
  uid?: string,
  did: string,
  nonce: string,
  'dgraph.type'?: string
}

interface DgPerspective {
  uid?: string,
  xid: string,
  name: string,
  context: string,
  origin: string,
  creator: Array<DgRef>,
  timestamp: number,
  'dgraph.type'?: string,
  stored: boolean
}

interface DgCommit {
  uid?: string,
  xid: string,
  creator: Array<DgRef>,
  timestamp: number,
  message: string,
  parents: Array<DgRef>,
  data: Array<DgRef>,
  'dgraph.type'?: string,
  stored: boolean
}

interface DgData {
  uid?: string,
  xid: string,
  'dgraph.type'?: string,
  stored: boolean
}

export const requestToObj = (req: any) => {
  return {
    query: req.getQuery(),
    mutations: req.getMutationsList().map((mutation: any) => {
      return JSON.stringify({
        setNquads: mutation.getSetNquads(),
        delNquads: mutation.getDelNquads()
      })
    })
  }
}

export class DGraphService {
  private host: string;
  private client: any;
  connectionReady: Promise<any>;

  constructor(_host: string) {
    this.host = _host;
    this.connectionReady = new Promise(async (resolve) => {
      await this.connect();
      await this.dropAll();
      await this.setSchema();
      console.log('[DGRAPH] Initialized');
      resolve();
    })
  }

  async connect() {
    let clientStub = new dgraph.DgraphClientStub(this.host, grpc.credentials.createInsecure());
    this.client = new dgraph.DgraphClient(clientStub);
  }

  async dropAll() {
    const op = new dgraph.Operation();
    op.setDropAll(true);
    return this.client.alter(op);
  }

  async setSchema() {
    let schema = SCHEMA;

    const op = new dgraph.Operation();
    op.setSchema(schema);
    return this.client.alter(op);
  }

  ready(): Promise<void> {
    return this.connectionReady;
  }

  private async callRequest(req: any, retry: number = 0): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        let tx = await this.client.newTxn();
        let result = await tx.doRequest(req);
        await tx.commit();
        resolve(result)
      } catch (e) {
        console.log('[DGRAPH] error during request', {req: requestToObj(req), message: e.message})
        let regexp = new RegExp('please retry', 'i');
        if(regexp.test(e.message) && retry < 10) {
          console.log('[DGRAPH] retrying upsert', req.getQuery())
          setTimeout(() => {
            resolve(this.callRequest(req, retry + 1))
          }, 100);
        } else {
          reject()
        }
      }
    })
  }

  async upsertProfile(did: string):Promise<void> {
    await this.ready();
    
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query = `profile as var(func: eq(did, "${did}"))`;
  
    req.setQuery(`query{${query}}`);

    let nquads = `uid(profile) <did> "${did}" .`;
    nquads = nquads.concat(`\nuid(profile) <dgraph.type> "${PROFILE_SCHEMA_NAME}" .`);

    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    
    let result = await this.callRequest(req);
    console.log('[DGRAPH] upsertProfile', {query}, {nquads}, result.getUidsMap().toArray());
  }

  /** set nonce on user. it craetes the user Did if it does not exist */
  async setUserNonce(did: string, nonce: string):Promise<void> {
    await this.ready();

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query = `profile as var(func: eq(did, "${did}"))`;
    req.setQuery(`query{${query}}`);

    let nquads = `uid(profile) <did> "${did}" .`;
    nquads = nquads.concat(`\nuid(profile) <nonce> "${nonce}" .`);
    nquads = nquads.concat(`\nuid(profile) <dgraph.type> "${PROFILE_SCHEMA_NAME}" .`);

    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    
    let result = await this.callRequest(req);
    console.log('[DGRAPH] setUserNonce', {query}, {nquads}, result.getUidsMap().toArray());

  }

  /**  */
  async getNonce(did: string):Promise<string | null> {
    await this.ready();
    const query = `query {
      profile(func: eq(did, "${did}")) {
        nonce
      }
    }`;

    let result = await this.client.newTxn().query(query);
    console.log('[DGRAPH] getNonce', {query}, result.getJson());
    let dprofile: DgProfile = result.getJson().profile[0];
    if (!dprofile) return null;
    if (!dprofile.nonce) return null;

    return dprofile.nonce;
  }

  async createPerspective(perspective: Perspective) {
    await this.ready();

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
    await this.upsertProfile(perspective.creatorId);
    
    let query = `profile as var(func: eq(did, "${perspective.creatorId}"))`;
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
    
    let result = await this.callRequest(req);
    console.log('[DGRAPH] createPerspective', {query}, {nquads}, result.getUidsMap().toArray());
    return perspective.id;
  }

  async createPermissionsConfig(permissions: PermissionConfig) {
    await this.ready();
    
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** commit object might exist because of parallel update head call */
    let query = ``;
    
    let nquads = `_:permissions <publicRead> "${permissions.publicRead}" .`;
    nquads = nquads.concat(`\n_:permissions <dgraph.type> "${PERMISSIONS_SCHEMA_NAME}" .`);
    nquads = nquads.concat(`\n_:permissions <publicWrite> "${permissions.publicRead}" .`);
    
    if (permissions.canRead) {
      for (let ix = 0; ix < permissions.canRead.length; ix++) {
        await this.upsertProfile(permissions.canRead[ix]);
        query = query.concat(`\ncanRead${ix} as var(func: eq(did, "${permissions.canRead[ix]}"))`);
        nquads = nquads.concat(`\n_:permissions <canRead> uid(canRead${ix}) .`);  
      }
    }

    if (permissions.canWrite) {
      for (let ix = 0; ix < permissions.canWrite.length; ix++) {
        await this.upsertProfile(permissions.canWrite[ix]);
        query = query.concat(`\ncanWrite${ix} as var(func: eq(did, "${permissions.canWrite[ix]}"))`);
        nquads = nquads.concat(`\n_:permissions <canWrite> uid(canWrite${ix}) .`);  
      }
    }

    if (permissions.canAdmin) {
      for (let ix = 0; ix < permissions.canAdmin.length; ix++) {
        await this.upsertProfile(permissions.canAdmin[ix]);
        query = query.concat(`\ncanAdmin${ix} as var(func: eq(did, "${permissions.canAdmin[ix]}"))`);
        nquads = nquads.concat(`\n_:permissions <canAdmin> uid(canAdmin${ix}) .`);  
      }
    }

    if (query !== '') req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    
    let result = await this.callRequest(req);
    console.log('[DGRAPH] createPermissionsSet', {query}, {nquads}, result.getUidsMap().toArray());
    return result.getUidsMap().toArray()[0][1];
  }

  /** updates the pointer of the accessControl node of an elementId to point 
   * to a new permissionsConfig node. */
  async setPermissionsConfigOf(elementId: string, permUid: string) {
    await this.ready();
    
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** commit object might exist because of parallel update head call */
    let query = `\naccessConfig as var(func: eq(xid, ${elementId}))`;
    let nquads = `uid(accessConfig) <permissions> "${permUid}" .`;

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.callRequest(req);
    console.log('[DGRAPH] createPermissionsSet', {query}, {nquads}, result.getUidsMap().toArray());
    return result.getUidsMap().toArray()[0];
  }

  async can(elementId: string, userId: string, type: PermissionType) : Promise<boolean> {
    let query = `
    element(func: eq(xid, "${elementId}")) {
      accessConfig {
        permissions {
          canRead @filter(eq(did, "${userId}")) {
            count(uid)
          }
          canWrite @filter(eq(did, "${userId}")) {
            count(uid)
          }
          canAdmin @filter(eq(did, "${userId}")) {
            count(uid)
          }
        }
      }
    }`;

    let result = await this.client.newTxn().query(`query{${query}}`);
    let json = result.getJson();
    let can: boolean;
    /** canAdmin > canWrite > canRead */
    switch (type) {
      case PermissionType.Read:
        can = (json.element[0].accessConfig[0].permissions[0].canRead ? json.element[0].accessConfig[0].permissions[0].canRead[0].count > 0 : false) ||
          (json.element[0].accessConfig[0].permissions[0].canWrite? json.element[0].accessConfig[0].permissions[0].canWrite[0].count > 0 : false) ||
          (json.element[0].accessConfig[0].permissions[0].canAdmin? json.element[0].accessConfig[0].permissions[0].canAdmin[0].count > 0 : false);
        break;

      case PermissionType.Write:
        can = (json.element[0].accessConfig[0].permissions[0].canWrite? json.element[0].accessConfig[0].permissions[0].canWrite[0].count > 0 : false) ||
          (json.element[0].accessConfig[0].permissions[0].canAdmin? json.element[0].accessConfig[0].permissions[0].canAdmin[0].count > 0 : false);
        break;

      case PermissionType.Admin:
        can = (json.element[0].accessConfig[0].permissions[0].canAdmin? json.element[0].accessConfig[0].permissions[0].canAdmin[0].count > 0 : false);
        break;

      default: 
        can = false;
    }

    console.log(`[DGRAPH] isRole ${type}`, {elementId, userId}, JSON.stringify(json), {can});
    return can;
  }

  /** only accessible to an admin */
  async getPermissionsConfig(permissionsUid: string) : Promise<PermissionConfig> {
    let query = `
    permissions(func: uid(${permissionsUid})) {
      expand(_all_)
    }
    `
    
    let result = await this.client.newTxn().query(`query{${query}}`);
    console.log('[DGRAPH] getPermissionsConfig', {permissionsUid}, result.getJson());

    let dpermissionsConfig = result.getJson().permissions[0]

    return {
      publicRead: dpermissionsConfig.publicRead,
      publicWrite: dpermissionsConfig.publicWrite,
      canRead: dpermissionsConfig.canRead.map((el:any) => el.did),
      canWrite: dpermissionsConfig.canWrite.map((el:any) => el.did),
      canAdmin: dpermissionsConfig.canAdmin.map((el:any) => el.did),
    };
  }

  /** TODO: protect getAccessConnfig to admins of the element */
  async getAccessConfigOfElement(elementId: string, userId: string | null) : Promise<AccessConfig> {
    let query = `
    permissions(func: eq(xid, ${elementId})) {
      accessConfig {
        uid
        delegate
        delegateTo
        finDelegatedTo
        permissions {
          uid
        }
      }
    }
    `
    
    let result = await this.client.newTxn().query(`query{${query}}`);
    console.log('[DGRAPH] getAccessConfigOfElement', {elementId, userId}, result.getJson());
    let daccessConfig = result.getJson().permissions[0].accessConfig;

    return {
      uid: daccessConfig.uid,
      delegate: daccessConfig.delegate,
      delegateTo: daccessConfig.delegateTo,
      finDelegatedTo: daccessConfig.finDelegatedTo,
      permissionsUid: daccessConfig.permissions[0].uid,
    };
  }

  async isPublic(elementId: string, type: PermissionType) : Promise<boolean> {
    if (type === PermissionType.Admin) return false;

    let query = `
    element(func: eq(xid, ${elementId})) {
      accessConfig {
        permissions {
          public${type}
        }
      }
    }
    `
    
    let result = await this.client.newTxn().query(`query{${query}}`);
    console.log(`[DGRAPH] isPublic ${type}`, {elementId}, result.getJson());
    return result.getJson().element[0].accessConfig[0].permissions[0][`public${type}`];
  }

  async createAccessConfig(accessConfig: AccessConfig): Promise<string> {
    await this.ready();
    
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** commit object might exist because of parallel update head call */
    let nquads = `_:accessConfig <permissions> <${accessConfig.permissionsUid}> .`;
    nquads = nquads.concat(`\n_:accessConfig <dgraph.type> "${ACCESS_CONFIG_SCHEMA_NAME}" .`);
    nquads = nquads.concat(`\n_:accessConfig <delegate> "${accessConfig.delegate}" .`);
    if (accessConfig.delegateTo) nquads = nquads.concat(`\n_:accessConfig <delegateTo> <${accessConfig.delegateTo}> .`);
    if (accessConfig.finDelegatedTo) nquads = nquads.concat(`\n_:accessConfig <finDelegatedTo> <${accessConfig.finDelegatedTo}> .`);
    
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    
    let result = await this.callRequest(req);
    console.log('[DGRAPH] createAccessConfig', {nquads}, result.getUidsMap().toArray());
    return result.getUidsMap().toArray()[0][1];
  }

  async setAccessConfigOf(elementId: string, accessConfigUid: string): Promise<void> {
    await this.ready();
    
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** make sure creatorId exist */
    let query = `element as var(func: eq(xid, "${elementId}"))`;
    let nquads = `uid(element) <accessConfig> <${accessConfigUid}> .`;

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.callRequest(req);
    console.log('[DGRAPH] setAccessConfigOf', {query}, {nquads}, result.getUidsMap().toArray());
  }

  async getFinallyDelegatedFrom(elementId: string) {
    let query = `elements(
      func: eq(~finalDeletegate, "${elementId}") {
        xid
      }
    )`

    let result = await this.client.newTxn().query(`query{${query}}`);
    console.log('[DGRAPH] getFinallyDelegatedFrom', {elementId}, result.getJson());
    return [elementId].concat(result.getJson().elements.map((dpersp: any) => dpersp.xid));
  }

  async deleteHead(perspectiveId: string):Promise<void> {
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** make sure creatorId exist */
    let query = `perspective as var(func: eq(xid, "${perspectiveId}"))`;
    req.setQuery(`query{${query}}`);

    let delnquads = `uid(perspective) <head> * .`;
    
    mu.setDelNquads(delnquads);
    req.setMutationsList([mu]);

    let result = await this.callRequest(req);
    console.log('[DGRAPH] deleteHead', {query}, {delnquads}, result.getUidsMap().toArray());
  }

  async updatePerspective(perspectiveId: string, headId: string):Promise<void> {
    await this.ready();

    /** delete previous head */
    await this.deleteHead(perspectiveId);

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** make sure creatorId exist */
    let query = `perspective as var(func: eq(xid, "${perspectiveId}"))`;
    query = query.concat(`\nhead as var(func: eq(xid, "${headId}"))`)
    req.setQuery(`query{${query}}`);

    let nquads = `uid(perspective) <xid> "${perspectiveId}" .`;
    nquads = nquads.concat(`\nuid(perspective) <head> uid(head) .`);
    /** set the head xid in case its was not created */
    nquads = nquads.concat(`\nuid(head) <xid> "${headId}" .`);+
    
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.callRequest(req);
    console.log('[DGRAPH] updatePerspective', {query}, {nquads}, result.getUidsMap().toArray());
  }

  async createCommit(commit: Commit) {
    await this.ready();
    
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
    await this.upsertProfile(commit.creatorId);
    
    /** commit object might exist because of parallel update head call */
    let query = `\ncommit as var(func: eq(xid, ${commit.id}))`;
    
    query = query.concat(`\ndata as var(func: eq(xid, "${commit.dataId}"))`);
    query = query.concat(`\nprofile as var(func: eq(did, "${commit.creatorId}"))`);
  
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

    let result = await this.callRequest(req);
    console.log('[DGRAPH] createCommit', {query}, {nquads}, result.getUidsMap().toArray());
    return commit.id;
  }

  async getPerspective(perspectiveId: string): Promise<Perspective | null> {
    await this.ready();
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

    let result = await this.client.newTxn().query(query);
    console.log('[DGRAPH] getPerspective', {query}, result.getJson());
    let dperspective: DgPerspective = result.getJson().perspective[0];
    if (!dperspective) return null;
    if (!dperspective.stored) return null;

    let perspective: Perspective = {
      id: dperspective.xid,
      name: dperspective.name,
      context: dperspective.context,
      origin: dperspective.origin,
      creatorId: dperspective.creator[0].did,
      timestamp: dperspective.timestamp,
    }
    return perspective;
  }

  async getContextPerspectives(context: string):Promise<Perspective[]> {
    await this.ready();
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

    let result = await this.client.newTxn().query(query);
    console.log('[DGRAPH] getContextPerspectives', {query}, result.getJson());
    let perspectives = result.getJson().perspective.map((dperspective: DgPerspective):Perspective => {
      return {
        id: dperspective.xid,
        name: dperspective.name,
        context: dperspective.context,
        origin: dperspective.origin,
        creatorId: dperspective.creator[0].did,
        timestamp: dperspective.timestamp,
      }
    })
    
    return perspectives;
  }

  async getPerspectiveHead(perspectiveId: string): Promise<string> {
    await this.ready();

    const query = `query {
      perspective(func: eq(xid, ${perspectiveId})) {
       head {
         xid
       }
      }
    }`;

    let result = await this.client.newTxn().query(query);
    let perspectivehead = result.getJson().perspective[0];
    console.log('[DGRAPH] getPerspectiveHead', {query}, result.getJson(), perspectivehead);
    return perspectivehead.head[0].xid;
  }

  async getCommit(commitId: string): Promise<Commit | null> {
    await this.ready();
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

    let result = await this.client.newTxn().query(query);
    let dcommit: DgCommit = result.getJson().commit[0];
    console.log('[DGRAPH] getCommit', {query}, result.getJson());
    if (!dcommit) return null;
    if (!dcommit.stored) return null;

    let commit: Commit = {
      id: dcommit.xid,
      creatorId: dcommit.creator[0].did,
      dataId: dcommit.data[0].xid,
      timestamp: dcommit.timestamp,
      message: dcommit.message,
      parentsIds: dcommit.parents ? dcommit.parents.map(parent => parent.xid) : []
    }
    return commit;
  }

  async createData(dataDto: DataDto) {
    await this.ready();

    const data = JSON.parse(dataDto.jsonData);

    if (dataDto.id !== '') {
      let valid = await ipldService.validateCid(
        dataDto.id,
        data,
        dataTypeOrder(dataDto.type)
      );
      if (!valid) {
        throw new Error(`Invalid cid ${dataDto.id}`);
      }
    } else {
      dataDto.id = await ipldService.generateCidOrdered(
        data,
        localCidConfig,
        dataTypeOrder(dataDto.type)
      );
    }

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();
    
    let query = `data as var(func: eq(xid, ${dataDto.id}))`;

    let nquads = `uid(data) <xid> "${dataDto.id}" .`;
    nquads = nquads.concat(`\nuid(data) <stored> "true" .`);
    nquads = nquads.concat(`\nuid(data) <dgraph.type> "${DATA_SCHEMA_NAME}" .`);

    switch (dataDto.type) {
      case DataType.DOCUMENT_NODE:
        nquads = nquads.concat(`\nuid(data) <dgraph.type> "${DOCUMENT_NODE_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\nuid(data) <doc_node_type> "${data.doc_node_type}" .`);
        /** NO BREAK */

      case DataType.TEXT_NODE:
        /** get and set the uids of the links */
        for (let ix = 0; ix < data.links.length; ix++) {
          query = query.concat(`\nlinks${ix} as var(func: eq(xid, ${data.links[ix]}))`);
          nquads = nquads.concat(`\nuid(data) <links> uid(links${ix}) .`);
          /** set the link xid in case it was not created */
          nquads = nquads.concat(`\nuid(links${ix}) <xid> "${data.links[ix]}" .`);
        }
        
        nquads = nquads.concat(`\nuid(data) <dgraph.type> "${TEXT_NODE_SCHEMA_NAME}" .`);
        /** NO BREAK */
  
      case DataType.TEXT:
        nquads = nquads.concat(`\nuid(data) <dgraph.type> "${TEXT_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\nuid(data) <text> "${data.text}" .`);
        break;
    }

    req.setQuery(`query {${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.callRequest(req);
    console.log('[DGRAPH] createData', {query}, {nquads}, result.getUidsMap().toArray());
    return dataDto.id;
  }

  async getData(dataId: string): Promise<DataC1If | null> {
    await this.ready();

    const query = `query {
      data(func: eq(xid, ${dataId})) {
        xid
        text
        links {
          xid
        }
        doc_node_type
        stored
        <dgraph.type>
      }
    }`;
    
    let result = await this.client.newTxn().query(query);
    console.log('[DGRAPH] getData', {query}, result.getJson());

    let ddata = result.getJson().data[0];

    if (!ddata) return null;
    if (!ddata.stored) return null;

    let data: any = {};
    let c1Type = '';

    let dgraphTypes = ddata['dgraph.type'];

    if (dgraphTypes.includes(TEXT_SCHEMA_NAME)) {
      data['text'] = ddata.text;
    }

    if (dgraphTypes.includes(TEXT_NODE_SCHEMA_NAME)) {
      data['links'] = ddata.links ? ddata['links'].map((link: { xid: any; }) => link.xid) : [];
    }

    if (dgraphTypes.includes(DOCUMENT_NODE_SCHEMA_NAME)) {
      data['doc_node_type'] = ddata['doc_node_type'];
      c1Type = 'DOCUMENT_NODE';
    }

    return {
      id: ddata.xid,
      jsonData: JSON.stringify(data),
      type: c1Type
    }
  }

  async addKnownSources(elementId: string, sources: Array<string>):Promise<void> {
    await this.ready();

    console.log('[DGRAPH] addKnownSources', {elementId}, {sources});

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    sources = sources.filter(source => source !== LOCAL_PROVIDER);
    
    let query = `element as var(func: eq(elementId, "${elementId}"))`;
    req.setQuery(`query{${query}}`);

    let nquads = `uid(element) <elementId> "${elementId}" .`;
    nquads = nquads.concat(`\nuid(element) <dgraph.type> "${KNOWN_SOURCES_SCHEMA_NAME}" .`);
    for (let ix = 0; ix < sources.length; ix++) {
      nquads = nquads.concat(`\nuid(element) <sources> "${sources[ix]}" .`);
    }
    
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.callRequest(req);
    console.log('[DGRAPH] addKnownSources', {query}, {nquads}, result.getUidsMap().toArray());
  }

  async getKnownSources(elementId: string):Promise<Array<string>> {
    await this.ready();

    const query = `
    query {
      sources(func: eq(elementId, ${elementId})) {
        sources
      }
    }`;

    let result = await this.client.newTxn().query(query);
    console.log('[DGRAPH] getKnownSources', {query}, result.getJson());

    let sources = result.getJson().sources.length > 0 ? result.getJson().sources[0].sources : []

    const queryLocal = `
    query {
      element(func: eq(xid, ${elementId})) @filter(eq(stored, true)) {
        xid
      }
    }`;

    /** check if there is an xid for this element (it means we have a local copy of it) */
    let resultLocal = await this.client.newTxn().query(queryLocal);
    let elements = resultLocal.getJson().element;
    if (elements.length > 0) sources.push(LOCAL_PROVIDER);

    return sources;
  }

  async getOrigin():Promise<string> {
    return LOCAL_PROVIDER;
  }
}