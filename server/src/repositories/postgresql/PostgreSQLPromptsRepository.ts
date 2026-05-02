import { Pool, PoolClient } from 'pg';
import { IPromptsRepository } from '../../domain/interfaces/IPromptsRepository';
import { Prompt } from '../../domain/entities/Prompt';
import { JobType } from '../../domain/enums/JobType';

export class PostgreSQLPromptsRepository implements IPromptsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly client?: PoolClient,
  ) {}

  private getClient(): Pool | PoolClient {
    return this.client || this.pool;
  }

  async getByJobType(jobType: JobType): Promise<Prompt | null> {
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

  async upsert(jobType: JobType, template: string): Promise<Prompt> {
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
