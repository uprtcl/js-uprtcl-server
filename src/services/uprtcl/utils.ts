import { CASStore, Entity, EntityCreate } from '@uprtcl/evees';
import { DataService } from '../data/data.service';

export class LocalStore implements CASStore {
  constructor(protected dataService: DataService) {}

  cacheEntities(entities: Entity<any>[]): Promise<void> {
    throw new Error('Method not implemented.');
  }
  storeEntities(entities: EntityCreate<any>[]): Promise<Entity<any>[]> {
    throw new Error('Method not implemented.');
  }
  removeEntities(hashes: string[]): Promise<void> {
    throw new Error('Method not implemented.');
  }
  hashEntities(entities: EntityCreate<any>[]): Promise<Entity<any>[]> {
    throw new Error('Method not implemented.');
  }
  async getEntities(hashes: string[]): Promise<Entity[]> {
    return this.dataService.getDatas(hashes);
  }
  flush(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  diff(): Promise<Entity<any>[]> {
    throw new Error('Method not implemented.');
  }
  async getEntity<T = any>(hash: string): Promise<Entity<T>> {
    const entities = await this.dataService.getDatas([hash]);
    return entities[0];
  }
  storeEntity(entity: EntityCreate<any>): Promise<Entity<any>> {
    throw new Error('Method not implemented.');
  }
  hashEntity<T = any>(entity: EntityCreate<any>): Promise<Entity<T>> {
    throw new Error('Method not implemented.');
  }
}
