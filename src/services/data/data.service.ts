import { Entity } from '@uprtcl/evees';
import { DGraphService } from '../../db/dgraph.service';
import { DataRepository } from '../data/data.repository';
export class DataService {
  constructor(
    protected db: DGraphService,
    protected dataRepo: DataRepository
  ) {}

  async createDatas(
    datas: Entity[],
    _loggedUserId: string | null
  ): Promise<Entity<any>[]> {
    console.log('[UPRTCL-SERVICE] createDatas', datas);
    return await this.dataRepo.createDatas(datas);
  }

  async getDatas(hashes: string[]): Promise<Entity[]> {
    console.log('[UPRTCL-SERVICE] getData', hashes);
    let datas = await this.dataRepo.getDatas(hashes);
    return datas;
  }

  async getData(hash: string): Promise<Entity> {
    let entities = await this.dataRepo.getDatas([hash]);
    return entities[0];
  }
}
