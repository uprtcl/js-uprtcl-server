
export interface PerspectiveDetails {
  name?: string;
  context?: string | undefined;
  headId?: string | undefined;
}

export interface Perspective {
  origin: string;
  creatorId: string;
  timestamp: number;
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