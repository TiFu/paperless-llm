import { Pool, PoolClient } from 'pg';
import { IJobRepository } from '../../domain/job/IJobRepository';
import { WorkflowType } from '../../domain/workflows/WorkflowType';
import { JobState } from '../../domain/job/JobState';
import { Job } from '../../domain/job/Job';
import { DocumentAction } from '../../domain/actions/DocumentAction';
import { DocumentActionFactory } from '../../domain/actions/DocumentActionFactory';

export class PostgreSQLJobRepository implements IJobRepository {
  constructor(
    private readonly pool: PoolClient
  ) {}

  private getClient(): Pool | PoolClient {
    return this.pool;
  }

  private async loadActions(jobId: string): Promise<DocumentAction[]> {
    const query = `
      SELECT * FROM document_actions
      WHERE job_id = $1
      ORDER BY created_at ASC
    `;

    const result = await this.getClient().query(query, [jobId]);
    return result.rows.map((row) => DocumentActionFactory.fromDb(row));
  }

  private async saveActions(jobId: string, actions: DocumentAction[]): Promise<void> {

    // Insert new actions
    if (actions.length > 0) {
      const values = actions.map((action, idx) => {
        const base = idx * 5;
        return `(COALESCE($${base + 1}, gen_random_uuid()), $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
      }).join(', ');

      const params = actions.flatMap((action) => [
        action.id || null,  // Pass null for new actions
        jobId,
        action.actionType,
        action.oldValue,
        action.newValue,
      ]);

      const query = `
        INSERT INTO document_actions (id, job_id, action_type, old_value, new_value)
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          action_type = EXCLUDED.action_type,
          old_value = EXCLUDED.old_value,
          new_value = EXCLUDED.new_value
      `;

      await this.getClient().query(query, params);
    }
  }

  async create(
    documentId: string,
    jobType: WorkflowType,
  ): Promise<Job> {
    const query = `
      INSERT INTO jobs (document_id, job_type, state)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await this.getClient().query(query, [
      documentId,
      jobType,
      JobState.PENDING
    ]);

    return Job.fromDb(result.rows[0], []);
  }

  async getById(id: string): Promise<Job | null> {
    const query = `SELECT * FROM jobs WHERE id = $1`;
    const result = await this.getClient().query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const actions = await this.loadActions(id);
    return Job.fromDb(result.rows[0], actions);
  }

  async update(job: Job): Promise<void> {
    const query = `
      UPDATE jobs
      SET 
        state = $1,
        completed_at = $2,
        updated_at = NOW()
      WHERE id = $3
    `;

    await this.getClient().query(query, [
      job.state,
      job.completedAt,
      job.id,
    ]);

    // Save actions to document_actions table
    await this.saveActions(job.id, job.documentActions);
  }

  async updateState(job: Job): Promise<void> {
    const query = `
      UPDATE jobs
      SET 
        state = $1,
        error_message = $2,
        completed_at = $3,
        updated_at = NOW()
      WHERE id = $4
    `;

    await this.getClient().query(query, [
      job.state,
      job.errorMessage || null,
      job.completedAt || null,
      job.id,
    ]);
  }

  async list(
    limit: number,
    cursor?: string,
    state?: JobState,
  ): Promise<{ items: Job[]; nextCursor: string | null }> {
    const conditions: string[] = [];
    const params: (number | string)[] = [limit];
    let paramIndex = 2;

    if (cursor) {
      conditions.push(`id > $${paramIndex}`);
      params.push(cursor);
      paramIndex++;
    }

    if (state) {
      conditions.push(`state = $${paramIndex}`);
      params.push(state);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM jobs
      ${whereClause}
      ORDER BY id ASC
      LIMIT $1
    `;

    const result = await this.getClient().query(query, params);
    const items = await Promise.all(
      result.rows.map(async (row) => {
        const actions = await this.loadActions(row.id as string);
        return Job.fromDb(row, actions);
      }),
    );
    const nextCursor = items.length === limit ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }

  async getByDocumentId(documentId: string): Promise<Job[]> {
    const query = `
      SELECT * FROM jobs
      WHERE document_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.getClient().query(query, [documentId]);
    return Promise.all(
      result.rows.map(async (row) => {
        const actions = await this.loadActions(row.id as string);
        return Job.fromDb(row, actions);
      }),
    );
  }
}
