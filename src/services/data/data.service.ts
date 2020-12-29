import { DGraphService } from '../../db/dgraph.service';
import { DataRepository } from '../data/data.repository';
import {
  Hashed
} from '../uprtcl/types';


export class DataService {
  constructor(
    protected db: DGraphService,
    protected dataRepo: DataRepository
  ) {}

  async createDatas(
    datas: Hashed<Object>[],
    _loggedUserId: string | null
  ): Promise<string[]> {
    console.log('[UPRTCL-SERVICE] createDatas', datas);
    return await this.dataRepo.createDatas(datas);
  }

  async getData(dataId: string): Promise<any> {
    console.log('[UPRTCL-SERVICE] getData', dataId);
    let data = await this.dataRepo.getData(dataId);
    return data;
  }
}
