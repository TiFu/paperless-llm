import { PoolClient } from 'pg';
import { IPromptsRepository } from '../../domain/prompt/IPromptsRepository.js';
import { StepType } from '../../domain/steps/IStep.js';
import { Prompt } from '../../domain/prompt/Prompt.js';
import { Saveable, UoW } from '../../infrastructure/UoW.js';

export class PostgreSQLPromptsRepository implements IPromptsRepository, Saveable<Prompt> {
  constructor(
    private readonly pool: PoolClient,
    private uow: UoW
  ) {}

  private getClient(): PoolClient {
    return this.pool;
  }

  async getByStepType(stepType: StepType): Promise<Prompt | null> {
    const username = this.uow.getUser()?.username;

    if (username) {
      // Try user-specific prompt first, fall back to global default
      const result = await this.getClient().query(
        `SELECT * FROM prompts
         WHERE step_type = $1 AND (username = $2 OR username IS NULL)
         ORDER BY (username IS NOT NULL) DESC
         LIMIT 1`,
        [stepType, username],
      );
      return result.rows.length > 0 ? Prompt.fromDb(result.rows[0]) : null;
    }

    const result = await this.getClient().query(
      `SELECT * FROM prompts WHERE step_type = $1 AND username IS NULL`,
      [stepType],
    );
    return result.rows.length > 0 ? Prompt.fromDb(result.rows[0]) : null;
  }

  async getAll(): Promise<Prompt[]> {
    const username = this.uow.getUser()?.username;

    if (username) {
      const result = await this.getClient().query(
        `SELECT DISTINCT ON (step_type) *
         FROM prompts
         WHERE username = $1 OR username IS NULL
         ORDER BY step_type, (username IS NOT NULL) DESC`,
        [username],
      );
      return result.rows.map(Prompt.fromDb);
    }

    const result = await this.getClient().query(
      `SELECT * FROM prompts WHERE username IS NULL ORDER BY step_type`,
    );
    return result.rows.map(Prompt.fromDb);
  }

  async getAllForUser(username: string): Promise<Prompt[]> {
    const result = await this.getClient().query(
      `SELECT * FROM prompts WHERE username = $1 ORDER BY step_type`,
      [username],
    );
    return result.rows.map(Prompt.fromDb);
  }

  async getGlobalDefaults(): Promise<Prompt[]> {
    const result = await this.getClient().query(
      `SELECT * FROM prompts WHERE username IS NULL ORDER BY step_type`,
    );
    return result.rows.map(Prompt.fromDb);
  }

  async copyForUser(defaults: Prompt[], username: string): Promise<void> {
    for (const prompt of defaults) {
      await this.getClient().query(
        `INSERT INTO prompts (step_type, template, version, username)
         VALUES ($1, $2, 1, $3)
         ON CONFLICT (step_type, username) WHERE username IS NOT NULL DO NOTHING`,
        [prompt.stepType, prompt.template, username],
      );
    }
  }

  async save(object: Prompt): Promise<void> {
    return this.upsert(object.stepType, object.template).then(() => {})
  }

  async saveAll(objects: Prompt[]): Promise<void> {
    const promises = objects.map(o => this.save(o));
    return Promise.all(promises).then(() => {})
  }

  async upsert(stepType: StepType, template: string): Promise<Prompt> {
    const username = this.uow.getUser()?.username ?? null;

    const query = username
      ? `INSERT INTO prompts (step_type, template, version, username)
         VALUES ($1, $2, 1, $3)
         ON CONFLICT (step_type, username) WHERE username IS NOT NULL DO UPDATE SET
           template = EXCLUDED.template,
           version = prompts.version + 1,
           updated_at = NOW()
         RETURNING *`
      : `INSERT INTO prompts (step_type, template, version)
         VALUES ($1, $2, 1)
         ON CONFLICT (step_type) WHERE username IS NULL DO UPDATE SET
           template = EXCLUDED.template,
           version = prompts.version + 1,
           updated_at = NOW()
         RETURNING *`;

    const params = username ? [stepType, template, username] : [stepType, template];
    const result = await this.getClient().query(query, params);

    const prompt = Prompt.fromDb(result.rows[0]);
    this.uow.register(prompt, this);
    return prompt;
  }
}
