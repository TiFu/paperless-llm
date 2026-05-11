export interface IDocument {
  id: string;
  content: string;
  title: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdDate: Date | null;
  modifiedDate: Date | null;
}

export interface PaginatedDocuments {
  documents: IDocument[];
  nextCursor: string | null;
}
