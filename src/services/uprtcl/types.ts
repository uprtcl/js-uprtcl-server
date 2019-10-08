export interface Perspective {
  id: string;
  origin: string;
  creatorId: string;
  timestamp: number;
  context: string;
  name: string;
}

export interface Commit {
  id: string;
  creatorId: string;
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
  jsonData: any,
}

export const PropertyOrder = {
  Context: ['creatorId', 'timestamp', 'nonce'],
  Perspective: ['origin', 'creatorId', 'timestamp', 'context', 'name'],
  Commit: ['creatorId', 'timestamp', 'message', 'parentsIds', 'dataId']
};

export const DataPropertyOrder = {
  Text: ['text'],
  TextNode: ['text', 'links'],
  DocumentNode: ['text', 'links', 'doc_node_type']
}

export const dataTypeOrder = (type: DataType): string[] => {
  switch(type) {
    case DataType.TEXT: 
      return DataPropertyOrder.Text;
    
    case DataType.TEXT_NODE:
      return DataPropertyOrder.TextNode;

    case DataType.DOCUMENT_NODE:
      return DataPropertyOrder.DocumentNode;
  }
  return []
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