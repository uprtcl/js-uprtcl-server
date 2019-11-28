import { ACCESS_CONFIG_SCHEMA_NAME } from "../access/access.schema";

export const DATA_SCHEMA_NAME = 'Data';
export const DATA_SCHEMA = `

type ${DATA_SCHEMA_NAME} {
  xid: string
  stored: bool
  stringValues: [string]
  intValues: [int]
  floatValues: [float]
  boolValues: [bool]
  links: [uid]
}

# data objects
stringValues: string @index(fulltext) .
intValues: int @index(exact) .
floatValues: float @index(exact) .
boolValues: bool @index(exact) .
links: [uid] @reverse .

`