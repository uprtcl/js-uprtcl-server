import { Secured } from '@uprtcl/evees';
import CID from 'cids';
const CBOR = require('cbor-js');

import multihashing from 'multihashing-async';
import { localCidConfig } from '.';
import { CidConfig } from './cid.config';

type genericObject = {
  [key: string]: any;
};

const LOGINFO = false;

function sortObject(object: genericObject): object {
  if (typeof object !== 'object' || object instanceof Array) {
    // Not to sort the array
    return object;
  }
  const keys = Object.keys(object).sort();

  const newObject: genericObject = {};
  for (let i = 0; i < keys.length; i++) {
    newObject[keys[i]] = sortObject(object[keys[i]]);
  }
  return newObject;
}

export class IpldService {
  async generateCidOrdered(object: any, cidConfig: CidConfig) {
    const sorted = sortObject(object);
    const buffer = CBOR.encode(sorted);
    const buffer2 = new Buffer(buffer);
    const encoded = await multihashing(buffer2, cidConfig.type);

    const cid = new CID(
      cidConfig.version,
      cidConfig.codec,
      encoded,
      cidConfig.base
    );

    if (LOGINFO) {
      console.log(`hashed object:`, {
        object,
        sorted,
        buffer,
        buffer2,
        cidConfig,
        cid,
        cidStr: cid.toString(),
      });
    }

    return cid.toString();
  }

  async validateSecured(secured: Secured<any>) {
    if (secured.hash !== undefined && secured.hash !== '') {
      let valid = await this.validateCid(secured.hash, secured.object);
      if (!valid) {
        throw new Error(
          `Invalid cid ${secured.hash} (see log above for details)`
        );
      }
      return secured.hash;
    } else {
      const id = await ipldService.generateCidOrdered(
        secured.object,
        localCidConfig
      );
      return id;
    }
  }

  async validateCid(cidStr: string, object: object): Promise<boolean> {
    let cidConfig = CidConfig.fromCid(cidStr);
    let cidCheck = await this.generateCidOrdered(object, cidConfig);
    const valid = cidCheck === cidStr;
    if (!valid) {
      console.log(`[IPLD-SERVICE] validateCid invalid`, {
        object,
        cidConfig,
        cidExpected: cidStr,
        cidCheck,
      });
    }
    return valid;
  }
}

export const ipldService = new IpldService();
