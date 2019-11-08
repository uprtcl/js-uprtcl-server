import { DGraphService } from "../../db/dgraph.service";
import { UserRepository } from "../user/user.repository";
import { DataDto, DataType } from "../uprtcl/types";
import { localCidConfig } from "../ipld";
import { ipldService } from "../ipld/ipldService";
import { DATA_SCHEMA_NAME, DOCUMENT_NODE_SCHEMA_NAME, TEXT_NODE_SCHEMA_NAME, TEXT_SCHEMA_NAME } from "../../db/schema";

const dgraph = require("dgraph-js");

interface DgData {
  uid?: string,
  xid: string,
  'dgraph.type'?: string,
  stored: boolean
}

export interface DataC1If {
  id: string;
  type: string;
  jsonData: string;
}


export class DataRepository {

  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository) {
  }

  async createData(dataDto: DataDto) {
    await this.db.ready();

    const data = dataDto.data;

    if (dataDto.id !== undefined && dataDto.id !== '') {
      let valid = await ipldService.validateCid(
        dataDto.id,
        data
      );
      if (!valid) {
        throw new Error(`Invalid cid ${dataDto.id}`);
      }
    } else {
      dataDto.id = await ipldService.generateCidOrdered(
        data,
        localCidConfig
      );
    }

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();
    
    let query = `data as var(func: eq(xid, ${dataDto.id}))`;

    let nquads = `uid(data) <xid> "${dataDto.id}" .`;
    nquads = nquads.concat(`\nuid(data) <stored> "true" .`);
    nquads = nquads.concat(`\nuid(data) <dgraph.type> "${DATA_SCHEMA_NAME}" .`);

    switch (dataDto.type) {
      case DataType.DOCUMENT_NODE:
        nquads = nquads.concat(`\nuid(data) <dgraph.type> "${DOCUMENT_NODE_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\nuid(data) <doc_node_type> "${data.doc_node_type}" .`);
        /** NO BREAK */

      case DataType.TEXT_NODE:
        /** get and set the uids of the links */
        for (let ix = 0; ix < data.links.length; ix++) {
          query = query.concat(`\nlinks${ix} as var(func: eq(xid, ${data.links[ix]}))`);
          nquads = nquads.concat(`\nuid(data) <links> uid(links${ix}) .`);
          /** set the link xid in case it was not created */
          nquads = nquads.concat(`\nuid(links${ix}) <xid> "${data.links[ix]}" .`);
        }
        
        nquads = nquads.concat(`\nuid(data) <dgraph.type> "${TEXT_NODE_SCHEMA_NAME}" .`);
        /** NO BREAK */

      case DataType.TEXT:
        nquads = nquads.concat(`\nuid(data) <dgraph.type> "${TEXT_SCHEMA_NAME}" .`);
        nquads = nquads.concat(`\nuid(data) <text> "${data.text}" .`);
        break;
    }

    req.setQuery(`query {${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] createData', {query}, {nquads}, result.getUidsMap().toArray());
    return dataDto.id;
  }

  async getData(dataId: string): Promise<Object | null> {
    await this.db.ready();

    const query = `query {
      data(func: eq(xid, ${dataId})) {
        xid
        text
        links {
          xid
        }
        doc_node_type
        stored
        <dgraph.type>
      }
    }`;
    
    let result = await this.db.client.newTxn().query(query);
    console.log('[DGRAPH] getData', {query}, result.getJson());

    let ddata = result.getJson().data[0];

    if (!ddata) return null;
    if (!ddata.stored) return null;

    let data: any = {};
    data['id'] = dataId;
    
    let dgraphTypes = ddata['dgraph.type'];

    if (dgraphTypes.includes(TEXT_SCHEMA_NAME)) {
      data['text'] = ddata.text;
    }

    if (dgraphTypes.includes(TEXT_NODE_SCHEMA_NAME)) {
      data['links'] = ddata.links ? ddata['links'].map((link: { xid: any; }) => link.xid) : [];
    }

    if (dgraphTypes.includes(DOCUMENT_NODE_SCHEMA_NAME)) {
      data['doc_node_type'] = ddata['doc_node_type'];
    }

    return data
  }
}