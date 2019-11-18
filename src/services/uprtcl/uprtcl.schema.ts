import { ACCESS_CONFIG_SCHEMA_NAME } from "../access/access.schema";

export const PERSPECTIVE_SCHEMA_NAME = 'Perspective';
export const PROOF_SCHEMA_NAME = 'Proof';
export const COMMIT_SCHEMA_NAME = 'Commit';

export const UPRTCL_SCHEMA = `

type ${PERSPECTIVE_SCHEMA_NAME} {
  xid: string
  creator: uid
  origin: string
  timestamp: datetime
  head: ${COMMIT_SCHEMA_NAME}
  name: string
  context: string
  stored: bool
  accessConfig: ${ACCESS_CONFIG_SCHEMA_NAME}
  proof: ${PROOF_SCHEMA_NAME}
}

type ${COMMIT_SCHEMA_NAME} {
  xid: string
  creator: uid
  timestamp: datetime
  message: string
  parents: [uid]
  data: uid
  stored: bool
  accessConfig: ${ACCESS_CONFIG_SCHEMA_NAME}
}

type ${PROOF_SCHEMA_NAME} {
  signature: string
  proof_type: string
}

stored: bool @index(bool) . 
xid: string @index(exact) @upsert .
head: uid .
name: string @index(exact) .
context: string @index(exact) .
creator: uid .
proof: uid .

`;