export interface Context {
  id: string,
  creatorId: string,
  timestamp: number,
  nonce: number
}

export interface Perspective {
  id: string;
  origin: string;
  creatorId: string;
  timestamp: number;
  contextId: string;
  name: string;
}

export const PropertyOrder = {
  Context: ['creatorId', 'timestamp', 'nonce'],
  Perspective: ['origin', 'creatorId', 'timestamp', 'contextId', 'name'],
  Commit: ['creatorId', 'timestamp', 'message', 'parentsIds', 'dataId'],
  TextNode: ['text', 'type', 'links']
};