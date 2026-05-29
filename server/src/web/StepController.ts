import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import type { OperationResult } from './dtos/models/OperationResult.js';

export class StepController {
  private readonly appFactory: ApplicationServiceFactory;

  constructor(appFactory: ApplicationServiceFactory) {
    this.appFactory = appFactory;
  }

  /**
   * Manually retry a step in RETRYING or IN_FALLOUT status
   */
  async retryStep(stepId: string): Promise<OperationResult> {
    const stepRetryService = this.appFactory.createStepRetryApplicationService();
    await stepRetryService.retryStep(stepId);
    return {
      success: true,
      message: `Step ${stepId} has been reset and will be retried`,
    };
  }

  /**
   * Cancel a step in RETRYING or IN_FALLOUT status, permanently marking it as FAILED
   */
  async cancelStep(stepId: string): Promise<OperationResult> {
    const stepCancelService = this.appFactory.createStepCancelApplicationService();
    await stepCancelService.cancelStep(stepId);
    return {
      success: true,
      message: `Step ${stepId} has been cancelled and marked as failed`,
    };
  }
}
