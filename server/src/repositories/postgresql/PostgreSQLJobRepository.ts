import { Pool, PoolClient } from 'pg';
import { IJobRepository } from '../../domain/job/IJobRepository';
import { Job } from '../../domain/entities/Job';
import { WorkflowType } from '../../domain/workflows/WorkflowType';
import { JobState } from '../../domain/entities/JobState';

export class PostgreSQLJobRepository implements IJobRepository {
  constructor(
    private readonly pool: Pool,
    private readonly client?: PoolClient,
  ) {}

  private getClient(): Pool | PoolClient {
    return this.client || this.pool;
  }

  async create(
    documentId: string,
    jobType: WorkflowType,
    data: Record<string, unknown>,
  ): Promise<Job> {
    const query = `
      INSERT INTO jobs (document_id, job_type, state, data, document_actions)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.getClient().query(query, [
      documentId,
      jobType,
      JobState.PENDING,
      JSON.stringify(data),
      JSON.stringify([]), // Empty actions array initially
    ]);

    return Job.fromDb(result.rows[0], []);
  }

  async getById(id: string): Promise<Job | null> {
    const query = `SELECT * FROM jobs WHERE id = $1`;
    const result = await this.getClient().query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    // TODO: Deserialize document_actions when ActionFactory is updated
    // For now, pass empty array
    return Job.fromDb(result.rows[0], []);
  }

  async update(job: Job): Promise<void> {
    const query = `
      UPDATE jobs
      SET 
        state = $1,
        data = $2,
        document_actions = $3,
        completed_at = $4,
        updated_at = NOW()
      WHERE id = $5
    `;

    // Serialize document actions
    const serializedActions = JSON.stringify(
      job.documentActions.map((action) => ({
        type: action.actionType,
        ...action.serializePayload(),
      })),
    );

    await this.getClient().query(query, [
    completedAt?: Date,
  ): Promise<void> {
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
      state,
      errorMessage || null,
      completedAt || null,
      id,
    
    errorMessage?: string,
  ): Promise<void> {
    const query = `
      UPDATE jobs
      SET 
        state = $1,
        error_message = $2,
        updated_at = NOW()
      WHERE id = $3
    `;

    await this.getClient().query(query, [state, errorMessage || null, id]);
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
      SELECT * FROM jobs, []));
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
    return result.rows.map((row) => Job.fromDb(row, []se<Job[]> {
    const query = `
      SELECT * FROM jobs 
      WHERE document_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.getClient().query(query, [documentId]);
    return result.rows.map((row) => Job.fromDb(row));
  }
}
