import { ExecutableStep } from '../steps/automated/ExecutableStep.js';
import { IStep, StepStatus, RetryConfig, StepExecutionContext, StepResult } from '../steps/IStep.js';
import { TransactionContext } from '../../infrastructure/TransactionManager.js';
import { DomainServices } from './DomainServices.js';
import { IDocumentManagementSystem } from '../document/IDocumentManagementSystem.js';
import { ILLMService } from '../llm/ILLMService.js';
import { IPromptDomainService } from '../prompt/IPromptDomainService.js';
import { CompositeStep } from '../steps/automated/CompositeStep.js';
import { Transition } from '../workflows/Transition.js';
import { AuditLogEntry, StepCompletedMetadata, StepExecutionMetadata } from '../audit/AuditLogEntry.js';

export interface StepExecutionResult {
    result: StepResult,
    auditEntries: AuditLogEntry[]
}
/**
 * StepExecutorService - executes a step and recursively updates parent hierarchy.
 * This service is stateless and operates entirely within a provided TransactionContext.
 */
export class StepExecutorService {
    private compositeStepStatusMapping: Record<StepStatus, Record<StepStatus, StepStatus>> = {
        [StepStatus.WAITING]: {
            [StepStatus.WAITING]: StepStatus.WAITING,
            [StepStatus.IN_PROGRESS]: StepStatus.IN_PROGRESS,
            [StepStatus.IN_FALLOUT]: StepStatus.IN_PROGRESS,
            [StepStatus.RETRYING]: StepStatus.IN_PROGRESS,
            [StepStatus.COMPLETED]: StepStatus.IN_PROGRESS,
            [StepStatus.FAILED]: StepStatus.IN_PROGRESS,
        },
        [StepStatus.IN_PROGRESS]: {
            [StepStatus.WAITING]: StepStatus.IN_PROGRESS,
            [StepStatus.IN_PROGRESS]: StepStatus.IN_PROGRESS,
            [StepStatus.IN_FALLOUT]: StepStatus.IN_PROGRESS,
            [StepStatus.RETRYING]: StepStatus.IN_PROGRESS,
            [StepStatus.COMPLETED]: StepStatus.IN_PROGRESS,
            [StepStatus.FAILED]: StepStatus.IN_PROGRESS,
        },
        [StepStatus.COMPLETED]: {
            [StepStatus.WAITING]: StepStatus.IN_PROGRESS,
            [StepStatus.IN_PROGRESS]: StepStatus.IN_PROGRESS,
            [StepStatus.IN_FALLOUT]: StepStatus.IN_PROGRESS,
            [StepStatus.RETRYING]: StepStatus.IN_PROGRESS,
            [StepStatus.COMPLETED]: StepStatus.COMPLETED,
            [StepStatus.FAILED]: StepStatus.FAILED,
        },
        [StepStatus.FAILED]: {
            [StepStatus.WAITING]: StepStatus.IN_PROGRESS,
            [StepStatus.IN_PROGRESS]: StepStatus.IN_PROGRESS,
            [StepStatus.IN_FALLOUT]: StepStatus.IN_PROGRESS,
            [StepStatus.RETRYING]: StepStatus.IN_PROGRESS,
            [StepStatus.COMPLETED]: StepStatus.FAILED,
            [StepStatus.FAILED]: StepStatus.FAILED,
        },
        [StepStatus.RETRYING]: {
            [StepStatus.WAITING]: StepStatus.IN_PROGRESS,
            [StepStatus.IN_PROGRESS]: StepStatus.IN_PROGRESS,
            [StepStatus.IN_FALLOUT]: StepStatus.IN_PROGRESS,
            [StepStatus.RETRYING]: StepStatus.IN_PROGRESS,
            [StepStatus.COMPLETED]: StepStatus.IN_PROGRESS,
            [StepStatus.FAILED]: StepStatus.IN_PROGRESS,
        },
        [StepStatus.IN_FALLOUT]: {
            [StepStatus.WAITING]: StepStatus.IN_PROGRESS,
            [StepStatus.IN_PROGRESS]: StepStatus.IN_PROGRESS,
            [StepStatus.IN_FALLOUT]: StepStatus.IN_PROGRESS,
            [StepStatus.RETRYING]: StepStatus.IN_PROGRESS,
            [StepStatus.COMPLETED]: StepStatus.IN_PROGRESS,
            [StepStatus.FAILED]: StepStatus.IN_PROGRESS,
        }
    }
  public constructor(
      private transactionContext: TransactionContext,
      private dms: IDocumentManagementSystem,
      private llm: ILLMService,
      private promptDomainService: IPromptDomainService
    ) {
    
  }
  /**
   * Executes a step, updates parent hierarchy, and returns all updated steps and root transition.
   * @param context TransactionContext for all DB operations
   * @param step The AutomatedStep to execute
   * @param domainServices DomainServices for DMS, LLM, etc.
   * @param retryConfig RetryConfig for step execution
   * @returns { updatedSteps, rootTransition }
   */
  async executeAndUpdateHierarchy(
    step: ExecutableStep,
    retryConfig: RetryConfig
  ): Promise<StepExecutionResult> {
    // 1. Execute the step
    const startDate = new Date();

    if (step.isCompleted() || step.isFailed()) {
        throw new Error("Step is already completed or failed - no double execution possible");
    }
    const stepRepo = this.transactionContext.getRepositoryRegistry().getSteps();
    const jobRepo = this.transactionContext.getRepositoryRegistry().getJobs()
    const auditRepo = this.transactionContext.getRepositoryRegistry().getAuditLog();

    // Load job
    const job = await jobRepo.getById(step.getJobId())
    if (!job) {
        throw new Error("Unknown job - cancelling execution");
    }
    // Prepare execution context
    const prompt = await this.promptDomainService.loadPrompt(step);
    const executionContext: StepExecutionContext = {
        job: job,
        stepId: step.getStepId() as string,
        prompt: prompt, 
        services: {
            dms: this.dms,
            llm: this.llm,
            promptDomainService: this.promptDomainService            
        }
    };

    const result = await step.execute(executionContext, retryConfig);
    job.addDocumentActions(result.actions)

    stepRepo.update(step)
    jobRepo.update(job)
    
    const auditEntries: AuditLogEntry[] =[
    ];

    // Determine final transition based on top-most job
    const modifiedSteps = await this.updateState(step.getParentStepId(), step, auditEntries)
    const parentMostStep = modifiedSteps[modifiedSteps.length - 1]
    const parentStatus = parentMostStep.getStepStatus();
    result.transition = this.getTransitionForParentStatus(parentStatus);

    stepRepo.updateAll(modifiedSteps)


    // Create final Audit Log Entry for this execution
    const endDate = new Date();
    const stepMetadata: StepExecutionMetadata = {
        message: result.message,
        success: result.transition == Transition.SUCCESS,
        retryCount: step.getRetryCount(),
        nextRetryTime: step.getRetryAfter()
    }
    const entry = AuditLogEntry.createStepExecuted(step, stepMetadata, startDate, startDate, endDate);
    auditEntries.push(entry)

    return {
        result: result,
        auditEntries: auditEntries
    };
  }

    private getTransitionForParentStatus(parentStatus: StepStatus): Transition {
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

  private async updateState(parentStepId: string | null, mainStep: ExecutableStep, auditEntries: AuditLogEntry[]): Promise<IStep[]> {
    const priorSteps: Array<IStep> = [mainStep];

    if (parentStepId == null) {
        return priorSteps
    }   

    const stepRepo = this.transactionContext.getRepositoryRegistry().getSteps();
    let parentId: string | null = parentStepId
    while (parentId != null) {
        // (1) Load the parent step
        const parentStep = await stepRepo.getCompositeStep(parentId)
        const childSteps = await stepRepo.getChildSteps(parentId);

        // (2) If no child steps, return completed. Just in case
        if (childSteps.length == 0) {
            parentStep.setStepState(StepStatus.COMPLETED)
            priorSteps.push(parentStep)
            return priorSteps;
        }

        // Map
        const resultState = childSteps.map(s => s.getStepStatus()).reduce<StepStatus>(
                (output: StepStatus, current) => {
                    return this.compositeStepStatusMapping[output][current];
                }, childSteps[0].getStepStatus());
        
        parentStep.setStepState(resultState)

        if (resultState == StepStatus.COMPLETED || resultState == StepStatus.FAILED) {
            const success = resultState == StepStatus.COMPLETED;
            const msg = success ? "Step completed successfully" : "Step failed"
            const metadata: StepCompletedMetadata = {
                message: msg,
                success: success
            }
            const completedEntry = AuditLogEntry.createStepCompleted(parentStep, metadata, new Date())
            auditEntries.push(completedEntry)
        }
        parentId = parentStep.getParentStepId();
        
    }

    return priorSteps
  } 
}
