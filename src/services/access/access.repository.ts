import { DGraphService } from "../../db/dgraph.service";
import { PROFILE_SCHEMA_NAME, PERMISSIONS_SCHEMA_NAME, ACCESS_CONFIG_SCHEMA_NAME } from "../../db/schema";
import { UserRepository } from "../user/user.repository";

const dgraph = require("dgraph-js");

export enum PermissionType {
  Read = 'Read',
  Write = 'Write',
  Admin = 'Admin'
}

export interface PermissionConfig {
  publicRead: boolean,
  publicWrite: boolean,
  canRead?: string[],
  canWrite?: string[],
  canAdmin?: string[],
}

export interface AccessConfig {
  uid?: string,
  delegate: boolean,
  delegateTo?: string | null,
  finDelegatedTo?: string | null,
  permissionsUid?: string
}

export class AccessRepository {

  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository) {
  }

  async createPermissionsConfig(permissions: PermissionConfig) {
    await this.db.ready();
    
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** commit object might exist because of parallel update head call */
    let query = ``;
    
    let nquads = `_:permissions <publicRead> "${permissions.publicRead}" .`;
    nquads = nquads.concat(`\n_:permissions <dgraph.type> "${PERMISSIONS_SCHEMA_NAME}" .`);
    nquads = nquads.concat(`\n_:permissions <publicWrite> "${permissions.publicRead}" .`);
    
    if (permissions.canRead) {
      for (let ix = 0; ix < permissions.canRead.length; ix++) {
        await this.userRepo.upsertProfile(permissions.canRead[ix]);
        query = query.concat(`\ncanRead${ix} as var(func: eq(did, "${permissions.canRead[ix].toLowerCase()}"))`);
        nquads = nquads.concat(`\n_:permissions <canRead> uid(canRead${ix}) .`);  
      }
    }

    if (permissions.canWrite) {
      for (let ix = 0; ix < permissions.canWrite.length; ix++) {
        await this.userRepo.upsertProfile(permissions.canWrite[ix]);
        query = query.concat(`\ncanWrite${ix} as var(func: eq(did, "${permissions.canWrite[ix].toLowerCase()}"))`);
        nquads = nquads.concat(`\n_:permissions <canWrite> uid(canWrite${ix}) .`);  
      }
    }

    if (permissions.canAdmin) {
      for (let ix = 0; ix < permissions.canAdmin.length; ix++) {
        await this.userRepo.upsertProfile(permissions.canAdmin[ix]);
        query = query.concat(`\ncanAdmin${ix} as var(func: eq(did, "${permissions.canAdmin[ix].toLowerCase()}"))`);
        nquads = nquads.concat(`\n_:permissions <canAdmin> uid(canAdmin${ix}) .`);  
      }
    }

    if (query !== '') req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    
    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] createPermissionsSet', {query}, {nquads}, result.getUidsMap().toArray());
    return result.getUidsMap().toArray()[0][1];
  }

  /** updates the pointer of the accessControl node of an elementId to point 
   * to a new permissionsConfig node. */
  async setPermissionsConfigOf(elementId: string, permUid: string) {
    await this.db.ready();
    
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** commit object might exist because of parallel update head call */
    let query = `\naccessConfig as var(func: eq(xid, ${elementId}))`;
    let nquads = `uid(accessConfig) <permissions> "${permUid}" .`;

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] createPermissionsSet', {query}, {nquads}, result.getUidsMap().toArray());
    return result.getUidsMap().toArray()[0];
  }

  async can(elementId: string, userId: string, type: PermissionType) : Promise<boolean> {
    let query = `
    element(func: eq(xid, "${elementId}")) {
      accessConfig {
        permissions {
          canRead @filter(eq(did, "${userId.toLowerCase()}")) {
            count(uid)
          }
          canWrite @filter(eq(did, "${userId.toLowerCase()}")) {
            count(uid)
          }
          canAdmin @filter(eq(did, "${userId.toLowerCase()}")) {
            count(uid)
          }
        }
      }
    }`;

    let result = await this.db.client.newTxn().query(`query{${query}}`);
    let json = result.getJson();
    let can: boolean;

    if (json.element.length > 0) {
      /** apply the logic canAdmin > canWrite > canRead */
      switch (type) {
        case PermissionType.Read:
          can = (json.element[0].accessConfig.permissions.canRead ? json.element[0].accessConfig.permissions.canRead[0].count > 0 : false) ||
            (json.element[0].accessConfig.permissions.canWrite? json.element[0].accessConfig.permissions.canWrite[0].count > 0 : false) ||
            (json.element[0].accessConfig.permissions.canAdmin? json.element[0].accessConfig.permissions.canAdmin[0].count > 0 : false);
          break;

        case PermissionType.Write:
          can = (json.element[0].accessConfig.permissions.canWrite? json.element[0].accessConfig.permissions.canWrite[0].count > 0 : false) ||
            (json.element[0].accessConfig.permissions.canAdmin? json.element[0].accessConfig.permissions.canAdmin[0].count > 0 : false);
          break;

        case PermissionType.Admin:
          can = (json.element[0].accessConfig.permissions.canAdmin? json.element[0].accessConfig.permissions.canAdmin[0].count > 0 : false);
          break;

        default: 
          can = false;
      }
    } else {
      /** if not found, the user does not have permissions */
      can = false;
    }
  
    console.log(`[DGRAPH] isRole ${type}`, {elementId, userId}, JSON.stringify(json), {can});
    return can;
  }

  /** only accessible to an admin */
  async getPermissionsConfig(permissionsUid: string) : Promise<PermissionConfig> {
    let query = `
    permissions(func: uid(${permissionsUid})) {
      expand(_all_)
    }
    `
    
    let result = await this.db.client.newTxn().query(`query{${query}}`);
    console.log('[DGRAPH] getPermissionsConfig', {permissionsUid}, result.getJson());

    let dpermissionsConfig = result.getJson().permissions

    return {
      publicRead: dpermissionsConfig.publicRead,
      publicWrite: dpermissionsConfig.publicWrite,
      canRead: dpermissionsConfig.canRead.map((el:any) => el.did.toLowerCase()),
      canWrite: dpermissionsConfig.canWrite.map((el:any) => el.did.toLowerCase()),
      canAdmin: dpermissionsConfig.canAdmin.map((el:any) => el.did.toLowerCase()),
    };
  }

  /** TODO: protect getAccessConnfig to admins of the element */
  async getAccessConfigOfElement(elementId: string, userId: string | null) : Promise<AccessConfig> {
    let query = `
    elements(func: eq(xid, ${elementId})) {
      accessConfig {
        uid
        delegate
        delegateTo
        finDelegatedTo
        permissions {
          uid
        }
      }
    }
    `
    
    let result = await this.db.client.newTxn().query(`query{${query}}`);
    console.log('[DGRAPH] getAccessConfigOfElement', {elementId, userId}, JSON.stringify(result.getJson()));
    let daccessConfig = result.getJson().elements[0].accessConfig;

    return {
      uid: daccessConfig.uid,
      delegate: daccessConfig.delegate == 'true',
      delegateTo: daccessConfig.delegateTo,
      finDelegatedTo: daccessConfig.finDelegatedTo,
      permissionsUid: daccessConfig.permissions.uid,
    };
  }

  async isPublic(elementId: string, type: PermissionType) : Promise<boolean> {
    if (type === PermissionType.Admin) return false;

    let query = `
    element(func: eq(xid, ${elementId})) {
      accessConfig {
        permissions {
          public${type}
        }
      }
    }
    `
    
    let result = await this.db.client.newTxn().query(`query{${query}}`);
    console.log(`[DGRAPH] isPublic ${type}`, {elementId}, JSON.stringify(result.getJson()));
    return result.getJson().element[0].accessConfig.permissions[`public${type}`];
  }

  async createAccessConfig(accessConfig: AccessConfig): Promise<string> {
    await this.db.ready();
    
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let nquads = `_:accessConfig <permissions> <${accessConfig.permissionsUid}> .`;
    nquads = nquads.concat(`\n_:accessConfig <dgraph.type> "${ACCESS_CONFIG_SCHEMA_NAME}" .`);
    nquads = nquads.concat(`\n_:accessConfig <delegate> "${accessConfig.delegate}" .`);
    if (accessConfig.delegateTo) nquads = nquads.concat(`\n_:accessConfig <delegateTo> <${accessConfig.delegateTo}> .`);
    if (accessConfig.finDelegatedTo) nquads = nquads.concat(`\n_:accessConfig <finDelegatedTo> <${accessConfig.finDelegatedTo}> .`);
    
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    
    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] createAccessConfig', {nquads}, result.getUidsMap().toArray());
    return result.getUidsMap().toArray()[0][1];
  }

  async updateAccessConfig(elementId: string, accessConfig: AccessConfig): Promise<void> {
    await this.db.ready();

    /** get the accessConfig Uid */
    const query0 = `
      element(func: eq(xid, ${elementId})) {
        accessConfig {
          uid
        }
      }`;

    const res = await this.db.client.newTxn().query(`query{${query0}}`);
    let json = res.getJson();
    const accessConfigUid = json.element[0].accessConfig.uid;

    /** delete the permissions 
     * TODO: dont know why it complains if I dont do this */
    const delMu = new dgraph.Mutation();
    let delNquads = `<${accessConfigUid}> <permissions> * .`;
    delMu.setDelNquads(delNquads);

    const delReq = new dgraph.Request();
    delReq.setCommitNow(true);
    delReq.setMutationsList([delMu]);

    await this.db.client.newTxn().doRequest(delReq);


    /** now update the the accessConfig */
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query: string = '';

    let nquads = `<${accessConfigUid}> <delegate> "${accessConfig.delegate}" .`;

    if (accessConfig.permissionsUid) {
      nquads = nquads.concat(`\n<${accessConfigUid}> <permissions> <${accessConfig.permissionsUid}> .`);
    }
    
    if (accessConfig.delegateTo) {
      query = query.concat(`\ndelegateTo as var(func: eq(xid, "${accessConfig.delegateTo}"))`);
      nquads = nquads.concat(`\n<${accessConfigUid}> <delegateTo> uid(delegateTo) .`);
    }

    if (accessConfig.finDelegatedTo) {
      query = query.concat(`\nfinDelegatedTo as var(func: eq(xid, "${accessConfig.finDelegatedTo}"))`);
      nquads = nquads.concat(`\n<${accessConfigUid}> <finDelegatedTo> uid(finDelegatedTo) .`);
    }
    
    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);
    
    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] updateAccessConfig', {nquads}, result.getUidsMap().toArray());
  }

  async setFinDelegatedTo(elementId: string, newFinDelegatedTo: string): Promise<void> {
    await this.db.ready();
    
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();
    
    let query = `accessConfig as var(func: eq(xid, "${elementId}")) { accessConfig { uid } }`;
    let nquads = `uid(accessConfig) <finDelegatedTo> <${newFinDelegatedTo}> .`;
    
    mu.setSetNquads(nquads);
    req.setQuery(`query{${query}}`);
    req.setMutationsList([mu]);
    
    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] createAccessConfig', {nquads}, result.getUidsMap().toArray());
    return result.getUidsMap().toArray()[0][1];
  }

  async setAccessConfigOf(elementId: string, accessConfigUid: string): Promise<void> {
    await this.db.ready();
    
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** make sure creatorId exist */
    let query = `element as var(func: eq(xid, "${elementId}"))`;
    let nquads = `uid(element) <accessConfig> <${accessConfigUid}> .`;

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] setAccessConfigOf', {query}, {nquads}, result.getUidsMap().toArray());
  }

  async getFinallyDelegatedFrom(elementId: string) {
    let query = `elements(
      func: eq(~finDelegatedTo, "${elementId}") {
        xid
      }
    )`

    let result = await this.db.client.newTxn().query(`query{${query}}`);
    console.log('[DGRAPH] getFinallyDelegatedFrom', {elementId}, result.getJson());
    return [elementId].concat(result.getJson().elements.map((dpersp: any) => dpersp.xid));
  }

  async getDelegatedFrom(elementId: string) : Promise<string[]> {
    let query = `
    elements(func: eq(xid, "${elementId}")) {
      ~delegateTo {
        ~accessConfig {
          xid
        }
      }
    }
    `

    let result = await this.db.client.newTxn().query(`query{${query}}`);
    let json = result.getJson();
    console.log('[DGRAPH] getFinallyDelegatedFrom', {elementId}, JSON.stringify(json));

    return json.elements.length > 0 ? 
      json.elements['~delegateTo'].map((accessConfig: any) => accessConfig['~accessConfig'].xid) 
      : [];
  }

  async addPermission(elementId: string, type: PermissionType, toUserId: string): Promise<void> {
    await this.db.ready();

    let queryUid = `
    element(func: eq(xid, "${elementId}")) { 
      accessConfig { 
        permissions { 
          uid 
        } 
      } 
    }`;

    let result1 = await this.db.client.newTxn().query(`query{${queryUid}}`);
    let json = result1.getJson();
    
    let permissionsUid = json.element[0].accessConfig.permissions.uid;
    let ndelquads: string = '';

    let query = `user as var(func: eq(did, "${toUserId.toLowerCase()}"))`

    /** delete lower level permissions so that each user has one role only */
    switch (type) {
      case PermissionType.Admin: 
        ndelquads = ndelquads.concat(`\n<${permissionsUid}> <canRead> uid(user) .`)
        ndelquads = ndelquads.concat(`\n<${permissionsUid}> <canWrite> uid(user) .`)
        break;

      case PermissionType.Write: 
        ndelquads = ndelquads.concat(`\n<${permissionsUid}> <canRead> uid(user) .`)
        break;
    }

    let nquads = `<${permissionsUid}> <can${type}> uid(user).`;
    
    const req = new dgraph.Request();
    const mu = new dgraph.Mutation();
    
    mu.setDelNquads(ndelquads);
    mu.setSetNquads(nquads);
    req.setQuery(`query{${query}}`);
    req.setMutationsList([mu]);
    
    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] addPermission', {nquads}, result.getUidsMap().toArray());
  }

  async deletePermission(elementId: string, toUserId: string): Promise<void> {
    await this.db.ready();
    
    let queryUid = `permissions as var(func: eq(xid, "${elementId}")) { 
      accessConfig { 
        permissions { 
          uid 
        } 
      } 
    }`;

    let result1 = await this.db.client.newTxn().query(`query{${queryUid}}`);
    let json = result1.getJson();
    
    let permissionsUid = json.accessConfig.permissions.uid;
    
    let query = `user as var(func: eq(did, "${toUserId.toLowerCase()}"))`
    let ndelquads: string = '';
    ndelquads = ndelquads.concat(`\n<${permissionsUid}> <canRead> uid(user) .`)
    ndelquads = ndelquads.concat(`\n<${permissionsUid}> <canWrite> uid(user) .`)
    ndelquads = ndelquads.concat(`\n<${permissionsUid}> <canAdmin> uid(user) .`)

    const req = new dgraph.Request();
    const mu = new dgraph.Mutation();
    
    mu.setDelNquads(ndelquads);
    req.setQuery(`query{${query}}`);
    req.setMutationsList([mu]);
    
    let result = await this.db.callRequest(req);
    console.log('[DGRAPH] deletePermission', {ndelquads}, result.getUidsMap().toArray());
  }
}