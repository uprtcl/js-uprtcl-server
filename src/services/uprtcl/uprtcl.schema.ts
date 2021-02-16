import { PROFILE_SCHEMA_NAME } from '../user/user.schema';

export const PERSPECTIVE_SCHEMA_NAME = 'Perspective';
export const COMMIT_SCHEMA_NAME = 'Commit';
export const CONTEXT_SCHEMA_NAME = 'Context';

export enum PermissionType {
  Read = 'Read',
  Write = 'Write',
  Admin = 'Admin',
}

export const UPRTCL_SCHEMA = `

type ${PERSPECTIVE_SCHEMA_NAME} {
  xid: string
  creator: uid
  authority: string
  timextamp: int
  head: ${COMMIT_SCHEMA_NAME}
  name: string
  context: ${CONTEXT_SCHEMA_NAME}
  linksTo: [uid]
  stored: bool
  path: string
  remote: string
  signature: string
  proof_type: string
  ecosystem: [uid]
  children: [uid]
  deleted: bool
  delegate: bool
  delegateTo: uid
  finDelegatedTo: uid
  publicRead: bool
  publicWrite: bool
  can${PermissionType.Read}: [${PROFILE_SCHEMA_NAME}]
  can${PermissionType.Write}: [${PROFILE_SCHEMA_NAME}]
  can${PermissionType.Admin}: [${PROFILE_SCHEMA_NAME}]
}

type ${CONTEXT_SCHEMA_NAME} {
  name: string
  perspectives: [uid]
}

type ${COMMIT_SCHEMA_NAME} {
  xid: string
  creators: [uid]
  timextamp: int
  message: string
  parents: [uid]
  data: uid
  stored: bool
}


stored: bool @index(bool) . 
xid: string @index(hash) .
authority: string .
timextamp: int .
message: string .
head: uid .
name: string @index(exact) .
context: uid .
linksTo: [uid] @reverse .
perspectives: [uid] @reverse .
parents: [uid] .
signature: string .
proof_type: string .
creator: uid .
creators: [uid] .
data: uid .
ecosystem: [uid] @reverse .
children: [uid] @reverse .
deleted: bool @index(bool) . 
remote: string .
path: string .
canRead: [uid] .
canWrite: [uid] .
canAdmin: [uid] .
publicRead: bool @index(bool) .
publicWrite: bool @index(bool) .
delegate: bool .
delegateTo: uid @reverse .
finDelegatedTo: uid @reverse .
`;
