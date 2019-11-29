export const KNOWN_SOURCES_SCHEMA_NAME = 'KnownSources';

export const KNOWN_SOURCES_SCHEMA = `

type ${KNOWN_SOURCES_SCHEMA_NAME} {
  elementId: string
  sources: [string]
}

elementId: string @index(exact) @upsert .
sources: [string] .

`;