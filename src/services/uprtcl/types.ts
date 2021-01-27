export enum ProposalState {
  Open = 'OPEN',
  Rejected = 'REJECTED',
  Executed = 'EXECUTED',
  Declined = 'DECLINED',
}

export interface Upsert {
  query: string;
  nquads: string;
  delNquads?: string;
}

export interface PerspectiveDetails {
  name?: string;
  headId?: string | undefined;
  addedChildren?: string[];
  removedChildren?: string[];
}

export interface Perspective {
  remote: string;
  path: string;
  creatorId: string;
  timestamp: number;
  context: string;
}

export const getAuthority = (perspective: Perspective): string => {
  return `${perspective.remote}:${perspective.path}`;
};

export interface Proposal {
  id: string;
  creatorId?: string;
  toPerspectiveId?: string;
  fromPerspectiveId: string;
  toHeadId?: string;
  fromHeadId?: string;
  details: {
    updates?: UpdateRequest[];
    newPerspectives?: NewPerspectiveData[];
  };

  state: ProposalState;
  executed: boolean;
  authorized: boolean;
  canAuthorize?: boolean;
}

export interface UpdateRequest {
  fromPerspectiveId?: string;
  oldHeadId?: string;
  perspectiveId: string;
  newHeadId: string | undefined;
}

export interface UpdateDetails {
  id: string;
  details?: PerspectiveDetails;
}

export interface Commit {
  creatorsIds: string[];
  timestamp: number;
  message: string;
  parentsIds: Array<string>;
  dataId: string;
}
export interface Hashed<T> {
  id: string;
  object: T;
}

export interface Proof {
  signature: string;
  type: string;
}
export interface Signed<T = any> {
  payload: T;
  proof: Proof;
}

export type Secured<T = any> = Hashed<Signed<T>>;

export interface NewPerspectiveData {
  perspective: Secured<Perspective>;
  details?: PerspectiveDetails;
  parentId?: string;
}

export interface NewProposalData {
  creatorId: string;
  fromPerspectiveId: string;
  toPerspectiveId: string;
  fromHeadId: string;
  toHeadId: string;
  details: {
    updates: Array<UpdateRequest>;
    newPerspectives: Array<NewPerspectiveData>;
  };
}

// Dgraph incoming data types
export interface DgUpdate {
  fromPerspective: xid;
  perspective: xid;
  oldHead?: xid;
  newHead: xid;
}

export interface xid {
  xid: string;
}

export interface did {
  did: string;
}
