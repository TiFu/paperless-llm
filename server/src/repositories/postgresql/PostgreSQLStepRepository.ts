
import { Pool, PoolClient } from 'pg';
import { AutomatedStepStatistics, IStepRepository, StepWithJob } from '../../domain/steps/IStepRepository.js';
import { IStep, StepStatus, StepType } from '../../domain/steps/IStep.js';
import { StepFactory } from '../../domain/steps/StepFactory.js';
import { ExecutableStep } from '../../domain/steps/automated/ExecutableStep.js';
import { ManualStep } from '../../domain/steps/userinteraction/ManualStep.js';
import { Cursor } from '../../domain/common/Cursor.js';
import { CompositeStep } from '../../domain/steps/automated/CompositeStep.js';
import pino from 'pino';
import { createChildLogger } from '../../utils/logger.js';

export class PostgreSQLStepRepository implements IStepRepository {
  private logger: pino.Logger;
  constructor(private readonly client: PoolClient) {
    this.logger = createChildLogger( { name: "PostgreSQLStepRepository"})
  }

  private getClient(): Pool | PoolClient {
    return this.client;
  }

  // TODO: this needs to correctly handle recursive steps, i.e. create children
  async create(step: IStep): Promise<void> {
    await this.createAll([step])
 }

  private getValuesAndParamsForStep(step: IStep, counter: number = 1): { values: string[], params: Array<any>, counter: number } {
    const valueEntry = `($${counter}, $${counter+1}, $${counter+2}, $${counter+3}, $${counter+4}, $${counter+5}, $${counter+6})`
    counter += 7
    const params = [ step.getStepId(),
      step.getJobId(),
      step.getStepType(),
      step.getStepStatus(),
      step.getParentStepId(),
      step.getConfiguration() ? JSON.stringify(step.getConfiguration()) : null,
      step.kind]

    const values = [valueEntry]

    this.logger.error({ hasChildren: step.hasChildren(), children: step.getChildren()}, "Creating step")
    if (step.hasChildren()) {
      for (let child of step.getChildren()) {
        const result = this.getValuesAndParamsForStep(child, counter)
        values.push(...result.values)
        params.push(...result.params)
        counter += result.counter - counter // only increment by the difference 
      }

    }
      return {
        values: values,
        params: params,
        counter: counter
      }
  }

  async createAll(steps: IStep[]): Promise<void> {
    if (steps.length === 0) {
      return;
    }

    const values = []
    const params = []
    let counter = 1;
    for (let step of steps) {
      const result = this.getValuesAndParamsForStep(step, counter)
      values.push(...result.values)
      params.push(...result.params)
      counter += result.counter
    }

    const query = `INSERT INTO steps (id, job_id, type, status, parent_id, configuration, kind)
      VALUES ${values.join(",")}
      RETURNING *`;

    this.logger.error({ query: query, params: params}, "Creating steps recursively")
    await this.getClient().query(query, params);
  }

  async getById(id: string): Promise<IStep | null> {
    return this.getStepByIdRecursive(id)
  }

  async getByJobId(jobId: string): Promise<IStep[]> {
    const query = `
      SELECT id FROM steps
      WHERE job_id = $1
      ORDER BY created_at ASC
    `;

    const stepIds = await this.getClient().query(query, [jobId])

    const steps = await Promise.all(stepIds.rows.map((r) => this.getStepByIdRecursive(r.id)))
    return steps
  }

  private async getStepByIdRecursive(id: string): Promise<IStep> {
    const mainQuery = `SELECT * FROM steps WHERE id = $1`;
    const childQuery = `SELECT id FROM steps WHERE parent_id = $1`

    const mainStepResult = await this.getClient().query(mainQuery, [id])


    const childrenIdResult = await this.getClient().query(childQuery, [id])
    const childSteps = await Promise.all(childrenIdResult.rows.map((r) => this.getStepByIdRecursive(r.id)))

    return StepFactory.fromDb(mainStepResult.rows[0], childSteps)
  }

  async getPendingExecutableSteps(limit: number): Promise<ExecutableStep[]> {
    const query = `
      SELECT * FROM steps
      WHERE status = $1 AND kind = 'executable'
      ORDER BY created_at ASC
      LIMIT $2
    `;

    const result = await this.getClient().query(query, [
      StepStatus.WAITING,
      limit
    ]);
    return result.rows.map((row) => StepFactory.fromDb(row, [])) as ExecutableStep[];
  }

  async getPendingManualSteps(limit: number, cursor?: Cursor): Promise<ManualStep[]> {
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
    return result.rows.map((row) => StepFactory.fromDb(row, [])) as ManualStep[];
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

  async getStuckInProgressExecutableSteps(olderThanMs: number, limit?: number): Promise<IStep[]> {
    const query = `
      SELECT id FROM steps
      WHERE status = $1 
        AND started_at IS NOT NULL
        AND started_at < NOW() - INTERVAL '1 millisecond' * $2
        AND kind = 'executable'
      ORDER BY started_at ASC
      ${limit ? `LIMIT $3` : ''}
    `;

    const params: any[] = [StepStatus.IN_PROGRESS, olderThanMs];
    if (limit) {
      params.push(limit);
    }

    const result = await this.getClient().query(query, params);

    const steps = await Promise.all(result.rows.map((r) => this.getStepByIdRecursive(r.id)))

    return steps;
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
  async getPendingRetries(now: Date, limit: number): Promise<ExecutableStep[]> {
    const query = `
      SELECT id FROM steps
      WHERE status = $1 
        AND retry_after IS NOT NULL
        AND retry_after <= $2
        AND kind = 'executable'
      ORDER BY retry_after ASC, created_at ASC
      LIMIT $3
    `;

    const result = await this.getClient().query(query, [
      StepStatus.RETRYING,
      now,
      limit
    ]);

    // Force type cast as we specifically look for executable steps
    return Promise.all(result.rows.map((r) => this.getStepByIdRecursive(r.id))) as Promise<ExecutableStep[]>
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
}
