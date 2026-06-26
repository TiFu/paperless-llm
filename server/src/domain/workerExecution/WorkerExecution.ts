export interface WorkerExecution {
  id: string;
  workerType: string;
  status: 'running' | 'succeeded' | 'failed';
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}
