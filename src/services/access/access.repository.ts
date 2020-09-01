import { DGraphService } from '../../db/dgraph.service';
import { UserRepository } from '../user/user.repository';
import {
  PERMISSIONS_SCHEMA_NAME,
  PermissionType,
  ACCESS_CONFIG_SCHEMA_NAME,
} from './access.schema';

const dgraph = require('dgraph-js');

export interface PermissionConfig {
  publicRead: boolean
  publicWrite: boolean
  canRead?: string[]
  canWrite?: string[]
  canAdmin?: string[]
}

export interface AccessConfig {
  uid?: string
  delegate: boolean
  delegateTo?: string
  finDelegatedTo?: string
  permissionsUid?: string
}

export interface AccessConfigInherited {
  delegate: boolean,
  delegateTo?: string | null,
  finDelegatedTo?: string | null,
  effectivePermissions: PermissionConfig,
  customPermissions?: PermissionConfig
}

export class AccessRepository {
  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository
  ) {}

  async createPermissionsConfig(permissions: PermissionConfig) {
    await this.db.ready();

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    /** commit object might exist because of parallel update head call */
    let query = ``;

    let nquads = `_:permissions <publicRead> "${permissions.publicRead}" .`;
    nquads = nquads.concat(
      `\n_:permissions <dgraph.type> "${PERMISSIONS_SCHEMA_NAME}" .`
    );
    nquads = nquads.concat(
      `\n_:permissions <publicWrite> "${permissions.publicWrite}" .`
    );

    if (permissions.canRead) {
      for (let ix = 0; ix < permissions.canRead.length; ix++) {
        await this.userRepo.upsertProfile(permissions.canRead[ix]);
        query = query.concat(
          `\ncanRead${ix} as var(func: eq(did, "${permissions.canRead[
            ix
          ].toLowerCase()}"))`
        );
        nquads = nquads.concat(`\n_:permissions <canRead> uid(canRead${ix}) .`);
      }
    }

    if (permissions.canWrite) {
      for (let ix = 0; ix < permissions.canWrite.length; ix++) {
        await this.userRepo.upsertProfile(permissions.canWrite[ix]);
        query = query.concat(
          `\ncanWrite${ix} as var(func: eq(did, "${permissions.canWrite[
            ix
          ].toLowerCase()}"))`
        );
        nquads = nquads.concat(
          `\n_:permissions <canWrite> uid(canWrite${ix}) .`
        );
      }
    }

    if (permissions.canAdmin) {
      for (let ix = 0; ix < permissions.canAdmin.length; ix++) {
        await this.userRepo.upsertProfile(permissions.canAdmin[ix]);
        query = query.concat(
          `\ncanAdmin${ix} as var(func: eq(did, "${permissions.canAdmin[
            ix
          ].toLowerCase()}"))`
        );
        nquads = nquads.concat(
          `\n_:permissions <canAdmin> uid(canAdmin${ix}) .`
        );
      }
    }

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

  async can(
    elementId: string,
    userId: string,
    type: PermissionType
  ): Promise<boolean> {
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
      if (json.element[0] === undefined)
        throw new Error(
          `undefined accessConfig in can() for element ${elementId}`
        );
      switch (type) {
        case PermissionType.Read:
          can =
            (json.element[0].accessConfig.permissions.canRead
              ? json.element[0].accessConfig.permissions.canRead[0].count > 0
              : false) ||
            (json.element[0].accessConfig.permissions.canWrite
              ? json.element[0].accessConfig.permissions.canWrite[0].count > 0
              : false) ||
            (json.element[0].accessConfig.permissions.canAdmin
              ? json.element[0].accessConfig.permissions.canAdmin[0].count > 0
              : false);
          break;

        case PermissionType.Write:
          can =
            (json.element[0].accessConfig.permissions.canWrite
              ? json.element[0].accessConfig.permissions.canWrite[0].count > 0
              : false) ||
            (json.element[0].accessConfig.permissions.canAdmin
              ? json.element[0].accessConfig.permissions.canAdmin[0].count > 0
              : false);
          break;

        case PermissionType.Admin:
          can = json.element[0].accessConfig.permissions.canAdmin
            ? json.element[0].accessConfig.permissions.canAdmin[0].count > 0
            : false;
          break;

        default:
          can = false;
      }
    } else {
      /** if not found, the user does not have permissions */
      can = false;
    }

    console.log(
      `[DGRAPH] isRole ${type}`,
      { elementId, userId },
      JSON.stringify(json),
      { can }
    );
    return can;
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
      permissionsUid: daccessConfig.permissions.uid
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

    let query = '';
    if (accessConfig.delegateTo)
      query = query.concat(
        `\ndelegateToEl as var(func: eq(xid, "${accessConfig.delegateTo}"))`
      );
    if (accessConfig.finDelegatedTo)
      query = query.concat(
        `\nfinDelegatedToEl as var(func: eq(xid, "${accessConfig.finDelegatedTo}"))`
      );

    let nquads = `_:accessConfig <permissions> <${accessConfig.permissionsUid}> .`;
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
    delegateTo: string | undefined,        
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
      if(!delegateTo) {
        throw new Error('Undefined delegateTo');
      }

      const delegateToAccessConfig = await this.getAccessConfigOfElement(delegateTo);

      if(delegateToAccessConfig.finDelegatedTo === undefined) {
        throw new Error(`property finDelegatedTo is undefined for element ${delegateTo}`);
      } 

      query = query.concat(
        `\ndelegateTo as var(func: eq(xid, "${delegateTo}"))`
      );
      nquads = nquads.concat(
        `\nuid(config) <delegateTo> uid(delegateTo) .`
      ); 

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
          }`);    

    nquads = nquads.concat(
      `\nuid(a) <finDelegatedTo> uid(finDelegatedTo) .`
    );

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
      ? json.elements[0].accessConfig.map((accessConfig: any) => 
          accessConfig.perspective[0].xid
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

  async clonePermissions(elementId: string, finDelegatedTo: string): Promise<void> {
    const finDelegatedToAccessConfig = await this.getAccessConfigOfElement(finDelegatedTo);

    if(!finDelegatedToAccessConfig.permissionsUid) 
      throw new Error (`Can not clone permissions. Permissions are missed for element ${finDelegatedTo}`);

    await this.setPermissionsConfigOf(elementId, finDelegatedToAccessConfig.permissionsUid);
  }
}