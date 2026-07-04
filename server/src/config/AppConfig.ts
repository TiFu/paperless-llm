import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { WorkflowType } from '../domain/workflows/WorkflowType.js';
import { DOCUMENT_FIELDS, DocumentField } from '../domain/steps/StepFactory.js';

/**
 * Redis configuration
 */
export interface RedisConfig {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly db: number;
  readonly ttlInSeconds: number;
  readonly reconnectBaseDelayMs?: number;
  readonly reconnectMaxDelayMs?: number;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly database: string;
}

/**
 * A single auto-processing tag configuration: documents carrying `tag` in
 * Paperless are picked up by the auto-queue and processed to generate
 * `fields`, using `workflowType`.
 */
export interface AutoProcessTagConfig {
  readonly tag: string;
  readonly fields: DocumentField[];
  readonly workflowType: WorkflowType;
}

/**
 * A single auto-processing tag configuration: documents carrying `tag` in
 * Paperless are picked up by the auto-queue and processed to generate
 * `fields`, using `workflowType`.
 */
export interface AutoProcessTagConfig {
  readonly tag: string;
  readonly fields: DocumentField[];
  readonly workflowType: WorkflowType;
}

/**
 * Paperless-NG configuration
 */
export interface PaperlessConfig {
  readonly url: string;
  readonly token: string;
  readonly tags?: string;
  readonly autoProcessTags: AutoProcessTagConfig[];
  readonly autoProcessTags: AutoProcessTagConfig[];
}

/**
 * Step-processor loop configuration
 */
export interface StepExecutionConfig {
  readonly batchSize: number;
  readonly pollIntervalMs: number;
}

/**
 * Stuck-step-reset loop configuration. Retry limits for the steps it resets
 * come from RetryConfig, not from here.
 */
export interface StuckStepResetConfig {
  readonly timeoutMs: number;
  readonly checkIntervalMs: number;
}

/**
 * Unified worker process configuration: shared identity plus one section per
 * independent polling loop started in runWorker.ts.
 */
export interface WorkersConfig {
  readonly instanceId: string;
  readonly stepExecution: StepExecutionConfig;
  readonly stuckStepReset: StuckStepResetConfig;
  readonly entitySync: EntitySyncConfig;
  readonly autoQueue: AutoQueueConfig;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  readonly level: string;
  readonly pretty: boolean;
}

/**
 * LLM configuration
 */
export interface LLMConfig {
  readonly url: string;
  readonly model: string;
  readonly temperature: number;
  readonly timeoutMs: number;
}

/**
 * API configuration
 */
export interface ApiConfig {
  readonly port: number;
  readonly corsOrigins: string[];
}

/**
 * Retry configuration for step execution
 */
export interface RetryConfig {
  readonly maxRetries: number;
  readonly retryDelayInMs: number;
  readonly retryExponent: number;
}

/**
 * Entity sync configuration
 */
export interface EntitySyncConfig {
  readonly pollIntervalMs: number;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
}

/**
 * Automated document queue configuration. Which tags trigger auto-processing
 * (and which fields/workflowType they use) is configured via
 * paperless.autoProcessTags, not here.
 * Automated document queue configuration. Which tags trigger auto-processing
 * (and which fields/workflowType they use) is configured via
 * paperless.autoProcessTags, not here.
 */
export interface AutoQueueConfig {
  readonly enabled: boolean;
  readonly pollIntervalMs: number;
}

/**
 * Raw config structure from YAML file
 */
interface RawConfig {
  database: DatabaseConfig;
  paperless: Omit<PaperlessConfig, 'autoProcessTags'> & {
    autoProcessTags?: Array<{ tag: string; fields?: DocumentField[]; workflowType?: string }>;
  };
  paperless: Omit<PaperlessConfig, 'autoProcessTags'> & {
    autoProcessTags?: Array<{ tag: string; fields?: DocumentField[]; workflowType?: string }>;
  };
  llm: LLMConfig;
  auth: {
    jwtSecret: string;
    jwtExpiresIn?: string;
  };
  workers: {
    instanceId?: string | null;
    stepExecution: {
      batchSize: number;
      pollIntervalMs: number;
    };
    stuckStepReset?: {
      timeoutMs?: number;
      checkIntervalMs?: number;
    };
    entitySync?: {
      pollIntervalMs?: number;
    };
    autoQueue?: {
      enabled?: boolean;
      pollIntervalMs?: number;
    };
  };
  logging: LoggingConfig;
  api: {
    port: number;
    corsOrigins: string[];
  };
  retry?: {
    maxRetries?: number;
    retryDelayInMs?: number;
    retryExponent?: number;
  };
  redis: RedisConfig;
}

/**
 * Application configuration
 */
export class AppConfig {
  public readonly redis: RedisConfig;
  public readonly database: DatabaseConfig;
  public readonly workers: WorkersConfig;
  public readonly paperless: PaperlessConfig;
  public readonly logging: LoggingConfig;
  public readonly llm: LLMConfig;
  public readonly api: ApiConfig;
  public readonly auth: AuthConfig;
  public readonly retry: RetryConfig;

  constructor(configPath?: string) {
    const rawConfig = this.loadConfig(configPath);

    // Database Configuration
    this.database = rawConfig.database;

    const autoProcessTags: AutoProcessTagConfig[] = (rawConfig.paperless.autoProcessTags ?? []).map(t => ({
      tag: t.tag,
      fields: t.fields ?? [...DOCUMENT_FIELDS],
      workflowType: this.parseWorkflowType(t.workflowType) ?? WorkflowType.AUTOMATED,
    }));
    const autoProcessTags: AutoProcessTagConfig[] = (rawConfig.paperless.autoProcessTags ?? []).map(t => ({
      tag: t.tag,
      fields: t.fields ?? [...DOCUMENT_FIELDS],
      workflowType: this.parseWorkflowType(t.workflowType) ?? WorkflowType.AUTOMATED,
    }));
    this.paperless = {
      ...rawConfig.paperless,
      autoProcessTags,
      autoProcessTags,
    };
    this.logging = rawConfig.logging;
    this.llm = rawConfig.llm;
    this.api = rawConfig.api;
    this.auth = {
      jwtSecret: rawConfig.auth.jwtSecret,
      jwtExpiresIn: rawConfig.auth.jwtExpiresIn ?? '8h',
    };

    // Retry Configuration - shared retry/backoff policy for both automated
    // step execution and stuck-step reset
    this.retry = {
      maxRetries: rawConfig.retry?.maxRetries ?? 3, // Default: 3 retries
      retryDelayInMs: rawConfig.retry?.retryDelayInMs ?? 30000, // Default: 30 seconds
      retryExponent: rawConfig.retry?.retryExponent ?? 2, // Default: exponential backoff base 2
    };

    // Workers Configuration - auto-generate instanceId if not provided
    this.workers = {
      instanceId: rawConfig.workers.instanceId || `unified-worker-${Date.now()}`,
      stepExecution: {
        batchSize: rawConfig.workers.stepExecution.batchSize,
        pollIntervalMs: rawConfig.workers.stepExecution.pollIntervalMs,
      },
      stuckStepReset: {
        timeoutMs: rawConfig.workers.stuckStepReset?.timeoutMs ?? 300000, // Default: 5 minutes
        checkIntervalMs: rawConfig.workers.stuckStepReset?.checkIntervalMs ?? 30000, // Default: 30 seconds
      },
      entitySync: {
        pollIntervalMs: rawConfig.workers.entitySync?.pollIntervalMs ?? 900000, // Default: 15 minutes
      },
      autoQueue: {
        enabled: rawConfig.workers.autoQueue?.enabled ?? false, // Default: disabled
        pollIntervalMs: rawConfig.workers.autoQueue?.pollIntervalMs ?? 60000, // Default: 60 seconds
      },
    };

    // Redis Configuration (optional)
    this.redis = {
      ...rawConfig.redis,
      reconnectBaseDelayMs: rawConfig.redis.reconnectBaseDelayMs ?? 500, // Default: 500ms initial backoff
      reconnectMaxDelayMs: rawConfig.redis.reconnectMaxDelayMs ?? 30000, // Default: cap backoff at 30s
    };

    this.validate();
    this.validateLLMConfig();
    this.validateAutoQueueConfig();
  }

  private loadConfig(configPath?: string): RawConfig {
    // Explicit constructor arg wins; then CONFIG_PATH (set by every real
    // deployment — see docker/server.Dockerfile, the Helm chart, and the
    // dev-*.sh scripts); then a cwd-relative fallback for zero-config local
    // runs from the repo root.
    const finalPath = configPath || process.env.CONFIG_PATH || path.resolve(process.cwd(), 'config.yaml');

    if (!fs.existsSync(finalPath)) {
      throw new Error(
        `Configuration file not found at: ${finalPath}\n` +
        'Please create config.yaml from config.example.yaml'
      );
    }

    try {
      const fileContents = fs.readFileSync(finalPath, 'utf8');
      const config = yaml.load(fileContents) as RawConfig;
      
      if (!config) {
        throw new Error('Empty configuration file');
      }

      // Validate required fields exist
      this.validateRequiredFields(config);

      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load configuration: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  private validateRequiredFields(config: Partial<RawConfig>): void {
    const required: (keyof RawConfig)[] = [
      'database',
      'paperless',
      'llm',
      'workers',
      'logging',
      'api',
      'auth',
    ];

    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required configuration section: ${field}`);
      }
    }

    // Validate critical fields
    if (!config.database!.username || !config.database!.password) {
      throw new Error('Missing required database credentials');
    }
    if (!config.paperless!.url) {
      throw new Error('Missing required Paperless configuration');
    }
    if (!config.auth?.jwtSecret) {
      throw new Error('Missing required auth.jwtSecret configuration');
    }
  }

  private validate(): void {
    if (this.workers.stepExecution.batchSize < 1) {
      throw new Error('workers.stepExecution.batchSize must be greater than 0');
    }
    if (this.workers.stepExecution.pollIntervalMs < 100) {
      throw new Error('workers.stepExecution.pollIntervalMs must be at least 100ms');
    }
    if (this.workers.stuckStepReset.timeoutMs < 1000) {
      throw new Error('workers.stuckStepReset.timeoutMs must be at least 1000ms');
    }
    if (this.workers.stuckStepReset.checkIntervalMs < 1000) {
      throw new Error('workers.stuckStepReset.checkIntervalMs must be at least 1000ms');
    }
  }

  private validateLLMConfig(): void {
    if (this.llm.temperature < 0 || this.llm.temperature > 2) {
      throw new Error('llm.temperature must be between 0 and 2');
    }
  }

  private parseWorkflowType(value: string | undefined): WorkflowType | undefined {
    if (!value) return undefined;
    
    const normalized = value.toLowerCase();
    if (normalized === 'automated') return WorkflowType.AUTOMATED;
    if (normalized === 'approval') return WorkflowType.APPROVAL;
    
    throw new Error(`Invalid workflow type: ${value}. Must be 'automated' or 'approval'`);
  }

  private validateAutoQueueConfig(): void {
    if (this.workers.autoQueue.pollIntervalMs < 1000) {
      throw new Error('workers.autoQueue.pollIntervalMs must be at least 1000ms');
    }

    for (const { tag } of this.paperless.autoProcessTags) {
      if (!tag || tag.trim().length === 0) {
        throw new Error('paperless.autoProcessTags[].tag must be a non-empty string');
      }
    }
    const tagNames = this.paperless.autoProcessTags.map(t => t.tag);
    const duplicates = tagNames.filter((tag, index) => tagNames.indexOf(tag) !== index);
    if (duplicates.length > 0) {
      throw new Error(`paperless.autoProcessTags contains duplicate tag(s): ${[...new Set(duplicates)].join(', ')}`);
    }

    if (this.workers.autoQueue.enabled && this.paperless.autoProcessTags.length === 0) {
      throw new Error('workers.autoQueue.enabled is true but paperless.autoProcessTags is empty');

    for (const { tag } of this.paperless.autoProcessTags) {
      if (!tag || tag.trim().length === 0) {
        throw new Error('paperless.autoProcessTags[].tag must be a non-empty string');
      }
    }
    const tagNames = this.paperless.autoProcessTags.map(t => t.tag);
    const duplicates = tagNames.filter((tag, index) => tagNames.indexOf(tag) !== index);
    if (duplicates.length > 0) {
      throw new Error(`paperless.autoProcessTags contains duplicate tag(s): ${[...new Set(duplicates)].join(', ')}`);
    }

    if (this.workers.autoQueue.enabled && this.paperless.autoProcessTags.length === 0) {
      throw new Error('workers.autoQueue.enabled is true but paperless.autoProcessTags is empty');
    }
  }
}

/**
 * Factory function to create the application config
 */
export function createAppConfig(configPath?: string): AppConfig {
  return new AppConfig(configPath);
}
