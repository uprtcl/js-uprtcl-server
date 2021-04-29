import { Entity } from '@uprtcl/evees';

import { DGraphService } from '../../db/dgraph.service';
import { UserRepository } from '../user/user.repository';
import { DATA_SCHEMA_NAME } from './data.schema';
import { ipldService } from '../ipld/ipldService';
import { decodeData, encodeData } from './utils';

const dgraph = require('dgraph-js');

export class DataRepository {
  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository
  ) {}

  /** All data objects are stored as textValues, intValues, floatValues and boolValues
   * or links to other objects, if the value is a valid CID string.
   * The path of the property in the JSON object is stored in a facet */
  async createDatas(datas: Entity<any>[]): Promise<Entity<any>[]> {
    if (datas.length === 0) return [];
    await this.db.ready();

    let query = ``;
    let nquads = ``;
    let entities: Entity<any>[] = [];

    for (let hashedData of datas) {
      const data = hashedData.object;
      const id = await ipldService.validateSecured(hashedData);

      query = query.concat(`\ndata${id} as var(func: eq(xid, ${id}))`);
      nquads = nquads.concat(`\nuid(data${id}) <xid> "${id}" .`);

      nquads = nquads.concat(`\nuid(data${id}) <stored> "true" .`);
      nquads = nquads.concat(
        `\nuid(data${id}) <dgraph.type> "${DATA_SCHEMA_NAME}" .`
      );

      // patch store quotes of string attributes as symbol
      const dataCoded = encodeData(data);
      nquads = nquads.concat(`\nuid(data${id}) <jsonString> "${dataCoded}" .`);

      entities.push({
        hash: id,
        object: data,
        remote: '',
      });
    }

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    req.setQuery(`query {${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] createData',
      { query },
      { nquads },
      result.getUidsMap().toArray()
    );
    return entities;
  }

  async getDatas(hashes: string[]): Promise<Entity[]> {
    await this.db.ready();

    let query = '';
    hashes.forEach((hash) => {
      query = query.concat(`\ndata${hash}(func: eq(xid, ${hash})) {
        xid
        stored
        jsonString
      }`);
    });

    let result = await this.db.client.newTxn().query(`query{${query}}`);
    const json = result.getJson();
    console.log('[DGRAPH] getData', { query, json });

    const datas = hashes.map((hash) => {
      const data = json[`data${hash}`];

      if (data.stored) {
        const object = decodeData(data.jsonString);
        return {
          hash,
          object,
          remote: '',
        };
      }
      return undefined;
    });

    const datasValid = datas.filter((d) => !!d);
    console.log('[DGRAPH] getData', { query, json, datasValid });

    return datasValid as Entity[];
  }
}
