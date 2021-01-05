import { DGraphService } from '../../db/dgraph.service';
import { UserRepository } from '../user/user.repository';
import {
  PERMISSIONS_SCHEMA_NAME,
  PermissionType,
  ACCESS_CONFIG_SCHEMA_NAME,
} from './access.schema';
import { Upsert } from '../uprtcl/types';

const dgraph = require('dgraph-js');

export interface PermissionConfig {
  publicRead: boolean;
  publicWrite: boolean;
  canRead?: string[];
  canWrite?: string[];
  canAdmin?: string[];
}

export interface AccessConfig {
  uid?: string;
  delegate: boolean;
  delegateTo?: string;
  finDelegatedTo?: string;
  permissionsUid?: string;
}

export interface AccessConfigInherited {
  delegate: boolean;
  delegateTo?: string | null;
  finDelegatedTo?: string | null;
  effectivePermissions: PermissionConfig;
  customPermissions?: PermissionConfig;
}

export interface UserPermissions {
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
}

export interface PublicPermissions {
  publicRead: boolean;
  publicWrite: boolean;
}

export class AccessRepository {
  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository
  ) {}

  createPermissionsConfigUpsert(
    permissions: PermissionConfig,
    {
      upsert: {
        query,
        nquads
      }
    } : { upsert: Upsert }
  ) {

    nquads = nquads.concat(
      `\n_:permissions <publicRead> "${permissions.publicRead}" .
       \n_:permissions <dgraph.type> "${PERMISSIONS_SCHEMA_NAME}" .
       \n_:permissions <publicWrite> "${permissions.publicWrite}" .`
    );

    const canRead = permissions.canRead ? permissions.canRead : [];
    const canWrite = permissions.canWrite ? permissions.canWrite : [];
    const canAdmin = permissions.canAdmin ? permissions.canAdmin : [];

    let profiles: string[] = [];

    profiles.push( ...canRead,
                   PermissionType.Write, ...canWrite,
                   PermissionType.Admin, ...canAdmin );

    // Upsert profiles just once per user
    [...new Set(profiles)].map(did => {
      query.concat(this.userRepo.upsertQueries(did).query);
      nquads.concat(this.userRepo.upsertQueries(did).nquads);
    });

    for (let ix = 0; ix < profiles.length; ix++) {
      if (ix < profiles.indexOf(PermissionType.Write)) {
        query = query.concat(`\ncanRead${ix} as var(func: eq(did, "${profiles[ix].toLowerCase()}"))` )
        nquads = nquads.concat(`\n_:permissions <canRead> uid(canRead${ix}) .`);
      } else if (ix > profiles.indexOf(PermissionType.Write) && ix < profiles.indexOf(PermissionType.Admin)){
        query = query.concat(`\ncanWrite${ix} as var(func: eq(did, "${profiles[ix].toLowerCase()}"))` )
        nquads = nquads.concat(`\n_:permissions <canWrite> uid(canWrite${ix}) .`);
      } else {
        query = query.concat(`\ncanAdmin${ix} as var(func: eq(did, "${profiles[ix].toLowerCase()}"))` )
        nquads = nquads.concat(`\n_:permissions <canAdmin> uid(canAdmin${ix}) .`);
      }
    }

    return { query, nquads }
  }

  createAccessConfigUpsert(
    accessConfig: AccessConfig,
    {
      upsert: {
        query,
        nquads
      }
    } : { upsert: Upsert }
  ) {
    if (accessConfig.delegateTo)
      query = query.concat(
        `\ndelegateToEl as var(func: eq(xid, "${accessConfig.delegateTo}"))`
      );
    if (accessConfig.finDelegatedTo)
      query = query.concat(
        `\nfinDelegatedToEl as var(func: eq(xid, "${accessConfig.finDelegatedTo}"))`
      );

    nquads = `_:accessConfig <permissions> <${accessConfig.permissionsUid}> .`;
    nquads = nquads.concat(
      `\n_:accessConfig <dgraph.type> "${ACCESS_CONFIG_SCHEMA_NAME}" .`
    );
    nquads = nquads.concat(
      `\n_:accessConfig <delegate> "${accessConfig.delegate}" .`
    );
    if (accessConfig.delegateTo)
      nquads = nquads.concat(
        `\n_:accessConfig <delegateTo> uid(delegateToEl) .`
      );
    if (accessConfig.finDelegatedTo)
      nquads = nquads.concat(
        `\n_:accessConfig <finDelegatedTo> uid(finDelegatedToEl) .`
      );

    return { query, nquads }
  }

  async createPermissionsConfig(permissions: PermissionConfig) {
    await this.db.ready();

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** commit object might exist because of parallel update head call */
    let query = ``;
    let nquads = ``;

    const upsert: Upsert = {
      query,
      nquads
    }

    const upsertResult = this.createPermissionsConfigUpsert(permissions, { upsert });

    query = upsertResult.query;
    nquads = upsertResult.nquads;

    if (query !== '') req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] createPermissionsSet',
      { query },
      { nquads },
      result.getUidsMap().toArray()
    );
    return result.getUidsMap().toArray()[0][1];
  }

  /** updates the pointer of the accessControl node of an elementId to point
   * to a new permissionsConfig node. */
  async setPermissionsConfigOf(elementId: string, permUid: string) {
    await this.db.ready();

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** commit object might exist because of parallel update head call */
    let query = `\nq(func: eq(xid, ${elementId})){
                    a as accessConfig
                  }

                  permissions as var(func: uid("${permUid}"))
                  `;
    let nquads = `uid(a) <permissions> uid(permissions) .`;

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] createPermissionsSet',
      { query },
      { nquads },
      result.getUidsMap().toArray()
    );
    return result.getUidsMap().toArray()[0];
  }

  async getUserCan(
    elementId: string,
    userId: string | null
  ): Promise<UserPermissions> {
    const publicPermissions = await this.getPublicPermissions(elementId);

    if (!userId) {
      return {
        canRead: publicPermissions.publicRead,
        canWrite: publicPermissions.publicWrite,
        canAdmin: false,
      };
    }

    const permissions = await this.getUserPermissions(elementId, userId);

    return {
      canRead: publicPermissions.publicRead || permissions.canRead,
      canWrite: publicPermissions.publicWrite || permissions.canWrite,
      canAdmin: permissions.canAdmin,
    };
  }

  /** optimize to not get user permissions if public */
  async can(
    elementId: string,
    userId: string | null,
    type: PermissionType
  ): Promise<boolean> {
    const publicPermissions = await this.getPublicPermissions(elementId);
    switch (type) {
      case PermissionType.Read:
        if (publicPermissions.publicRead) {
          return true;
        }

      case PermissionType.Write:
        if (publicPermissions.publicWrite) {
          return true;
        }
    }

    if (!userId) return false;

    const permissions = await this.getUserPermissions(elementId, userId);
    switch (type) {
      case PermissionType.Read:
        return permissions.canRead;

      case PermissionType.Write:
        return permissions.canWrite;

      case PermissionType.Admin:
        return permissions.canAdmin;
    }
  }

  async getPublicPermissions(elementId: string): Promise<PublicPermissions> {
    let query = `
    element(func: eq(xid, "${elementId}")) {
      accessConfig {
        permissions {
          publicRead
          publicWrite
        }
      }
    }`;

    let result = await this.db.client.newTxn().query(`query{${query}}`);
    let json = result.getJson();

    if (json.element.length > 0) {
      if (json.element[0] === undefined) {
        throw new Error(
          `undefined accessConfig in getUserPermissions() for element ${elementId}`
        );
      }

      const publicRead: boolean =
        json.element[0].accessConfig.permissions.publicRead;
      const publicWrite: boolean =
        json.element[0].accessConfig.permissions.publicWrite;

      /** apply the logic canAdmin > canWrite > canRead */
      return {
        publicRead: publicRead || publicWrite,
        publicWrite: publicWrite,
      };
    } else {
      /** if not found, the user does not have permissions */
      return {
        publicRead: false,
        publicWrite: false,
      };
    }
  }

  async getUserPermissions(
    elementId: string,
    userId: string
  ): Promise<UserPermissions> {
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

    if (json.element.length > 0) {
      if (json.element[0] === undefined) {
        throw new Error(
          `undefined accessConfig in getUserPermissions() for element ${elementId}`
        );
      }

      const canReadUser: boolean =
        json.element[0].accessConfig.permissions.canRead !== undefined &&
        json.element[0].accessConfig.permissions.canRead[0].count > 0;

      const canWriteUser: boolean =
        json.element[0].accessConfig.permissions.canWrite !== undefined &&
        json.element[0].accessConfig.permissions.canWrite[0].count > 0;

      const canAdminUser: boolean =
        json.element[0].accessConfig.permissions.canAdmin !== undefined &&
        json.element[0].accessConfig.permissions.canAdmin[0].count > 0;

      /** apply the logic canAdmin > canWrite > canRead */
      return {
        canRead: canReadUser || canWriteUser || canAdminUser,
        canWrite: canWriteUser || canAdminUser,
        canAdmin: canAdminUser,
      };
    } else {
      /** if not found, the user does not have permissions */
      return {
        canRead: false,
        canWrite: false,
        canAdmin: false,
      };
    }
  }

  /** only accessible to an admin */
  async getPermissionsConfig(
    permissionsUid: string
  ): Promise<PermissionConfig> {
    let query = `
    permissions(func: uid(${permissionsUid})) {
      publicRead
      publicWrite
      canRead {
        did
      }
      canWrite {
        did
      }
      canAdmin {
        did
      }
    }
    `;

    let result = await this.db.client.newTxn().query(`query{${query}}`);
    console.log(
      '[DGRAPH] getPermissionsConfig',
      { permissionsUid },
      result.getJson()
    );

    let dpermissionsConfig = result.getJson().permissions[0];

    return {
      publicRead: dpermissionsConfig.publicRead,
      publicWrite: dpermissionsConfig.publicWrite,
      canRead: dpermissionsConfig.canRead
        ? dpermissionsConfig.canRead.map((el: any) => el.did.toLowerCase())
        : [],
      canWrite: dpermissionsConfig.canWrite
        ? dpermissionsConfig.canWrite.map((el: any) => el.did.toLowerCase())
        : [],
      canAdmin: dpermissionsConfig.canAdmin
        ? dpermissionsConfig.canAdmin.map((el: any) => el.did.toLowerCase())
        : [],
    };
  }

  /** TODO: protect getAccessConnfig to admins of the element */
  async getAccessConfigOfElement(elementId: string): Promise<AccessConfig> {
    let query = `
    elements(func: eq(xid, ${elementId})) {
      accessConfig {
        uid
        delegate
        delegateTo {
          xid
        }
        finDelegatedTo {
          xid
        }
        permissions {
          uid
        }
      }
    }
    `;
    let result = await this.db.client.newTxn().query(`query{${query}}`);
    const json = result.getJson();
    console.log(
      '[DGRAPH] getAccessConfigOfElement',
      { elementId },
      JSON.stringify(json)
    );
    if (json.elements[0] === undefined)
      throw new Error(
        `undefined accessConfig in getAccessConfigOfElement() for element ${elementId}`
      );
    let daccessConfig = json.elements[0].accessConfig;

    return {
      uid: daccessConfig.uid,
      delegate:
        daccessConfig.delegate !== undefined ? daccessConfig.delegate : false,
      delegateTo: daccessConfig.delegateTo
        ? daccessConfig.delegateTo.xid
        : undefined,
      finDelegatedTo: daccessConfig.finDelegatedTo
        ? daccessConfig.finDelegatedTo.xid
        : undefined,
      permissionsUid: daccessConfig.permissions.uid,
    };
  }

  async isPublic(elementId: string, type: PermissionType): Promise<boolean> {
    if (type === PermissionType.Admin) return false;

    let query = `
    element(func: eq(xid, ${elementId})) {
      accessConfig {
        permissions {
          public${type}
        }
      }
    }
    `;

    let result = await this.db.client.newTxn().query(`query{${query}}`);

    const json = result.getJson();
    console.log(
      `[DGRAPH] isPublic ${type}`,
      { elementId },
      JSON.stringify(json)
    );
    if (json.element[0] === undefined)
      throw new Error(
        `undefined accessConfig in isPublic() for element ${elementId}`
      );

    return json.element[0].accessConfig.permissions[`public${type}`];
  }

  async setPublic(
    elementId: string,
    type: PermissionType,
    value: boolean
  ): Promise<void> {
    await this.db.ready();

    let query = `
    var(func: eq(xid, ${elementId})) {
      accessConfig {
        per as permissions
      }
    }
    `;

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let nquads = `uid(per) <public${type}> "${value}" .`;

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    mu.setCond(`@if(eq(len(per), 1))`);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] setPublic',
      { nquads },
      result.getUidsMap().toArray()
    );
  }

  async createAccessConfig(accessConfig: AccessConfig): Promise<string> {
    await this.db.ready();

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let upsert: Upsert = {
      query: '',
      nquads: ''
    }

    const { query, nquads } = this.createAccessConfigUpsert(accessConfig, { upsert });

    if (query !== '') req.setQuery(`query{${query}}`);

    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] createAccessConfig',
      { query, nquads },
      result.getUidsMap().toArray()
    );
    return result.getUidsMap().toArray()[0][1];
  }

  async toggleDelegate(
    elementId: string,
    delegateTo: string | undefined
  ): Promise<void> {
    await this.db.ready();

    /** get the accessConfig Uid */
    let query = `
      element(func: eq(xid, ${elementId})) {
        config as accessConfig
      }`;

    /** now update the the accessConfig */
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    const delegate = delegateTo !== undefined;

    let nquads = `uid(config) <delegate> "${delegate}" .`;

    let finDelegatedTo: string;

    if (delegate) {
      if (!delegateTo) {
        throw new Error('Undefined delegateTo');
      }

      const delegateToAccessConfig = await this.getAccessConfigOfElement(
        delegateTo
      );

      if (delegateToAccessConfig.finDelegatedTo === undefined) {
        throw new Error(
          `property finDelegatedTo is undefined for element ${delegateTo}`
        );
      }

      query = query.concat(
        `\ndelegateTo as var(func: eq(xid, "${delegateTo}"))`
      );
      nquads = nquads.concat(`\nuid(config) <delegateTo> uid(delegateTo) .`);

      /* add logic to compute and keep finDelegateTo of this element consistent and 
    also of all the elements that where inheriting from this element */
      finDelegatedTo = delegateToAccessConfig.finDelegatedTo;
    } else {
      finDelegatedTo = elementId;
    }

    query = query.concat(
      `\nfinDelegatedTo as var(func: eq(xid, "${finDelegatedTo}"))`
    );
    nquads = nquads.concat(
      `\nuid(config) <finDelegatedTo> uid(finDelegatedTo) .`
    );

    query = query.concat(
      `\n q(func: eq(xid, "${elementId}")) 
          @recurse
          {
            perspective: ~accessConfig
            a as accessConfig: ~delegateTo
            uid
          }`
    );

    nquads = nquads.concat(`\nuid(a) <finDelegatedTo> uid(finDelegatedTo) .`);

    if (query !== '') req.setQuery(`query{${query}}`);

    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] updateAccessConfig',
      { nquads },
      result.getUidsMap().toArray()
    );
  }

  async setFinDelegatedTo(
    elementId: string,
    newFinDelegatedTo: string
  ): Promise<void> {
    await this.db.ready();

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let query = `accessConfig as var(func: eq(xid, "${elementId}")) { accessConfig { uid } }`;
    let nquads = `uid(accessConfig) <finDelegatedTo> <${newFinDelegatedTo}> .`;

    mu.setSetNquads(nquads);
    req.setQuery(`query{${query}}`);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] createAccessConfig',
      { nquads },
      result.getUidsMap().toArray()
    );
    return result.getUidsMap().toArray()[0][1];
  }

  async setAccessConfigOf(
    elementId: string,
    accessConfigUid: string
  ): Promise<void> {
    await this.db.ready();

    if (elementId == undefined || elementId === '')
      throw new Error(`ElementId is empty`);

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** make sure creatorId exist */
    let query = `element as var(func: eq(xid, "${elementId}"))`;
    let nquads = `uid(element) <accessConfig> <${accessConfigUid}> .`;

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] setAccessConfigOf',
      { query },
      { nquads },
      result.getUidsMap().toArray()
    );
  }

  async getDelegatedFrom(elementId: string): Promise<string[]> {
    let query = `
    elements(func: eq(xid, "${elementId}")) {
      accessConfig: ~delegateTo {
        perspective: ~accessConfig {
          xid
        }
      }
    }
    `;

    let result = await this.db.client.newTxn().query(`query{${query}}`);
    let json = result.getJson();

    return json.elements.length > 0
      ? json.elements[0].accessConfig.map(
          (accessConfig: any) => accessConfig.perspective[0].xid
        )
      : [];
  }

  async addPermission(
    elementId: string,
    type: PermissionType,
    toUserId: string
  ): Promise<void> {
    await this.db.ready();

    /** make sure creatorId exist */
    await this.userRepo.upsertProfile(toUserId);

    let ndelquads: string = '';
    let query = `
    var(func: eq(xid, ${elementId})) {
      accessConfig {
        per as permissions
      }
    }
    user as var(func: eq(did, "${toUserId.toLowerCase()}"))
    `;

    /** delete other permissions so that each user has one role only */
    switch (type) {
      case PermissionType.Admin:
        ndelquads = ndelquads.concat(`\nuid(per) <canRead> uid(user) .`);
        ndelquads = ndelquads.concat(`\nuid(per) <canWrite> uid(user) .`);
        break;

      case PermissionType.Write:
        ndelquads = ndelquads.concat(`\nuid(per) <canRead> uid(user) .`);
        ndelquads = ndelquads.concat(`\nuid(per) <canAdmin> uid(user) .`);
        break;

      case PermissionType.Read:
        ndelquads = ndelquads.concat(`\nuid(per) <canWrite> uid(user) .`);
        ndelquads = ndelquads.concat(`\nuid(per) <canAdmin> uid(user) .`);
        break;
    }

    let nquads = `uid(per) <can${type}> uid(user).`;

    const req = new dgraph.Request();
    const mu = new dgraph.Mutation();

    mu.setDelNquads(ndelquads);
    mu.setSetNquads(nquads);
    mu.setCond(`@if(eq(len(per), 1))`);
    req.setQuery(`query{${query}}`);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] addPermission',
      { nquads },
      result.getUidsMap().toArray()
    );
  }

  async deletePermission(elementId: string, toUserId: string): Promise<void> {
    await this.db.ready();

    let query = `
    var(func: eq(xid, ${elementId})) {
      accessConfig {
        per as permissions
      }
    }
    user as var(func: eq(did, "${toUserId.toLowerCase()}"))`;
    let ndelquads: string = '';
    ndelquads = ndelquads.concat(`\nuid(per) <canRead> uid(user) .`);
    ndelquads = ndelquads.concat(`\nuid(per) <canWrite> uid(user) .`);
    ndelquads = ndelquads.concat(`\nuid(per) <canAdmin> uid(user) .`);

    const req = new dgraph.Request();
    const mu = new dgraph.Mutation();

    mu.setDelNquads(ndelquads);
    mu.setCond(`@if(eq(len(per), 1))`);
    req.setQuery(`query{${query}}`);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] deletePermission',
      { ndelquads },
      result.getUidsMap().toArray()
    );
  }

  async removeAllPermissions(elementId: string): Promise<void> {
    await this.db.ready();

    let query = `
      query{
        var(func: eq(xid, ${elementId})) {
          accessConfig {
            per as permissions
          }
        }
      }
    `;

    let delNquads = `uid(per) <canRead> * .`;
    delNquads = delNquads.concat(`\nuid(per) <canWrite> * .`);
    delNquads = delNquads.concat(`\nuid(per) <canAdmin> * .`);

    const req = new dgraph.Request();
    const mu = new dgraph.Mutation();

    mu.setDelNquads(delNquads);
    mu.setCond(`@if(eq(len(per), 1))`);
    req.setQuery(query);
    req.setMutationsList([mu]);

    await this.db.callRequest(req);
  }

  async clonePermissions(
    elementId: string,
    finDelegatedTo: string
  ): Promise<void> {
    await this.removeAllPermissions(elementId);

    let query = `
      finDelegateTo(func: eq(xid, "${finDelegatedTo}")) {        
        accessConfig {
          permissions {
            canRead {
              userCr as uid          
            }
            canWrite {
              userCw as uid
            }
            canAdmin {
              userAd as uid
            }
          }
        }
      }
    `;

    query = query.concat(`
      \nelementId(func:eq(xid, "${elementId}")) {
        accessConfig {
          per as permissions
        }
      }
    `);

    const readMutation = new dgraph.Mutation();
    readMutation.setSetNquads(`uid(per) <canRead> uid(userCr) .`);
    readMutation.setCond(`@if(gt(len(userCr), 0))`);

    const writeMutation = new dgraph.Mutation();
    writeMutation.setSetNquads(`uid(per) <canWrite> uid(userCw) .`);
    writeMutation.setCond(`@if(gt(len(userCw), 0))`);

    const adminMutation = new dgraph.Mutation();
    adminMutation.setSetNquads(`uid(per) <canAdmin> uid(userAd) .`);
    adminMutation.setCond(`@if(gt(len(userAd), 0))`);

    const req = new dgraph.Request();

    req.setQuery(`query{${query}}`);
    req.setMutationsList([readMutation, writeMutation, adminMutation]);

    await this.db.callRequest(req);
  }
}
