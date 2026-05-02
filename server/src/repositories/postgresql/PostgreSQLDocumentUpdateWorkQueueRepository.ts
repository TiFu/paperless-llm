import { Pool, PoolClient } from 'pg';
import { IDocumentUpdateWorkQueueRepository } from '../../domain/interfaces/IDocumentUpdateWorkQueueRepository';
import { ActionType } from '../../domain/enums/ActionType';
import { WorkItemStatus } from '../../domain/enums/WorkItemStatus';
import { ActionItem } from '../../domain/entities/ActionItem';

export class PostgreSQLDocumentUpdateWorkQueueRepository
  implements IDocumentUpdateWorkQueueRepository
{
  constructor(
    private readonly pool: Pool,
    private readonly client?: PoolClient,
  ) {}

  private getClient(): Pool | PoolClient {
    return this.client || this.pool;
  }

  async claimBatch(
    batchSize: number,
    workerId: string,
    timeoutMs: number,
  ): Promise<Record<string, unknown>[]> {
    const timeoutDate = new Date(Date.now() - timeoutMs);

    const query = `
      UPDATE document_update_work_queue
      SET 
        status = $1,
        claimed_at = NOW(),
        claimed_by = $2,
        updated_at = NOW()
      WHERE id IN (
        SELECT id
        FROM document_update_work_queue
        WHERE 
          (status = $3
          OR (status = $4 AND claimed_at < $5))
          AND (retry_after IS NULL OR retry_after <= NOW())
        ORDER BY created_at ASC
        LIMIT $6
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    const result = await this.getClient().query(query, [
      WorkItemStatus.PROCESSING,
      workerId,
      WorkItemStatus.PENDING,
      WorkItemStatus.PROCESSING,
      timeoutDate,
      batchSize,
    ]);

    return result.rows;
  }

  async insert(
    documentId: string,
    documentSystem: string,
    actionType: ActionType,
    actionPayload: Record<string, unknown>,
  ): Promise<void> {
    const query = `
      INSERT INTO document_update_work_queue 
        (document_id, document_system, action_type, action_payload, status, retry_count)
      VALUES ($1, $2, $3, $4, $5, 0)
    `;

    await this.getClient().query(query, [
      documentId,
      documentSystem,
      actionType,
      JSON.stringify(actionPayload),
      WorkItemStatus.PENDING,
    ]);
  }

  async markCompleted(id: string): Promise<void> {
    const query = `
      UPDATE document_update_work_queue
      SET 
        status = $1,
        claimed_at = NULL,
        claimed_by = NULL,
        updated_at = NOW()
      WHERE id = $2
    `;

    await this.getClient().query(query, [WorkItemStatus.COMPLETED, id]);
  }

  async markFailed(id: string, retryAfter: Date | null): Promise<void> {
    const query = `
      UPDATE document_update_work_queue
      SET 
        status = $1,
        retry_count = retry_count + 1,
        retry_after = $2,
        claimed_at = NULL,
        claimed_by = NULL,
        updated_at = NOW()
      WHERE id = $3
    `;

    await this.getClient().query(query, [WorkItemStatus.FAILED, retryAfter, id]);
  }

  async getById(id: string): Promise<ActionItem | null> {
    const query = `SELECT * FROM document_update_work_queue WHERE id = $1`;
    const result = await this.getClient().query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return ActionItem.fromDb(result.rows[0]);
  }

  async list(
    limit: number,
    cursor?: string,
    status?: WorkItemStatus,
  ): Promise<{ items: ActionItem[]; nextCursor: string | null }> {
    const conditions: string[] = [];
    const params: (number | string)[] = [limit];
    let paramIndex = 2;

    if (cursor) {
      conditions.push(`id > $${paramIndex}`);
      params.push(cursor);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataQuery = `
      SELECT * FROM document_update_work_queue
      ${whereClause}
      ORDER BY id ASC
      LIMIT $1
    `;

    const result = await this.getClient().query(dataQuery, params);
    const items = result.rows.map((row) => ActionItem.fromDb(row));
    const nextCursor = items.length === limit ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }

  async getQueueStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = $1) as pending,
        COUNT(*) FILTER (WHERE status = $2) as processing,
        COUNT(*) FILTER (WHERE status = $3) as completed,
        COUNT(*) FILTER (WHERE status = $4) as failed
      FROM document_update_work_queue
    `;

    const result = await this.getClient().query(query, [
      WorkItemStatus.PENDING,
      WorkItemStatus.PROCESSING,
      WorkItemStatus.COMPLETED,
      WorkItemStatus.FAILED,
    ]);

    const row = result.rows[0];
    return {
      total: parseInt(row.total, 10),
      pending: parseInt(row.pending, 10),
      processing: parseInt(row.processing, 10),
      completed: parseInt(row.completed, 10),
      failed: parseInt(row.failed, 10),
    };
  }
}
