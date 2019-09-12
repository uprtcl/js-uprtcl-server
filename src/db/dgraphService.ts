import { Perspective, Commit, PropertyOrder, DataDto, dataTypeOrder, DataType } from "../services/uprtcl/types";
import { ipldService } from "../services/ipld/ipldService";
import { localCidConfig } from "../services/ipld";
import { linkSync } from "fs";

const dgraph = require("dgraph-js");
const grpc = require("grpc");
let ready = false;

const PERSPECTIVE_SCHEMA_NAME = 'Perspective';
const PROFILE_SCHEMA_NAME = 'Profile';
const COMMIT_SCHEMA_NAME = 'Commit';
const DATA_SCHEMA_NAME = 'Data';
const TEXT_SCHEMA_NAME = 'Text';
const TEXT_NODE_SCHEMA_NAME = 'TextNode';
const DOCUMENT_NODE_SCHEMA_NAME = 'DocumentNode';

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
    let schema = `
      type ${PROFILE_SCHEMA_NAME} {
        did: string
      }

      type ${PERSPECTIVE_SCHEMA_NAME} {
        xid: string
        creator: [${PROFILE_SCHEMA_NAME}]
        context: string
        timestamp: datetime
        nonce: int
      }

      type ${COMMIT_SCHEMA_NAME} {
        xid: string
        creator: [${PROFILE_SCHEMA_NAME}]
        timestamp: datetime
        message: string
        parents: [${COMMIT_SCHEMA_NAME}]
        data: [${DATA_SCHEMA_NAME}]
      }

      type ${DATA_SCHEMA_NAME} {
        xid: string
      }

      type ${TEXT_SCHEMA_NAME} {
        xid: string
        text: string
      }

      type ${TEXT_NODE_SCHEMA_NAME} {
        xid: string
        text: string
        links: [${PERSPECTIVE_SCHEMA_NAME}]
      }

      type ${DOCUMENT_NODE_SCHEMA_NAME} {
        xid: string
        text: string
        node_type: string
        links: [${PERSPECTIVE_SCHEMA_NAME}]
      }
      
      xid: string @index(exact) .
      text: string @index(exact) .
    `;

    const op = new dgraph.Operation();
    op.setSchema(schema);
    return this.client.alter(op);
  }

  ready(): Promise<void> {
    return this.connectionReady;
  }

  async upsertProfile(_did: string) {
    await this.ready();
    /*
    const txn = this.client.newTxn();
    
    let query = `query {
      profile as var(func: eq(did, "${did}"))
    }`;

    let mutation = new dgraph.Mutation();
    mutation.setSetJson({
      "did": did
    });
  
    const req = new dgraph.Request();
    req.setQuery(query);
    req.setMutationsList([mutation]);
    req.setCommitNow(true);
    

     // Update account only if matching uid found.
    const response = await txn.doRequest(req);
    let uid = response.getUidsMap().get(`uid(profile)`);
    return uid;
    */

    const txn = this.client.newTxn();
    const mu = new dgraph.Mutation();

    /** rename id as xid for dgraph external Id */
    let dgProfile: DgProfile = {
      uid: '_:profile',
      did: _did,
      'dgraph.type': PROFILE_SCHEMA_NAME
    }

    mu.setSetJson(dgProfile);

    const response = await txn.mutate(mu);
    await txn.commit(); ''
    let uid = response.getUidsMap().get('profile');
    return uid;
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

    const txn = this.client.newTxn();
    const mu = new dgraph.Mutation();

    let profileUid = await this.upsertProfile(perspective.creatorId);

    /** rename id as xid for dgraph external Id */
    let dgPerspective: DgPerspective = {
      xid: perspective.id,
      name: perspective.name,
      context: perspective.context,
      creator: [{ uid: profileUid }],
      timestamp: perspective.timestamp,
      origin: LOCAL_PROVIDER,
      'dgraph.type': PERSPECTIVE_SCHEMA_NAME
    }

    mu.setSetJson(dgPerspective);

    const response = await txn.mutate(mu);
    const result = await txn.commit(); ''
    return perspective.id;
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

    const txn = this.client.newTxn();
    const mu = new dgraph.Mutation();

    let profileUid = await this.upsertProfile(commit.creatorId);
    let dataUid = ''; // await this.getData();

    /** rename id as xid for dgraph external Id */
    let dgCommit: DgCommit = {
      xid: commit.id,
      creator: [{ uid: profileUid }],
      timestamp: commit.timestamp,
      message: commit.message,
      parents: [], // TODO: efficiently convert list of ids into uids...
      data: [{ uid: dataUid }],
      'dgraph.type': COMMIT_SCHEMA_NAME
    }

    mu.setSetJson(dgCommit);

    const response = await txn.mutate(mu);
    const result = await txn.commit(); ''
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
    }
    `;
    // TODO: issue with variables UNKNOWN: Variable not defined 
    // let vars = {$contextId: $contextId}
    let result = await this.client.newTxn().query(query);
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
        timestamp
      }
    }
    `;
    // TODO: issue with variables UNKNOWN: Variable not defined 
    // let vars = {$contextId: $contextId}
    let result = await this.client.newTxn().query(query);
    let dcommit: DgCommit = result.getJson().commit[0];
    let commit: Commit = {
      id: dcommit.xid,
      creatorId: dcommit.creator[0].did,
      dataId: dcommit.data[0].xid,
      timestamp: dcommit.timestamp,
      message: dcommit.message,
      parentsIds: []
    }
    return commit;
  }

  async createData(dataDto: DataDto) {
    await this.ready();
    
    if (dataDto.id !== '') {
      let valid = await ipldService.validateCid(
        dataDto.id,
        dataDto.data,
        dataTypeOrder(dataDto.type)
      );
      if (!valid) {
        throw new Error(`Invalid cid ${dataDto.id}`);
      }
    } else {
      dataDto.id = await ipldService.generateCidOrdered(
        dataDto.data,
        localCidConfig,
        dataTypeOrder(dataDto.type)
      );
    }

    const txn = this.client.newTxn();
    const mu = new dgraph.Mutation();

    const data = dataDto.data;

    let nquads = `_:data <xid> "${dataDto.id}" .`;

    switch (dataDto.type) {
      case DataType.TEXT:
        nquads = nquads.concat(`\n_:data <dgraph.type> "${TEXT_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\n_:data <text> "${dataDto.data.text}" .`);
        break;

      case DataType.TEXT_NODE:
        nquads = nquads.concat(`\n_:data <dgraph.type> "${TEXT_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\n_:data <dgraph.type> "${TEXT_NODE_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\n_:data <text> "${dataDto.data.text}" .`);
        for (let ix = 0; ix < data.links.length; ix++) {
          nquads = nquads.concat(`\n_:data <link> "${dataDto.data.links[ix]}" (order=${ix}) .`)
        }
        break;

      case DataType.DOCUMENT_NODE:
        nquads = nquads.concat(`\n_:data <dgraph.type> "${TEXT_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\n_:data <dgraph.type> "${TEXT_NODE_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\n_:data <dgraph.type> "${DOCUMENT_NODE_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\n_:data <text> "${dataDto.data.text}" .`);
        nquads = nquads.concat(`\n_:data <doc_node_type> "${dataDto.data.type}" .`);
        for (let ix = 0; ix < data.links.length; ix++) {
          nquads = nquads.concat(`\n_:data <link> "${dataDto.data.links[ix]}" (order=${ix}) .`)
        }
        break;
    }

    mu.setSetNquads(nquads);

    const response = await txn.mutate(mu);
    await txn.commit(); ''
    let uid = response.getUidsMap().get('data');
    // console.log(`[DGRAPH - createData()]`, {uid}, {id: dataDto.id}, {data: dataDto.data});
    return dataDto.id;
  }

  async getData(dataId: string): Promise<any> {
    await this.ready();

    const query = `query {
      data(func: eq(xid, ${dataId})) {
        expand(_all_)
        <dgraph.type>
      }
    }
    `;
    // TODO: issue with variables UNKNOWN: Variable not defined 
    // let vars = {$contextId: $contextId
    let result = await this.client.newTxn().query(query);
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
      data['type'] = ddata['doc_node_type'];
    }

    return data;
  }
}