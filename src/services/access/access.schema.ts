import { PROFILE_SCHEMA_NAME } from "../user/user.schema";

export const PERMISSIONS_SCHEMA_NAME = 'Permissions';
export const ACCESS_CONFIG_SCHEMA_NAME = 'AccessConfig';

export enum PermissionType {
  Read = 'Read',
  Write = 'Write',
  Admin = 'Admin'
}

export const ACCESS_SCHEMA = `

type ${PERMISSIONS_SCHEMA_NAME} {
  publicRead: bool
  publicWrite: bool
  can${PermissionType.Read}: [${PROFILE_SCHEMA_NAME}]
  can${PermissionType.Write}: [${PROFILE_SCHEMA_NAME}]
  can${PermissionType.Admin}: [${PROFILE_SCHEMA_NAME}]
}

type ${ACCESS_CONFIG_SCHEMA_NAME} {
  delegate: bool
  delegateTo: uid
  finDelegatedTo: uid
  permissions: ${PERMISSIONS_SCHEMA_NAME}
}

canRead: [uid] .
canWrite: [uid] .
canAdmin: [uid] .
accessConfig: uid @reverse .
permissions: uid .
publicRead: bool @index(bool) .
publicWrite: bool @index(bool) .
delegate: bool .
delegateTo: uid @reverse .
finDelegatedTo: uid @reverse .

`;