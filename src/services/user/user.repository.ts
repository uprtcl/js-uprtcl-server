import { DGraphService } from '../../db/dgraph.service';
import { PROFILE_SCHEMA_NAME } from './user.schema';

const dgraph = require('dgraph-js');

interface DgProfile {
  uid?: string;
  did: string;
  nonce: string;
  'dgraph.type'?: string;
}

export class UserRepository {
  constructor(protected db: DGraphService) {}

  async upsertProfile(did: string): Promise<void> {
    await this.db.ready();

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query = `profile as var(func: eq(did, "${did.toLowerCase()}"))`;

    req.setQuery(`query{${query}}`);

    let nquads = `uid(profile) <did> "${did.toLowerCase()}" .`;
    nquads = nquads.concat(
      `\nuid(profile) <dgraph.type> "${PROFILE_SCHEMA_NAME}" .`
    );

    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] upsertProfile',
      { query },
      { nquads },
      result.getUidsMap().toArray()
    );
  }

  /** set nonce on user. it craetes the user Did if it does not exist */
  async setUserNonce(did: string, nonce: string): Promise<void> {
    await this.db.ready();

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query = `profile as var(func: eq(did, "${did.toLowerCase()}"))`;
    req.setQuery(`query{${query}}`);

    let nquads = `uid(profile) <did> "${did.toLowerCase()}" .`;
    nquads = nquads.concat(`\nuid(profile) <nonce> "${nonce}" .`);
    nquads = nquads.concat(
      `\nuid(profile) <dgraph.type> "${PROFILE_SCHEMA_NAME}" .`
    );

    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] setUserNonce',
      { query },
      { nquads },
      result.getUidsMap().toArray()
    );
  }

  /**  */
  async getNonce(did: string): Promise<string | null> {
    await this.db.ready();
    const query = `query {
      profile(func: eq(did, "${did.toLowerCase()}")) {
        nonce
      }
    }`;

    let result = await this.db.client.newTxn().query(query);
    console.log('[DGRAPH] getNonce', { query }, result.getJson());
    let dprofile: DgProfile = result.getJson().profile[0];
    if (!dprofile) return null;
    if (!dprofile.nonce) return null;

    return dprofile.nonce;
  }
}
