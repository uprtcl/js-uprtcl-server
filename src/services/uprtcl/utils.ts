import { CASStore, Entity, EntityCreate, EntityGetResult } from '@uprtcl/evees';
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
  async getEntities(hashes: string[]): Promise<EntityGetResult> {
    const entities = await Promise.all(
      hashes.map((hash) => this.dataService.getData(hash))
    );
    return { entities };
  }
  flush(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  diff(): Promise<Entity<any>[]> {
    throw new Error('Method not implemented.');
  }
  getEntity<T = any>(hash: string): Promise<Entity<T>> {
    return this.dataService.getData(hash);
  }
  storeEntity(entity: EntityCreate<any>): Promise<Entity<any>> {
    throw new Error('Method not implemented.');
  }
  hashEntity<T = any>(entity: EntityCreate<any>): Promise<Entity<T>> {
    throw new Error('Method not implemented.');
  }
}
