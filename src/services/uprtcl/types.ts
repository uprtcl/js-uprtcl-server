export enum PermissionType {
  Read = 'Read',
  Write = 'Write',
  Admin = 'Admin',
}

export interface Upsert {
  query: string;
  nquads: string;
  delNquads?: string;
}

// Dgraph incoming data types
export interface xid {
  xid: string;
}

export interface did {
  did: string;
}
