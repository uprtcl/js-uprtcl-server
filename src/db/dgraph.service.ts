import { SCHEMA} from "./schema";

const dgraph = require("dgraph-js");
const grpc = require("grpc");

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
  host: string;
  client: any;
  connectionReady: Promise<any>;

  constructor(_host: string) {
    this.host = _host;
    this.connectionReady = new Promise(async (resolve) => {
      await this.connect();
      // await this.dropAll();
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

  async callRequest(req: any, retry: number = 0): Promise<any> {
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
}