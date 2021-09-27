const fs = require('fs');

import { UPRTCL_SCHEMA } from '../services/uprtcl/uprtcl.schema';
import { DATA_SCHEMA } from '../services/data/data.schema';
import { USER_SCHEMA } from '../services/user/user.schema';
import { PROPOSAL_SCHEMA } from '../services/proposals/proposals.schema';

export const SCHEMA = [
  UPRTCL_SCHEMA,
  DATA_SCHEMA,
  USER_SCHEMA,
  PROPOSAL_SCHEMA,
].join('\n');
