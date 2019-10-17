import { DGraphService, PermissionConfig } from "../../db/dgraph.service";
import { generateToken } from "../../utils/crypto";
var jwt = require('jsonwebtoken');
var ethUtil = require('ethereumjs-util');
require('dotenv').config();

export const C1_ETH_AUTH = 'C1_ETH_AUTH';

export class UserService {

  constructor(protected db: DGraphService) {
  }

  async get(userDid: string): Promise<Object> {
    console.log('[UPRTCL-SERVICE] getNonce', {userDid});
    return { did: userDid };
  };

  /**  */
  async getNonce(userDid: string): Promise<string> {
    console.log('[UPRTCL-SERVICE] getNonce', {userDid});
    let nonce = await generateToken();
    await this.db.setUserNonce(userDid, nonce);
    return nonce;
  };

  async getJwt(userDid: string, signature: string) {
    
    console.log('[USER-CONTROLLER] getJwt', {userDid});

    let owner =  '0x' + userDid.split(':')[2];

    let nonce = await this.db.getNonce(userDid);
    var data = `Login to CollectiveOne \nnonce:${nonce}`;  
    var message = ethUtil.toBuffer(data);
    var msgHash = ethUtil.hashPersonalMessage(message);

    var signatureBytes = ethUtil.toBuffer(signature);
    var sigParams = ethUtil.fromRpcSig(signatureBytes);
    var publicKey = ethUtil.ecrecover(msgHash, sigParams.v, sigParams.r, sigParams.s);
    var sender = ethUtil.publicToAddress(publicKey);
    var addr = ethUtil.bufferToHex(sender);
  
    if (addr.toLowerCase() == owner.toLowerCase()) { 
      var token = jwt.sign({user: addr}, process.env.JWT_SECRET,  { expiresIn: '8d', algorithm: 'HS256', issuer: C1_ETH_AUTH });
      console.log('[USER-CONTROLLER] getJwt() - user authenticated');
      return token;
    } else {
      console.log('[USER-CONTROLLER] getJwt() - user not authenticated');
      return null;
    }
  }

  async isAdmin(perspectiveId: string, userId: string) : Promise<boolean>  {
    return this.db.isAdmin(perspectiveId, userId);
  }

  async getPermissionsConfig(perspectiveId: string, userId: string) : Promise<PermissionConfig> {
    return this.db.getPermissionsConfig(perspectiveId, userId);
  }

  async switchPermissionsConfig(
    perspectiveId: string, 
    userId: string, 
    newPermissions: PermissionConfig) {
    
    /** check user is admin of perspective */
    if(!(await this.isAdmin(perspectiveId, userId))) return;

    let oldPermissions  = await this.getPermissionsConfig(perspectiveId, userId);

    if ((oldPermissions.customAccess && newPermissions.customAccess) || 
        (!oldPermissions.customAccess && !newPermissions.customAccess)) {
      /** no changes */
      return
    } 

    /** incumbent perspectives: this and all who **finally** inherit from 
     *  this perspective */
    let incumbentPerspectives = await this.db.getFinallyInheritingFrom(perspectiveId);

    /**  
     *  from custom to inherit: 
     *   - remove the permissions
     *   - newPermissions = permissions of final inherited from */
    if (oldPermissions.customAccess && !newPermissions.customAccess) {
      let clear = incumbentPerspectives.map((perspId) => this.db.clearPermissions(perspectiveId, userId));
      await Promise.all(clear);
      newPermissions = await this.getPermissionsConfig(newPermissions.inheritFrom, userId);
    }

    let addFirstAdmin = incumbentPerspectives.map((perspId) => this.db.addAdmin(perspectiveId, userId, userId));
    await Promise.all(addFirstAdmin);

    /** at this point it is safe to work in delta-mode */
    if (newPermissions.canRead) {
      let add = newPermissions.canRead.map((newAdminId) => this.addCanRead(perspectiveId, newAdminId, userId));
      await Promise.all(add);
    }

    if (newPermissions.canWrite) {
      let add = newPermissions.canWrite.map((newAdminId) => this.addCanWrite(perspectiveId, newAdminId, userId));
      await Promise.all(add);
    }

    if (newPermissions.canAdmin) {
      let add = newPermissions.canAdmin.map((newAdminId) => this.addCanWrite(perspectiveId, newAdminId, userId));
      await Promise.all(add);
    }
    
  }

}

