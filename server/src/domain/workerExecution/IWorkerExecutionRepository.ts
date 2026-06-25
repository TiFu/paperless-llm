import { WorkerExecutionItem } from './WorkerExecutionItem.js';

export interface IWorkerExecutionRepository {
  /**
   * Record the start of a worker execution run.
   * @param workerType e.g. step_processor, stuck_step_reset, entity_sync, document_auto_queue
   * @returns The execution id, to be passed to complete()/fail()/recordItems()
   */
  start(workerType: string): Promise<string>;

  /**
   * Mark an execution as succeeded, with an optional result summary.
   */
  complete(executionId: string, result?: Record<string, unknown>): Promise<void>;

  /**
   * Mark an execution as failed.
   */
  fail(executionId: string, errorMessage: string): Promise<void>;

  /**
   * Record the individual items touched during an execution run.
   */
  recordItems(executionId: string, items: WorkerExecutionItem[]): Promise<void>;
}
