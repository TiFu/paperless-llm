
import { Pool, PoolClient } from 'pg';
import { AutomatedStepStatistics, IStepRepository, StepWithJob } from '../../domain/steps/IStepRepository.js';
import { IStep, StepStatus, StepType } from '../../domain/steps/IStep.js';
import { StepFactory } from '../../domain/steps/StepFactory.js';
import { ExecutableStep } from '../../domain/steps/automated/ExecutableStep.js';
import { ManualStep } from '../../domain/steps/userinteraction/ManualStep.js';
import { Cursor } from '../../domain/common/Cursor.js';
import pino from 'pino';
import { createChildLogger } from '../../utils/logger.js';
import { Saveable, UoW } from '../../infrastructure/UoW.js';

export class PostgreSQLStepRepository implements IStepRepository, Saveable<IStep> {
  private logger: pino.Logger;
  constructor(private readonly client: PoolClient, private readonly uow: UoW) {
    this.logger = createChildLogger( { name: "PostgreSQLStepRepository"})
  }


  save(object: IStep): Promise<void> {
      return this.update(object)
  }

  saveAll(objects: IStep[]): Promise<void> {
      return this.updateAll(objects)
  }

  private getClient(): Pool | PoolClient {
    return this.client;
  }

  // TODO: this needs to correctly handle recursive steps, i.e. create children
  async create(step: IStep): Promise<void> {
    return this.createAll([step])
 }

  private getValuesAndParamsForStep(step: IStep, counter: number = 1): { values: string[], params: Array<unknown>, counter: number } {
    const valueEntry = `($${counter}, $${counter+1}, $${counter+2}, $${counter+3}, $${counter+4}, $${counter+5}, $${counter+6})`
    counter += 7
    const params: unknown[] = [ step.getStepId(),
      step.getJobId(),
      step.getStepType(),
      step.getStepStatus(),
      step.getParentStepId(),
      step.getConfiguration() ? JSON.stringify(step.getConfiguration()) : null,
      step.kind]

    const values = [valueEntry]

    this.logger.debug({ hasChildren: step.hasChildren(), children: step.getChildren()}, "Creating step")
    if (step.hasChildren()) {
      for (const child of step.getChildren()) {
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
    for (const step of steps) {
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

  async getById(id: string): Promise<IStep> {
    const step = await this.getStepByIdRecursive(id)
    this.uow.register(step, this)
    return step
  }

  async getByJobId(jobId: string): Promise<IStep[]> {
    const query = `
      SELECT id FROM steps
      WHERE job_id = $1
      ORDER BY created_at ASC
    `;

    const stepIds = await this.getClient().query(query, [jobId])

    const steps = await Promise.all(stepIds.rows.map((r) => this.getStepByIdRecursive(r.id)))
    this.uow.registerAll(steps, this)
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
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.getClient().query(query, [
      StepStatus.WAITING,
      limit
    ]);

    const steps = result.rows.map((row) => StepFactory.fromDb(row, [])) as ExecutableStep[];
    this.uow.registerAll(steps, this)
    return steps;
  }

  async getPendingManualSteps(limit: number, cursor?: Cursor): Promise<ManualStep[]> {
    const allowedJobIds = await this.resolveAllowedJobIds();
    if (allowedJobIds !== null && allowedJobIds.length === 0) return [];

    const jobFilter = allowedJobIds !== null ? `AND job_id = ANY($3)` : '';
    let query: string;
    let params: unknown[];

    if (cursor) {
      query = `
        SELECT * FROM steps
        WHERE status = $1 AND type = $2 AND id < $${allowedJobIds !== null ? 4 : 3}
          ${jobFilter}
        ORDER BY created_at DESC, id DESC
        LIMIT $${allowedJobIds !== null ? 5 : 4}
      `;
      params = allowedJobIds !== null
        ? [StepStatus.WAITING, StepType.REQUIRE_APPROVAL, allowedJobIds, cursor.stepId, limit]
        : [StepStatus.WAITING, StepType.REQUIRE_APPROVAL, cursor.stepId, limit];
    } else {
      query = `
        SELECT * FROM steps
        WHERE status = $1 AND type = $2
          ${jobFilter}
        ORDER BY created_at DESC, id DESC
        LIMIT $${allowedJobIds !== null ? 4 : 3}
      `;
      params = allowedJobIds !== null
        ? [StepStatus.WAITING, StepType.REQUIRE_APPROVAL, allowedJobIds, limit]
        : [StepStatus.WAITING, StepType.REQUIRE_APPROVAL, limit];
    }

    const result = await this.getClient().query(query, params);
    const steps = result.rows.map((row) => StepFactory.fromDb(row, [])) as ManualStep[];
    this.uow.registerAll(steps, this);
    return steps;
  }

  async update(step: IStep): Promise<void> {
    const status = step.getStepStatus();
    
    // Build dynamic query based on status
    let query = `UPDATE steps SET status = $1, retry_count = $2, retry_after = $3`;
    const params: unknown[] = [status, step.getRetryCount(), step.getRetryAfter()];
    const paramIndex = 4;

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

  /**
   * Returns the list of allowed job IDs for the current UoW user,
   * or null when operating in system context (no user = no filter).
   */
  private async resolveAllowedJobIds(): Promise<string[] | null> {
    const user = this.uow.getUser();
    if (!user) return null;
    return this.uow.getPermissions().listObjectIdsForUser('job', user.username);
  }

  async getAutomatedStepStatistics(): Promise<AutomatedStepStatistics> {
    const allowedJobIds = await this.resolveAllowedJobIds();
    if (allowedJobIds !== null && allowedJobIds.length === 0) {
      return { total: 0, waiting: 0, inProgress: 0, completed: 0, failed: 0, inFallout: 0 };
    }

    const jobFilter = allowedJobIds !== null ? `AND job_id = ANY($7)` : '';
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
        ${jobFilter}
    `;

    const params: unknown[] = [
      StepStatus.WAITING,
      StepStatus.IN_PROGRESS,
      StepStatus.COMPLETED,
      StepStatus.FAILED,
      StepStatus.IN_FALLOUT,
      StepType.REQUIRE_APPROVAL,
    ];
    if (allowedJobIds !== null) params.push(allowedJobIds);

    const result = await this.getClient().query(query, params);
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
    const allowedJobIds = await this.resolveAllowedJobIds();
    if (allowedJobIds !== null && allowedJobIds.length === 0) return 0;

    const jobFilter = allowedJobIds !== null ? `AND job_id = ANY($3)` : '';
    const query = `
      SELECT COUNT(*) as count
      FROM steps
      WHERE status = $1 AND type = $2
        ${jobFilter}
    `;

    const params: unknown[] = [StepStatus.WAITING, StepType.REQUIRE_APPROVAL];
    if (allowedJobIds !== null) params.push(allowedJobIds);

    const result = await this.getClient().query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  async listAutomatedStepsWithJob(
    limit: number,
    cursor?: string,
    stepStatus?: StepStatus
  ): Promise<{ items: StepWithJob[]; nextCursor: string | null }> {
    const allowedJobIds = await this.resolveAllowedJobIds();
    if (allowedJobIds !== null && allowedJobIds.length === 0) return { items: [], nextCursor: null };

    const jobFilter = allowedJobIds !== null ? `AND s.job_id = ANY($2)` : '';
    let query = `
      SELECT
        s.id as step_id,
        s.type as step_type,
        s.status as step_status,
        s.created_at as step_created_at,
        s.started_at as step_started_at,
        s.completed_at as step_completed_at,
        s.retry_count as step_retry_count,
        j.id as job_id,
        j.document_id,
        j.job_type,
        j.state as job_state
      FROM steps s
      INNER JOIN jobs j ON s.job_id = j.id
      WHERE s.type != $1
        ${jobFilter}
    `;

    const params: unknown[] = [StepType.REQUIRE_APPROVAL];
    if (allowedJobIds !== null) params.push(allowedJobIds);
    let paramIndex = params.length + 1;

    if (cursor) {
      query += ` AND s.id > $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    if (stepStatus) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(stepStatus);
      paramIndex++;
    }

    query += ` ORDER BY s.created_at DESC, s.id DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const result = await this.getClient().query(query, params);

    const hasMore = result.rows.length > limit;
    const items = result.rows.slice(0, limit);

    const stepWithJobItems: StepWithJob[] = items.map((row) => ({
      stepId: row.step_id,
      stepType: row.step_type,
      stepStatus: row.step_status,
      stepCreatedAt: row.step_created_at,
      stepStartedAt: row.step_started_at,
      stepCompletedAt: row.step_completed_at,
      retryCount: row.step_retry_count,
      jobId: row.job_id,
      documentId: row.document_id,
      jobType: row.job_type,
      jobState: row.job_state,
    }));

    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].step_id
      : null;

    return { items: stepWithJobItems, nextCursor };
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

    const params: unknown[] = [StepStatus.IN_PROGRESS, olderThanMs];
    if (limit) {
      params.push(limit);
    }

    const result = await this.getClient().query(query, params);

    const steps = await Promise.all(result.rows.map((r) => this.getStepByIdRecursive(r.id)))
    this.uow.registerAll(steps, this)
    return steps;
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
    const steps = await Promise.all(result.rows.map((r) => this.getStepByIdRecursive(r.id)))
    this.uow.registerAll(steps, this)
    return steps as ExecutableStep[];

  }

  async getStepsByJob(jobId: string): Promise<Array<IStep>> {
    const query = `
      SELECT id FROM steps
      WHERE job_id = $1 AND parent_id is NULL
      ORDER BY created_at ASC
    `;

    const result = await this.getClient().query(query, [jobId]);

    const mainSteps = result.rows.map((v) => {
      const step = this.getStepByIdRecursive(v.id)
      return step;
    })

    return Promise.all(mainSteps)
  }

}
