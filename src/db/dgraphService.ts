import { Context } from "../services/uprtcl/types";

const dgraph = require("dgraph-js");
const grpc = require("grpc");

export class DGraphService {

  private host: string;
  private client: any;

  constructor(_host: string) {
    this.host = _host;
  }

  connect() {
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
      type Author {
        did: string
      }

      type Context {
        id: xid
        creator: Author
        timestamp: dateTime
        nonce: int
      }
      
      xid: string @index(exact) .
      did: string @index(exact) .
    `;
    const op = new dgraph.Operation();
    op.setSchema(schema);
    return this.client.alter(op);
  }

  async createContext(context: Context) {
    const txn = this.client.newTxn();
    const mu = new dgraph.Mutation();
    
    let dgContext = {
      id: context.id,
      creatorId: context.creatorId,
      timestamp: context.timestamp,
      'dgraph.type': 'context'
    }

    mu.setSetJson(dgContext);
    
    const response = await txn.mutate(mu);
    await txn.commit();
    
    return response.getUidsMap().arr_[0][1];
  }

  async getContext(id: string): Promise<Context> {
    const query = `query all($a: string) {
        all(func: eq(name, $a)) {
            uid
            name
            age
            married
            loc
            dob
            friend {
                name
                age
            }
            school {
                name
            }
        }
    }`;
    const vars = { $id: id };
    return this.client.newTxn().queryWithVars(query, vars);
  }
}