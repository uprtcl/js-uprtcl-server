import CID from 'cids';
import multihashing from 'multihashing-async';
import Buffer from 'buffer/';
import { CidConfig } from './cid.config';

export class IpldService {
  async generateCidOrdered(
    object: any,
    cidConfig: CidConfig,
    propertyOrder: string[]
  ) {
    const plain: any = {};

    for (const key of propertyOrder) {
      plain[key] = object[key];
    }

    return ipldService.generateCid(plain, cidConfig);
  }

  async validateCid(
    cidStr: string,
    object: object,
    propertyOrder: string[]
  ): Promise<boolean> {
    let cidConfig = CidConfig.fromCid(cidStr);
    let cidCheck = await this.generateCidOrdered(
      object,
      cidConfig,
      propertyOrder
    );
    return cidCheck === cidStr;
  }

  /** wrapper that takes a message and computes its [cid](https://github.com/multiformats/cid) */
  async generateCid(object: object, cidConfig: CidConfig): Promise<string> {
    if (typeof object !== 'object')
      throw new Error('Object expected, not the stringified string!');

    /** other clients should hash the stringified object directly  */
    const b = Buffer.Buffer.from(JSON.stringify(object));
    const encoded = await multihashing(b, cidConfig.type);
    // TODO check if raw or dag-pb
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
