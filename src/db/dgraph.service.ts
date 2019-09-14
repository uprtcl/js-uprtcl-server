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
  KNOWN_SOURCES_SCHEMA_NAME} from "./schema";

const dgraph = require("dgraph-js");
const grpc = require("grpc");
let ready = false;

const LOCAL_PROVIDER = 'http://collectiveone.org/uprtcl/1';

interface DgRef {
  [x: string]: string;
  uid: string
}

interface DgProfile {
  uid?: string,
  did: string,
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
  'dgraph.type'?: string
}

interface DgCommit {
  uid?: string,
  xid: string,
  creator: Array<DgRef>,
  timestamp: number,
  message: string,
  parents: Array<DgRef>,
  data: Array<DgRef>,
  'dgraph.type'?: string
}

interface DgData {
  uid?: string,
  xid: string,
  'dgraph.type'?: string
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
        let result = await this.client.newTxn().doRequest(req);
        resolve(result)
      } catch (e) {
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
    req.setCommitNow(true);

    let result = await this.callRequest(req);
    console.log('[DGRAPH] upsertProfile', {query}, {nquads}, result.getUidsMap().toArray());
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
    nquads = nquads.concat(`\n_:perspective <name> "${perspective.name}" .`);
    nquads = nquads.concat(`\n_:perspective <context> "${perspective.context}" .`);
    nquads = nquads.concat(`\n_:perspective <creator> uid(profile) .`);
    nquads = nquads.concat(`\n_:perspective <timestamp> "${perspective.timestamp}"^^<xs:int> .`);
    nquads = nquads.concat(`\n_:perspective <origin> "${LOCAL_PROVIDER}" .`);
    nquads = nquads.concat(`\n_:perspective <dgraph.type> "${PERSPECTIVE_SCHEMA_NAME}" .`);
    
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    req.setCommitNow(true);

    let result = await this.callRequest(req);
    console.log('[DGRAPH] createPerspective', {query}, {nquads}, result.getUidsMap().toArray());
    return perspective.id;
  }

  async updatePerspective(perspectiveId: string, headId: string):Promise<void> {
    await this.ready();

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** make sure creatorId exist */
    let query = `perspective as var(func: eq(xid, "${perspectiveId}"))`;
    query = query.concat(`\nhead as var(func: eq(xid, "${headId}"))`)
    req.setQuery(`query{${query}}`);

    let nquads = `uid(perspective) <xid> "${perspectiveId}" .`;
    nquads = nquads.concat(`\nuid(perspective) <head> uid(head) .`);
    
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    req.setCommitNow(true);

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
    
    let query = ``;
    if (commit.parentsIds.length > 0) query = query.concat(`\nparents as var(func: eq(xid, [${commit.parentsIds.join(' ')}]))`);
    query = query.concat(`\ndata as var(func: eq(xid, "${commit.dataId}"))`);
    query = query.concat(`\nprofile as var(func: eq(did, "${commit.creatorId}"))`);
  
    req.setQuery(`query{${query}}`);

    let nquads = `_:commit <xid> "${commit.id}" .`;
    nquads = nquads.concat(`\n_:commit <dgraph.type> "${COMMIT_SCHEMA_NAME}" .`);
    nquads = nquads.concat(`\n_:commit <message> "${commit.message}" .`);
    nquads = nquads.concat(`\n_:commit <creator> uid(profile) .`);
    nquads = nquads.concat(`\n_:commit <timestamp> "${commit.timestamp}"^^<xs:int> .`);
    if (commit.parentsIds.length > 0) nquads = nquads.concat(`\n_:commit <parents> uid(parents) .`)
    nquads = nquads.concat(`\n_:commit <data> uid(data) .`)
    
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    req.setCommitNow(true);

    let result = await this.callRequest(req);
    console.log('[DGRAPH] createCommit', {query}, {nquads}, result.getUidsMap().toArray());
    return commit.id;
  }

  async getPerspective(perspectiveId: string): Promise<Perspective> {
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
      }
    }`;

    let result = await this.client.newTxn().query(query);
    console.log('[DGRAPH] getPerspective', {query}, result.getJson());
    let dperspective: DgPerspective = result.getJson().perspective[0];
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
    console.log('[DGRAPH] getPerspectiveHead', {query}, result.getJson());
    let perspectivehead = result.getJson().perspective[0];
    return perspectivehead.head[0].xid;
  }

  async getCommit(commitId: string): Promise<Commit> {
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
      }
    }`;

    let result = await this.client.newTxn().query(query);
    let dcommit: DgCommit = result.getJson().commit[0];
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
    nquads = nquads.concat(`\nuid(data) <dgraph.type> "${DATA_SCHEMA_NAME}" .`);

    switch (dataDto.type) {
      case DataType.DOCUMENT_NODE:
        nquads = nquads.concat(`\nuid(data) <dgraph.type> "${DOCUMENT_NODE_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\nuid(data) <doc_node_type> "${data.doc_node_type}" .`);
        /** NO BREAK */

      case DataType.TEXT_NODE:
        /** get the uids of the links (they must exist!) */
        if (data.links.length > 0) query = query.concat(`\nlinks as var(func: eq(xid, [${data.links.join(' ')}]))`);

        nquads = nquads.concat(`\nuid(data) <dgraph.type> "${TEXT_NODE_SCHEMA_NAME}" .`);
        /** set links to uids of the links */
        if (data.links.length > 0) nquads = nquads.concat(`\nuid(data) <links> uid(links) .`)
        /** NO BREAK */
  

      case DataType.TEXT:
        nquads = nquads.concat(`\nuid(data) <dgraph.type> "${TEXT_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\nuid(data) <text> "${data.text}" .`);
        break;
      
    }
    req.setQuery(`query {${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    req.setCommitNow(true);

    let result = await this.callRequest(req);
    console.log('[DGRAPH] createData', {query}, {nquads}, result.getUidsMap().toArray());
    return dataDto.id;
  }

  async getData(dataId: string): Promise<any> {
    await this.ready();

    const query = `query {
      data(func: eq(xid, ${dataId})) @recurse {
        xid
        text
        links
        doc_node_type
        <dgraph.type>
      }
    }`;
    
    let result = await this.client.newTxn().query(query);
    console.log('[DGRAPH] getData', {query}, result.getJson());

    let ddata = result.getJson().data[0];

    let data: any = {};

    data['id'] = ddata.xid;

    let dgraphTypes = ddata['dgraph.type'];

    if (dgraphTypes.includes(TEXT_SCHEMA_NAME)) {
      data['text'] = ddata.text;
    }

    if (dgraphTypes.includes(TEXT_NODE_SCHEMA_NAME)) {
      data['links'] = ddata['links'];
    }

    if (dgraphTypes.includes(DOCUMENT_NODE_SCHEMA_NAME)) {
      data['doc_node_type'] = ddata['doc_node_type'];
    }

    return data;
  }

  async addKnownSources(elementId: string, sources: Array<string>):Promise<void> {
    await this.ready();

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
    req.setCommitNow(true);

    let result = await this.client.newTxn().doRequest(req);
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
      element(func: eq(xid, ${elementId})) {
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