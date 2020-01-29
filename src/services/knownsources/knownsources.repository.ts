import { DGraphService } from "../../db/dgraph.service";
import { UserRepository } from "../user/user.repository";
import { KNOWN_SOURCES_SCHEMA_NAME } from "./knownsources.schema";
import { DATA_SCHEMA_NAME } from "../data/data.schema";
import {
  PERSPECTIVE_SCHEMA_NAME,
  COMMIT_SCHEMA_NAME
} from "../uprtcl/uprtcl.schema";
import { LOCAL_SOURCE } from '../providers';

const dgraph = require("dgraph-js");
require("dotenv").config();


export class KnownSourcesRepository {
  constructor(protected db: DGraphService) {}

  async getTypes(elementId: string): Promise<string[]> {
    await this.db.ready();

    const query = `query {
      element(func: eq(xid, ${elementId})) {
        dgraph.type
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    let json = result.getJson();
    console.log("[DGRAPH] getGeneric", { query }, JSON.stringify(json));

    return json.element[0].dgraph.type ? json.element[0].dgraph.type : [];
  }

  async addKnownSources(
    elementId: string,
    sources: Array<string>
  ): Promise<void> {
    await this.db.ready();

    console.log("[DGRAPH] addKnownSources", { elementId }, { sources });

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    sources = sources.filter(source => source !== LOCAL_SOURCE);

    let query = `element as var(func: eq(elementId, "${elementId}"))`;
    req.setQuery(`query{${query}}`);

    let nquads = `uid(element) <elementId> "${elementId}" .`;
    nquads = nquads.concat(
      `\nuid(element) <dgraph.type> "${KNOWN_SOURCES_SCHEMA_NAME}" .`
    );
    for (let ix = 0; ix < sources.length; ix++) {
      nquads = nquads.concat(`\nuid(element) <sources> "${sources[ix]}" .`);
    }

    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      "[DGRAPH] addKnownSources",
      { query },
      { nquads },
      result.getUidsMap().toArray()
    );
  }

  async getKnownSources(elementId: string): Promise<Array<string>> {
    await this.db.ready();

    const query = `
    query {
      sources(func: eq(elementId, ${elementId})) {
        sources
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    console.log("[DGRAPH] getKnownSources", { query }, result.getJson());

    let sources =
      result.getJson().sources.length > 0
        ? result.getJson().sources[0].sources
        : [];

    const queryLocal = `
    query {
      element(func: eq(xid, ${elementId})) @filter(eq(stored, true)) {
        xid,
        <dgraph.type>
      }
    }`;

    /** check if there is an xid for this element (it means we have a local copy of it) */
    let resultLocal = await this.db.client.newTxn().query(queryLocal);
    let elements = resultLocal.getJson().element;
    if (elements.length > 0) {
      const types = elements[0]["dgraph.type"];
      const uprtcl_types = [PERSPECTIVE_SCHEMA_NAME, COMMIT_SCHEMA_NAME];
      const data_types = [DATA_SCHEMA_NAME];

      if (types.some((type: string) => data_types.includes(type))) {
        sources.push(LOCAL_SOURCE);
      }

      if (types.some((type: string) => uprtcl_types.includes(type))) {
        sources.push(LOCAL_SOURCE);
      }
    }

    return sources;
  }
}
