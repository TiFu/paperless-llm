import { IWorkerExecutionRepository } from '../domain/workerExecution/IWorkerExecutionRepository.js';
import { WorkerExecutionItem } from '../domain/workerExecution/WorkerExecutionItem.js';

export interface WorkerRunResult {
  summary?: Record<string, unknown>;
  items?: WorkerExecutionItem[];
}

/**
 * Wraps a worker's work function with worker_executions/worker_execution_items
 * logging. Rethrows on failure so the caller's existing error handling (e.g.
 * WorkerExecutor.executeWork's catch-and-log) is unchanged.
 */
export function withExecutionTracking(
  workerType: string,
  repo: IWorkerExecutionRepository,
  fn: () => Promise<WorkerRunResult>,
): () => Promise<void> {
  return async () => {
    const executionId = await repo.start(workerType);

    try {
      const { summary, items } = await fn();
      if (items && items.length > 0) {
        await repo.recordItems(executionId, items);
      }
      await repo.complete(executionId, summary);
    } catch (error) {
      await repo.fail(executionId, error instanceof Error ? error.message : String(error));
      throw error;
    }
  };
}
