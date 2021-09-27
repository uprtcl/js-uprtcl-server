import { EntityResolver, Entity, EntityCreate } from '@uprtcl/evees';
import { DataService } from '../data/data.service';

export class LocalEntityResolver implements EntityResolver {
  constructor(protected dataService: DataService) {}

  async getEntities(hashes: string[]): Promise<Entity[]> {
    const datas = await this.dataService.getDatas(hashes);
    if (datas.length !== hashes.length) {
      console.log('Error reading entities', { hashes, datas });
      throw new Error(`Error reading entities ${JSON.stringify(hashes)}`);
    }
    return datas;
  }
  async getEntity<T = any>(hash: string): Promise<Entity<T>> {
    const entities = await this.dataService.getDatas([hash]);
    return entities[0];
  }

  putEntity(entity: Entity<any>): Promise<void> {
    throw new Error('Method not implemented.');
  }
  putEntities(entities: Entity<any>[]): Promise<void> {
    throw new Error('Method not implemented.');
  }
  removeEntity(entityId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  hashObjects(entities: EntityCreate<any>[]): Promise<Entity<any>[]> {
    throw new Error('Method not implemented.');
  }
  hashObject<T = any>(entity: EntityCreate<any>): Promise<Entity<T>> {
    throw new Error('Method not implemented.');
  }
}
