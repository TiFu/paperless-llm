import { Pool, PoolClient } from 'pg';
import { AutomatedStepStatistics, IStepRepository, StepWithJob } from '../../domain/steps/IStepRepository.js';
import { IStep, StepStatus, StepType } from '../../domain/steps/IStep.js';
import { StepFactory } from '../../domain/steps/StepFactory.js';
import { AutomatedStep } from '../../domain/steps/automated/AutomatedStep.js';
import { UserInteractionStep } from '../../domain/steps/userinteraction/UserInteractionStep.js';
import { Cursor } from '../../domain/common/Cursor.js';
export class PostgreSQLStepRepository implements IStepRepository {
  constructor(private readonly client: PoolClient) {}

  private getClient(): Pool | PoolClient {
    return this.client;
  }

  async create(step: IStep): Promise<IStep> {
    const query = `
      INSERT INTO steps (job_id, type, status, parent_step_id, configuration)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.getClient().query(query, [
      step.getJobId(),
      step.getStepType(),
      step.getStepStatus(),
      step.getParentStepId(),
      step.getConfiguration() ? JSON.stringify(step.getConfiguration()) : null,
    ]);

    step.updateId(result.rows[0].id)
    return step;
  }

  async createAll(steps: IStep[]): Promise<IStep[]> {
    if (steps.length === 0) {
      return [];
    }

    // Create each step and collect results
    const createdSteps: IStep[] = [];
    for (const step of steps) {
      const createdStep = await this.create(step);
      createdSteps.push(createdStep);
    }

    return createdSteps;
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
    let query = `UPDATE steps SET status = $1, retry_count = $2, retry_after = $3`;
    const params: any[] = [status, step.getRetryCount(), step.getRetryAfter()];
    let paramIndex = 4;

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
        COUNT(*) FILTER (WHERE status = $4) as failed,
        COUNT(*) FILTER (WHERE status = $5) as in_fallout
      FROM steps
      WHERE type != $6
    `;

    const result = await this.getClient().query(query, [
      StepStatus.WAITING,
      StepStatus.IN_PROGRESS,
      StepStatus.COMPLETED,
      StepStatus.FAILED,
      StepStatus.IN_FALLOUT,
      StepType.REQUIRE_APPROVAL,
    ]);

    const row = result.rows[0];
    return {
      total: parseInt(row.total, 10),
      waiting: parseInt(row.waiting, 10),
      inProgress: parseInt(row.in_progress, 10),
      completed: parseInt(row.completed, 10),
      failed: parseInt(row.failed, 10),
      inFallout: parseInt(row.in_fallout, 10),
    };
  }

  async countPendingUserInteractionSteps(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM steps
      WHERE status = $1 AND type = $2
    `;

    const result = await this.getClient().query(query, [
      StepStatus.WAITING,
      StepType.REQUIRE_APPROVAL,
    ]);

    return parseInt(result.rows[0].count, 10);
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

  async getStuckInProgressSteps(olderThanMs: number, limit?: number): Promise<IStep[]> {
    const query = `
      SELECT * FROM steps
      WHERE status = $1 
        AND started_at IS NOT NULL
        AND started_at < NOW() - INTERVAL '1 millisecond' * $2
      ORDER BY started_at ASC
      ${limit ? `LIMIT $3` : ''}
    `;

    const params: any[] = [StepStatus.IN_PROGRESS, olderThanMs];
    if (limit) {
      params.push(limit);
    }

    const result = await this.getClient().query(query, params);
    return result.rows.map((row) => StepFactory.fromDb(row));
  }

  async resetStepToWaiting(stepId: string): Promise<void> {
    const query = `
      UPDATE steps
      SET status = $1,
          retry_count = retry_count + 1,
          started_at = NULL,
          completed_at = NULL
      WHERE id = $2
    `;

    await this.getClient().query(query, [StepStatus.WAITING, stepId]);
  }

  async markStepAsFailed(stepId: string, errorMessage: string): Promise<void> {
    const query = `
      UPDATE steps
      SET status = $1,
          completed_at = COALESCE(completed_at, NOW())
      WHERE id = $2
    `;

    await this.getClient().query(query, [StepStatus.FAILED, stepId]);
  }

  /**
   * Get steps in RETRYING status that are ready for retry (retry_after <= now)
   * @param now Current time - steps with retry_after <= this are ready for retry
   * @param limit Maximum number of steps to return
   * @returns Array of automated steps ready for retry
   */
  async getPendingRetries(now: Date, limit: number): Promise<AutomatedStep[]> {
    const query = `
      SELECT * FROM steps
      WHERE status = $1 
        AND retry_after IS NOT NULL
        AND retry_after <= $2
        AND type != $3
      ORDER BY retry_after ASC, created_at ASC
      LIMIT $4
    `;

    const result = await this.getClient().query(query, [
      StepStatus.RETRYING,
      now,
      StepType.REQUIRE_APPROVAL,
      limit
    ]);

    return result.rows.map((row) => StepFactory.fromDb(row)) as AutomatedStep[];
  }

  async getStepsByJobIdWithTimestamps(jobId: string): Promise<Array<{
    stepId: string;
    stepType: StepType;
    stepStatus: StepStatus;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    retryCount: number;
    retryAfter: Date | null;
  }>> {
    const query = `
      SELECT id, type, status, created_at, started_at, completed_at, retry_count, retry_after
      FROM steps
      WHERE job_id = $1
      ORDER BY created_at ASC
    `;

    const result = await this.getClient().query(query, [jobId]);

    return result.rows.map((row: any) => ({
      stepId: row.id,
      stepType: row.type as StepType,
      stepStatus: row.status as StepStatus,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      retryCount: row.retry_count || 0,
      retryAfter: row.retry_after ? new Date(row.retry_after) : null,
    }));
  }

  async getChildSteps(parentStepId: string): Promise<IStep[]> {
    const query = `
      SELECT * FROM steps
      WHERE parent_step_id = $1
      ORDER BY created_at ASC
    `;

    const result = await this.getClient().query(query, [parentStepId]);
    return result.rows.map((row) => StepFactory.fromDb(row));
  }

  async areAllChildStepsInFinalState(parentStepId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM steps
      WHERE parent_step_id = $1
        AND status NOT IN ($2, $3, $4)
    `;

    const result = await this.getClient().query(query, [
      parentStepId,
      StepStatus.COMPLETED,
      StepStatus.FAILED,
      StepStatus.IN_FALLOUT
    ]);

    return parseInt(result.rows[0].count, 10) === 0;
  }

  async hasFailedChildSteps(parentStepId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM steps
      WHERE parent_step_id = $1
        AND status IN ($2, $3)
    `;

    const result = await this.getClient().query(query, [
      parentStepId,
      StepStatus.FAILED,
      StepStatus.IN_FALLOUT
    ]);

    return parseInt(result.rows[0].count, 10) > 0;
  }
}
