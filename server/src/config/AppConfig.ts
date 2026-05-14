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
 * Worker configuration
 */
export interface WorkerConfig {
  readonly instanceId: string;
  readonly batchSize: number;
  readonly pollIntervalMs: number;
  readonly maxRetries: number;
  readonly claimTimeoutMs: number;
  readonly stuckStepTimeoutMs: number;
  readonly stuckStepCheckIntervalMs: number;
  readonly maxStepRetries: number;
}

/**
 * Orchestration configuration for unified worker
 */
export interface OrchestrationConfig {
  readonly llmCycleDurationMs: number;
  readonly docUpdateCycleDurationMs: number;
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
  worker: {
    instanceId?: string | null;
    batchSize: number;
    pollIntervalMs: number;
    maxRetries: number;
    claimTimeoutMs: number;
    stuckStepTimeoutMs?: number;
    stuckStepCheckIntervalMs?: number;
    maxStepRetries?: number;
  };
  orchestration: OrchestrationConfig;
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
  autoQueue?: {
    enabled?: boolean;
    pollIntervalMs?: number;
    workflowType?: string;
    tag?: string;
    fields?: DocumentField[]
  };
}

/**
 * Application configuration
 */
export class AppConfig {
  public readonly database: DatabaseConfig;
  public readonly worker: WorkerConfig;
  public readonly orchestration: OrchestrationConfig;
  public readonly paperless: PaperlessConfig;
  public readonly logging: LoggingConfig;
  public readonly llm: LLMConfig;
  public readonly api: ApiConfig;
  public readonly retry: RetryConfig;
  public readonly autoQueue: AutoQueueConfig;

  constructor(configPath?: string) {
    const rawConfig = this.loadConfig(configPath);

    // Database Configuration
    this.database = rawConfig.database;

    // Worker Configuration - auto-generate instanceId if not provided
    this.worker = {
      instanceId: rawConfig.worker.instanceId || `unified-worker-${Date.now()}`,
      batchSize: rawConfig.worker.batchSize,
      pollIntervalMs: rawConfig.worker.pollIntervalMs,
      maxRetries: rawConfig.worker.maxRetries,
      claimTimeoutMs: rawConfig.worker.claimTimeoutMs,
      stuckStepTimeoutMs: rawConfig.worker.stuckStepTimeoutMs ?? 300000, // Default: 5 minutes
      stuckStepCheckIntervalMs: rawConfig.worker.stuckStepCheckIntervalMs ?? 30000, // Default: 30 seconds
      maxStepRetries: rawConfig.worker.maxStepRetries ?? 3, // Default: 3 retries
    };

    // Copy remaining configurations
    this.orchestration = rawConfig.orchestration;
    this.paperless = rawConfig.paperless;
    this.logging = rawConfig.logging;
    this.llm = rawConfig.llm;
    this.api = rawConfig.api;

    // Retry Configuration
    this.retry = {
      maxRetries: rawConfig.retry?.maxRetries ?? 3, // Default: 3 retries
      retryDelayInMs: rawConfig.retry?.retryDelayInMs ?? 30000, // Default: 30 seconds
      retryExponent: rawConfig.retry?.retryExponent ?? 2, // Default: exponential backoff base 2
    };

    // Auto Queue Configuration
    this.autoQueue = {
      enabled: rawConfig.autoQueue?.enabled ?? false, // Default: disabled
      pollIntervalMs: rawConfig.autoQueue?.pollIntervalMs ?? 60000, // Default: 60 seconds
      workflowType: this.parseWorkflowType(rawConfig.autoQueue?.workflowType) ?? WorkflowType.AUTOMATED, // Default: AUTOMATED
      tag: rawConfig.autoQueue?.tag ?? 'llm-auto-process', // Default: llm-auto-process
      fields: rawConfig.autoQueue?.fields ?? [ 'title' ]
    };

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
        throw new Error(`Failed to load configuration: ${error.message}`);
      }
      throw error;
    }
  }

  private validateRequiredFields(config: any): void {
    const required = [
      'database',
      'paperless',
      'llm',
      'worker',
      'orchestration',
      'logging',
      'api',
    ];

    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required configuration section: ${field}`);
      }
    }

    // Validate critical fields
    if (!config.database.username || !config.database.password) {
      throw new Error('Missing required database credentials');
    }
    if (!config.paperless.url || !config.paperless.token) {
      throw new Error('Missing required Paperless configuration');
    }
  }

  private validate(): void {
    if (this.worker.batchSize < 1) {
      throw new Error('worker.batchSize must be greater than 0');
    }
    if (this.worker.maxRetries < 0) {
      throw new Error('worker.maxRetries must be non-negative');
    }
    if (this.worker.pollIntervalMs < 100) {
      throw new Error('worker.pollIntervalMs must be at least 100ms');
    }
    if (this.worker.stuckStepTimeoutMs < 1000) {
      throw new Error('worker.stuckStepTimeoutMs must be at least 1000ms');
    }
    if (this.worker.stuckStepCheckIntervalMs < 1000) {
      throw new Error('worker.stuckStepCheckIntervalMs must be at least 1000ms');
    }
    if (this.worker.maxStepRetries < 0) {
      throw new Error('worker.maxStepRetries must be non-negative');
    }
    if (this.orchestration.llmCycleDurationMs < 1000) {
      throw new Error('orchestration.llmCycleDurationMs must be at least 1000ms');
    }
    if (this.orchestration.docUpdateCycleDurationMs < 1000) {
      throw new Error('orchestration.docUpdateCycleDurationMs must be at least 1000ms');
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
    if (this.autoQueue.pollIntervalMs < 1000) {
      throw new Error('autoQueue.pollIntervalMs must be at least 1000ms');
    }
    if (!this.autoQueue.tag || this.autoQueue.tag.trim().length === 0) {
      throw new Error('autoQueue.tag must be a non-empty string');
    }
  }
}

/**
 * Factory function to create the application config
 */
export function createAppConfig(configPath?: string): AppConfig {
  return new AppConfig(configPath);
}
