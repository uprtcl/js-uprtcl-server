import { ACCESS_CONFIG_SCHEMA_NAME } from "../access/access.schema";

export const PERSPECTIVE_SCHEMA_NAME = 'Perspective';
export const PROOF_SCHEMA_NAME = 'Proof';
export const COMMIT_SCHEMA_NAME = 'Commit';

export const UPRTCL_SCHEMA = `

type ${PERSPECTIVE_SCHEMA_NAME} {
  xid: string
  creator: uid
  authority: string
  timextamp: int
  head: ${COMMIT_SCHEMA_NAME}
  name: string
  context: string
  stored: bool
  accessConfig: ${ACCESS_CONFIG_SCHEMA_NAME}
  proof: ${PROOF_SCHEMA_NAME}
  ecosystem: [uid]
  children: [uid]
  deleted: bool
}

type ${COMMIT_SCHEMA_NAME} {
  xid: string
  creators: [uid]
  timextamp: int
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
authority: string .
timextamp: int .
message: string .
head: uid .
name: string @index(exact) .
parents: [uid] .
signature: string .
proof_type: string .
context: string @index(exact) .
creator: uid .
creators: [uid] .
data: uid .
proof: uid .
ecosystem: [uid] @reverse .
children: [uid] @reverse .
deleted: bool @index(bool) . 

`;