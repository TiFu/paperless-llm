import { CompositeStep } from './CompositeStep.js';
import { IStep, StepStatus, StepType } from '../IStep.js';
import { StepFactory } from '../StepFactory.js';

/**
 * Composite step that spawns multiple parallel field generation substeps
 * Configuration format: { fields: ["title", "tags", "correspondent", "document_type", "created_date"] }
 */
export class LLMGenerateFieldsStep extends CompositeStep {
  
  private static readonly FIELD_TO_STEP_TYPE_MAP: Record<string, StepType> = {
    'title': StepType.LLM_GENERATE_TITLE,
    'tags': StepType.LLM_GENERATE_TAGS,
    'correspondent': StepType.LLM_GENERATE_CORRESPONDENT,
    'document_type': StepType.LLM_GENERATE_DOCUMENT_TYPE,
    'created_date': StepType.LLM_GENERATE_CREATED_DATE,
  };

  public constructor(
    stepId: string | null,
    jobId: string,
    stepState: StepStatus,
    retryCount: number = 0,
    retryAfter: Date | null = null,
    startedAt: Date | null = null,
    parentStepId: string | null = null,
    configuration: Record<string, any> | null = null
  ) {
    super(stepId, StepType.LLM_GENERATE_FIELDS, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);
  }

  /**
   * Create child steps for each field specified in configuration
   * Each child step will execute independently and generate its field
   * @returns Array of child steps (one per field)
   */
  public createChildSteps(): IStep[] {
    const config = this.getConfiguration();
    if (!config || !Array.isArray(config.fields)) {
      throw new Error('LLMGenerateFieldsStep requires configuration with "fields" array');
    }

    const parentStepId = this.getStepId();
    if (!parentStepId) {
      throw new Error('Parent step must have an ID before creating children');
    }

    const jobId = this.getJobId();
    const childSteps: IStep[] = [];

    for (const fieldName of config.fields) {
      const stepType = LLMGenerateFieldsStep.FIELD_TO_STEP_TYPE_MAP[fieldName];
      if (!stepType) {
        throw new Error(`Unknown field name: ${fieldName}. Supported: ${Object.keys(LLMGenerateFieldsStep.FIELD_TO_STEP_TYPE_MAP).join(', ')}`);
      }

      // Create child step with parent reference
      const childStep = StepFactory.create(
        null, // No ID yet, will be assigned on insert
        jobId,
        stepType,
        StepStatus.WAITING,
        0, // No retries yet
        null, // No retry timer
        null, // No started at
        parentStepId,
        null // No configuration
      );

      childSteps.push(childStep);
    }

    return childSteps;
  }
}
