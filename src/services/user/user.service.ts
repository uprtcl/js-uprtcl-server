import { DGraphService } from "../../db/dgraph.service";
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

}

