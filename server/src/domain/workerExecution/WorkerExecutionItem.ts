export interface WorkerExecutionItem {
  itemType: string;
  itemId: string;
  outcome: string;
  errorMessage?: string;
  startedAt: Date;
  finishedAt: Date;
}
