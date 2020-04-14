import { DGraphService } from "../../db/dgraph.service";
import { UserRepository } from "../user/user.repository";
import { KNOWN_SOURCES_SCHEMA_NAME } from "./knownsources.schema";
import { DATA_SCHEMA_NAME } from "../data/data.schema";
import {
  PERSPECTIVE_SCHEMA_NAME,
  COMMIT_SCHEMA_NAME
} from "../uprtcl/uprtcl.schema";
import { LOCAL_CASID } from '../providers';

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

    return json.element[0]['dgraph.type'] ? json.element[0]['dgraph.type'] : [];
  }

  async addKnownSources(
    elementId: string,
    casIDs: Array<string>
  ): Promise<void> {
    await this.db.ready();

    console.log("[DGRAPH] addKnownSources", { elementId }, { casIDs });

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    casIDs = casIDs.filter(casID => casID !== LOCAL_CASID);

    let query = `element as var(func: eq(elementId, "${elementId}"))`;
    req.setQuery(`query{${query}}`);

    let nquads = `uid(element) <elementId> "${elementId}" .`;
    nquads = nquads.concat(
      `\nuid(element) <dgraph.type> "${KNOWN_SOURCES_SCHEMA_NAME}" .`
    );
    for (let ix = 0; ix < casIDs.length; ix++) {
      nquads = nquads.concat(`\nuid(element) <casIDs> "${casIDs[ix]}" .`);
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
      casIDs(func: eq(elementId, ${elementId})) {
        casIDs
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    console.log("[DGRAPH] getKnownSources", { query }, result.getJson());

    let casIDs =
      result.getJson().casIDs.length > 0
        ? result.getJson().casIDs[0].casIDs
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
        casIDs.push(LOCAL_CASID);
      }

      if (types.some((type: string) => uprtcl_types.includes(type))) {
        casIDs.push(LOCAL_CASID);
      }
    }

    return casIDs;
  }
}
