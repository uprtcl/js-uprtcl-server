import { DGraphService } from '../../db/dgraph.service';
import {
  PermissionConfig,
  AccessRepository,
  AccessConfig,
  AccessConfigInherited,
  UserPermissions,
} from './access.repository';
import { NOT_AUTHORIZED_MSG } from '../../utils';
import { PermissionType } from '../uprtcl/types';
import { DgUpdate } from '../proposals/types';
import { Update } from '@uprtcl/evees';

require('dotenv').config();

export class AccessService {
  constructor(
    protected db: DGraphService,
    protected accessRepo: AccessRepository
  ) {}

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
    const allowedUsers = userId !== null ? [userId] : [];
    const permissions = {
      publicRead: false,
      publicWrite: false,
      canRead: allowedUsers,
      canWrite: allowedUsers,
      canAdmin: allowedUsers,
    };

    if (delegateTo) {
      if (userId == null)
        throw new Error('cant inherit permissions if user is not logged in');
      const delegateAccessConfig = await this.getAccessConfig(delegateTo);
      /** keep the final delegate updated */
      const finDelegatedTo = delegateAccessConfig.delegate
        ? delegateAccessConfig.finDelegatedTo
        : delegateTo;
      accessConfig = {
        delegate: true,
        delegateTo,
        finDelegatedTo,
        permissions,
      };
    } else {
      accessConfig = {
        delegate: false,
        finDelegatedTo: elementId,
        permissions,
      };
    }

    return this.accessRepo.setAccessConfigOf(elementId, accessConfig);
  }

  async getPermissionsConfig(
    permissionsUid: string
  ): Promise<PermissionConfig> {
    return this.accessRepo.getPermissionsConfig(permissionsUid);
  }

  async getAccessConfig(elementId: string): Promise<AccessConfig> {
    return this.accessRepo.getAccessConfigOfElement(elementId);
  }

  async getAccessConfigDetails(
    elementId: string,
    userId: string
  ): Promise<AccessConfigInherited> {
    if (!(await this.accessRepo.can(elementId, userId, PermissionType.Admin))) {
      throw new Error(NOT_AUTHORIZED_MSG);
    }

    const accessConfig = await this.getAccessConfig(elementId);

    let permissionsElement: string = elementId;
    if (accessConfig.delegate) {
      if (!accessConfig.finDelegatedTo)
        throw new Error(
          `undefined delegateTo but accessConfig delegate of ${elementId} is true`
        );
      permissionsElement = accessConfig.finDelegatedTo;
    }

    const customPermissions = await this.getPermissionsConfigOfElement(
      elementId
    );
    const effectivePermissions = await this.getPermissionsConfigOfElement(
      permissionsElement
    );

    return {
      delegate: accessConfig.delegate,
      delegateTo: accessConfig.delegateTo || null,
      finDelegatedTo: accessConfig.finDelegatedTo || null,
      customPermissions: customPermissions.permissions,
      effectivePermissions: effectivePermissions.permissions,
    };
  }

  async getUserCan(
    elementId: string,
    userId: string
  ): Promise<UserPermissions> {
    return this.accessRepo.getUserCan(elementId, userId);
  }

  async getPermissionsConfigOfElement(elementId: string) {
    const perspective = await this.accessRepo.getAccessConfigOfElement(
      elementId
    );
    if (!perspective)
      throw new Error(`persmissions not found for element ${elementId}`);
    return perspective;
  }

  async toggleDelegate(
    elementId: string,
    delegate: boolean,
    delegateTo: string | undefined,
    userId: string | null
  ): Promise<void> {
    // Are non logged in users able to delegate?
    if (userId == null) throw new Error('logged user not found');

    if (!delegateTo && delegate) {
      throw new Error('Can not delegate to undefined.');
    }

    if (!delegate) {
      // Gets the elementId accessConfig
      const elementIdAccessConfig = await this.accessRepo.getAccessConfigOfElement(
        elementId
      );

      // Verifies that the elementId brings with itself the `delegateTo` property to continue.
      if (!elementIdAccessConfig.delegateTo)
        throw new Error(`
          Can not clone permissions from undefined
          delegateTo property of the element 
          ${elementId}
        `);

      // Gets the accessConfig of the elementId `delegateTo` property.
      const delegateToAccessConfig = await this.accessRepo.getAccessConfigOfElement(
        elementIdAccessConfig.delegateTo
      );

      // Verifies that the delegateTo element brings with itself the `finalDelegatedTo` property.
      if (!delegateToAccessConfig.finDelegatedTo)
        throw new Error(`
          Can not clone permissions. 
          Undefined finDelegated for ID 
          ${elementIdAccessConfig.delegateTo}
        `);

      // Clone permissions from the `finalDelegatedTo` element obtained to the accessConfig  of the `elementId` element.
      await this.accessRepo.clonePermissions(
        elementId,
        delegateToAccessConfig.finDelegatedTo
      );
    }

    await this.accessRepo.toggleDelegate(elementId, delegateTo);
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
          `undefined finDelegatedTo but accessConfig delegate of ${elementId} is true`
        );
      permissionsElement = accessConfig.finDelegatedTo;
    }

    return this.accessRepo.can(permissionsElement, userId, type);
  }

  async canAll(
    perspectiveIds: string[],
    loggedUserId: string,
    type: PermissionType
  ): Promise<boolean> {
    if (loggedUserId === null)
      throw new Error('Anonymous user. Cant update a perspective');

    return await this.accessRepo.canAll(perspectiveIds, loggedUserId, type);
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
    const authorizePromises = proposalUpdates.map(async (update) => {
      const {
        perspective: { xid: perspectiveId },
      } = update;

      return {
        canAdmin: await this.accessRepo.can(
          perspectiveId,
          userId,
          PermissionType.Admin
        ),
        canWrite: await this.accessRepo.can(
          perspectiveId,
          userId,
          PermissionType.Write
        ),
      };
    });

    const authorizations = await Promise.all(authorizePromises);

    const authorizedUpdates = authorizations.filter((auth) => {
      return auth.canAdmin || auth.canWrite;
    });

    return authorizedUpdates.length == proposalUpdates.length;
  }

  async deletePermission(
    elementId: string,
    toUserId: string,
    userId: string | null
  ): Promise<void> {
    if (userId == null) throw new Error('logged user not found');

    if (!(await this.accessRepo.can(elementId, userId, PermissionType.Admin))) {
      throw new Error(NOT_AUTHORIZED_MSG);
    }

    return this.accessRepo.deletePermission(elementId, toUserId);
  }
}
