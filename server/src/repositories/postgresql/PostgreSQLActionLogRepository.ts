import { Pool, PoolClient } from 'pg';
import { IActionLogRepository } from '../../domain/actions/IActionLogRepository.js';
import { WorkflowAction } from '../../domain/actions/WorkflowAction.js';

export class PostgreSQLActionLogRepository implements IActionLogRepository {
  constructor(private readonly client: PoolClient) {}

  private getClient(): PoolClient {
    return this.client;
  }

  async insertActions(
    actions: Array<{
      jobId: string;
      stepId: string;
      type: string;
      payload: Record<string, unknown>;
    }>,
  ): Promise<WorkflowAction[]> {
    if (actions.length === 0) {
      return [];
    }

    // Use INSERT ... ON CONFLICT DO NOTHING for idempotency
    // The unique index on (step_id, type, md5(payload)) prevents duplicates
    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const action of actions) {
      values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
      params.push(
        action.jobId,
        action.stepId,
        action.type,
        JSON.stringify(action.payload),
      );
      paramIndex += 4;
    }

    const query = `
      INSERT INTO action_log (job_id, step_id, type, payload)
      VALUES ${values.join(', ')}
      ON CONFLICT (step_id, type, md5(payload::text)) DO NOTHING
      RETURNING *
    `;

    const result = await this.getClient().query(query, params);
    return result.rows.map((row) => WorkflowAction.fromDb(row));
  }

  async getByJobId(jobId: string): Promise<WorkflowAction[]> {
    const query = `
      SELECT * FROM action_log
      WHERE job_id = $1
      ORDER BY created_at ASC
    `;

    const result = await this.getClient().query(query, [jobId]);
    return result.rows.map((row) => WorkflowAction.fromDb(row));
  }

  async getByStepId(stepId: string): Promise<WorkflowAction[]> {
    const query = `
      SELECT * FROM action_log
      WHERE step_id = $1
      ORDER BY created_at ASC
    `;

    const result = await this.getClient().query(query, [stepId]);
    return result.rows.map((row) => WorkflowAction.fromDb(row));
  }
}
