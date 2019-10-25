import { DGraphService, PermissionConfig, AccessConfig, PermissionType } from "../../db/dgraph.service";
require('dotenv').config();

export class AccessService {

  constructor(protected db: DGraphService) {
  }

  async createDefaultPermissions(userId: string | null): Promise<string> {
    let persmissions: PermissionConfig;
    if (userId != null) {
      persmissions = {
        publicRead: false,
        publicWrite: false,
        canRead: [],
        canWrite: [],
        canAdmin: [userId]
      }
    } else {
      /** public elements can be read and writed by anyone and have no admin */
      persmissions = {
        publicRead: true,
        publicWrite: true,
        canRead: [],
        canWrite: [],
        canAdmin: []
      }
    }
    return this.db.createPermissionsConfig(persmissions);     
  }

  /** if delegateTo is available, set its persmissions as the persissions of elementId
   *  if not, set its permissions as default. */
  async createAccessConfig(
    elementId: string, 
    delegateTo: string | null, 
    userId: string | null): Promise<void> {

    let accessConfig: AccessConfig;

    if (delegateTo != null) {
      let refAccessConfig = await this.db.getAccessConfigOfElement(delegateTo, userId);
      accessConfig = {
        delegate: true,
        delegateTo: delegateTo,
        finDelegatedTo: refAccessConfig.finDelegatedTo,
        permissionsUid: refAccessConfig.permissionsUid
      }
    } else {
      let dftPermUid = await this.createDefaultPermissions(userId);
      accessConfig = {
        delegate: false,
        permissionsUid: dftPermUid
      }
    }

    let accessConfigUid = await this.db.createAccessConfig(accessConfig);

    return this.db.setAccessConfigOf(elementId, accessConfigUid);
  }

  async can(
    elementId: string, 
    userId: string | null, 
    type: PermissionType) : Promise<boolean>  {

    if (await this.db.isPublic(elementId, type)) {
      return true;
    }
    
    if (userId != null) {
      return this.db.can(elementId, userId, type);
    }

    console.log('[ACCESS-SERVICE] isRole - FALSE', {elementId, userId, type});    
    return false
  }

  async getPermissionsConfig(permissionsUid: string) : Promise<PermissionConfig> {
    return this.db.getPermissionsConfig(permissionsUid);
  }

//  async switchPermissionsConfig(
//    perspectiveId: string, 
//    userId: string, 
//    newPermissions: PermissionConfig) {
//    
//    /** check user is admin of perspective */
//    if(!(await this.isRole(perspectiveId, userId))) return;
//
//    let oldPermissions  = await this.getPermissionsConfig(perspectiveId, userId);
//
//    if ((oldPermissions.delegate && newPermissions.delegate) || 
//        (!oldPermissions.delegate && !newPermissions.delegate)) {
//      /** no changes */
//      return
//    } 
//
//    /** incumbent perspectives: this and all who **finally** inherit from 
//     *  this perspective */
//    let incumbentPerspectives = await this.db.getFinallyInheritingFrom(perspectiveId);
//
//    /** clear current permissions */
//    let clear = incumbentPerspectives.map((perspId) => this.db.clearPermissions(perspectiveId, userId));
//    await Promise.all(clear);
//    
//    /**  
//     *  from custom to inherit: 
//     *   - newPermissions = permissions of final inherited from */
//    if (oldPermissions.delegate && !newPermissions.delegate) {
//      newPermissions = await this.getPermissionsConfig(newPermissions.delegateTo, userId);
//    }
//
//    /** at this point it is safe to work in delta-mode */
//    if (newPermissions.canRead) {
//      let add = newPermissions.canRead.map((newUserId) => this.addCanRead(perspectiveId, newUserId, userId));
//      await Promise.all(add);
//    }
//
//    if (newPermissions.canWrite) {
//      let add = newPermissions.canWrite.map((newUserId) => this.addCanWrite(perspectiveId, newUserId, userId));
//      await Promise.all(add);
//    }
//
//    if (newPermissions.canAdmin) {
//      let add = newPermissions.canAdmin.map((newUserId) => this.addCanWrite(perspectiveId, newUserId, userId));
//      await Promise.all(add);
//    }
//  }
//
//  async addCanRead(perspectiveId: string, newUserId: string, userId: string) {
//    this.db.addPermission(perspectiveId, newUserId, userId, PermissionType.Read);
//  }

}

