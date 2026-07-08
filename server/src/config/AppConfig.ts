import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import pino from 'pino';
import { createChildLogger } from '../utils/logger.js';
import type { UoWFactory } from '../infrastructure/UoW.js';
import { RetryConfig } from '../domain/steps/IStep.js';
import {
  AppSettingsData,
  AutoProcessTagConfig,
  StepExecutionSettings,
  StuckStepResetSettings,
  EntitySyncSettings,
  AutoQueueSettings,
} from '../domain/settings/AppSettingsTypes.js';
import { validateAppSettings } from '../domain/settings/SettingsDomainService.js';
import { WorkflowType } from '../domain/workflows/WorkflowType.js';

export {
  AutoProcessTagConfig,
  StepExecutionSettings,
  StuckStepResetSettings,
  EntitySyncSettings,
  AutoQueueSettings,
} from '../domain/settings/AppSettingsTypes.js';

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
 * Paperless-NG technical connection info. Non-technical fields (tags,
 * autoProcessTags) are live-editable and exposed via IPaperlessConfig below.
 * No system-level API token: every real request uses the per-user token
 * captured at login (see UoWImplementation._createDMSForUser).
 */
export interface PaperlessConfig {
  readonly url: string;
}

/**
 * LLM technical connection info. Non-technical fields (model, temperature,
 * timeoutMs) are live-editable and exposed via ILLMConfig below.
 */
export interface LLMConfig {
  readonly url: string;
}

/**
 * Worker process identity. All per-loop timing lives in AppSettingsData /
 * IWorkersConfig below — this is just the boot-time process label.
 */
export interface WorkersConfig {
  readonly instanceId: string;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  readonly level: string;
  readonly pretty: boolean;
}

/**
 * API configuration
 */
export interface ApiConfig {
  readonly port: number;
  readonly corsOrigins: string[];
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
}

/**
 * Narrow interfaces implemented by AppConfig, one per consumer concern, so
 * each dependency only knows the slice it needs rather than the whole class.
 * The non-technical fields are exposed as getter *methods* rather than
 * `readonly` properties precisely because they must reflect AppConfig's
 * latest poll of the app_settings table rather than being frozen at
 * construction/read time.
 */
export interface ILLMConfig {
  readonly llm: LLMConfig;
  getModel(): string;
  getTemperature(): number;
  getTimeoutMs(): number;
}

export interface IWorkersConfig {
  readonly workers: WorkersConfig;
  getStepExecution(): StepExecutionSettings;
  getStuckStepReset(): StuckStepResetSettings;
  getEntitySync(): EntitySyncSettings;
  getAutoQueue(): AutoQueueSettings;
}

export interface IPaperlessConfig {
  readonly paperless: PaperlessConfig;
  getTags(): string | undefined;
  getAutoProcessTags(): AutoProcessTagConfig[];
}

export interface IRetryConfig {
  getRetry(): RetryConfig;
}

/**
 * Raw config structure from YAML file — technical settings only. Everything
 * non-technical lives in Postgres (see AppSettingsData) and is loaded/kept
 * fresh by start()/refreshNow(), not by this file.
 */
interface RawConfig {
  database: DatabaseConfig;
  paperless: {
    url: string;
  };
  llm: {
    url: string;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn?: string;
  };
  workers?: {
    instanceId?: string | null;
  };
  logging: LoggingConfig;
  api: {
    port: number;
    corsOrigins: string[];
  };
  redis: RedisConfig;
}

// Literal defaults mirroring migration 022_app_settings.sql's seed row —
// used until the first successful DB read (start()) completes, so a process
// never has to special-case "settings haven't loaded yet".
const DEFAULT_LIVE_SETTINGS: AppSettingsData = {
  paperlessTags: 'paperless-llm',
  paperlessAutoProcessTags: [{ tag: 'paperless-llm-auto', fields: ['title'], workflowType: WorkflowType.APPROVAL }],
  stepExecution: { enabled: true, batchSize: 5, pollIntervalMs: 30000 },
  stuckStepReset: { enabled: true, timeoutMs: 300000, checkIntervalMs: 30000 },
  entitySync: { enabled: true, pollIntervalMs: 900000 },
  autoQueue: { enabled: false, pollIntervalMs: 60000 },
  retry: { maxRetries: 3, retryDelayInMs: 30000, retryExponent: 2 },
  llmModel: 'qwen3:4b',
  llmTemperature: 0.7,
  llmTimeoutMs: 30000,
};

const LIVE_SETTINGS_POLL_INTERVAL_MS = 5000;

/**
 * Application configuration. Loads technical settings synchronously from
 * config.yaml at construction (unchanged usage for callers like
 * migrate-config.ts, which run before migrations exist and only ever touch
 * .database). Once start(uowFactory) is called — after migrations have run —
 * it also loads non-technical settings from Postgres and keeps them fresh via
 * a periodic poll, exposed through the narrow I*Config interfaces above.
 */
export class AppConfig implements ILLMConfig, IWorkersConfig, IPaperlessConfig, IRetryConfig {
  public readonly redis: RedisConfig;
  public readonly database: DatabaseConfig;
  public readonly workers: WorkersConfig;
  public readonly paperless: PaperlessConfig;
  public readonly logging: LoggingConfig;
  public readonly llm: LLMConfig;
  public readonly api: ApiConfig;
  public readonly auth: AuthConfig;

  // Created lazily in start(), not in the constructor: initializeLogger()
  // (which createChildLogger() depends on) is only called by bootstrap.ts
  // *after* createAppConfig() returns, so building this eagerly here would
  // throw "Logger not initialized" before that happens.
  private logger!: pino.Logger;
  private live: AppSettingsData = DEFAULT_LIVE_SETTINGS;
  private uowFactory: UoWFactory | null = null;
  private running = false;
  private timeoutHandle: NodeJS.Timeout | null = null;

  constructor(configPath?: string) {
    const rawConfig = this.loadConfig(configPath);

    this.database = rawConfig.database;
    this.paperless = { url: rawConfig.paperless.url };
    this.llm = { url: rawConfig.llm.url };
    this.logging = rawConfig.logging;
    this.api = rawConfig.api;
    this.auth = {
      jwtSecret: rawConfig.auth.jwtSecret,
      jwtExpiresIn: rawConfig.auth.jwtExpiresIn ?? '8h',
    };
    this.workers = {
      instanceId: rawConfig.workers?.instanceId || `unified-worker-${Date.now()}`,
    };
    this.redis = {
      ...rawConfig.redis,
      reconnectBaseDelayMs: rawConfig.redis.reconnectBaseDelayMs ?? 500, // Default: 500ms initial backoff
      reconnectMaxDelayMs: rawConfig.redis.reconnectMaxDelayMs ?? 30000, // Default: cap backoff at 30s
    };
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

  /**
   * Loads non-technical settings from Postgres and starts a periodic
   * re-read (~5s) that keeps this instance's getters current for the rest
   * of the process's lifetime. Call once, after migrations have run, from
   * bootstrap.ts. Never throws — a failed or invalid read just keeps the
   * last-known-good snapshot (starts out as DEFAULT_LIVE_SETTINGS), same
   * "soft dependency" philosophy as the Redis cache.
   */
  public async start(uowFactory: UoWFactory): Promise<void> {
    // Deferred from the constructor — see the `logger` field comment.
    this.logger ??= createChildLogger({ name: 'AppConfig' });

    if (this.running) {
      this.logger.warn('AppConfig live-settings loop already running');
      return;
    }
    this.uowFactory = uowFactory;
    this.running = true;
    await this.refreshOnce();
    this.scheduleNext();
  }

  public stop(): void {
    this.running = false;
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  /**
   * Forces an immediate re-read, bypassing the poll interval. Called by
   * SettingsApplicationService right after a successful write so this
   * process reflects its own change without waiting for the next tick.
   */
  public async refreshNow(): Promise<void> {
    await this.refreshOnce();
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timeoutHandle = setTimeout(() => {
      void this.refreshOnce().finally(() => this.scheduleNext());
    }, LIVE_SETTINGS_POLL_INTERVAL_MS);
  }

  private async refreshOnce(): Promise<void> {
    if (!this.uowFactory) return;
    try {
      await using uow = await this.uowFactory.createSystemUoW();
      await uow.start();
      const row = await uow.getSettings().get();
      await uow.commit();

      const errors = validateAppSettings(row);
      if (errors.length > 0) {
        this.logger.error({ errors }, 'app_settings row failed validation, keeping last-known-good settings');
        return;
      }
      this.live = row;
    } catch (error) {
      this.logger.error({ error }, 'Failed to refresh live settings, keeping last-known-good');
    }
  }

  // ---- ILLMConfig ----
  getModel(): string {
    return this.live.llmModel;
  }
  getTemperature(): number {
    return this.live.llmTemperature;
  }
  getTimeoutMs(): number {
    return this.live.llmTimeoutMs;
  }

  // ---- IWorkersConfig ----
  getStepExecution(): StepExecutionSettings {
    return this.live.stepExecution;
  }
  getStuckStepReset(): StuckStepResetSettings {
    return this.live.stuckStepReset;
  }
  getEntitySync(): EntitySyncSettings {
    return this.live.entitySync;
  }
  getAutoQueue(): AutoQueueSettings {
    return this.live.autoQueue;
  }

  // ---- IPaperlessConfig ----
  getTags(): string | undefined {
    return this.live.paperlessTags;
  }
  getAutoProcessTags(): AutoProcessTagConfig[] {
    return this.live.paperlessAutoProcessTags;
  }

  // ---- IRetryConfig ----
  getRetry(): RetryConfig {
    return this.live.retry;
  }
}

/**
 * Factory function to create the application config
 */
export function createAppConfig(configPath?: string): AppConfig {
  return new AppConfig(configPath);
}
