var PermissionType = require("./dgraph.service");

export const PERSPECTIVE_SCHEMA_NAME = 'Perspective';
export const PROFILE_SCHEMA_NAME = 'Profile';
export const COMMIT_SCHEMA_NAME = 'Commit';
export const DATA_SCHEMA_NAME = 'Data';
export const TEXT_SCHEMA_NAME = 'Text';
export const TEXT_NODE_SCHEMA_NAME = 'TextNode';
export const DOCUMENT_NODE_SCHEMA_NAME = 'DocumentNode';
export const KNOWN_SOURCES_SCHEMA_NAME = 'KnownSources';
export const PERMISSIONS_SCHEMA_NAME = 'Permissions';
export const ACCESS_CONFIG_SCHEMA_NAME = 'AccessConfig';

export const SCHEMA = `

type ${PROFILE_SCHEMA_NAME} {
  did: string
  nonce: string
}

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

type ${PERSPECTIVE_SCHEMA_NAME} {
  xid: string
  name: string
  creator: uid
  context: string
  origin: string
  timestamp: datetime
  head: ${COMMIT_SCHEMA_NAME}
  stored: bool
  accessConfig: ${ACCESS_CONFIG_SCHEMA_NAME}
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

type ${DATA_SCHEMA_NAME} {
  xid: string
  stored: bool
  accessConfig: ${ACCESS_CONFIG_SCHEMA_NAME}
}

type ${TEXT_SCHEMA_NAME} {
  xid: string
  stored: bool
  text: string
  accessConfig: ${ACCESS_CONFIG_SCHEMA_NAME}
}

type ${TEXT_NODE_SCHEMA_NAME} {
  xid: string
  stored: bool
  text: string
  links: [uid]
  accessConfig: ${ACCESS_CONFIG_SCHEMA_NAME}
}

type ${DOCUMENT_NODE_SCHEMA_NAME} {
  xid: string
  stored: bool
  text: string
  node_type: string
  links: [uid]
  accessConfig: ${ACCESS_CONFIG_SCHEMA_NAME}
}

# elementId is like xid but for elements *not* stored locally
type ${KNOWN_SOURCES_SCHEMA_NAME} {
  elementId: string
  sources: [string]
}

stored: bool @index(bool) . 
xid: string @index(exact) @upsert .
did: string @index(exact) @upsert .
links: [uid] @reverse .
elementId: string @index(exact) @upsert .
sources: [string] .
text: string @index(fulltext) .
context: string @index(exact) .
publicRead: bool @index(bool) .
publicWrite: bool @index(bool) .
delegatedTo: [uid] @reverse .
finDelegatedTo: [uid] @reverse .
`