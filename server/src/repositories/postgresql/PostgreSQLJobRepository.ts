import { Pool, PoolClient } from 'pg';
import { IJobRepository } from '../../domain/job/IJobRepository.js';
import { WorkflowType } from '../../domain/workflows/WorkflowType.js';
import { JobState } from '../../domain/job/JobState.js';
import { Job } from '../../domain/job/Job.js';
import { DocumentAction } from '../../domain/actions/DocumentAction.js';
import { DocumentActionFactory } from '../../domain/actions/DocumentActionFactory.js';
import { DocumentField } from '../../domain/steps/StepFactory.js';
import { createChildLogger } from '../../utils/logger.js';
import pino from 'pino';

export class PostgreSQLJobRepository implements IJobRepository {
  private logger: pino.Logger

  constructor(
    private readonly pool: PoolClient
  ) {
    this.logger = createChildLogger({ name: "PostgreSQLJobRepository"})
  }

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
    fields: DocumentField[]
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

  async createBulk(
    jobs: Array<{ documentId: string; jobType: WorkflowType, fields: DocumentField[]}>
  ): Promise<Job[]> {
    if (jobs.length === 0) {
      return [];
    }

    // Build bulk insert query
    const values = jobs.map((_, idx) => {
      const base = idx * 2;
      return `($${base + 1}, $${base + 2}, '${JobState.PENDING}')`;
    }).join(', ');

    const params = jobs.flatMap((job) => [
      job.documentId,
      job.jobType,
    ]);

    const query = `
      INSERT INTO jobs (document_id, job_type, state)
      VALUES ${values}
      RETURNING *
    `;

    this.logger.error({ query: query}, "Creating jobs in bulk")
    const result = await this.getClient().query(query, params);

    const fields = result.rows.map((r, idx) => { 
      return {
        jobId: r.id,
        fields: jobs[idx].fields
      }
    })
    await this.saveFieldsBulk(fields)
    
    return result.rows.map((row, idx) => Job.fromDb(row, jobs[idx].fields));
  }

  async getById(id: string): Promise<Job | null> {
    const query = `SELECT * FROM jobs WHERE id = $1`;
    const result = await this.getClient().query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const actions = await this.loadActions(id);
    const fields = await this.loadFields(id);
    return Job.fromDb(result.rows[0], fields, actions);
  }

  private async saveFieldsBulk(fields: Array<{jobId: string, fields: DocumentField[]}>) {
    const paramArray = fields.map((e) => {
      return e.fields.map(f => [e.jobId, f]) as string[][];
    }).flat(1);

    const values = paramArray.map((e, idx) => `($${2*idx+1}, $${2*idx+2})`).join(', ')

    const params = paramArray.flat()
    const query = `INSERT INTO job_fields (job_id, field)
      VALUES ${values}
      ON CONFLICT (job_id, field) DO NOTHING`

    this.logger.info({ query: query, params: params}, "Saving fields in bulk")
    await this.getClient().query(query, params)
  }

  private async saveFields(jobId: string, fields: DocumentField[]): Promise<void> {
    if (fields.length == 0) {
      const query = `DELETE FROM job_fields WHERE job_id = $1`
      await this.getClient().query(query, [jobId])
      return;
    }

    // Prepare bulk insert
    const values = fields.map((field, idx) => `($1, $${idx + 2})`).join(', ');
    const params = [jobId, ...fields];

    let query = `
      INSERT INTO job_fields (job_id, field)
      VALUES ${values}
      ON CONFLICT (job_id, field) DO NOTHING
    `;
    console.log("Save Fields: " + query)
    await this.getClient().query(query, params);


  }

  private async loadFields(jobId: string): Promise<DocumentField[]> {
    const query = `SELECT * FROM job_fields WHERE job_id = $1`;
    const result = await this.getClient().query(query, [jobId]);

    const output = result.rows.map((v) => v.field as DocumentField);
    return output

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
    this.logger.info({ job: job}, "Updating job")
    // Save actions to document_actions table
    await this.saveActions(job.id, job.documentActions);
    await this.saveFields(job.id, job.fields)
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
        const fields = await this.loadFields(row.id);
        return Job.fromDb(row, fields, actions);
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
        const fields = await this.loadFields(row.id as string);
        return Job.fromDb(row, fields, actions);
      }),
    );
  }

  async getJobCountsByState(): Promise<{ [state: string]: number }> {
    const query = `
      SELECT 
        state,
        COUNT(*) as count
      FROM jobs
      GROUP BY state
    `;

    const result = await this.getClient().query(query);
    const counts: { [state: string]: number } = {};
    
    result.rows.forEach((row) => {
      counts[row.state] = parseInt(row.count, 10);
    });

    return counts;
  }

  async filterInProgressDocuments(documentIds: string[]): Promise<string[]> {
    if (documentIds.length === 0) {
      return [];
    }

    const query = `
      SELECT DISTINCT document_id 
      FROM jobs 
      WHERE document_id = ANY($1)
        AND state NOT IN ('completed', 'failed', 'rejected')
    `;

    const result = await this.getClient().query(query, [documentIds]);
    return result.rows.map((row) => row.document_id);
  }
}
