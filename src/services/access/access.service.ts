import { DGraphService } from "../../db/dgraph.service";
import { SUCCESS, NOT_AUTHORIZED_MSG } from "../uprtcl/uprtcl.controller";
import { PermissionConfig, AccessRepository, AccessConfig, PermissionType } from "./access.repository";
require('dotenv').config();

export class AccessService {

  constructor(
    protected db: DGraphService,
    protected accessRepo: AccessRepository) {
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
    return this.accessRepo.createPermissionsConfig(persmissions);     
  }

  /** if delegateTo is available, set its persmissions as the persissions of elementId
   *  if not, set its permissions as default. */
  async createAccessConfig(
    elementId: string,
    userId: string | null): Promise<void> {

    let accessConfig: AccessConfig;
    let dftPermUid = await this.createDefaultPermissions(userId);
    accessConfig = {
      delegate: false,
      permissionsUid: dftPermUid
    }

    let accessConfigUid = await this.accessRepo.createAccessConfig(accessConfig);

    return this.accessRepo.setAccessConfigOf(elementId, accessConfigUid);
  }

  async getPermissionsConfig(permissionsUid: string) : Promise<PermissionConfig> {
    return this.accessRepo.getPermissionsConfig(permissionsUid);
  }

  async getAccessConfig(elementId: string, userId: string) : Promise<AccessConfig> {
    return this.accessRepo.getAccessConfigOfElement(elementId, userId);
  }

  /** Create a new permissions config element and set it in the access config of the element. 
   * It does not change the delegate, delegateTo and finalDelegatedTo.
   */
  async createPermissionsConfig(elementId: string, permissions: PermissionConfig) : Promise<string> {
    return this.accessRepo.createPermissionsConfig(permissions)
  }

  async updateAccessConfig(
    elementId: string, 
    newAccessConfig: AccessConfig, 
    userId: string | null) : Promise<void> {

    if (userId == null) throw new Error('logged user not found');

    if(!await this.accessRepo.can(elementId, userId, PermissionType.Admin)) {
      throw new Error(NOT_AUTHORIZED_MSG);
    }

    /**  */
    let newDelegateTo: string | null;
    let newFinDelegatedTo: string | null;
    let newPermissionsUid: string | undefined;

    if (newAccessConfig.delegate) {
      /** protection for undefined delegateTo and finDelegatedTo */
      if (!newAccessConfig.delegateTo) throw new Error('delegateTo not defined');
      
      newDelegateTo = newAccessConfig.delegateTo;

      let delegateToAccessConfig = await this.getAccessConfig(newAccessConfig.delegateTo, userId);
      
      if (delegateToAccessConfig.delegate) {
        /** if delegateTo is, in turn, delegated, jump to the final delegated element */

        /** protection for undefined delegateTo and finDelegatedTo */
        if (!delegateToAccessConfig.delegateTo) throw new Error('delegateTo not found');
        if (!delegateToAccessConfig.finDelegatedTo) throw new Error('finDelegatedTo not found');

        newFinDelegatedTo = delegateToAccessConfig.finDelegatedTo;
        let finDelegatedToAccessConfig = 
          await this.getAccessConfig(delegateToAccessConfig.finDelegatedTo, userId);

        newPermissionsUid = finDelegatedToAccessConfig.permissionsUid;
      } else {
        /** if delegateTo is custom, set it as the final delegated and as the permissions */
        newFinDelegatedTo = newAccessConfig.delegateTo;
        newPermissionsUid = delegateToAccessConfig.permissionsUid;
      }
    } else {
      newDelegateTo = null;
      newFinDelegatedTo = null;
      newPermissionsUid = newAccessConfig.permissionsUid;
    }

    let newAccessConfigProc: AccessConfig = {
      delegate: newAccessConfig.delegate,
      delegateTo: newDelegateTo,
      finDelegatedTo: newFinDelegatedTo,
      permissionsUid: newPermissionsUid
    }

    await this.accessRepo.updateAccessConfig(elementId, newAccessConfigProc);
    
    /** now, recursively update the finDelegatedTo of all elements that are 
     * directly or indirectly using this element permissions */
    let newFinDelegatedToOfChilds = newFinDelegatedTo != null ? newFinDelegatedTo : elementId;
    await this.setFinDelegatedToRec(elementId, newFinDelegatedToOfChilds);
  }

  private async setFinDelegatedToRec(elementId: string, finDelegatedTo: string) : Promise<void> {
    /** get the list of elements that delegated to elementId */
    let delegatingFrom = await this.accessRepo.getDelegatedFrom(elementId);
    
    /** for each of them, set the finDelegateTo and call recursively this function */
    let updateFinDelegatedTo = delegatingFrom.map(async (otherElementId: string) => {
      this.accessRepo.setFinDelegatedTo(otherElementId, finDelegatedTo)
      await this.setFinDelegatedToRec(otherElementId, finDelegatedTo)
    })

    await Promise.all(updateFinDelegatedTo);
  }

  async can(
    elementId: string, 
    userId: string | null, 
    type: PermissionType) : Promise<boolean>  {

    if (await this.accessRepo.isPublic(elementId, type)) {
      return true;
    }
    
    if (userId != null) {
      return this.accessRepo.can(elementId, userId, type);
    }

    console.log('[ACCESS-SERVICE] isRole - FALSE', {elementId, userId, type});    
    return false
  }

  async setPublic(
    elementId: string, 
    type: PermissionType,
    value: boolean,
    userId: string | null) : Promise<void> {

    if (userId == null) throw new Error('logged user not found');

    if(!await this.accessRepo.can(elementId, userId, PermissionType.Admin)) {
      throw new Error(NOT_AUTHORIZED_MSG);
    }

    return this.accessRepo.setPublic(elementId, type, value);    
  }

  async addPermission(
    elementId: string, 
    type: PermissionType,
    toUserId: string, 
    userId: string | null) : Promise<void> {

    if (userId == null) throw new Error('logged user not found');

    if(!await this.accessRepo.can(elementId, userId, PermissionType.Admin)) {
      throw new Error(NOT_AUTHORIZED_MSG);
    }

    return this.accessRepo.addPermission(elementId, type, toUserId);
  }

}

