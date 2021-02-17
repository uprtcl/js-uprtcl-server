import { DGraphService } from '../../db/dgraph.service';

const dgraph = require('dgraph-js');

export class SearchRepository {
    constructor(
        protected db: DGraphService
    ) {}
}