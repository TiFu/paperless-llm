import { UoW, UoWFactory } from '../../../src/infrastructure/UoW.js';
import { IJobRepository } from '../../../src/domain/job/IJobRepository.js';
import { IStepRepository } from '../../../src/domain/steps/IStepRepository.js';
import { IPromptsRepository } from '../../../src/domain/prompt/IPromptsRepository.js';
import { IAuditLogRepository, IAuditCollector } from '../../../src/domain/audit/IAuditLogRepository.js';
import { IWorkerExecutionRepository } from '../../../src/domain/workerExecution/IWorkerExecutionRepository.js';
import { IPermissionsRepository } from '../../../src/domain/authorization/IPermissionsRepository.js';
import { IAppSettingsRepository } from '../../../src/domain/settings/IAppSettingsRepository.js';
import { IDocumentManagementSystem } from '../../../src/domain/document/IDocumentManagementSystem.js';
import { IPromptDomainService } from '../../../src/domain/prompt/IPromptDomainService.js';
import { StepExecutorDomainService } from '../../../src/domain/services/StepExecutorDomainService.js';
import { WorkflowOrchestratorDomainService } from '../../../src/domain/services/WorkflowOrchestratorService.js';
import { UserContext } from '../../../src/domain/auth/UserContext.js';

/**
 * Builds a jest.fn()-backed fake implementing the given interface's methods
 * without requiring every call site to re-list them. Methods not in
 * `methodNames` are left undefined — only call what the test under test
 * actually invokes.
 */
function fakeOf<T extends object>(methodNames: Array<keyof T>): jest.Mocked<T> {
  const fake = {} as Record<string, jest.Mock>;
  for (const name of methodNames) {
    fake[name as string] = jest.fn();
  }
  return fake as unknown as jest.Mocked<T>;
}

export function makeFakeJobRepo(): jest.Mocked<IJobRepository> {
  return fakeOf<IJobRepository>([
    'create',
    'createBulk',
    'getById',
    'update',
    'updateState',
    'listForUser',
    'getByDocumentId',
    'getJobCountsByState',
    'filterInProgressDocuments',
    'getActiveJobsByDocumentIds',
  ]);
}

export function makeFakeStepRepo(): jest.Mocked<IStepRepository> {
  return fakeOf<IStepRepository>([
    'create',
    'createAll',
    'getPendingExecutableSteps',
    'getPendingManualSteps',
    'getById',
    'getByJobId',
    'update',
    'updateAll',
    'getAutomatedStepStatistics',
    'countPendingUserInteractionSteps',
    'listAutomatedStepsWithJob',
    'getStuckInProgressExecutableSteps',
    'getPendingRetries',
    'getStepsByJob',
  ]);
}

export function makeFakePromptsRepo(): jest.Mocked<IPromptsRepository> {
  return fakeOf<IPromptsRepository>([
    'getByStepType',
    'getAll',
    'upsert',
    'getAllForUser',
    'getGlobalDefaults',
    'copyForUser',
  ]);
}

export function makeFakeAuditLogRepo(): jest.Mocked<IAuditLogRepository> {
  return fakeOf<IAuditLogRepository>(['create', 'createAll', 'getByJobId', 'getByStepId', 'getByStepIds', 'deleteByJobId']);
}

export function makeFakePermissionsRepo(): jest.Mocked<IPermissionsRepository> {
  return fakeOf<IPermissionsRepository>([
    'grant',
    'revoke',
    'hasPermission',
    'getOwner',
    'listObjectIdsForUser',
    'setEntityVisibility',
    'canSeeEntity',
    'getVisibleEntityIds',
  ]);
}

export function makeFakeSettingsRepo(): jest.Mocked<IAppSettingsRepository> {
  return fakeOf<IAppSettingsRepository>(['get', 'update']);
}

export function makeFakeWorkerExecutionRepo(): jest.Mocked<IWorkerExecutionRepository> {
  return fakeOf<IWorkerExecutionRepository>([
    'start',
    'complete',
    'fail',
    'recordItems',
    'listExecutions',
    'getExecutionById',
    'listItemsForExecution',
  ]);
}

export function makeFakeDMS(): jest.Mocked<IDocumentManagementSystem> {
  return fakeOf<IDocumentManagementSystem>([
    'getDocument',
    'getDocumentsByIds',
    'getDocumentsByTag',
    'updateDocument',
    'getTags',
    'getCorrespondents',
    'getDocumentTypes',
    'getAvailableFields',
    'resolveTagId',
    'resolveCorrespondentId',
    'resolveDocumentTypeId',
    'removeTagsFromDocument',
    'removeProcessingTag',
    'healthCheck',
  ]);
}

export function makeFakePromptDomainService(): jest.Mocked<IPromptDomainService> {
  return fakeOf<IPromptDomainService>(['renderPrompt', 'loadPrompt']);
}

export function makeFakeAuditCollector(): jest.Mocked<IAuditCollector> {
  const fake = fakeOf<IAuditCollector>(['record', 'recordAll', 'getEvents', 'clear']);
  fake.getEvents.mockReturnValue([]);
  return fake;
}

export interface FakeUoWRepos {
  jobs: jest.Mocked<IJobRepository>;
  steps: jest.Mocked<IStepRepository>;
  prompts: jest.Mocked<IPromptsRepository>;
  auditLog: jest.Mocked<IAuditLogRepository>;
  permissions: jest.Mocked<IPermissionsRepository>;
  workerExecutions: jest.Mocked<IWorkerExecutionRepository>;
  dms: jest.Mocked<IDocumentManagementSystem>;
  promptDomainService: jest.Mocked<IPromptDomainService>;
  auditCollector: jest.Mocked<IAuditCollector>;
  settings: jest.Mocked<IAppSettingsRepository>;
}

export interface FakeUoW extends UoW {
  repos: FakeUoWRepos;
}

/**
 * Builds a UoW-shaped fake with jest.fn() repos/services for every method an
 * application service might call. Tests grab `fakeUoW.repos.jobs.getById`
 * etc. to set return values / assert calls — no DI container needed since
 * UoW is just an interface.
 */
export function createFakeUoW(user?: UserContext): FakeUoW {
  const repos: FakeUoWRepos = {
    jobs: makeFakeJobRepo(),
    steps: makeFakeStepRepo(),
    prompts: makeFakePromptsRepo(),
    auditLog: makeFakeAuditLogRepo(),
    permissions: makeFakePermissionsRepo(),
    workerExecutions: makeFakeWorkerExecutionRepo(),
    dms: makeFakeDMS(),
    promptDomainService: makeFakePromptDomainService(),
    auditCollector: makeFakeAuditCollector(),
    settings: makeFakeSettingsRepo(),
  };

  const fakeUoW: FakeUoW = {
    repos,
    start: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    save: jest.fn(),
    dispose: jest.fn(),
    [Symbol.asyncDispose]: jest.fn(),
    getAuditCollector: jest.fn(() => repos.auditCollector),
    getUser: jest.fn(() => user),
    getDMS: jest.fn().mockResolvedValue(repos.dms),
    getPermissions: jest.fn(() => repos.permissions),
    register: jest.fn(),
    registerAll: jest.fn(),
    getPrompts: jest.fn(() => repos.prompts),
    getJobs: jest.fn(() => repos.jobs),
    getSteps: jest.fn(() => repos.steps),
    getAuditLog: jest.fn(() => repos.auditLog),
    getWorkerExecutions: jest.fn(() => repos.workerExecutions),
    getSettings: jest.fn(() => repos.settings),
    getPromptDomainService: jest.fn(() => repos.promptDomainService),
    getStepExecutorDomainService: jest.fn(() => new StepExecutorDomainService(repos.auditCollector)),
    // Mirrors UoWImplementation: a real domain service built from the fake
    // repos/collector, not a mock — application-service tests exercise real
    // job/step state transitions this way. Override
    // fakeUoW.getWorkflowOrchestratorDomainService in a specific test if you
    // need to assert "was called with X" instead.
    getWorkflowOrchestratorDomainService: jest.fn(
      () => new WorkflowOrchestratorDomainService(repos.jobs, repos.steps, repos.auditCollector),
    ),
  };

  return fakeUoW;
}

/**
 * Fake UoWFactory whose createUoW()/createSystemUoW() resolve to (by
 * default) a fresh createFakeUoW() each call, or to `sharedUoW` when
 * provided — pass a shared instance when a test needs to inspect the same
 * fake across multiple createUoW() calls within one service method.
 */
export function makeFakeUoWFactory(sharedUoW?: FakeUoW): jest.Mocked<UoWFactory> {
  return {
    createUoW: jest.fn((user: UserContext) => Promise.resolve(sharedUoW ?? createFakeUoW(user))),
    createSystemUoW: jest.fn(() => Promise.resolve(sharedUoW ?? createFakeUoW())),
  } as unknown as jest.Mocked<UoWFactory>;
}
