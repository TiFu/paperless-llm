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

  constructor() {
    const workerName = 'unified-worker';

    // Database Configuration
    this.database = {
      host: this.getEnvOrDefault('DB_HOST', 'localhost'),
      port: parseInt(this.getEnvOrDefault('DB_PORT', '5432'), 10),
      username: this.getEnvOrThrow('DB_USERNAME'),
      password: this.getEnvOrThrow('DB_PASSWORD'),
      database: this.getEnvOrDefault('DB_DATABASE', 'paperless_llm'),
    };

    // Worker Configuration
    this.worker = {
      instanceId: this.getEnvOrDefault(
        'WORKER_INSTANCE_ID',
        `${workerName}-${Date.now()}`,
      ),
      batchSize: parseInt(this.getEnvOrDefault('WORKER_BATCH_SIZE', '10'), 10),
      pollIntervalMs: parseInt(
        this.getEnvOrDefault('WORKER_POLL_INTERVAL_MS', '5000'),
        10,
      ),
      maxRetries: parseInt(this.getEnvOrDefault('WORKER_MAX_RETRIES', '5'), 10),
      claimTimeoutMs: parseInt(
        this.getEnvOrDefault('WORKER_CLAIM_TIMEOUT_MS', '300000'),
        10,
      ),
    };

    // Orchestration Configuration
    this.orchestration = {
      llmCycleDurationMs: parseInt(
        this.getEnvOrDefault('LLM_CYCLE_DURATION_MS', '30000'),
        10,
      ),
      docUpdateCycleDurationMs: parseInt(
        this.getEnvOrDefault('DOC_UPDATE_CYCLE_DURATION_MS', '30000'),
        10,
      ),
    };

    // Paperless-NG Configuration
    this.paperless = {
      url: this.getEnvOrThrow('PAPERLESS_URL'),
      token: this.getEnvOrThrow('PAPERLESS_TOKEN'),
      tags: this.getEnvOrDefault('PAPERLESS_TAGS', 'llm-process'),
    };

    // Logging Configuration
    this.logging = {
      level: this.getEnvOrDefault('LOG_LEVEL', 'info'),
      pretty: this.getEnvOrDefault('LOG_PRETTY', 'false') === 'true',
    };

    // LLM Configuration
    this.llm = {
      url: this.getEnvOrDefault('LLM_URL', 'http://localhost:11434'),
      model: this.getEnvOrDefault('LLM_MODEL', 'llama3'),
      temperature: parseFloat(this.getEnvOrDefault('LLM_TEMPERATURE', '0.7')),
      timeoutMs: parseInt(this.getEnvOrDefault('LLM_TIMEOUT_MS', '60000'), 10),
    };

    // API Configuration
    this.api = {
      port: parseInt(this.getEnvOrDefault('API_PORT', '3000'), 10),
      corsOrigins: this.getEnvOrDefault('API_CORS_ORIGINS', '*')
        .split(',')
        .map((origin) => origin.trim()),
    };

    this.validate();
    this.validateLLMConfig();
  }

  private getEnvOrThrow(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  private getEnvOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  private validate(): void {
    if (this.worker.batchSize < 1) {
      throw new Error('WORKER_BATCH_SIZE must be greater than 0');
    }
    if (this.worker.maxRetries < 0) {
      throw new Error('WORKER_MAX_RETRIES must be non-negative');
    }
    if (this.worker.pollIntervalMs < 100) {
      throw new Error('WORKER_POLL_INTERVAL_MS must be at least 100ms');
    }
    if (this.orchestration.llmCycleDurationMs < 1000) {
      throw new Error('LLM_CYCLE_DURATION_MS must be at least 1000ms');
    }
    if (this.orchestration.docUpdateCycleDurationMs < 1000) {
      throw new Error('DOC_UPDATE_CYCLE_DURATION_MS must be at least 1000ms');
    }
  }

  private validateLLMConfig(): void {
    if (this.llm.temperature < 0 || this.llm.temperature > 2) {
      throw new Error('LLM_TEMPERATURE must be between 0 and 2');
    }
  }
}

/**
 * Factory function to create the application config
 */
export function createAppConfig(): AppConfig {
  return new AppConfig();
}
