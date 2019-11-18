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
