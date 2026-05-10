import { DocumentAction } from '../actions/DocumentAction.js';
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
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
  UPDATE_DOCUMENT = 'UPDATE_DOCUMENT',
}

/**
 * Step execution status
 */
export enum StepStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * New-style automated step result
 * Contains document actions and transition result
 */
export interface StepResult {
  actions: DocumentAction[];
  transition: Transition;
}


/**
 * Execution context passed to steps
 * Contains services and dependencies needed for execution
 */
export interface StepExecutionContext {
  job: Job;
  stepId: string;
  prompt: Prompt | null;
  services: {
    dms: IDocumentManagementSystem,
    llm: ILLMService,
    promptDomainService: IPromptDomainService
  }
}

export abstract class IStep {

  constructor(
    protected stepId: string | null, 
    protected stepType: StepType, 
    protected jobId: string, 
    protected stepState: StepStatus,
    protected retryCount: number = 0
  ) {
  }

  public updateId(stepId: string) {
    this.stepId = stepId
  }

  public getRetryCount(): number {
    return this.retryCount;
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

  public getStepId(): string | null {
    return this.stepId
  }

  public getJobId(): string {
    return this.jobId
  }

  /**
   * Override this method to indicate if the step requires a prompt for execution
   * @returns true if step needs a prompt, false otherwise
   */
  public needsPrompt(): boolean {
    return false;
  }
}
