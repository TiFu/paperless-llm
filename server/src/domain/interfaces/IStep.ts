import { WorkflowAction } from '../entities/WorkflowAction';
import { DocumentAction } from '../actions/DocumentAction';
import { Transition } from '../enums/Transition';

/**
 * New-style automated step result
 * Contains document actions and transition result
 */
export interface AutomatedStepResult {
  actions: DocumentAction[];
  transition: Transition;
}

/**
 * New-style user interaction step result
 * Contains actions and transition from user decision
 */
export interface UserInteractionStepResult {
  actions: DocumentAction[];
  transition: Transition;
}

/**
 * Union of all possible step result types
 */
export type StepExecutionResult = StepResult | AutomatedStepResult | UserInteractionStepResult;

/**
 * Execution context passed to steps
 * Contains services and dependencies needed for execution
 */
export interface StepExecutionContext {
  jobId: string;
  stepId: string;
  documentId: string;
  jobType: string;
  stepPayload: Record<string, unknown>;
  jobData: Record<string, unknown>;
}

/**
/**
 * Base interface for all step implementations
 * Steps are executable units that emit actions (facts)
 */
export interface IStep {
  /**
   * Execute the step and return actions
   * Steps should be idempotent - safe to retry
   */
  execute(context: StepExecutionContext): Promise<StepExecutionResult>;
}
