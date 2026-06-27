import pino from "pino";
import { AuditLogEntry, StepExecutionMetadata } from "../audit/AuditLogEntry.js";
import { IAuditCollector } from "../audit/IAuditLogRepository.js";
import { ExecutableStep } from "../steps/automated/ExecutableStep.js";
import { RetryConfig, StepExecutionContext, StepResult } from "../steps/IStep.js";
import { createChildLogger } from "../../utils/logger.js";


export class StepExecutorDomainService {
    private logger: pino.Logger

    constructor(private readonly auditCollector: IAuditCollector) {
        this.logger = createChildLogger({ name: "StepExecutorDomainService"})
    }

    public async executeStep(step: ExecutableStep, context: StepExecutionContext, retryConfig: RetryConfig): Promise<StepResult> {
        const start = new Date();
        try {
            const resultPromise = step.execute(context, retryConfig);
            const result = await resultPromise;
            const end = new Date();

            const meta: StepExecutionMetadata = {
                stepType: step.getStepType(),
                message: result.message,
                success: result.success,
                retryCount: step.getRetryCount(),
                nextRetryTime: step.getRetryAfter(),
                prompt: result.prompt || null
            };
            this.logger.info({ meta }, "Adding Audit Log Step Executed Event")
            const auditLogEntry = AuditLogEntry.createStepExecuted(step, meta, new Date(), start, end);
            this.auditCollector.record(auditLogEntry)

            return result;
        } catch (err) {
            const end = new Date();
            const meta: StepExecutionMetadata = {
                stepType: step.getStepType(),
                message: "Execution failed: " + err,
                success: false,
                retryCount: step.getRetryCount(),
                nextRetryTime: step.getRetryAfter(),
                prompt: "n/a"
            };
            const auditLogEntry = AuditLogEntry.createStepExecuted(step, meta, new Date(), start, end);
            this.auditCollector.record(auditLogEntry)

            throw err;
        }
    }
}