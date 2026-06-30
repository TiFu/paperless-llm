import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { WorkflowType } from '../domain/workflows/WorkflowType.js';
import { DocumentField } from '../domain/steps/StepFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Paperless-NG configuration
 */
export interface PaperlessConfig {
  readonly url: string;
  readonly token: string;
  readonly tags?: string;
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
 * Automated document queue configuration
 */
export interface AutoQueueConfig {
  readonly enabled: boolean;
  readonly pollIntervalMs: number;
  readonly workflowType: WorkflowType;
  readonly tag: string;
  readonly fields: DocumentField[]
}

/**
 * Raw config structure from YAML file
 */
interface RawConfig {
  database: DatabaseConfig;
  paperless: PaperlessConfig;
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
      workflowType?: string;
      tag?: string;
      fields?: DocumentField[]
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

    this.paperless = rawConfig.paperless;
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
        workflowType: this.parseWorkflowType(rawConfig.workers.autoQueue?.workflowType) ?? WorkflowType.AUTOMATED, // Default: AUTOMATED
        tag: rawConfig.workers.autoQueue?.tag ?? 'llm-auto-process', // Default: llm-auto-process
        fields: rawConfig.workers.autoQueue?.fields ?? [ 'title' ]
      },
    };

    // Redis Configuration (optional)
    this.redis = rawConfig.redis;

    this.validate();
    this.validateLLMConfig();
    this.validateAutoQueueConfig();
  }

  private loadConfig(configPath?: string): RawConfig {
    // Look for config.yaml in project root (three levels up from src/config/)
    const defaultPath = path.resolve(__dirname, '../../../config.yaml');
    const finalPath = configPath || defaultPath;

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
    if (!this.workers.autoQueue.tag || this.workers.autoQueue.tag.trim().length === 0) {
      throw new Error('workers.autoQueue.tag must be a non-empty string');
    }
  }
}

/**
 * Factory function to create the application config
 */
export function createAppConfig(configPath?: string): AppConfig {
  return new AppConfig(configPath);
}
