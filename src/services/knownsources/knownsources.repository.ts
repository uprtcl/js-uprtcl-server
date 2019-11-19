import { DGraphService } from "../../db/dgraph.service";
import { UserRepository } from "../user/user.repository";
import { KNOWN_SOURCES_SCHEMA_NAME } from "./knownsources.schema";

const dgraph = require("dgraph-js");

export const LOCAL_PROVIDER = 'http:evees-v1:localhost';

export class KnownSourcesRepository {

  constructor(
    protected db: DGraphService,
    protected dataRepo: UserRepository,
    protected dataRepo: UserRepository,
    protected dataRepo: UserRepository) {
    
  }

  async getGeneric(elementId: string) {
    await this.db.ready();

    const query = `query {
      element(func: eq(xid, ${elementId})) {
        dgraph.type
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    let json = result.getJson();
    console.log('[DGRAPH] getGeneric', {query}, JSON.stringify(json));
    
    let types: string[] = json.element[0]['dgraph.type'];

    let dataTypes = [
      DATA_SCHEMA_NAME,
      TEXT_SCHEMA_NAME, 
      TEXT_NODE_SCHEMA_NAME, 
      DOCUMENT_NODE_SCHEMA_NAME
    ]

    TBD

    /** if object is data */
    if (dataTypes.includes(types[0])) {
      return this.dataService.getData(elementId);
    } else {
      switch (types[0]) {
        case PERSPECTIVE_SCHEMA_NAME:
          return this.uprtclService.getPerspective(elementId);
        
        case COMMIT_SCHEMA_NAME:
          return this.uprtclService.getCommit(elementId);
      }
    }
    return null;
  }

  async addKnownSources(elementId: string, sources: Array<string>):Promise<void> {
    await this.db.ready();

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

    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] addKnownSources', {query}, {nquads}, result.getUidsMap().toArray());
  }

  async getKnownSources(elementId: string):Promise<Array<string>> {
    await this.db.ready();

    const query = `
    query {
      sources(func: eq(elementId, ${elementId})) {
        sources
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    console.log('[DGRAPH] getKnownSources', {query}, result.getJson());

    let sources = result.getJson().sources.length > 0 ? result.getJson().sources[0].sources : []

    const queryLocal = `
    query {
      element(func: eq(xid, ${elementId})) @filter(eq(stored, true)) {
        xid
      }
    }`;

    /** check if there is an xid for this element (it means we have a local copy of it) */
    let resultLocal = await this.db.client.newTxn().query(queryLocal);
    let elements = resultLocal.getJson().element;
    if (elements.length > 0) sources.push(LOCAL_PROVIDER);

    return sources;
  }
}