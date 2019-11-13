
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

export enum DataType {
  TEXT = 'TEXT',
  TEXT_NODE = 'TEXT_NODE',
  DOCUMENT_NODE = 'DOCUMENT_NODE'
}

export enum DocNodeType {
  title = 'title',
  paragraph = 'paragraph'
} 

export interface DataDto {
  id: string,
  type: DataType,
  data: any,
}

export interface PostResult {
  result: string;
  message: string;
  elementIds: string[];
}

export interface GetResult {
  result: string;
  message: string;
  data: any;
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