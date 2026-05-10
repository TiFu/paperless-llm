import { DocumentAction } from '../actions/DocumentAction';
import { IDocumentManagementSystem } from '../document/IDocumentManagementSystem';
import { Job } from '../job/Job';
import { ILLMService } from '../llm/ILLMService';
import { IPromptDomainService } from '../prompt/IPromptDomainService';
import { Prompt } from '../prompt/Prompt';
import { Transition } from '../workflows/Transition';
import { AutomatedStep } from './automated/AutomatedStep';
import { UserInteractionStep } from './userinteraction/UserInteractionStep';

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
  prompt: Prompt;
  services: {
    dms: IDocumentManagementSystem,
    llm: ILLMService,
    promptDomainService: IPromptDomainService
  }
}

export abstract class IStep {

  constructor(protected stepId: string | null, protected stepType: StepType, protected jobId: string, protected stepState: StepStatus) {
  }

  public updateId(stepId: string) {
    this.stepId = stepId
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
}
