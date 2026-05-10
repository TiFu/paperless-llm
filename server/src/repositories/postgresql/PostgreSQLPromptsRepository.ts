import { Pool, PoolClient } from 'pg';
import { IPromptsRepository } from '../../domain/prompt/IPromptsRepository.js';
import { StepType } from '../../domain/steps/IStep.js';
import { Prompt } from '../../domain/prompt/Prompt.js';

export class PostgreSQLPromptsRepository implements IPromptsRepository {
  constructor(
    private readonly pool: PoolClient
  ) {}

  private getClient(): Pool | PoolClient {
    return this.pool;
  }

  async getByStepType(stepType: StepType): Promise<Prompt | null> {
    const query = `SELECT * FROM prompts WHERE step_type = $1`;
    const result = await this.getClient().query(query, [stepType]);

    if (result.rows.length === 0) {
      return null;
    }

    return Prompt.fromDb(result.rows[0]);
  }

  async getAll(): Promise<Prompt[]> {
    const query = `SELECT * FROM prompts ORDER BY step_type`;
    const result = await this.getClient().query(query);

    return result.rows.map((row) => Prompt.fromDb(row));
  }

  async upsert(stepType: StepType, template: string): Promise<Prompt> {
    const query = `
      INSERT INTO prompts (step_type, template, version)
      VALUES ($1, $2, 1)
      ON CONFLICT (step_type) 
      DO UPDATE SET 
        template = EXCLUDED.template,
        version = prompts.version + 1,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await this.getClient().query(query, [stepType, template]);

    return Prompt.fromDb(result.rows[0]);
  }
}
