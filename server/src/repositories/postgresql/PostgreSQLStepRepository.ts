import { Pool, PoolClient } from 'pg';
import { AutomatedStepStatistics, IStepRepository, StepWithJob } from '../../domain/steps/IStepRepository';
import { IStep, StepStatus, StepType } from '../../domain/steps/IStep';
import { StepFactory } from '../../domain/steps/StepFactory';
import { AutomatedStep } from '../../domain/steps/automated/AutomatedStep';
import { UserInteractionStep } from '../../domain/steps/userinteraction/UserInteractionStep';import { Cursor } from '../../domain/common/Cursor';
export class PostgreSQLStepRepository implements IStepRepository {
  constructor(private readonly client: PoolClient) {}

  private getClient(): Pool | PoolClient {
    return this.client;
  }

  async create(step: IStep): Promise<IStep> {
    const query = `
      INSERT INTO steps (job_id, type, status)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await this.getClient().query(query, [
      step.getJobId(),
      step.getStepType(),
      step.getStepStatus(),
    ]);

    step.updateId(result.rows[0].id)
    return step;
  }

  async getById(id: string): Promise<IStep | null> {
    const query = `SELECT * FROM steps WHERE id = $1`;
    const result = await this.getClient().query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return StepFactory.fromDb(result.rows[0]);
  }

  async getPending(limit: number): Promise<IStep[]> {
    const query = `
      SELECT * FROM steps
      WHERE status = $1
      ORDER BY created_at ASC
      LIMIT $2
    `;

    const result = await this.getClient().query(query, [StepStatus.WAITING, limit]);
    return result.rows.map((row) => StepFactory.fromDb(row));
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

  async getByJobId(jobId: string): Promise<IStep[]> {
    const query = `
      SELECT * FROM steps
      WHERE job_id = $1
      ORDER BY created_at ASC
    `;

    const result = await this.getClient().query(query, [jobId]);
    return result.rows.map((row) => StepFactory.fromDb(row));
  }

  async getPendignAutomatedSteps(limit: number): Promise<AutomatedStep[]> {
    const query = `
      SELECT * FROM steps
      WHERE status = $1 AND type != $2
      ORDER BY created_at ASC
      LIMIT $3
    `;

    const result = await this.getClient().query(query, [
      StepStatus.WAITING,
      StepType.REQUIRE_APPROVAL,
      limit
    ]);
    return result.rows.map((row) => StepFactory.fromDb(row)) as AutomatedStep[];
  }

  async getPendingUserInteractionSteps(limit: number, cursor?: Cursor): Promise<UserInteractionStep[]> {
    let query: string;
    let params: any[];

    if (cursor) {
      // With cursor: fetch steps after the cursor position
      query = `
        SELECT * FROM steps
        WHERE status = $1 AND type = $2 AND id > $3
        ORDER BY created_at ASC, id ASC
        LIMIT $4
      `;
      params = [StepStatus.WAITING, StepType.REQUIRE_APPROVAL, cursor.stepId, limit];
    } else {
      // Without cursor: fetch first page
      query = `
        SELECT * FROM steps
        WHERE status = $1 AND type = $2
        ORDER BY created_at ASC, id ASC
        LIMIT $3
      `;
      params = [StepStatus.WAITING, StepType.REQUIRE_APPROVAL, limit];
    }

    const result = await this.getClient().query(query, params);
    return result.rows.map((row) => StepFactory.fromDb(row)) as UserInteractionStep[];
  }

  async update(step: IStep): Promise<void> {
    const status = step.getStepStatus();
    
    // Build dynamic query based on status
    let query = `UPDATE steps SET status = $1`;
    const params: any[] = [status];
    let paramIndex = 2;

    // Set timestamps based on status transitions
    if (status === StepStatus.IN_PROGRESS) {
      query += `, started_at = COALESCE(started_at, NOW())`;
    } else if (status === StepStatus.COMPLETED || status === StepStatus.FAILED) {
      query += `, completed_at = COALESCE(completed_at, NOW())`;
    }

    query += ` WHERE id = $${paramIndex}`;
    params.push(step.getStepId());

    await this.getClient().query(query, params);
  }

  async updateAll(steps: IStep[]): Promise<void> {
    if (steps.length === 0) {
      return;
    }

    // Use a transaction-safe approach with individual updates
    // This is already within a transaction context from the PoolClient
    for (const step of steps) {
      await this.update(step);
    }
  }

  async getAutomatedStepStatistics(): Promise<AutomatedStepStatistics> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = $1) as waiting,
        COUNT(*) FILTER (WHERE status = $2) as in_progress,
        COUNT(*) FILTER (WHERE status = $3) as completed,
        COUNT(*) FILTER (WHERE status = $4) as failed
      FROM steps
      WHERE type != $5
    `;

    const result = await this.getClient().query(query, [
      StepStatus.WAITING,
      StepStatus.IN_PROGRESS,
      StepStatus.COMPLETED,
      StepStatus.FAILED,
      StepType.REQUIRE_APPROVAL,
    ]);

    const row = result.rows[0];
    return {
      total: parseInt(row.total, 10),
      waiting: parseInt(row.waiting, 10),
      inProgress: parseInt(row.in_progress, 10),
      completed: parseInt(row.completed, 10),
      failed: parseInt(row.failed, 10),
    };
  }

  async listAutomatedStepsWithJob(
    limit: number,
    cursor?: string,
    stepStatus?: StepStatus
  ): Promise<{ items: StepWithJob[]; nextCursor: string | null }> {
    let query = `
      SELECT 
        s.id as step_id,
        s.type as step_type,
        s.status as step_status,
        s.created_at as step_created_at,
        s.started_at as step_started_at,
        s.completed_at as step_completed_at,
        j.id as job_id,
        j.document_id,
        j.job_type,
        j.state as job_state
      FROM steps s
      INNER JOIN jobs j ON s.job_id = j.id
      WHERE s.type != $1
    `;

    const params: any[] = [StepType.REQUIRE_APPROVAL];
    let paramIndex = 2;

    // Add cursor filter if provided
    if (cursor) {
      query += ` AND s.id > $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    // Add status filter if provided
    if (stepStatus) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(stepStatus);
      paramIndex++;
    }

    // Order by created_at ASC (FIFO queue) and limit
    query += ` ORDER BY s.created_at ASC, s.id ASC LIMIT $${paramIndex}`;
    params.push(limit + 1); // Fetch one extra to determine if there's a next page

    const result = await this.getClient().query(query, params);

    // Check if there are more items
    const hasMore = result.rows.length > limit;
    const items = result.rows.slice(0, limit);

    const stepWithJobItems: StepWithJob[] = items.map((row) => ({
      stepId: row.step_id,
      stepType: row.step_type,
      stepStatus: row.step_status,
      stepCreatedAt: row.step_created_at,
      stepStartedAt: row.step_started_at,
      stepCompletedAt: row.step_completed_at,
      jobId: row.job_id,
      documentId: row.document_id,
      jobType: row.job_type,
      jobState: row.job_state,
    }));

    const nextCursor = hasMore && items.length > 0 
      ? items[items.length - 1].step_id 
      : null;

    return {
      items: stepWithJobItems,
      nextCursor,
    };
  }
}
