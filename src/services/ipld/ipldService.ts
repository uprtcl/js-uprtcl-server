import CID from 'cids';
import multihashing from 'multihashing-async';
import Buffer from 'buffer/';
import { CidConfig } from './cid.config';
import { Secured } from '../uprtcl/types';
import { localCidConfig } from '.';

export function sortObject(object: any): object {
  if (typeof object !== 'object' || object instanceof Array) {
    // Not to sort the array
    return object;
  }
  const keys = Object.keys(object).sort();

  const newObject: any = {};
  for (let i = 0; i < keys.length; i++) {
    newObject[keys[i]] = sortObject(object[keys[i]]);
  }
  return newObject;
}

export class IpldService {
  async generateCidOrdered(
    object: any,
    cidConfig: CidConfig
  ) {
    return ipldService.generateCid(sortObject(object), cidConfig);
  }

  async validateSecured(secured: Secured) {
    if (secured.id !== undefined && secured.id !== '') {
      let valid = await this.validateCid(
        secured.id,
        secured.object
      );
      if (!valid) {
        throw new Error(`Invalid cid ${secured.id}`);
      }
      return secured.id;
    } else {
      const id = await ipldService.generateCidOrdered(
        secured.object,
        localCidConfig
      );
      return id
    }
  }

  async validateCid(
    cidStr: string,
    object: object
  ): Promise<boolean> {
    let cidConfig = CidConfig.fromCid(cidStr);
    let cidCheck = await this.generateCidOrdered(
      object,
      cidConfig
    );
    const valid = cidCheck === cidStr;
    if (!valid) {
      console.log(`[IPLD-SERVICE] validateCid invalid`, {
        object, cidConfig, cidExpected: cidStr, cidCheck});
    }
    return valid;
  }

  async generateCid(object: object, cidConfig: CidConfig): Promise<string> {
    if (typeof object !== 'object') {
      throw new Error(`Object expected, received "${object}"`);
    }

    const b = Buffer.Buffer.from(JSON.stringify(object));
    const encoded = await multihashing(b, cidConfig.type);
    
    const cid = new CID(
      cidConfig.version,
      cidConfig.codec,
      encoded,
      cidConfig.base
    );

    return cid.toString();
  }
}

export const ipldService = new IpldService();
