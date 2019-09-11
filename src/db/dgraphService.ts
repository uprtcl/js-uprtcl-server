import { Perspective } from "../services/uprtcl/types";

const dgraph = require("dgraph-js");
const grpc = require("grpc");
let ready = false;

const PERSPECTIVE_SCHEMA_NAME = 'Perspective';
const PROFILE_SCHEMA_NAME = 'Profile';
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
      
      xid: string @index(exact) .
    `;

    const op = new dgraph.Operation();
    op.setSchema(schema);
    return this.client.alter(op);
  }

  ready(): Promise<void> {
    return this.connectionReady;
  }

  async upsertProfile(_did: string) {
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
   await txn.commit();''
   let uid = response.getUidsMap().get('profile');
   return uid;
  }

  async createPerspective(perspective: Perspective) {
    await this.ready();

    debugger
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
    const result = await txn.commit();''
    return perspective.id;
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
}