import { IPromptDomainService } from './IPromptDomainService.js';
import { IDocument } from '../document/IDocument.js';
import { Job } from '../job/Job.js';
import { Prompt } from './Prompt.js';
import { ExecutableStep } from '../steps/automated/ExecutableStep.js';
import pino from 'pino';
import { createChildLogger } from '../../utils/logger.js';
import { IPromptsRepository } from './IPromptsRepository.js';
import { DescribedAvailableFieldsObtainer } from '../entityDescriptions/IDescribedEntities.js';

/**
 * PromptDomainService - handles prompt rendering with document and job context.
 * Pure domain logic with no infrastructure dependencies.
 */
export class PromptService implements IPromptDomainService {
  private readonly logger: pino.Logger
  public constructor(private readonly repo: IPromptsRepository, private readonly fieldsObtainer: DescribedAvailableFieldsObtainer) {
    this.logger = createChildLogger({ name: "PromptService"})
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

      const variables: Record<string, string> = {
        documentContent: `<content>${document.content}</content>`,
        documentTitle: `<title>${document.title || '(No title)'}</title>`,
        documentTags: `<tags>${document.tags.map((v) => `<tag>${v}</tag>`).join('\n')}</tags>`,
        documentType: `<documentType>${document.documentType || '(No document type)'}</documentType>`,
        documentCorrespondent: `<documentCorrespondent>${document.correspondent || '(No correspondent)'}</documentCorrespondent>`,
        availableTags: `<availableTags>${tags}</availableTags>`,
        availableCorrespondents: `<availableCorrespondents>${correspondents}</availableCorrespondents>`,
        availableDocumentTypes: `<availableDocumentTypes>${documentTypes}</availableDocumentTypes>`
      };

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
