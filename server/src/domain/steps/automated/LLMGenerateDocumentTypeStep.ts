import { ExecutableStep } from './ExecutableStep.js';
import { StepExecutionContext, StepResult, StepStatus, StepType } from '../IStep.js';
import { DocumentTypeUpdateAction } from '../../actions/DocumentTypeUpdateAction.js';
import { Transition } from '../../workflows/Transition.js';

/**
 * Step: Generate document type using LLM
 * Returns: DocumentTypeUpdateAction with proposed document type and SUCCESS transition
 */
export class LLMGenerateDocumentTypeStep extends ExecutableStep {
  constructor(
    stepId: string | null,
    jobId: string,
    stepState: StepStatus,
    retryCount: number = 0,
    retryAfter: Date | null = null,
    startedAt: Date | null = null,
    parentStepId: string | null = null,
    configuration: Record<string, any> | null = null
  ) {
    super(
      stepId,
      StepType.LLM_GENERATE_DOCUMENT_TYPE,
      jobId,
      stepState,
      retryCount,
      retryAfter,
      startedAt,
      parentStepId,
      configuration
    );
  }

  public needsPrompt(): boolean {
    return true;
  }

  protected async doExecute(context: StepExecutionContext): Promise<StepResult> {
    if (!context.prompt) {
      throw new Error('LLMGenerateDocumentTypeStep requires a prompt');
    }

    // Fetch document from DMS
    const document = await context.services.dms.getDocument(context.job.documentId);

    // Render prompt using domain service
    const renderedPrompt = context.services.promptDomainService.renderPrompt(
      context.prompt,
      document,
      context.job
    );

    // Call LLM to generate document type
    const generatedResponse = await context.services.llm.sendChatRequest(renderedPrompt);

    // Clean the document type name
    const proposedDocumentTypeName = this.cleanDocumentType(generatedResponse);

    // Resolve document type name to ID (create if missing)
    const proposedDocumentTypeId = await context.services.dms.resolveDocumentTypeId(
      proposedDocumentTypeName,
      true
    );

    // Get current document type from document metadata
    const currentDocumentTypeId: number | null = 
      document.metadata?.document_type ? Number(document.metadata.document_type) : null;

    // Create DocumentTypeUpdateAction
    const action = DocumentTypeUpdateAction.create(
      context.job.id,
      proposedDocumentTypeId,
      currentDocumentTypeId
    );

    return {
      actions: [action],
      transition: Transition.SUCCESS,
      message: "Document type: " + action.newValue
    };
  }

  /**
   * Clean up the generated document type name
   */
  private cleanDocumentType(response: string): string {
    // Remove thinking tags and their content
    let cleaned = response.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

    // Remove surrounding quotes
    cleaned = cleaned.replace(/^["']|["']$/g, '');

    // Remove common prefixes that LLMs might add
    cleaned = cleaned.replace(/^(Document Type:\s*|Type:\s*|Category:\s*)/i, '');

    return cleaned.trim();
  }
}
