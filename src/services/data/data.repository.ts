import { DGraphService } from "../../db/dgraph.service";
import { UserRepository } from "../user/user.repository";
import { localCidConfig } from "../ipld";
import { ipldService } from "../ipld/ipldService";
import {
  DATA_SCHEMA_NAME
} from "./data.schema";
import { Hashed } from "../uprtcl/types";

const dgraph = require("dgraph-js");

export class DataRepository {
  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository
  ) {}

  /** All data objects are stored as textValues, intValues, floatValues and boolValues 
   * or links to other objects, if the value is a valid CID string.
   * The path of the property in the JSON object is stored in a facet */
  async createData(hashedData: Hashed<Object>) {
    await this.db.ready();

    /** Validate ID */
    const data = hashedData.object;
    let id: string;

    if (hashedData.id !== undefined && hashedData.id !== "") {
      let valid = await ipldService.validateCid(hashedData.id, data);
      if (!valid) {
        throw new Error(`Invalid cid ${hashedData.id}`);
      }
      id = hashedData.id;
    } else {
      id = await ipldService.generateCidOrdered(data, localCidConfig);
      console.log("[DGRAPH] createData - create id", { data, id });
    }

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query = `data as var(func: eq(xid, ${id}))`;
    let nquads = `uid(data) <xid> "${id}" .`;

    nquads = nquads.concat(`\nuid(data) <stored> "true" .`);
    nquads = nquads.concat(`\nuid(data) <dgraph.type> "${DATA_SCHEMA_NAME}" .`);
    nquads = nquads.concat(`\nuid(data) <jsonString> "${JSON.stringify(data).replace(/"/g, '\\"')}" .`);

    req.setQuery(`query {${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      "[DGRAPH] createData",
      { query },
      { nquads },
      result.getUidsMap().toArray()
    );
    return id;
  }

  async getData(dataId: string): Promise<Hashed<Object>> {
    await this.db.ready();

    const query = `query {
      data(func: eq(xid, ${dataId})) {
        xid
        stored
        jsonString
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    const json = result.getJson();
    console.log("[DGRAPH] getData", { query, json });

    if (json.data.length === 0) {
      throw new Error(`element with xid ${dataId} not found`)
    } 

    if (json.data.length > 1) {
      throw new Error(`unexpected number of entries ${json.data.length} for xid ${dataId}`);
    }

    if (!json.data[0].stored) {
      throw new Error(`element with xid ${dataId} content not stored`)
    }

    const data = JSON.parse(json.data[0].jsonString);

    console.log(
      "[DGRAPH] getData",
      { query, json, data }
    );

    return {
      id: dataId,
      object: data
    };
  }
}
