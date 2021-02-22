import { PerspectiveGetResult, GetPerspectiveOptions, SearchOptions, Slice } from '@uprtcl/evees';
import { DGraphService } from '../../db/dgraph.service';
import { UprtclRepository } from '../uprtcl/uprtcl.repository';

const dgraph = require('dgraph-js');

export class SearchRepository {
    constructor(
        protected db: DGraphService,
        protected uprtclRepo: UprtclRepository
    ) {}

    async explore(
      searchOptions: SearchOptions,
      getPerspectiveOptions: GetPerspectiveOptions = {
        levels: 0,
        entities: true,
      },
      loggedUserId: string | null,
    ): Promise<PerspectiveGetResult[]> {
      const results = await this.uprtclRepo.getPerspectives(
          loggedUserId, 
          getPerspectiveOptions, 
          undefined, 
          searchOptions
        );

      /** Filters by accessibility, if no headId is present in result,
       *  the perspective can't be read or accessed.
       * */
      return results.filter((res:any) => res.details.headId);
    }
}