import { Pool, PoolClient } from 'pg';
import { IPromptsRepository } from '../../domain/prompt/IPromptsRepository';
import { WorkflowType } from '../../domain/workflows/WorkflowType';
import { Prompt } from '../../domain/prompt/Prompt';

export class PostgreSQLPromptsRepository implements IPromptsRepository {
  constructor(
    private readonly pool: PoolClient
  ) {}

  private getClient(): Pool | PoolClient {
    return this.pool;
  }

  async getByJobType(jobType: WorkflowType): Promise<Prompt | null> {
    const query = `SELECT * FROM prompts WHERE job_type = $1`;
    const result = await this.getClient().query(query, [jobType]);

    if (result.rows.length === 0) {
      return null;
    }

    return Prompt.fromDb(result.rows[0]);
  }

  async getAll(): Promise<Prompt[]> {
    const query = `SELECT * FROM prompts ORDER BY job_type`;
    const result = await this.getClient().query(query);

    return result.rows.map((row) => Prompt.fromDb(row));
  }

  async upsert(jobType: WorkflowType, template: string): Promise<Prompt> {
    const query = `
      INSERT INTO prompts (job_type, template, version)
      VALUES ($1, $2, 1)
      ON CONFLICT (job_type) 
      DO UPDATE SET 
        template = EXCLUDED.template,
        version = prompts.version + 1,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await this.getClient().query(query, [jobType, template]);

    return Prompt.fromDb(result.rows[0]);
  }
}
