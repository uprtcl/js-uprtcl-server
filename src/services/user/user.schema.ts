export const PROFILE_SCHEMA_NAME = 'Profile';

export const USER_SCHEMA = `

type ${PROFILE_SCHEMA_NAME} {
  did: string
  nonce: string
}

did: string @index(exact) @upsert .

`;