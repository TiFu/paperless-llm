import { PoolClient } from 'pg';
import { IAuditLogRepository } from '../../domain/audit/IAuditLogRepository.js';
import { AuditLogEntry, AuditEventType, AuditLogMetadata } from '../../domain/audit/AuditLogEntry.js';

/**
 * PostgreSQL implementation of the audit log repository
 */
export class PostgreSQLAuditLogRepository implements IAuditLogRepository {
  constructor(
    private readonly pool: PoolClient
  ) {}

  /**
   * Map database row to AuditLogEntry domain entity
   */
  private mapRowToEntity(row: any): AuditLogEntry {
    return new AuditLogEntry(
      row.id,
      row.job_id,
      row.step_id,
      row.event_type as AuditEventType,
      new Date(row.event_timestamp),
      row.processing_start_time ? new Date(row.processing_start_time) : null,
      row.processing_end_time ? new Date(row.processing_end_time) : null,
      row.metadata as AuditLogMetadata | null,
    );
  }

  async create(entry: AuditLogEntry): Promise<AuditLogEntry> {
    const query = `
      INSERT INTO audit_log (
        id,
        job_id,
        step_id,
        event_type,
        event_timestamp,
        processing_start_time,
        processing_end_time,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      entry.id,
      entry.jobId,
      entry.stepId,
      entry.eventType,
      entry.eventTimestamp,
      entry.processingStartTime,
      entry.processingEndTime,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ]);

    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Batch create multiple AuditLogEntry objects.
   */
  async createAll(entries: AuditLogEntry[]): Promise<AuditLogEntry[]> {
    if (entries.length === 0) return [];

    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    let paramIndex = 1;

    for (const entry of entries) {
      valuePlaceholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
      values.push(
        entry.id,
        entry.jobId,
        entry.stepId,
        entry.eventType,
        entry.eventTimestamp,
        entry.processingStartTime,
        entry.processingEndTime,
        entry.metadata ? JSON.stringify(entry.metadata) : null
      );
      paramIndex += 8;
    }

    const query = `
      INSERT INTO audit_log (
        id,
        job_id,
        step_id,
        event_type,
        event_timestamp,
        processing_start_time,
        processing_end_time,
        metadata
      ) VALUES ${valuePlaceholders.join(",\n      ")}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async getByJobId(jobId: string): Promise<AuditLogEntry[]> {
    const query = `
      SELECT * FROM audit_log
      WHERE job_id = $1
      ORDER BY event_timestamp DESC
    `;

    const result = await this.pool.query(query, [jobId]);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async getByStepId(stepId: string): Promise<AuditLogEntry[]> {
    const query = `
      SELECT * FROM audit_log
      WHERE step_id = $1
      ORDER BY event_timestamp DESC
    `;

    const result = await this.pool.query(query, [stepId]);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async deleteByJobId(jobId: string): Promise<void> {
    const query = `
      DELETE FROM audit_log
      WHERE job_id = $1
    `;

    await this.pool.query(query, [jobId]);
  }
}
