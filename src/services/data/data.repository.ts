import { DGraphService } from "../../db/dgraph.service";
import { UserRepository } from "../user/user.repository";
import { localCidConfig } from "../ipld";
import { ipldService } from "../ipld/ipldService";
import {
  DATA_SCHEMA_NAME
} from "./data.schema";
import { Hashed } from "../uprtcl/types";

const dgraph = require("dgraph-js");
var CID  = require('cids');

export interface DataC1If {
  id: string;
  type: string;
  jsonData: string;
}

function objectToNquads(
  object: any,
  oid: string,
  path: string,
  nquads: string[],
  queries: string[]
): void {
  if (typeof object !== "object" || object instanceof Array) {
    switch (typeof object) {
      case "string":
        /** any string that is a valid CID is considered a link! */
        if (CID.isCID(new CID(object))) {
          const linkBlankUid = `links${path}`;
          queries.push(`${linkBlankUid} as var(func: eq(xid, ${object}))`);
          nquads.push(`${oid} <links> uid(${linkBlankUid}) (path=${path}) .`);
          /** initialized the xid in case its not stored */
          nquads.push(`uid(${linkBlankUid}) <xid> "${object}" .`);
        } else {
          nquads.push(`${oid} <stringValues> "${object}" (path=${path}) .`);
        }
        break;

      case "number":
        const type = Number.isInteger(object) ? "intValues" : "floatValues";
        nquads.push(`${oid} <${type}> "${object}" (path=${path}) .`);
        break;

      case "boolean":
        nquads.push(`${oid} <boolValues> "${object}" (path=${path}) .`);
        break;
    }
    return;
  }
  const keys = Object.keys(object);
  for (let i = 0; i < keys.length; i++) {
    const subpath = object instanceof Array ? `[${keys[i]}]` : keys[i];
    objectToNquads(object[keys[i]], oid, `${path}.${subpath}`, nquads, queries);
  };
}

function valuesToObject(values: Object) : Object {
  console.log(JSON.stringify(values));
  return {};
}

export class DataRepository {
  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository
  ) {}

  /** All data objects are stored as textValues, intValues, floatValues and boolValues 
   * or links to other objects, if the value is a valid CID string.
   * The path of the property in the JSON object is stored in a facet */
  async createData(dataDto: Hashed<any>) {
    await this.db.ready();

    /** Validate ID */
    const data = dataDto.object;
    let id: string;

    if (dataDto.id !== undefined && dataDto.id !== "") {
      let valid = await ipldService.validateCid(dataDto.id, data);
      if (!valid) {
        throw new Error(`Invalid cid ${dataDto.id}`);
      }
      id = dataDto.id;
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

    /** fill the nquads from the data json object properties */
    const nquadsArray: string[] = [];
    const queriesArray: string[] = [];
    objectToNquads(data, 'uid(data)', 'root', nquadsArray, queriesArray);

    nquads = nquads.concat(`\n${nquadsArray.join('\n')}`);
    query = query.concat(`\n${queriesArray.join('\n')}`);
    
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

  async getData(dataId: string): Promise<Object | null> {
    await this.db.ready();

    const query = `query {
      data(func: eq(xid, ${dataId})) {
        xid
        stored
        stringValues @facets
        intValues @facets
        floatValues @facets
        boolValues @facets
        links @facets {
          xid
        }
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    console.log("[DGRAPH] getData", { query }, result.getJson());

    const json = result.getJson();

    if (json.data.length === 0) {
      throw new Error(`element with xid ${dataId} not found`)
    } 

    if (json.data.length > 1) {
      throw new Error(`unexpected number of entries ${json.data.length} for xid ${dataId}`);
    }

    if (json.data[0].stored) {
      throw new Error(`element with xid ${dataId} content not stored`)
    }

    const data = valuesToObject(json.data[0]);

    console.log(
      "[DGRAPH] getData",
      { query, json, data }
    );

    return data;
  }
}
