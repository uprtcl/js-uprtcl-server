import { GetPerspectiveOptions, PerspectiveGetResult, SearchOptions } from "@uprtcl/evees";
import { SearchRepository } from "./search.repository";

export class SearchService {
    constructor(
        protected searchRepo: SearchRepository
    ) {}

    async explore(
     searchOptions: SearchOptions,
     getPerspectiveOptions: GetPerspectiveOptions,
     loggedUserId: string | null
    ): Promise<PerspectiveGetResult[]> {
        return await this.searchRepo.explore(searchOptions, getPerspectiveOptions, loggedUserId);
    }
}