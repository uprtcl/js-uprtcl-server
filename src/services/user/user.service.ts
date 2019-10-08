import { DGraphService } from "../../db/dgraph.service";
import { generateToken } from "../../utils/crypto";

export class UserService {

  constructor(protected db: DGraphService) {
  }

  async getNonce(userDid: string): Promise<void> {
    let nonce = await generateToken();
    await this.db.setUserNonce(userDid, nonce);
    console.log('[UPRTCL-SERVICE] getNonce', {userDid}, {nonce});
  };

}

