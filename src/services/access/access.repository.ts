import { DGraphService } from '../../db/dgraph.service';
import { UserRepository } from '../user/user.repository';
import { Upsert, PermissionType } from '../uprtcl/types';
import { Update } from '@uprtcl/evees';

const dgraph = require('dgraph-js');
export interface PermissionConfig {
  publicRead: boolean;
  publicWrite: boolean;
  canRead?: string[];
  canWrite?: string[];
  canAdmin?: string[];
}

export interface AccessConfig {
  delegate: boolean;
  delegateTo?: string;
  finDelegatedTo?: string;
  permissions: PermissionConfig;
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

  async canUpdate(
    updates: Update[],
    loggedUserId: string
  ): Promise<boolean> {
    const userId = this.userRepo.formatDid(loggedUserId);
    let query = '';

    for (let i = 0; i < updates.length; i++) {
      const queryString = this.canUpdateQuery(updates[i].perspectiveId, query, userId);

      if(i < 1) {
        query = query.concat(queryString);
      }

      query = queryString;
    }

    const result = (
      await this.db.client.newTxn().query(`query{${query}}`)
    ).getJson();

    const notAllowed = Object.keys(result).filter(el => result[el].length < 1);

    return notAllowed.length === 0;
  }

  canUpdateQuery(updateId: string, query: string, userId: string) {
    query = query.concat(
      `\nprivate${updateId} as var(func: eq(xid, ${updateId})) @cascade {
          canWrite @filter(eq(did, ${userId})) {
            did
          }
        }
      \npublic${updateId} as var(func: eq(xid, ${updateId})) @filter(eq(publicWrite, true)) {
        xid
       }
      \npersp${updateId}(func: eq(xid, ${updateId})) @filter(uid(private${updateId}) OR uid(public${updateId})) {
          xid
        }`
    );

    return query;
  }

  async getPublicPermissions(elementId: string): Promise<PublicPermissions> {
    let query = `
    element(func: eq(xid, "${elementId}")) {
      publicRead
      publicWrite
    }`;

    let result = await this.db.client.newTxn().query(`query{${query}}`);
    let json = result.getJson();

    if (json.element.length > 0) {
      if (json.element[0] === undefined) {
        throw new Error(
          `undefined element ${elementId}`
        );
      }

      const publicRead: boolean =
        json.element[0].publicRead;
      const publicWrite: boolean =
        json.element[0].publicWrite;

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
      canRead @filter(eq(did, "${userId.toLowerCase()}")) {
        count(uid)
      }
      canWrite @filter(eq(did, "${userId.toLowerCase()}")) {
        count(uid)
      }
      canAdmin @filter(eq(did, "${userId.toLowerCase()}")) {
        count(uid)
      }
    }`;

    let result = await this.db.client.newTxn().query(`query{${query}}`);
    let json = result.getJson();

    if (json.element.length > 0) {
      if (json.element[0] === undefined) {
        throw new Error(
          `undefined element ${elementId}`
        );
      }

      const canReadUser: boolean =
        json.element[0].canRead !== undefined &&
        json.element[0].canRead[0].count > 0;

      const canWriteUser: boolean =
        json.element[0].canWrite !== undefined &&
        json.element[0].canWrite[0].count > 0;

      const canAdminUser: boolean =
        json.element[0].canAdmin !== undefined &&
        json.element[0].canAdmin[0].count > 0;

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
    elementId: string
  ): Promise<PermissionConfig> {
    let query = `
    permissionsOf${elementId}(func: eq(xid, ${elementId})) {
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
      { elementId },
      result.getJson()
    );

    let dpermissionsConfig = result.getJson()[`permissionsOf${elementId}`][0];

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
    element(func: eq(xid, ${elementId})) {
      delegate
      delegateTo {
        xid
      }
      finDelegatedTo {
        xid
      }
      canRead {
        did
      }
      canWrite {
        did
      }
      canAdmin {
        did
      }
      publicRead
      publicWrite
    }
    `;
    let result = await this.db.client.newTxn().query(`query{${query}}`);
    const json = result.getJson();
    console.log(
      '[DGRAPH] getAccessConfigOfElement',
      { elementId },
      JSON.stringify(json)
    );
    
    if (json.element[0] === undefined)
      throw new Error(
        `undefined for element ${elementId}`
      );
    let daccessConfig = json.element[0];
    return {
      delegate:
        daccessConfig.delegate !== undefined ? daccessConfig.delegate : false,
      delegateTo: daccessConfig.delegateTo
        ? daccessConfig.delegateTo.xid
        : undefined,
      finDelegatedTo: daccessConfig.finDelegatedTo
        ? daccessConfig.finDelegatedTo.xid
        : undefined,
      permissions: {
        publicRead: daccessConfig.publicRead,
        publicWrite: daccessConfig.publicWrite,
        canRead: daccessConfig.canRead,
        canWrite: daccessConfig.canWrite,
        canAdmin: daccessConfig.canAdmin
      },
    };
  }

  async isPublic(elementId: string, type: PermissionType): Promise<boolean> {
    if (type === PermissionType.Admin) return false;

    let query = `
    element(func: eq(xid, ${elementId})) {
      public${type}
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

    return json.element[0][`public${type}`];
  }

  async setPublic(
    elementId: string,
    type: PermissionType,
    value: boolean
  ): Promise<void> {
    await this.db.ready();

    let query = `perspective as var(func: eq(xid, ${elementId}))`;

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    let nquads = `uid(perspective) <public${type}> "${value}" .`;

    req.setQuery(`query{${query}}`);
    mu.setSetNquads(nquads);
    mu.setCond(`@if(eq(len(perspective), 1))`);
    req.setMutationsList([mu]);

    let result = await this.db.callRequest(req);
    console.log(
      '[DGRAPH] setPublic',
      { nquads },
      result.getUidsMap().toArray()
    );
  }

  async toggleDelegate(
    elementId: string,
    delegateTo: string | undefined
  ): Promise<void> {
    await this.db.ready();

    /** get the accessConfig Uid */
    let query = `element as var(func: eq(xid, ${elementId}))`;

    /** now update the the accessConfig */
    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    const delegate = delegateTo !== undefined;

    let nquads = `uid(element) <delegate> "${delegate}" .`;

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
      nquads = nquads.concat(`\nuid(element) <delegateTo> uid(delegateTo) .`);

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
      `\nuid(element) <finDelegatedTo> uid(finDelegatedTo) .`
    );

    query = query.concat(
      `\n q(func: eq(xid, "${elementId}")) 
          @recurse
          {
            a as ~delegateTo
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

    let query = `perspective as var(func: eq(xid, "${elementId}"))`;
    let nquads = `uid(perspective) <finDelegatedTo> <${newFinDelegatedTo}> .`;

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
    accessConfig: AccessConfig
  ): Promise<void> {
    await this.db.ready();

    if (elementId == undefined || elementId === '')
      throw new Error(`ElementId is empty`);

    const mu = new dgraph.Mutation();
    const req = new dgraph.Request();

    const { permissions: { canRead, canWrite, canAdmin } } = accessConfig;

    /** make sure creatorId exist */
    let query = `element as var(func: eq(xid, "${elementId}"))`;
    let nquads = `\nuid(element) <delegate> ${accessConfig.delegate} .
                  \nuid(element) <finDelegatedTo> ${accessConfig.finDelegatedTo} .
                  \nuid(element) <canRead> ${accessConfig.delegate} .`;
    
    canRead?.map(did => {
      const creatorSegment = this.userRepo.upsertQueries(
        did
      );
      query = query.concat(creatorSegment.query);
      nquads = nquads.concat(creatorSegment.nquads);
      nquads = nquads.concat(`\nuid(element) <canRead> uid(profile${did}) .`);
    });

    canWrite?.map(did => {
      const creatorSegment = this.userRepo.upsertQueries(
        did
      );
      query = query.concat(creatorSegment.query);
      nquads = nquads.concat(creatorSegment.nquads);
      nquads = nquads.concat(`\nuid(element) <canWrite> uid(profile${did}) .`);
    });

    canAdmin?.map(did => {
      const creatorSegment = this.userRepo.upsertQueries(
        did
      );
      query = query.concat(creatorSegment.query);
      nquads = nquads.concat(creatorSegment.nquads);
      nquads = nquads.concat(`\nuid(element) <canAdmin> uid(profile${did}) .`);
    });
        
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
      ~delegateTo {
        xid
      }
    }
    `;

    let result = await this.db.client.newTxn().query(`query{${query}}`);
    let json = result.getJson();
    return json.elements.length > 0
      ? json.elements[0]['~delegateTo'].map(
          (accessConfig: any) => accessConfig.xid
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
    persp as var(func: eq(xid, ${elementId}))
    user as var(func: eq(did, "${toUserId.toLowerCase()}"))
    `;

    /** delete other permissions so that each user has one role only */
    switch (type) {
      case PermissionType.Admin:
        ndelquads = ndelquads.concat(`\nuid(persp) <canRead> uid(user) .`);
        ndelquads = ndelquads.concat(`\nuid(persp) <canWrite> uid(user) .`);
        break;

      case PermissionType.Write:
        ndelquads = ndelquads.concat(`\nuid(persp) <canRead> uid(user) .`);
        ndelquads = ndelquads.concat(`\nuid(persp) <canAdmin> uid(user) .`);
        break;

      case PermissionType.Read:
        ndelquads = ndelquads.concat(`\nuid(persp) <canWrite> uid(user) .`);
        ndelquads = ndelquads.concat(`\nuid(persp) <canAdmin> uid(user) .`);
        break;
    }

    let nquads = `uid(persp) <can${type}> uid(user) .`;

    const req = new dgraph.Request();
    const mu = new dgraph.Mutation();

    mu.setDelNquads(ndelquads);
    mu.setSetNquads(nquads);
    mu.setCond(`@if(eq(len(persp), 1))`);
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
    perspective as var(func: eq(xid, ${elementId}))
    user as var(func: eq(did, "${toUserId.toLowerCase()}"))`;
    let ndelquads: string = '';
    ndelquads = ndelquads.concat(`\nuid(perspective) <canRead> uid(user) .`);
    ndelquads = ndelquads.concat(`\nuid(perspective) <canWrite> uid(user) .`);
    ndelquads = ndelquads.concat(`\nuid(perspective) <canAdmin> uid(user) .`);

    const req = new dgraph.Request();
    const mu = new dgraph.Mutation();

    mu.setDelNquads(ndelquads);
    mu.setCond(`@if(eq(len(perspective), 1))`);
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
        perspective as var(func: eq(xid, ${elementId})) 
      }
    `;

    let delNquads = `uid(perspective) <canRead> * .`;
    delNquads = delNquads.concat(`\nuid(perspective) <canWrite> * .`);
    delNquads = delNquads.concat(`\nuid(perspective) <canAdmin> * .`);

    const req = new dgraph.Request();
    const mu = new dgraph.Mutation();

    mu.setDelNquads(delNquads);
    mu.setCond(`@if(eq(len(perspective), 1))`);
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
    `;

    query = query.concat(`
      \nelement as var(func:eq(xid, "${elementId}"))`);

    const readMutation = new dgraph.Mutation();
    readMutation.setSetNquads(`uid(element) <canRead> uid(userCr) .`);
    readMutation.setCond(`@if(gt(len(userCr), 0))`);

    const writeMutation = new dgraph.Mutation();
    writeMutation.setSetNquads(`uid(element) <canWrite> uid(userCw) .`);
    writeMutation.setCond(`@if(gt(len(userCw), 0))`);

    const adminMutation = new dgraph.Mutation();
    adminMutation.setSetNquads(`uid(element) <canAdmin> uid(userAd) .`);
    adminMutation.setCond(`@if(gt(len(userAd), 0))`);

    const req = new dgraph.Request();

    req.setQuery(`query{${query}}`);
    req.setMutationsList([readMutation, writeMutation, adminMutation]);

    await this.db.callRequest(req);
  }
}
