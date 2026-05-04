import { Pool, PoolClient } from 'pg';
import { IApprovalQueueRepository, ApprovalQueueItem } from '../../domain/steps/queues/IApprovalQueueRepository';
import { ActionType } from '../../domain/actions/ActionType';

export class PostgreSQLApprovalQueueRepository implements IApprovalQueueRepository {
  constructor(
    private readonly pool: Pool,
    private readonly client?: PoolClient,
  ) {}

  private getClient(): Pool | PoolClient {
    return this.client || this.pool;
  }

  async insert(
    jobId: string,
    documentId: string,
    documentSystem: string,
    actionType: ActionType,
    actionPayload: Record<string, unknown>,
  ): Promise<void> {
    const query = `
      INSERT INTO approval_queue 
        (job_id, document_id, document_system, action_type, action_payload, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.getClient().query(query, [
      jobId,
      documentId,
      documentSystem,
      actionType,
      JSON.stringify(actionPayload),
      'pending',
    ]);
  }

  async getPending(): Promise<ApprovalQueueItem[]> {
    const query = `
      SELECT *
      FROM approval_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `;

    const result = await this.getClient().query(query);
    return result.rows.map(this.mapRow);
  }

  async getById(id: string): Promise<ApprovalQueueItem | null> {
    const query = `
      SELECT *
      FROM approval_queue
      WHERE id = $1
    `;

    const result = await this.getClient().query(query, [id]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async getByJobId(jobId: string): Promise<ApprovalQueueItem | null> {
    const query = `
      SELECT *
      FROM approval_queue
      WHERE job_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.getClient().query(query, [jobId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async markApproved(id: string, reviewedBy: string): Promise<void> {
    const query = `
      UPDATE approval_queue
      SET 
        status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = $1
      WHERE id = $2
    `;

    await this.getClient().query(query, [reviewedBy, id]);
  }

  async markRejected(id: string, reviewedBy: string, reason: string): Promise<void> {
    const query = `
      UPDATE approval_queue
      SET 
        status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = $1,
        rejection_reason = $2
      WHERE id = $3
    `;

    await this.getClient().query(query, [reviewedBy, reason, id]);
  }

  private mapRow(row: Record<string, unknown>): ApprovalQueueItem {
    return {
      id: row.id as string,
      jobId: row.job_id as string,
      documentId: row.document_id as string,
      documentSystem: row.document_system as string,
      actionType: row.action_type as ActionType,
      actionPayload: row.action_payload as Record<string, unknown>,
      status: row.status as 'pending' | 'approved' | 'rejected',
      createdAt: new Date(row.created_at as string),
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string) : null,
      reviewedBy: row.reviewed_by as string | null,
      rejectionReason: row.rejection_reason as string | null,
    };
  }
}
