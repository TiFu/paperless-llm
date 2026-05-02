import { Pool, PoolClient } from 'pg';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';
import { AuditEntry, AuditStatus } from '../../domain/entities/AuditEntry';
import { JobType } from '../../domain/enums/JobType';
import { ActionType } from '../../domain/enums/ActionType';

export class PostgreSQLAuditLogRepository implements IAuditLogRepository {
  constructor(
    private readonly pool: Pool,
    private readonly client?: PoolClient,
  ) {}

  private getClient(): Pool | PoolClient {
    return this.client || this.pool;
  }

  async insert(
    documentId: string,
    documentSystem: string,
    jobType: JobType,
    actionType: ActionType,
    beforeValue: string | null,
    afterValue: string,
    status: AuditStatus,
    errorMessage: string | null = null,
  ): Promise<AuditEntry> {
    const query = `
      INSERT INTO audit_log 
        (document_id, document_system, job_type, action_type, before_value, after_value, status, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.getClient().query(query, [
      documentId,
      documentSystem,
      jobType,
      actionType,
      beforeValue,
      afterValue,
      status,
      errorMessage,
    ]);

    return AuditEntry.fromDb(result.rows[0]);
  }

  async getByDocumentId(documentId: string): Promise<AuditEntry[]> {
    const query = `
      SELECT * FROM audit_log 
      WHERE document_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.getClient().query(query, [documentId]);

    return result.rows.map((row: any) => AuditEntry.fromDb(row));
  }

  async getAll(limit: number, offset: number): Promise<AuditEntry[]> {
    const query = `
      SELECT * FROM audit_log 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await this.getClient().query(query, [limit, offset]);

    return result.rows.map((row: any) => AuditEntry.fromDb(row));
  }
}
