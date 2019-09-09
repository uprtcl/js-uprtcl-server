export interface Context {
  id: string,
  creatorId: string,
  timestamp: number,
  nonce: number
}

export const PropertyOrder = {
  Context: ['creatorId', 'timestamp', 'nonce'],
  Perspective: ['origin', 'creatorId', 'timestamp', 'contextId', 'name'],
  Commit: ['creatorId', 'timestamp', 'message', 'parentsIds', 'dataId'],
  TextNode: ['text', 'type', 'links']
};