
export const PERSPECTIVE_SCHEMA_NAME = 'Perspective';
export const PROFILE_SCHEMA_NAME = 'Profile';
export const COMMIT_SCHEMA_NAME = 'Commit';
export const DATA_SCHEMA_NAME = 'Data';
export const TEXT_SCHEMA_NAME = 'Text';
export const TEXT_NODE_SCHEMA_NAME = 'TextNode';
export const DOCUMENT_NODE_SCHEMA_NAME = 'DocumentNode';
export const KNOWN_SOURCES_SCHEMA_NAME = 'KnownSources';

export const SCHEMA = `

type ${PROFILE_SCHEMA_NAME} {
  did: string
}

type ${PERSPECTIVE_SCHEMA_NAME} {
  xid: string
  name: string
  creator: [${PROFILE_SCHEMA_NAME}]
  context: string
  origin: string
  timestamp: datetime
  head: [${COMMIT_SCHEMA_NAME}]
}

type ${COMMIT_SCHEMA_NAME} {
  xid: string
  creator: [${PROFILE_SCHEMA_NAME}]
  timestamp: datetime
  message: string
  parents: [${COMMIT_SCHEMA_NAME}]
  data: [${DATA_SCHEMA_NAME}]
}

type ${DATA_SCHEMA_NAME} {
  xid: string
}

type ${TEXT_SCHEMA_NAME} {
  xid: string
  text: string
}

type ${TEXT_NODE_SCHEMA_NAME} {
  xid: string
  text: string
  links: [uid]
}

type ${DOCUMENT_NODE_SCHEMA_NAME} {
  xid: string
  text: string
  node_type: string
  links: [uid]
}

# elementId is like xid but for elements *not* stored locally
type ${KNOWN_SOURCES_SCHEMA_NAME} {
  elementId: string
  sources: [string]
}

xid: string @index(exact) @upsert .
did: string @index(exact) @upsert .
links: [uid] @reverse .
elementId: string @index(exact) @upsert .
sources: [string] .
text: string @index(fulltext) .
context: string @index(exact) .
`