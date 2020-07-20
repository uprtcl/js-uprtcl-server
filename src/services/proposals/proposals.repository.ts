import { DGraphService } from "../../db/dgraph.service";
import { UserRepository } from "../user/user.repository";
import { KNOWN_SOURCES_SCHEMA_NAME } from '../knownsources/knownsources.schema';
import { DATA_SCHEMA_NAME } from "../data/data.schema";
import {
    PERSPECTIVE_SCHEMA_NAME,
    COMMIT_SCHEMA_NAME
} from "../uprtcl/uprtcl.schema";
import { LOCAL_CASID } from '../providers';
import { Perspective, Commit, Proposal, UpdateRequest } from "../uprtcl/types";

const dgraph = require("dgraph-js");
require("dotenv").config();

export class ProposalsRepository {
    constructor(protected db: DGraphService) {}

}