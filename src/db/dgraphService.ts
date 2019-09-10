import { Context } from "../services/uprtcl/types";

const dgraph = require("dgraph-js");
const grpc = require("grpc");
let ready = false;

const CONTEXT_SCHEMA_NAME = 'Context';
const PROFILE_SCHEMA_NAME = 'Profile';

interface DgProfile {
  uid?: string,
  did: string,
  'dgraph.type'?: string
}

interface DgContext {
  uid?: string,
  xid: string,
  creator: Array<DgProfile>,
  timestamp: number,
  nonce: number,
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

      type ${CONTEXT_SCHEMA_NAME} {
        xid: string
        creator: string
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

  async createContext(context: Context) {
    await this.ready();

    debugger
    const txn = this.client.newTxn();
    const mu = new dgraph.Mutation();

    let profileUid = await this.upsertProfile(context.creatorId);
    
    /** rename id as xid for dgraph external Id */
    let dgContext: DgContext = {
      xid: context.id,
      creator: [{ uid: profileUid, did: context.creatorId }],
      timestamp: context.timestamp,
      nonce: context.nonce,
      'dgraph.type': CONTEXT_SCHEMA_NAME
    }

    mu.setSetJson(dgContext);
    
    const response = await txn.mutate(mu);
    const result = await txn.commit();''
    return context.id;
  }

  async getContext(contextId: string): Promise<Context> {
    await this.ready();
    const query = `query {
      context(func: eq(xid, ${contextId})) {
        xid,
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
    let dcontext: DgContext = result.getJson().context[0];
    let context: Context = {
      id: dcontext.xid,
      creatorId: dcontext.creator[0].did,
      nonce: dcontext.nonce,
      timestamp: dcontext.timestamp
    }
    return context;
  }
}