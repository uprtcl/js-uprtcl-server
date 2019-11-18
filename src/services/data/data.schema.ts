export const DATA_SCHEMA_NAME = 'Data';
export const TEXT_SCHEMA_NAME = 'Text';
export const TEXT_NODE_SCHEMA_NAME = 'TextNode';
export const DOCUMENT_NODE_SCHEMA_NAME = 'DocumentNode';

export const DATA_SCHEMA = `

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

# data objects
data: uid .
text: string @index(fulltext) .
links: [uid] @reverse .

`