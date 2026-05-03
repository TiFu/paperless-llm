import { Pool, PoolClient } from 'pg';
import { IStepRepository } from '../../domain/interfaces/IStepRepository';
import { Step } from '../../domain/entities/Step';
import { StepType } from '../../domain/enums/StepType';
import { StepStatus } from '../../domain/enums/StepStatus';

export class PostgreSQLStepRepository implements IStepRepository {
  constructor(private readonly client: Pool | PoolClient) {}

  private getClient(): Pool | PoolClient {
    return this.client;
  }

  async create(
    jobId: string,
    type: StepType,
    payload: Record<string, unknown>,
  ): Promise<Step> {
    const query = `
      INSERT INTO steps (job_id, type, status, payload)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await this.getClient().query(query, [
      jobId,
      type,
      StepStatus.WAITING,
      JSON.stringify(payload),
    ]);

    return Step.fromDb(result.rows[0]);
  }

  async getById(id: string): Promise<Step | null> {
    const query = `SELECT * FROM steps WHERE id = $1`;
    const result = await this.getClient().query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return Step.fromDb(result.rows[0]);
  }

  async getPending(limit: number): Promise<Step[]> {
    const query = `
      SELECT * FROM steps
      WHERE status = $1
      ORDER BY created_at ASC
      LIMIT $2
    `;

    const result = await this.getClient().query(query, [StepStatus.WAITING, limit]);
    return result.rows.map((row) => Step.fromDb(row));
  }

  async markInProgress(id: string): Promise<void> {
    const query = `
      UPDATE steps
      SET status = $1, started_at = NOW()
      WHERE id = $2
    `;

    await this.getClient().query(query, [StepStatus.IN_PROGRESS, id]);
  }

  async markCompleted(id: string): Promise<void> {
    const query = `
      UPDATE steps
      SET status = $1, completed_at = NOW()
      WHERE id = $2
    `;

    await this.getClient().query(query, [StepStatus.COMPLETED, id]);
  }

  async markFailed(id: string): Promise<void> {
    const query = `
      UPDATE steps
      SET status = $1, completed_at = NOW()
      WHERE id = $2
    `;

    await this.getClient().query(query, [StepStatus.FAILED, id]);
  }

  async getByJobId(jobId: string): Promise<Step[]> {
    const query = `
      SELECT * FROM steps
      WHERE job_id = $1
      ORDER BY created_at ASC
    `;

    const result = await this.getClient().query(query, [jobId]);
    return result.rows.map((row) => Step.fromDb(row));
  }
}
