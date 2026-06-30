import { PromptService } from '../../../../src/domain/prompt/PromptDomainService.js';
import { Prompt } from '../../../../src/domain/prompt/Prompt.js';
import { StepFactory } from '../../../../src/domain/steps/StepFactory.js';
import { StepType } from '../../../../src/domain/steps/IStep.js';
import { IPromptsRepository } from '../../../../src/domain/prompt/IPromptsRepository.js';
import { IDocument } from '../../../../src/domain/document/IDocument.js';
import { Job } from '../../../../src/domain/job/Job.js';
import { JobState } from '../../../../src/domain/job/JobState.js';
import { WorkflowType } from '../../../../src/domain/workflows/WorkflowType.js';
import { DescribedAvailableFieldsObtainer } from '../../../../src/domain/entityDescriptions/IDescribedEntities.js';

function makeFakePromptsRepo(promptByType: Partial<Record<StepType, Prompt | null>> = {}): IPromptsRepository {
  return {
    getByStepType: jest.fn((type: StepType) => Promise.resolve(promptByType[type] ?? null)),
    getAll: jest.fn(),
    upsert: jest.fn(),
    getAllForUser: jest.fn(),
    getGlobalDefaults: jest.fn(),
    copyForUser: jest.fn(),
  } as unknown as IPromptsRepository;
}

function makeFieldsObtainer(
  fields: Partial<Awaited<ReturnType<DescribedAvailableFieldsObtainer>>> = {},
): DescribedAvailableFieldsObtainer {
  return () =>
    Promise.resolve({
      tags: fields.tags ?? [],
      correspondents: fields.correspondents ?? [],
      documentTypes: fields.documentTypes ?? [],
    });
}

function makeDocument(overrides: Partial<IDocument> = {}): IDocument {
  return {
    id: 1,
    content: 'some content',
    title: 'A title',
    tags: ['invoice'],
    correspondent: 'Acme Corp',
    documentType: 'Invoice',
    createdDate: null,
    modifiedDate: null,
    ...overrides,
  };
}

function makeJob(): Job {
  return new Job('job-1', 1, WorkflowType.AUTOMATED, JobState.LLM_PROCESSING, [], ['title'], undefined, new Date(), new Date(), null);
}

describe('PromptService', () => {
  describe('loadPrompt', () => {
    it('returns null when the step does not need a prompt', async () => {
      const step = new StepFactory().newUpdateDocumentStep('job-1'); // needsPrompt() === false
      const repo = makeFakePromptsRepo();
      const service = new PromptService(repo, makeFieldsObtainer());

      const result = await service.loadPrompt(step);

      expect(result).toBeNull();
      expect(repo.getByStepType).not.toHaveBeenCalled();
    });

    it('fetches the prompt for the step type when a prompt is needed', async () => {
      const step = new StepFactory().newLLMGenerateTitleStep('job-1'); // needsPrompt() === true
      const prompt = new Prompt('p1', StepType.LLM_GENERATE_TITLE, 'template', 1, new Date(), new Date());
      const repo = makeFakePromptsRepo({ [StepType.LLM_GENERATE_TITLE]: prompt });
      const service = new PromptService(repo, makeFieldsObtainer());

      const result = await service.loadPrompt(step);

      expect(result).toBe(prompt);
      expect(repo.getByStepType).toHaveBeenCalledWith(StepType.LLM_GENERATE_TITLE);
    });
  });

  describe('renderPrompt', () => {
    it('substitutes document and available-field variables into the template', async () => {
      const prompt = new Prompt(
        'p1',
        StepType.LLM_GENERATE_TITLE,
        '{{documentTitle}}{{documentContent}}{{availableTags}}',
        1,
        new Date(),
        new Date(),
      );
      const fieldsObtainer = makeFieldsObtainer({
        tags: [{ id: 1, name: 'invoice', description: 'Invoice docs' }],
      });
      const service = new PromptService(makeFakePromptsRepo(), fieldsObtainer);
      const document = makeDocument({ title: 'My Doc', content: 'body text' });

      const rendered = await service.renderPrompt(prompt, document, makeJob());

      expect(rendered).toContain('<title>My Doc</title>');
      expect(rendered).toContain('<content>body text</content>');
      expect(rendered).toContain('<availableTag description="Invoice docs">invoice</availableTag>');
    });

    it('falls back to placeholder text for missing title/correspondent/documentType', async () => {
      const prompt = new Prompt(
        'p1',
        StepType.LLM_GENERATE_TITLE,
        '{{documentTitle}}{{documentCorrespondent}}{{documentType}}',
        1,
        new Date(),
        new Date(),
      );
      const service = new PromptService(makeFakePromptsRepo(), makeFieldsObtainer());
      const document = makeDocument({ title: null, correspondent: null, documentType: null });

      const rendered = await service.renderPrompt(prompt, document, makeJob());

      expect(rendered).toContain('(No title)');
      expect(rendered).toContain('(No correspondent)');
      expect(rendered).toContain('(No document type)');
    });
  });
});
