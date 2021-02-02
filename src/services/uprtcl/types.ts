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

interface DgNewPerspective {
  NEWP_perspectiveId: string;
  NEWP_parentId: string;
  NEWP_headId: string;
}

// Dgraph incoming data types
export interface xid {
  xid: string;
}

export interface did {
  did: string;
}
