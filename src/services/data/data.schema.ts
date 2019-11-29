export const DATA_SCHEMA_NAME = 'Data';
export const DATA_SCHEMA = `

type ${DATA_SCHEMA_NAME} {
  xid: string
  stored: bool
  jsonString: string
}

# data objects
jsonString: string @index(fulltext) .
`