import { Job } from "../job/Job.js";
import { Transition } from "../workflows/Transition.js";
import { createChildLogger } from "../../utils/logger.js";
import { CompositeStep } from "../steps/automated/CompositeStep.js";
import { AuditLogEntry, StepCompletedMetadata, StepExecutionMetadata } from "../audit/AuditLogEntry.js";
import { IJobRepository } from "../job/IJobRepository.js";
import { IStep, RetryConfig, StepResult, StepStatus } from "../steps/IStep.js";
import { IStepRepository } from "../steps/IStepRepository.js";
import { ExecutableStep } from "../steps/automated/ExecutableStep.js";
import pino from "pino";
import { NextStepResult } from "../workflows/BaseWorkflow.js";
import { ManualStep } from "../steps/userinteraction/ManualStep.js";
import { JobState } from "../job/JobState.js";
import { IAuditCollector } from "../audit/IAuditLogRepository.js";

export interface StepExecutionResult {
    jobAdvancement: NextStepResult
    result: StepResult,
}

/**
 * WorkflowOrchestratorService - manages workflow progression and state transitions.
 * Application service responsible for advancing jobs through their workflow steps.
 */
export class WorkflowOrchestratorDomainService {
  private logger: pino.Logger

  constructor(private readonly jobRepo: IJobRepository, 
                private readonly stepRepo: IStepRepository, 
                private readonly auditCollector: IAuditCollector) {
      this.logger = createChildLogger({ name: "WorkflowOrchestratorDomainService"})
  }

  manuallyRetry(step: ExecutableStep): void {
      const prevState = step.getStepStatus();
      step.resetForManualRetry();
      const entry = AuditLogEntry.createStepManuallyRetried(step, {stepType: step.getStepType(), previousStatus: prevState }, new Date())
      this.auditCollector.record(entry)
  }


  resetStuckSteps(steps: IStep[], config: RetryConfig): IStep[] {
      const auditEntries = steps.map((s) => {
        s.markExecutionFailed(config)
        const auditEntry = AuditLogEntry.createStuckStepReset(s, { stepType: s.getStepType(), previousStartedAt: new Date(), stuckDurationMs: 0  })
        return auditEntry
      })
      this.auditCollector.recordAll(auditEntries)
      return steps
  }


  async processUserDecision(step: ManualStep, decision: string): Promise<NextStepResult> {
      // Process user decision (domain logic)
      // Now that decision has been processed, we can log the event
      const entry = AuditLogEntry.createDecisionEntry(step, { stepType: step.getStepType(), decision: decision}, new Date())
      this.auditCollector.record(entry)
      
      const job = await this.jobRepo.getById(step.getJobId())

      const result = await step.processUserDecision(decision);
      job.addDocumentActions(result.actions);

      const nextStepResult = this._processJobTransition(job, result.transition)

      return nextStepResult;
  }

  private _processJobTransition(job: Job, transition: Transition): NextStepResult {
      const nextStepResult = job.advance(transition)
      this.logger.error({ nextStepResult, job, transition}, "Moved job to next step")
      const nextStep = nextStepResult.step
      const auditEntries = [];
      if (nextStep) {
        auditEntries.push(AuditLogEntry.createStepCreated(nextStep, { stepType: nextStep.getStepType()}, new Date()))
        nextStep.getChildren().forEach((s) => {
          auditEntries.push(AuditLogEntry.createStepCreated(s, { stepType: s.getStepType()}, new Date()))
        })
      }

      if (nextStepResult.isTerminalState) {
        auditEntries.push(AuditLogEntry.createJobCompleted(job, { documentId: job.documentId, jobType: job.jobType, message: nextStepResult.errorMessage }, new Date()))
      }
      this.auditCollector.recordAll(auditEntries)
      return nextStepResult
  }

  startJob(job: Job): NextStepResult {
    if (job.state != JobState.PENDING) {
      throw new Error("Cannot start non-pending job " + job.id +" in state " + job.state)
    }
    return this._processJobTransition(job, Transition.SUCCESS)
  }

  // TODO: Technically a cancellation can cause new steps to be created
  async processStepCancellation(step: ExecutableStep): Promise<void> {
    this.logger.info("Entered processStepCancellation")
    // Verify step is eligible for cancellation (same as retry eligibility)
    if (!step.isEligibleForRetry()) {
      throw new Error(
        `Step ${step.getStepId()} is in ${step.getStepStatus()} status and is not eligible for cancellation. ` +
        `Only steps in RETRYING or IN_FALLOUT status can be manually cancelled.`
      );
    }

    const job = await this.jobRepo.getById(step.getJobId());
    // TODO: To make this "nicer" we could introduce a cancelled state at some 
    // point -> helps with stop cancel status
    // When we do this, we can also generalize, i.e. what happens if a composite step is cancelled?
    const prevStatus = step.getStepStatus();
    step.moveToFailed();
    this.logger.error({step}, "Moved step to failed due to cancellation")
    // Record that step is cancelled
    const entry = AuditLogEntry.createStepCancelled(step, {stepType: step.getStepType(), previousStatus: prevStatus}, new Date())
    this.auditCollector.record(entry) 
    // Then add the job transition
    this._processJobTransition(job, Transition.FAILURE)
    this.logger.error({job}, "Updated job due to cancellation")
  }

  async processStepExecutionResult(step: ExecutableStep, result: StepResult): Promise<StepExecutionResult> {
    const job = await this.jobRepo.getById(step.getJobId());
    // Update job with document actions
    job.addDocumentActions(result.actions)

    const stepUpdateAuditEntries: AuditLogEntry[] =[
    ];
    // Update step hierarchy & record audit events
    const modifiedSteps = await this._updateState(step.getParentStepId(), step, stepUpdateAuditEntries)
    const parentMostStep = modifiedSteps[modifiedSteps.length - 1]
    const parentStatus = parentMostStep.getStepStatus();
    const transition = this._getTransitionForParentStatus(parentStatus);
    this.auditCollector.recordAll(stepUpdateAuditEntries)

    this.logger.info({ steps: modifiedSteps.map(s => { return { id: s.getStepId(), state: s.getStepStatus()}})}, "Job advanced")

    const jobAdvancementResult = this._processJobTransition(job, transition)
    
    this.logger.info({ jobAdvancementResult}, "Job advanced")
    return {
      result: result,
      jobAdvancement: jobAdvancementResult
    }

  }

  private _getTransitionForParentStatus(parentStatus: StepStatus): Transition {
          switch (parentStatus) {
              case StepStatus.COMPLETED:
                  return Transition.SUCCESS;
                  break;
              case StepStatus.FAILED:
                  return Transition.FAILURE;
                  break;
              case StepStatus.IN_FALLOUT:
              case StepStatus.IN_PROGRESS:
              case StepStatus.RETRYING:
              case StepStatus.WAITING:
                  return Transition.NONE;
          }
      }
  

  private async _updateState(parentStepId: string | null, mainStep: ExecutableStep, auditEntries: AuditLogEntry[]): Promise<IStep[]> {
    const priorSteps: Array<IStep> = [mainStep];

    this.logger.info({ parentStepId: parentStepId, mainStep: mainStep.getStepId()}, "Updating state")

    if (parentStepId == null) {
        return priorSteps
    }   

    const stepRepo = this.stepRepo
    let parentId: string | null = parentStepId
    while (parentId != null) {
        // (1) Load the parent step
        const parentStep = await stepRepo.getById(parentId) as CompositeStep
        if (!parentStep) {
            throw new Error("Invalid parent id")
        }
        priorSteps.push(parentStep)
        const childSteps = parentStep.getChildren()
        this.logger.info({childSteps: childSteps.map((s) => { return { id: s.getStepId(), state: s.getStepStatus()}})}, "Child steps for parent")
        // (2) If no child steps, return completed. Just in case
        if (childSteps.length == 0) {
            this.logger.error("Composite Step " + parentId + " has no children.")
            throw new Error("Composite step " + parentId +" has no children.")
        }

        // Map
        parentStep.recalculateStateFromChildren();
        const resultState = parentStep.getStepStatus();

        if (parentStep.isCompleted()) {
            const success = resultState == StepStatus.COMPLETED;
            const msg = success ? "Step completed successfully" : "Step failed"
            const metadata: StepCompletedMetadata = {
                message: msg,
                success: success,
                stepType: parentStep.getStepType()
            }
            const completedEntry = AuditLogEntry.createStepCompleted(parentStep, metadata, new Date())
            auditEntries.push(completedEntry)
        }
        parentId = parentStep.getParentStepId();
    }

    return priorSteps
  }   
}