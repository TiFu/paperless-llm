import { DocumentAction } from '../actions/DocumentAction.js';
import { AuditLogEntry } from '../audit/AuditLogEntry.js';
import { IDocumentManagementSystem } from '../document/IDocumentManagementSystem.js';
import { Job } from '../job/Job.js';
import { ILLMService } from '../llm/ILLMService.js';
import { IPromptDomainService } from '../prompt/IPromptDomainService.js';
import { Prompt } from '../prompt/Prompt.js';
import { Transition } from '../workflows/Transition.js';

/**
 * Step types - executable units in a workflow
 */
export enum StepType {
  LLM_GENERATE_TITLE = 'LLM_GENERATE_TITLE',
  LLM_GENERATE_FIELDS = 'LLM_GENERATE_FIELDS',
  LLM_GENERATE_TAGS = 'LLM_GENERATE_TAGS',
  LLM_GENERATE_CORRESPONDENT = 'LLM_GENERATE_CORRESPONDENT',
  LLM_GENERATE_DOCUMENT_TYPE = 'LLM_GENERATE_DOCUMENT_TYPE',
  LLM_GENERATE_CREATED_DATE = 'LLM_GENERATE_CREATED_DATE',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
  UPDATE_DOCUMENT = 'UPDATE_DOCUMENT',
  REMOVE_TAGS = 'REMOVE_TAGS',
}

/**
 * Step execution status
 */
export enum StepStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  IN_FALLOUT = 'in_fallout',
}

/**
 * New-style automated step result
 * Contains document actions, transition result, and audit log metadata
 */
export interface StepResult {
  success: boolean;
  actions: DocumentAction[];
  transition: Transition;
  message: string
}


/**
 * Execution context passed to steps
 * Contains services and dependencies needed for execution
 */
export interface StepExecutionContext {
  job: Job;
  prompt: Prompt | null;
  services: {
    dms: IDocumentManagementSystem,
    llm: ILLMService,
    promptDomainService: IPromptDomainService
  }
}

export interface RetryConfig {
  maxRetries: number
  retryDelayInMs: number
  retryExponent: number
}

export abstract class IStep {
  public abstract kind: "composite" | "manual" | "executable"

  constructor(
    protected stepId: string, 
    protected stepType: StepType, 
    protected jobId: string, 
    protected stepState: StepStatus,
    protected retryCount: number = 0,
    protected retryAfter: Date | null = null,
    protected startedAt: Date | null = null,
    protected parentStepId: string | null = null,
    protected configuration: Record<string, any> | null = null
  ) {
  }

  public setParentId(id: string): void {
    this.parentStepId = id
  }

  public hasChildren(): boolean {
    return false;
  }

  public getChildren(): Array<IStep> {
    return []
  }

  public setStepState(state: StepStatus) {
    this.stepState = state;
  }

  public updateId(stepId: string) {
    this.stepId = stepId
  }
  
  public getStepId(): string {
    if (!this.stepId) {
      throw new Error('Step ID is not set');
    }
    return this.stepId;
  }

  public getRetryCount(): number {
    return this.retryCount;
  }

  public getRetryAfter(): Date | null {
    return this.retryAfter;
  }
  
  public getStartedAt(): Date | null {
    return this.startedAt;
  }

  private setRetryAfter(date: Date | null): void {
    this.retryAfter = date;
  }

  private incrementRetryCount(): void {
    this.retryCount += 1;
  }

  /**
   * Check if step is eligible for manual retry
   * @returns true if step is in RETRYING or IN_FALLOUT status
   */
  public isEligibleForRetry(): boolean {
    return this.stepState === StepStatus.RETRYING || this.stepState === StepStatus.IN_FALLOUT;
  }

  /**
   * Mark step for automatic retry with exponential backoff
   * Business logic: increments retry count, sets RETRYING status, schedules next retry
   * @param retryAfter When the step should be retried
   */
  public markExecutionFailed(config: RetryConfig): void {
    this.incrementRetryCount();
    if (this.retryCount < config.maxRetries) {
      this.stepState = StepStatus.RETRYING;
      const dateInMs = Date.now() + config.retryDelayInMs * Math.pow(config.retryExponent, this.retryCount);
      this.retryAfter = new Date(dateInMs)
    } else {
      this.markInFallout();
    }
  }

  /**
   * Mark step as in fallout (max retries exceeded)
   * Business logic: sets IN_FALLOUT status, clears retry timer, requires manual intervention
   */
  private markInFallout(): void {
    this.stepState = StepStatus.IN_FALLOUT;
    this.retryAfter = null;
  }

  /**
   * Reset step for manual retry
   * Business logic: resets retry count to 0, sets WAITING status, clears retry timer
   */
  public resetForManualRetry(): void {
    this.retryCount = 0;
    this.stepState = StepStatus.WAITING;
    this.retryAfter = null;
  }

  public moveToInProgress() {
    this.stepState = StepStatus.IN_PROGRESS
  }

  public moveToFailed() {
    this.stepState = StepStatus.FAILED
  }

  public moveToWaiting() {
    this.stepState = StepStatus.WAITING
  }

  public moveToCompleted() {
    this.stepState = StepStatus.COMPLETED
  }
  public isCompleted() {
    return this.stepState == StepStatus.FAILED || this.stepState == StepStatus.COMPLETED
  }
  
  public isFailed() {
    return this.stepState == StepStatus.FAILED
  }
 
  public isInProgress() {
    return this.stepState == StepStatus.IN_PROGRESS
  }

  public getStepStatus(): StepStatus {
    return this.stepState

  }
  public getStepType(): StepType {
    return this.stepType
  }

  public getJobId(): string {
    return this.jobId
  }

  public getParentStepId(): string | null {
    return this.parentStepId
  }

  public getConfiguration(): Record<string, any> | null {
    return this.configuration
  }



  /**
   * Override this method to indicate if this is a composite step that spawns child steps
   * @returns true if step is composite (parent), false otherwise
   */
  public isCompositeStep(): boolean {
    return false;
  }
}
