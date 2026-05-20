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


// Contains all available fields for prompt context
export interface AvailableFields {
  tags: ITag[];
  correspondents: ICorrespondent[];
  documentTypes: IDocumentType[];
}

// Function type for obtaining available fields (async)
export type AvailableFieldsObtainer = () => Promise<AvailableFields>;
