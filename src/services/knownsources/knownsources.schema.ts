export const KNOWN_SOURCES_SCHEMA_NAME = 'KnownSources';

export const KNOWN_SOURCES_SCHEMA = `

type ${KNOWN_SOURCES_SCHEMA_NAME} {
  elementId: string
  casIDs: [string]
}

elementId: string @index(exact) @upsert .
casIDs: [string] .

`;