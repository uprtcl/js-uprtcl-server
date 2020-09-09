export enum ProposalState {
  Open = "OPEN",  
  Rejected = "REJECTED",
  Executed = "EXECUTED",
  Declined = "DECLINED"
}

export interface PerspectiveDetails {
  name?: string
  context?: string | undefined
  headId?: string | undefined
}

export interface Perspective {
  remote: string
  path: string
  creatorId: string
  timestamp: number
}

export interface ecosystem {
  addedChildren: Array<string>,
  removedChildren: Array<string>
}

export const getAuthority = (perspective: Perspective): string => {
  return `${perspective.remote}:${perspective.path}`
}

export interface Proposal {
  id: string
  creatorId?: string
  toPerspectiveId?: string
  fromPerspectiveId: string
  toHeadId?: string
  fromHeadId?: string
  updates?: Array<UpdateRequest>
  state: ProposalState
  executed: boolean
  authorized: boolean
  canAuthorize?: boolean
}

export interface UpdateRequest {
  fromPerspectiveId?: string
  oldHeadId?: string
  perspectiveId: string
  newHeadId: string
}

export interface Commit {
  creatorsIds: string[]
  timestamp: number
  message: string
  parentsIds: Array<string>
  dataId: string
}

export interface Hashed<T> {
  id: string
  object: T
}

export interface Proof {
  signature: string
  type: string
}
export interface Signed<T = any> {
  payload: T
  proof: Proof
}

export type Secured<T = any> = Hashed<Signed<T>>

export interface NewPerspectiveData {
  perspective: Secured<Perspective>
  details?: PerspectiveDetails
  parentId?: string
}

export interface NewProposalData {
  creatorId: string,
  fromPerspectiveId: string
  toPerspectiveId: string
  fromHeadId: string
  toHeadId: string
  updates: Array<UpdateRequest>
}

// Dgraph incoming data types
export interface DgUpdate {
  fromPerspective: xid
  perspective: xid
  oldHead?: xid
  newHead: xid
}

export interface xid {
  xid: string
}

export interface did {
  did: string
}
