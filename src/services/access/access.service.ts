import { DGraphService } from '../../db/dgraph.service';
import {
  PermissionConfig,
  AccessRepository,
  AccessConfig,
} from './access.repository';
import { PermissionType } from './access.schema';
import { NOT_AUTHORIZED_MSG } from "../../utils";
import { DgUpdate } from "../uprtcl/types";
require('dotenv').config();

export class AccessService {
  constructor(
    protected db: DGraphService,
    protected accessRepo: AccessRepository
  ) {}

  async createDefaultPermissions(userId: string | null): Promise<string> {
    let persmissions: PermissionConfig;
    if (userId != null) {
      persmissions = {
        publicRead: false,
        publicWrite: false,
        canRead: [],
        canWrite: [],
        canAdmin: [userId],
      };
    } else {
      /** public elements can be read and writed by anyone and have no admin */
      persmissions = {
        publicRead: true,
        publicWrite: true,
        canRead: [],
        canWrite: [],
        canAdmin: [],
      };
    }
    return this.accessRepo.createPermissionsConfig(persmissions);
  }

  /** if delegateTo is available, set its persmissions as the persissions of elementId
   *  if not, set its permissions as default. */
  async createAccessConfig(
    elementId: string,
    delegateTo: string | undefined,
    userId: string | null
  ): Promise<void> {
    if (elementId == undefined || elementId === '')
      throw new Error(`ElementId is empty`);

    let accessConfig: AccessConfig;
    if (delegateTo) {
      if (userId == null)
        throw new Error('cant inherit permissions if user is not logged in');
      const delegateAccessConfig = await this.getAccessConfig(
        delegateTo
      );
      /** keep the final delegate updated */
      const finDelegatedTo = delegateAccessConfig.delegate
        ? delegateAccessConfig.finDelegatedTo
        : delegateTo;
      accessConfig = {
        delegate: true,
        delegateTo,
        finDelegatedTo,
        permissionsUid: delegateAccessConfig.permissionsUid,
      };
    } else {
      let dftPermUid = await this.createDefaultPermissions(userId);
      accessConfig = {
        delegate: false,
        finDelegatedTo: elementId,        
        permissionsUid: dftPermUid
      };
    }

    let accessConfigUid = await this.accessRepo.createAccessConfig(
      accessConfig
    );

    return this.accessRepo.setAccessConfigOf(elementId, accessConfigUid);
  }

  async getPermissionsConfig(
    permissionsUid: string
  ): Promise<PermissionConfig> {
    return this.accessRepo.getPermissionsConfig(permissionsUid);
  }

  async getAccessConfig(
    elementId: string
  ): Promise<AccessConfig> {
    return this.accessRepo.getAccessConfigOfElement(elementId);
  }

  async getPermissionsConfigOfElement(elementId: string, userId: string) {
    const { permissionsUid } = await this.accessRepo.getAccessConfigOfElement(
      elementId
    );
    if (!permissionsUid)
      throw new Error(`persmissions not found for element ${elementId}`);
    return this.getPermissionsConfig(permissionsUid);
  }

  /** Create a new permissions config element and set it in the access config of the element.
   * It does not change the delegate, delegateTo and finalDelegatedTo.
   */
  async createPermissionsConfig(
    permissions: PermissionConfig
  ): Promise<string> {
    return this.accessRepo.createPermissionsConfig(permissions);
  }

  async toggleDelegate(
    elementId: string,
    delegate: boolean,
    delegateTo: string | undefined,
    userId: string | null
  ): Promise<void> {

    // Are non logged in users able to delegate?
    if (userId == null) throw new Error('logged user not found');
    
    if(!delegateTo && delegate) { 
      throw new Error("Can not delegate to undefined.");
    }

    if(!delegate) {
      // Gets the elementId accessConfig
      const elementIdAccessConfig = await this.accessRepo.getAccessConfigOfElement(
        elementId
      );

      // Verifies that the elementId brings with itself the `delegateTo` property to continue.
      if(!elementIdAccessConfig.delegateTo) 
        throw new Error(`Can not clone permissions from undefined delegateTo property of the element ${elementId}`);

      // Gets the accessConfig of the elementId `delegateTo` property.
      const delegateToAccessConfig = await this.accessRepo.getAccessConfigOfElement(
        elementIdAccessConfig.delegateTo
      );

      // Verifies that the delegateTo element brings with itself the `finalDelegatedTo` property.      
      if(!delegateToAccessConfig.finDelegatedTo)
        throw new Error(`Can not clone permissions. Undefined finDelegated for ID ${elementIdAccessConfig.delegateTo}`);      

      // Clone permissions from the `finalDelegatedTo` element obtained to the `elementId` element.
      await this.accessRepo.clonePermissions(elementId, delegateToAccessConfig.finDelegatedTo);
    }

    await this.accessRepo.toggleDelegate(
      elementId, 
      delegateTo
    );
  }

  async can(
    elementId: string,
    userId: string | null,
    type: PermissionType
  ): Promise<boolean> {
    let permissionsElement: string = elementId;

    const accessConfig = await this.getAccessConfig(elementId);
    if (accessConfig.delegate) {
      if (!accessConfig.finDelegatedTo)
        throw new Error(
          `undefined delegateTo but accessConfig delegate of ${elementId} is true`
        );
      permissionsElement = accessConfig.finDelegatedTo;
    }

    if (await this.accessRepo.isPublic(permissionsElement, type)) {
      return true;
    }

    if (userId != null) {
      return this.accessRepo.can(permissionsElement, userId, type);
    }

    console.log('[ACCESS-SERVICE] isRole - FALSE', { elementId, userId, type });
    return false;
  }

  async setPublic(
    elementId: string,
    type: PermissionType,
    value: boolean,
    userId: string | null
  ): Promise<void> {
    if (userId == null) throw new Error('logged user not found');

    if (!(await this.accessRepo.can(elementId, userId, PermissionType.Admin))) {
      throw new Error(NOT_AUTHORIZED_MSG);
    }

    return this.accessRepo.setPublic(elementId, type, value);
  }

  async addPermission(
    elementId: string,
    type: PermissionType,
    toUserId: string,
    userId: string | null
  ): Promise<void> {
    if (userId == null) throw new Error('logged user not found');

    if (!(await this.accessRepo.can(elementId, userId, PermissionType.Admin))) {
      throw new Error(NOT_AUTHORIZED_MSG);
    }

    return this.accessRepo.addPermission(elementId, type, toUserId);
  }

  async canAuthorizeProposal(
    proposalUpdates: DgUpdate[],
    userId: string
  ): Promise<boolean> {
    const authorizePromises = proposalUpdates.map(async update => {
      const { perspective: { xid: perspectiveId } } = update;

      return {
        canAdmin: await this.accessRepo.can(perspectiveId, userId, PermissionType.Admin),
        canWrite: await this.accessRepo.can(perspectiveId, userId, PermissionType.Write)
      }
    });

    const authorizations = await Promise.all(authorizePromises);

    const authorizedUpdates = authorizations.filter(auth => {
      return auth.canAdmin || auth.canWrite;
    });

    return (authorizedUpdates.length == proposalUpdates.length);
  }

}

