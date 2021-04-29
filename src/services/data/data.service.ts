import { Entity } from '@uprtcl/evees';
import { DGraphService } from '../../db/dgraph.service';
import { DataRepository } from '../data/data.repository';
export class DataService {
  constructor(
    protected db: DGraphService,
    protected dataRepo: DataRepository
  ) {}

  async createDatas(
    datas: Entity<Object>[],
    _loggedUserId: string | null
  ): Promise<Entity<any>[]> {
    console.log('[UPRTCL-SERVICE] createDatas', datas);
    return await this.dataRepo.createDatas(datas);
  }

  async getData(hashes: string[]): Promise<any> {
    console.log('[UPRTCL-SERVICE] getData', hashes);
    let data = await this.dataRepo.getData(hashes);
    return data;
  }
}
