import { SearchRepository } from "./search.repository";

export class SearchService {
    constructor(
        protected searchRepo: SearchRepository
    ) {}

    async explore() {
        
    }
}