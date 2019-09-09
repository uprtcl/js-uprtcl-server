import { Context } from "../services/uprtcl/types";

const dgraph = require("dgraph-js");
const grpc = require("grpc");
let ready = false;

const CONTEXT_SCHEMA_NAME = 'Context';
const AUTHOR_SCHEMA_NAME = 'Author';

interface DgContext {
  xid: string,
  creatorId: string,
  timestamp: number,
  nonce: number,
  'dgraph.type': string
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
      type ${CONTEXT_SCHEMA_NAME} {
        xid: string
        creatorId: string
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

  async createContext(context: Context) {
    await this.ready();
    const txn = this.client.newTxn();
    const mu = new dgraph.Mutation();
    
    /** rename id as xid for dgraph external Id */
    let dgContext: DgContext = {
      xid: context.id,
      creatorId: context.creatorId,
      timestamp: context.timestamp,
      nonce: context.nonce,
      'dgraph.type': CONTEXT_SCHEMA_NAME
    }

    mu.setSetJson(dgContext);
    
    const response = await txn.mutate(mu);
    await txn.commit();''
    return context.id;
  }

  async getContext(contextId: string): Promise<Context> {
    await this.ready();
    const query = `{
      context(func: eq(xid, ${contextId})) {
        expand(_all_) { expand(_all_) }
      }
    }
    `;
    // TODO: issue with variables UNKNOWN: Variable not defined 
    // let vars = {$contextId: $contextId}
    let result = await this.client.newTxn().query(query);
    let dcontext: DgContext = result.getJson().context[0];
    let context: Context = {
      id: dcontext.xid,
      creatorId: dcontext.creatorId,
      nonce: dcontext.nonce,
      timestamp: dcontext.timestamp
    }
    return context;
  }
}