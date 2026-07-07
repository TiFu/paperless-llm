import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AppConfig } from '../../../src/config/AppConfig.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';

// Minimal set of required sections/fields AppConfig.validateRequiredFields
// demands (technical config only — non-technical settings live in the
// database, see SettingsDomainService.test.ts), merged with per-test
// overrides via a shallow merge on top-level sections.
function baseConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    database: { host: 'localhost', port: 5432, username: 'u', password: 'p', database: 'db' },
    paperless: { url: 'http://paperless.example.com', token: 't' },
    llm: { url: 'http://llm.example.com' },
    auth: { jwtSecret: 'secret' },
    logging: { level: 'info', pretty: false },
    api: { port: 3000, corsOrigins: ['*'] },
    redis: { host: 'localhost', port: 6379, username: '', password: '', db: 0, ttlInSeconds: 300 },
    ...overrides,
  };
}

function writeConfig(tmpDir: string, config: Record<string, unknown>): string {
  const filePath = path.join(tmpDir, 'config.yaml');
  fs.writeFileSync(filePath, yaml.dump(config));
  return filePath;
}

describe('AppConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'appconfig-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads a valid technical config', () => {
    const configPath = writeConfig(tmpDir, baseConfig());
    const config = new AppConfig(configPath);

    expect(config.database.host).toBe('localhost');
    expect(config.paperless).toEqual({ url: 'http://paperless.example.com', token: 't' });
    expect(config.llm).toEqual({ url: 'http://llm.example.com' });
    expect(config.auth.jwtExpiresIn).toBe('8h'); // default
  });

  it('auto-generates workers.instanceId when omitted', () => {
    const configPath = writeConfig(tmpDir, baseConfig());
    const config = new AppConfig(configPath);

    expect(config.workers.instanceId).toMatch(/^unified-worker-\d+$/);
  });

  it('honors an explicit workers.instanceId', () => {
    const configPath = writeConfig(tmpDir, baseConfig({ workers: { instanceId: 'worker-a' } }));
    const config = new AppConfig(configPath);

    expect(config.workers.instanceId).toBe('worker-a');
  });

  it('throws when a required section is missing', () => {
    const { auth: _omit, ...rest } = baseConfig();
    const configPath = writeConfig(tmpDir, rest);

    expect(() => new AppConfig(configPath)).toThrow(/Missing required configuration section: auth/);
  });

  it('throws when database credentials are missing', () => {
    const configPath = writeConfig(tmpDir, baseConfig({
      database: { host: 'localhost', port: 5432, username: '', password: '', database: 'db' },
    }));

    expect(() => new AppConfig(configPath)).toThrow(/Missing required database credentials/);
  });

  it('throws when auth.jwtSecret is missing', () => {
    const configPath = writeConfig(tmpDir, baseConfig({ auth: {} }));

    expect(() => new AppConfig(configPath)).toThrow(/Missing required auth.jwtSecret/);
  });

  it('non-technical getters return literal defaults before start() has run', () => {
    const configPath = writeConfig(tmpDir, baseConfig());
    const config = new AppConfig(configPath);

    expect(config.getModel()).toBe('qwen3:4b');
    expect(config.getTemperature()).toBe(0.7);
    expect(config.getAutoProcessTags()).toEqual([
      { tag: 'paperless-llm-auto', fields: ['title'], workflowType: WorkflowType.APPROVAL },
    ]);
    expect(config.getStepExecution()).toEqual({ enabled: true, batchSize: 5, pollIntervalMs: 30000 });
    expect(config.getStuckStepReset()).toEqual({ enabled: true, timeoutMs: 300000, checkIntervalMs: 30000 });
    expect(config.getEntitySync()).toEqual({ enabled: true, pollIntervalMs: 900000 });
    expect(config.getAutoQueue()).toEqual({ enabled: false, pollIntervalMs: 60000 });
  });
});
