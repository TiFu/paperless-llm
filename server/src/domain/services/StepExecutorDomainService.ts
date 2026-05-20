import { AuditLogEntry, StepExecutionMetadata } from "../audit/AuditLogEntry.js";
import { IAuditCollector } from "../audit/IAuditLogRepository.js";
import { IDocumentManagementSystem } from "../document/IDocumentManagementSystem.js";
import { IJobRepository } from "../job/IJobRepository.js";
import { ILLMService } from "../llm/ILLMService.js";
import { IPromptDomainService } from "../prompt/IPromptDomainService.js";
import { ExecutableStep, StepResultWithAuditEntries } from "../steps/automated/ExecutableStep.js";
import { RetryConfig, StepExecutionContext, StepResult } from "../steps/IStep.js";
import { StepExecutionResult } from "./WorkflowOrchestratorService.js";


export class StepExecutorDomainService {

    constructor(private readonly auditCollector: IAuditCollector) {

    }

    public async executeStep(step: ExecutableStep, context: StepExecutionContext, retryConfig: RetryConfig): Promise<StepResult> {
        const start = new Date();
        const result = step.execute(context, retryConfig)
        const end = new Date();

        const meta: StepExecutionMetadata = {stepType: step.getStepType(), message: "Successfully executed.", success: true, retryCount: step.getRetryCount(), nextRetryTime: step.getRetryAfter()};
        const auditLogEntry = AuditLogEntry.createStepExecuted(step, meta,new Date(), start, end);
        this.auditCollector.record(auditLogEntry)

        return result;
    }
}