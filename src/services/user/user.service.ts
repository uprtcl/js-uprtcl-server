import { DGraphService } from '../../db/dgraph.service';
import { generateToken } from '../../utils/crypto';
import { UserRepository } from './user.repository';
var jwt = require('jsonwebtoken');
var ethUtil = require('ethereumjs-util');
require('dotenv').config();

export const C1_ETH_AUTH = 'C1_ETH_AUTH';

export const loginMessage = (nonce: string) => {
  return `Login to Intercreativiy \n\nnonce:${nonce}`;
};

export class UserService {
  constructor(
    protected db: DGraphService,
    protected userRepo: UserRepository
  ) {}

  async get(userDid: string): Promise<Object> {
    console.log('[UPRTCL-SERVICE] getNonce', { userDid });
    return { did: userDid };
  }

  /**  */
  async getNonce(userDid: string): Promise<string> {
    console.log('[UPRTCL-SERVICE] getNonce', { userDid });
    let nonce = await generateToken();
    await this.userRepo.setUserNonce(userDid, nonce);
    return nonce;
  }

  async getJwt(userDid: string, signature: string) {
    console.log('[USER-CONTROLLER] getJwt', { userDid });

    let owner = userDid;

    let nonce = await this.userRepo.getNonce(userDid);
    if (!nonce) throw Error('Nonce not correct');
    var data = loginMessage(nonce);
    var message = '0x' + Buffer.from(data, 'utf8').toString('hex');
    var messageBuffer = ethUtil.toBuffer(message);
    var msgHash = ethUtil.hashPersonalMessage(messageBuffer);

    var signatureBytes = ethUtil.toBuffer(signature);
    var sigParams = ethUtil.fromRpcSig(signatureBytes);
    var publicKey = ethUtil.ecrecover(
      msgHash,
      sigParams.v,
      sigParams.r,
      sigParams.s
    );
    var sender = ethUtil.publicToAddress(publicKey);
    var addr = ethUtil.bufferToHex(sender);

    if (addr.toLowerCase() == owner.toLowerCase()) {
      var token = jwt.sign({ user: `${addr}` }, process.env.JWT_SECRET, {
        expiresIn: '8d',
        algorithm: 'HS256',
        issuer: C1_ETH_AUTH,
      });
      console.log('[USER-CONTROLLER] getJwt() - user authenticated');
      return token;
    } else {
      console.log('[USER-CONTROLLER] getJwt() - user not authenticated');
      return null;
    }
  }
}
