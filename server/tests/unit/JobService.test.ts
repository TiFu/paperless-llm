import { JobService } from '../../src/services/JobService';
import { TransactionManager } from '../../src/infrastructure/TransactionManager';
import { IPromptsRepository } from '../../src/domain/interfaces/IPromptsRepository';
import { IDocumentManagementSystem } from '../../src/domain/interfaces/IDocumentManagementSystem';
import { OllamaService } from '../../src/services/OllamaService';
import { WorkItem } from '../../src/domain/entities/WorkItem';
import { Prompt } from '../../src/domain/entities/Prompt';
import { IDocument } from '../../src/domain/interfaces/IDocument';
import { JobType } from '../../src/domain/enums/JobType';
import { WorkItemStatus } from '../../src/domain/enums/WorkItemStatus';
import { ActionType } from '../../src/domain/enums/ActionType';

describe('JobService Unit Tests', () => {
  let jobService: JobService;
  let mockTxManager: jest.Mocked<TransactionManager>;
  let mockPromptsRepo: jest.Mocked<IPromptsRepository>;
  let mockDmsService: jest.Mocked<IDocumentManagementSystem>;
  let mockOllamaService: jest.Mocked<OllamaService>;

  beforeEach(() => {
    // Create mocks
    mockPromptsRepo = {
      getByJobType: jest.fn(),
      getAll: jest.fn(),
      upsert: jest.fn(),
    };

    mockTxManager = {
      execute: jest.fn(),
    } as any;

    mockDmsService = {
      getDocument: jest.fn(),
      getDocumentsByTag: jest.fn(),
      updateDocument: jest.fn(),
      healthCheck: jest.fn(),
    };

    mockOllamaService = {
      sendChatRequest: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    jobService = new JobService(
      mockTxManager,
      mockDmsService,
      mockOllamaService,
      3, // maxRetries
    );
  });

  describe('processJob', () => {
    it('should successfully process a title job', async () => {
      // Arrange
      const workItem = new WorkItem(
        'work-item-1',
        'doc-123',
        JobType.TITLE,
        WorkItemStatus.PROCESSING,
        0,
        null,
        new Date(),
        'worker-1',
        new Date(),
        new Date(),
      );

      const document: IDocument = {
        id: 'doc-123',
        content: 'This is a test document about artificial intelligence.',
        title: null,
        tags: [],
        metadata: {},
        createdDate: new Date(),
        modifiedDate: new Date(),
      };

      const prompt = new Prompt(
        'prompt-1',
        JobType.TITLE,
        'Generate a title for: {{documentContent}}',
        1,
        new Date(),
        new Date(),
      );

      mockDmsService.getDocument.mockResolvedValue(document);
      mockPromptsRepo.getByJobType.mockResolvedValue(prompt);
      mockOllamaService.sendChatRequest.mockResolvedValue('Artificial Intelligence Overview');

      // Mock transaction execution - will be called twice (once for prompt fetch, once for main transaction)
      mockTxManager.execute.mockImplementation(async (fn: any) => {
        // Create mock repository registry
        const mockRepos = {
          getPrompts: jest.fn().mockReturnValue(mockPromptsRepo),
          getDocumentUpdateQueue: jest.fn().mockReturnValue({
            insert: jest.fn().mockResolvedValue(undefined),
          }),
          getLLMWorkQueue: jest.fn().mockReturnValue({
            markCompleted: jest.fn().mockResolvedValue(undefined),
          }),
        };
        return fn(mockRepos);
      });

      // Act
      await jobService.processJob(workItem);

      // Assert
      expect(mockDmsService.getDocument).toHaveBeenCalledWith('doc-123');
      expect(mockPromptsRepo.getByJobType).toHaveBeenCalledWith(JobType.TITLE);
      expect(mockOllamaService.sendChatRequest).toHaveBeenCalled();
      expect(mockTxManager.execute).toHaveBeenCalled();
    });

    it('should throw error if prompt not found', async () => {
      // Arrange
      const workItem = new WorkItem(
        'work-item-1',
        'doc-123',
        JobType.TITLE,
        WorkItemStatus.PROCESSING,
        0,
        null,
        new Date(),
        'worker-1',
        new Date(),
        new Date(),
      );

      const document: IDocument = {
        id: 'doc-123',
        content: 'Test content',
        title: null,
        tags: [],
        metadata: {},
        createdDate: new Date(),
        modifiedDate: new Date(),
      };

      mockDmsService.getDocument.mockResolvedValue(document);
      mockPromptsRepo.getByJobType.mockResolvedValue(null); // No prompt found

      // Mock transaction execution for prompt fetch
      mockTxManager.execute.mockImplementation(async (fn: any) => {
        const mockRepos = {
          getPrompts: jest.fn().mockReturnValue(mockPromptsRepo),
        };
        return fn(mockRepos);
      });

      // Act & Assert
      await expect(jobService.processJob(workItem)).rejects.toThrow(
        'No prompt found for job type: title',
      );
    });

    it('should handle DMS failures', async () => {
      // Arrange
      const workItem = new WorkItem(
        'work-item-1',
        'doc-123',
        JobType.TITLE,
        WorkItemStatus.PROCESSING,
        0,
        null,
        new Date(),
        'worker-1',
        new Date(),
        new Date(),
      );

      mockDmsService.getDocument.mockRejectedValue(new Error('DMS connection failed'));

      // Act & Assert
      await expect(jobService.processJob(workItem)).rejects.toThrow('DMS connection failed');
      expect(mockTxManager.execute).not.toHaveBeenCalled(); // Transaction should not be started
    });

    it('should handle Ollama failures', async () => {
      // Arrange
      const workItem = new WorkItem(
        'work-item-1',
        'doc-123',
        JobType.TITLE,
        WorkItemStatus.PROCESSING,
        0,
        null,
        new Date(),
        'worker-1',
        new Date(),
        new Date(),
      );

      const document: IDocument = {
        id: 'doc-123',
        content: 'Test content',
        title: null,
        tags: [],
        metadata: {},
        createdDate: new Date(),
        modifiedDate: new Date(),
      };

      const prompt = new Prompt(
        'prompt-1',
        JobType.TITLE,
        'Generate a title for: {{documentContent}}',
        1,
        new Date(),
        new Date(),
      );

      mockDmsService.getDocument.mockResolvedValue(document);
      mockPromptsRepo.getByJobType.mockResolvedValue(prompt);
      mockOllamaService.sendChatRequest.mockRejectedValue(new Error('Ollama timeout'));

      // Mock transaction execution for prompt fetch
      mockTxManager.execute.mockImplementation(async (fn: any) => {
        const mockRepos = {
          getPrompts: jest.fn().mockReturnValue(mockPromptsRepo),
        };
        return fn(mockRepos);
      });

      // Act & Assert
      await expect(jobService.processJob(workItem)).rejects.toThrow('Ollama timeout');
      expect(mockTxManager.execute).toHaveBeenCalledTimes(1); // Only for prompt fetch, not for final commit
    });
  });
});
