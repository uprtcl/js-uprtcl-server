import {
  PerspectiveGetResult,
  GetPerspectiveOptions,
  SearchOptions,
  SearchResult,
} from '@uprtcl/evees';
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
    loggedUserId: string | null
  ): Promise<SearchResult> {
    return this.uprtclRepo.explorePerspectives(
      searchOptions,
      loggedUserId,
      getPerspectiveOptions
    );
  }
}
