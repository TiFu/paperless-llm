import { ITag, ICorrespondent, IDocumentType } from '../document/IDocumentEntities.js';

export interface IDescribedTag extends ITag {
  description: string | null;
}

export interface IDescribedCorrespondent extends ICorrespondent {
  description: string | null;
}

export interface IDescribedDocumentType extends IDocumentType {
  description: string | null;
}

export interface DescribedAvailableFields {
  tags: IDescribedTag[];
  correspondents: IDescribedCorrespondent[];
  documentTypes: IDescribedDocumentType[];
}

export type DescribedAvailableFieldsObtainer = () => Promise<DescribedAvailableFields>;
