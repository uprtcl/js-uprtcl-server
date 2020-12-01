import { SCHEMA } from './schema';

const dgraph = require('dgraph-js');
const grpc = require('grpc');
const Url = require('url-parse');

export const requestToObj = (req: any) => {
  return {
    query: req.getQuery(),
    mutations: req.getMutationsList().map((mutation: any) => {
      return JSON.stringify({
        setNquads: mutation.getSetNquads(),
        delNquads: mutation.getDelNquads(),
      });
    }),
  };
};

export class DGraphService {
  host: string;
  port: string;
  apiKey: string;
  client: any;
  connectionReady: Promise<any>;

  constructor(_host: string, _port: string, _apiKey: string) {
    this.host = _host;
    this.port = _port;
    this.apiKey = _apiKey;
    this.connectionReady = new Promise(async (resolve) => {
      await this.connect();
      // await this.dropAll();
      await this.setSchema();
      console.log('[DGRAPH] Initialized');
      resolve();
    });
  }

  async connect() {
    let clientStub: any;

    if (this.apiKey) {
      let slashql = dgraph.clientStubFromSlashGraphQLEndpoint(
        this.host,
        this.apiKey
      );
      clientStub = slashql;
    } else {
      clientStub = new dgraph.DgraphClientStub(`${this.host}:${this.port}`);
    }

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
        resolve(result);
      } catch (e) {
        console.log('[DGRAPH] error during request', {
          req: requestToObj(req),
          message: e.message,
        });
        let regexp = new RegExp('please retry', 'i');
        if (regexp.test(e.message) && retry < 10) {
          console.log('[DGRAPH] retrying upsert', req.getQuery());
          setTimeout(() => {
            resolve(this.callRequest(req, retry + 1));
          }, 100);
        } else {
          reject();
        }
      }
    });
  }
}
