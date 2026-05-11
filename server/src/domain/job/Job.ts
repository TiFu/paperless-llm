import { WorkflowType as WorkflowType } from '../workflows/WorkflowType.js';
import { JobState } from './JobState.js';
import { DocumentAction } from '../actions/DocumentAction.js';
import { BaseWorkflow, NextStepResult } from '../workflows/BaseWorkflow.js';
import { IWorkflow } from '../workflows/IWorkflow.js';
import { AutomatedWorkflow } from '../workflows/AutomatedWorkflow.js';
import { ApprovalWorkflow } from '../workflows/ApprovalWorkflow.js';
import { error } from 'console';
import { Transition } from '../workflows/Transition.js';

/**
 * Job entity - stateful entity representing a workflow instance
 * Contains job-specific data and tracks overall workflow state
 */
export class Job {
  
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly jobType: WorkflowType,
    public state: JobState,
    public documentActions: DocumentAction[],
    public errorMessage: string | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly completedAt: Date | null,
  ) {
  }

  public advance(transition: Transition): NextStepResult {
    if (transition == Transition.NONE) {
      return {
          step: null,
          nextState: this.state,
          isTerminalState: this.isCompleted(),
      }
    }
    
    const result = this.getWorkflow().getNextStep(transition);
    this.state = result.nextState
    this.errorMessage = result.errorMessage

    return result
  }

  public addDocumentActions(actions: DocumentAction[]): void {
    this.documentActions.push(...actions)
  }

  public updateJobState(newState: JobState, errorMessage?: string): void {
    this.state = newState
    this.errorMessage = errorMessage
  }

  private getWorkflow(): IWorkflow {
    switch (this.jobType) {
      case WorkflowType.APPROVAL:
        return new ApprovalWorkflow(this);
      case WorkflowType.AUTOMATED:
        return new AutomatedWorkflow(this)
    }
  }
  public static fromDb(row: Record<string, unknown>, actions: DocumentAction[] = []): Job {
    return new Job(
      row.id as string,
      row.document_id as string,
      row.job_type as WorkflowType,
      row.state as JobState,
      actions,
      row.error_message as string | undefined,
      new Date(row.created_at as string),
      new Date(row.updated_at as string),
      row.completed_at ? new Date(row.completed_at as string) : null,
    );
  }

  public isPending(): boolean {
    return this.state === JobState.PENDING;
  }

  public isCompleted(): boolean {
    return this.state === JobState.COMPLETED;
  }

  public isFailed(): boolean {
    return this.state === JobState.FAILED;
  }

  public isRejected(): boolean {
    return this.state === JobState.REJECTED;
  }

  public isTerminal(): boolean {
    return this.isCompleted() || this.isFailed() || this.isRejected();
  }
}
