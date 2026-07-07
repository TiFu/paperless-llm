import { IPromptDomainService, PromptVariableDescriptor } from './IPromptDomainService.js';
import { IDocument } from '../document/IDocument.js';
import { Job } from '../job/Job.js';
import { Prompt } from './Prompt.js';
import { ExecutableStep } from '../steps/automated/ExecutableStep.js';
import pino from 'pino';
import { createChildLogger } from '../../utils/logger.js';
import { IPromptsRepository } from './IPromptsRepository.js';
import { DescribedAvailableFieldsObtainer } from '../entityDescriptions/IDescribedEntities.js';

// The single source of truth for which {{variable}} names renderPrompt()
// substitutes into a template — kept right next to the rendering logic that
// uses them (below) rather than in a separately-maintained file, so the two
// can never drift apart.
const PROMPT_VARIABLES: readonly PromptVariableDescriptor[] = [
  { name: 'documentContent', description: "The document's OCR text content." },
  { name: 'documentTitle', description: "The document's current title." },
  { name: 'documentTags', description: "The document's current tags." },
  { name: 'documentType', description: "The document's current document type." },
  { name: 'documentCorrespondent', description: "The document's current correspondent." },
  { name: 'availableTags', description: 'All tags available in Paperless, with descriptions where set.' },
  { name: 'availableCorrespondents', description: 'All correspondents available in Paperless, with descriptions where set.' },
  { name: 'availableDocumentTypes', description: 'All document types available in Paperless, with descriptions where set.' },
];

/**
 * PromptDomainService - handles prompt rendering with document and job context.
 * Pure domain logic with no infrastructure dependencies.
 */
export class PromptService implements IPromptDomainService {
  private readonly logger: pino.Logger
  public constructor(private readonly repo: IPromptsRepository, private readonly fieldsObtainer: DescribedAvailableFieldsObtainer) {
    this.logger = createChildLogger({ name: "PromptService"})
  }

  getAvailableVariables(): readonly PromptVariableDescriptor[] {
    return PROMPT_VARIABLES;
  }

  async loadPrompt(step: ExecutableStep): Promise<Prompt | null> {
    this.logger.info({ step: step, msg: "Loading prompt"})
    if (!step.needsPrompt()) { 
      return null
    }

    const prompt = this.repo.getByStepType(step.getStepType());
    return prompt
  }
  /**
   * Render a prompt template with document and job context.
   * @param prompt The prompt template to render
   * @param document The document context
   * @param job The job context
   * @returns Rendered prompt with variables substituted
   */
  async renderPrompt(prompt: Prompt, document: IDocument, _job: Job): Promise<string> {
      // Fetch available fields
      const { tags: availableTags, correspondents: availableCorrespondents, documentTypes: availableDocumentTypes } = await this.fieldsObtainer();

      // Prepare variables for rendering
      const tags = availableTags.map(t =>
        t.description
          ? `<availableTag description="${t.description}">${t.name}</availableTag>`
          : `<availableTag>${t.name}</availableTag>`
      ).join('\n');
      const correspondents = availableCorrespondents.map(c =>
        c.description
          ? `<availableCorrespondent description="${c.description}">${c.name}</availableCorrespondent>`
          : `<availableCorrespondent>${c.name}</availableCorrespondent>`
      ).join('\n');
      const documentTypes = availableDocumentTypes.map(dt =>
        dt.description
          ? `<availableDocumentType description="${dt.description}">${dt.name}</availableDocumentType>`
          : `<availableDocumentType>${dt.name}</availableDocumentType>`
      ).join('\n');

      // Keyed with `satisfies` against PROMPT_VARIABLES' names so a rename
      // there without a matching update here is a compile error.
      const variables = {
        documentContent: `<content>${document.content}</content>`,
        documentTitle: `<title>${document.title || '(No title)'}</title>`,
        documentTags: `<tags>${document.tags.map((v) => `<tag>${v}</tag>`).join('\n')}</tags>`,
        documentType: `<documentType>${document.documentType || '(No document type)'}</documentType>`,
        documentCorrespondent: `<documentCorrespondent>${document.correspondent || '(No correspondent)'}</documentCorrespondent>`,
        availableTags: `<availableTags>${tags}</availableTags>`,
        availableCorrespondents: `<availableCorrespondents>${correspondents}</availableCorrespondents>`,
        availableDocumentTypes: `<availableDocumentTypes>${documentTypes}</availableDocumentTypes>`
      } satisfies Record<(typeof PROMPT_VARIABLES)[number]['name'], string>;

      // Render the template using the Prompt entity's render method
      return prompt.render(variables);
  }

  /**
   * Truncate document content to a maximum length to avoid token limits.
   * @param content The content to truncate
   * @param maxLength Maximum length in characters
   * @returns Truncated content with ellipsis if needed
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength) + '...';
  }
}
