import { PoolClient } from 'pg';
import { IWorkerExecutionRepository } from '../../domain/workerExecution/IWorkerExecutionRepository.js';
import { WorkerExecution } from '../../domain/workerExecution/WorkerExecution.js';
import { WorkerExecutionItem } from '../../domain/workerExecution/WorkerExecutionItem.js';

function rowToExecution(row: Record<string, unknown>): WorkerExecution {
  return {
    id: row.id as string,
    workerType: row.worker_type as string,
    status: row.status as WorkerExecution['status'],
    result: (row.result as Record<string, unknown> | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    startedAt: row.started_at as Date,
    finishedAt: (row.finished_at as Date | null) ?? null,
  };
}

function rowToItem(row: Record<string, unknown>): WorkerExecutionItem {
  return {
    itemType: row.item_type as string,
    itemId: row.item_id as string,
    outcome: row.outcome as string,
    errorMessage: (row.error_message as string | undefined) ?? undefined,
    startedAt: row.started_at as Date,
    finishedAt: row.finished_at as Date,
  };
}

export class PostgreSQLWorkerExecutionRepository implements IWorkerExecutionRepository {
  constructor(private readonly pool: PoolClient) {}

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

  async listExecutions(
    limit: number,
    cursor?: string,
    workerType?: string,
    status?: string,
  ): Promise<{ items: WorkerExecution[]; nextCursor: string | null }> {
    const conditions: string[] = [];
    const params: unknown[] = [limit];
    let paramIndex = 2;

    if (cursor) {
      conditions.push(`started_at < (SELECT started_at FROM worker_executions WHERE id = $${paramIndex})`);
      params.push(cursor);
      paramIndex++;
    }

    if (workerType) {
      conditions.push(`worker_type = $${paramIndex}`);
      params.push(workerType);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT * FROM worker_executions
       ${whereClause}
       ORDER BY started_at DESC
       LIMIT $1`,
      params,
    );

    const items = result.rows.map(rowToExecution);
    const nextCursor = items.length === limit ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }

  async getExecutionById(id: string): Promise<WorkerExecution | null> {
    const result = await this.pool.query(`SELECT * FROM worker_executions WHERE id = $1`, [id]);
    if (result.rows.length === 0) return null;
    return rowToExecution(result.rows[0]);
  }

  async listItemsForExecution(executionId: string): Promise<WorkerExecutionItem[]> {
    const result = await this.pool.query(
      `SELECT * FROM worker_execution_items WHERE execution_id = $1 ORDER BY started_at ASC`,
      [executionId],
    );
    return result.rows.map(rowToItem);
  }
}
