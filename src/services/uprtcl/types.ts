export interface PerspectiveDetails {
  name?: string;
  context?: string | undefined;
  headId?: string | undefined;
}

export interface Perspective {
  authority: string;
  creatorId: string;
  timestamp: number;
}

export interface Proposal {
  id: string;
  creatorId?: string;
  toPerspectiveId?: string;
  fromPerspectiveId: string;
  toHeadId?: string;
  fromHeadId?: string;
  updates?: Array<UpdateRequest>;
  //status?: boolean; // why boolean?
  authorized?: boolean;
  open?: boolean;
  closed?: boolean;
  executed?: boolean;
  cancelled?: boolean;
  declined?: boolean;
  canAuthorize?: boolean;
}

export interface UpdateRequest {
  fromPerspectiveId?: string;
  oldHeadId?: string;
  perspectiveId: string;
  newHeadId: string;
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
  fromPerspectiveId: string;
  toPerspectiveId: string;
  fromHeadId: string;
  toHeadId: string;
  updates: UpdateRequest[];
}