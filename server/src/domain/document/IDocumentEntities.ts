/**
 * Domain model for a document tag
 */
export interface ITag {
  id: number;
  name: string;
  color?: string;
  isInboxTag?: boolean;
}

/**
 * Domain model for a correspondent (sender/recipient)
 */
export interface ICorrespondent {
  id: number;
  name: string;
}

/**
 * Domain model for a document type category
 */
export interface IDocumentType {
  id: number;
  name: string;
}
