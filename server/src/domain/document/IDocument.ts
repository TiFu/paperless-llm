

export interface IDocument {
  id: number;
  content: string;
  title: string | null;
  tags: string[];
  correspondent: string | null;
  documentType: string | null;  
  createdDate: Date | null;
  modifiedDate: Date | null;
}

export interface PaginatedDocuments {
  documents: IDocument[];
  nextCursor: string | null;
}
