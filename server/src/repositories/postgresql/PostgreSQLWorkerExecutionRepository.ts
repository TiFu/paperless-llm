import { Pool } from 'pg';
import { IWorkerExecutionRepository } from '../../domain/workerExecution/IWorkerExecutionRepository.js';
import { WorkerExecutionItem } from '../../domain/workerExecution/WorkerExecutionItem.js';

export class PostgreSQLWorkerExecutionRepository implements IWorkerExecutionRepository {
  constructor(private readonly pool: Pool) {}

  async start(workerType: string): Promise<string> {
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO worker_executions (worker_type, status) VALUES ($1, 'running') RETURNING id`,
      [workerType],
    );
    return result.rows[0].id;
  }

  async complete(executionId: string, result?: Record<string, unknown>): Promise<void> {
    await this.pool.query(
      `UPDATE worker_executions
       SET status = 'succeeded', result = $1, finished_at = NOW()
       WHERE id = $2`,
      [result ? JSON.stringify(result) : null, executionId],
    );
  }

  async fail(executionId: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      `UPDATE worker_executions
       SET status = 'failed', error_message = $1, finished_at = NOW()
       WHERE id = $2`,
      [errorMessage, executionId],
    );
  }

  async recordItems(executionId: string, items: WorkerExecutionItem[]): Promise<void> {
    if (items.length === 0) return;

    const values = items
      .map((_, idx) => {
        const base = idx * 7;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
      })
      .join(', ');

    const params = items.flatMap(item => [
      executionId,
      item.itemType,
      item.itemId,
      item.outcome,
      item.errorMessage || null,
      item.startedAt,
      item.finishedAt,
    ]);

    await this.pool.query(
      `INSERT INTO worker_execution_items
         (execution_id, item_type, item_id, outcome, error_message, started_at, finished_at)
       VALUES ${values}`,
      params,
    );
  }
}
