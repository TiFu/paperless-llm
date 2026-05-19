import { AuditLogEntry } from "../domain/audit/AuditLogEntry.js";
import { IAuditCollector, IAuditLogRepository } from "../domain/audit/IAuditLogRepository.js";
import { IDocumentManagementSystem } from "../domain/document/IDocumentManagementSystem.js";
import { IJobRepository } from "../domain/job/IJobRepository.js";
import { ILLMService } from "../domain/llm/ILLMService.js";
import { IPromptDomainService } from "../domain/prompt/IPromptDomainService.js";
import { IPromptsRepository } from "../domain/prompt/IPromptsRepository.js";
import { PromptService } from "../domain/prompt/PromptDomainService.js";
import { StepExecutorDomainService } from "../domain/services/StepExecutorDomainService.js";
import { WorkflowOrchestratorDomainService } from "../domain/services/WorkflowOrchestratorService.js";
import { IStepRepository } from "../domain/steps/IStepRepository.js";
import { DatabaseTransactionContext, DatabaseTransactionContextFactory, DBContextWithRepositoryFactory, RepositoryRegistry, RepositoryRegistryFactory } from "./TransactionManager.js";

class AuditCollector implements IAuditCollector{
    private events: AuditLogEntry[];

    constructor() {
        this.events = []
    }

    getEvents(): AuditLogEntry[] {
        return this.events
    }
    record(entry: AuditLogEntry): void {
        this.events.push(entry)
    }

    recordAll(entry: AuditLogEntry[]): void {
        this.events.push(...entry)
    }

    clear(): void {
        this.events = []
    }
}

export interface UoW {

  start(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  save(): Promise<void>;
  dispose(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>

  getAuditCollector(): IAuditCollector;

  register<T>(object: T, repo: Saveable<T>): void;
  registerAll<T>(object: T[], repo: Saveable<T>): void;

  getPrompts(): IPromptsRepository;
  getJobs(): IJobRepository;
  getSteps(): IStepRepository;
  getAuditLog(): IAuditLogRepository;

  getPromptDomainService(): IPromptDomainService
  getStepExecutorDomainService(): StepExecutorDomainService
  getWorkflowOrchestratorDomainService(): WorkflowOrchestratorDomainService
  
}

export interface Saveable<T> {
    save(object: T): Promise<void>;
    saveAll(objects: T[]): Promise<void>;
}

interface UoWRegistryEntry<T> {
    objects: T[]
    repository: Saveable<T>
}

export class UoWFactory {
    constructor(private readonly txManager: DatabaseTransactionContextFactory) {

    }

    public async createUoW(): Promise<UoW> {
        const context = await this.txManager.createContext()
        return new UoWImplementation(context)
    }
}

export class UoWImplementation implements UoW {
    private objectRegistry: Set<UoWRegistryEntry<any>>;
    private promptDomainService: IPromptDomainService | null;
    private repositoryRegistry: RepositoryRegistry
    private context: DatabaseTransactionContext
    private auditCollector: IAuditCollector;

    getAuditCollector(): IAuditCollector {
        return this.auditCollector
    }
    constructor(context: DBContextWithRepositoryFactory) {
        this.objectRegistry = new Set<UoWRegistryEntry<any>>();
        this.context = context.ctx
        this.repositoryRegistry = context.repositoryFactory.create(this)
        this.promptDomainService = null
        this.auditCollector = new AuditCollector();
    }
    getStepExecutorDomainService(): StepExecutorDomainService {
        return new StepExecutorDomainService(this.auditCollector)
    }
    getWorkflowOrchestratorDomainService(): WorkflowOrchestratorDomainService {
        return new WorkflowOrchestratorDomainService(this.getJobs(), this.getSteps(), this.auditCollector)
    }

    getPromptDomainService(): IPromptDomainService {
        if (!this.promptDomainService) {
            this.promptDomainService = new PromptService(this.getPrompts());
        }

        return this.promptDomainService    
    }

    getPrompts(): IPromptsRepository {
        return this.repositoryRegistry.getPrompts()
    }
    getJobs(): IJobRepository  {
        return this.repositoryRegistry.getJobs()
    }
    getSteps(): IStepRepository {
        return this.repositoryRegistry.getSteps()
    }
    getAuditLog(): IAuditLogRepository {
        return this.repositoryRegistry.getAuditLog()
    }


    register<T>(object: T, repo: Saveable<T>): void {
        this.registerAll([object], repo)
    }

    registerAll<T>(objects: T[], repo: Saveable<T>): void {
        this.objectRegistry.add({ objects: objects, repository: repo})
    }

    start(): Promise<void> {
        return this.context.start();
    }

    commit(): Promise<void> {
        return this.context.commit();
    }

    rollback(): Promise<void> {
        return this.context.rollback();
    }

    dispose(): Promise<void> {
        return this.context.dispose();
    }

    [Symbol.asyncDispose](): Promise<void> {
        return this.context.dispose();
    }

    save(): Promise<void> {
        const promises = []
        for (const entry of this.objectRegistry) {
            const promise = entry.repository.saveAll(entry.objects)
            promises.push(promise)
        }

        const events = this.auditCollector.getEvents();
        const log = this.getAuditLog().createAll(events)
        promises.push(log)

        this.objectRegistry.clear();
        this.auditCollector.clear();
        return Promise.all(promises).then((e) => {}) // Map to empty promise
    }
}