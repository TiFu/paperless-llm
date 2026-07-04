import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AppConfig } from '../../../src/config/AppConfig.js';
import { DOCUMENT_FIELDS } from '../../../src/domain/steps/StepFactory.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';

// Minimal set of required sections/fields AppConfig.validateRequiredFields demands,
// merged with per-test overrides via a deep-ish merge on top-level sections.
function baseConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    database: { host: 'localhost', port: 5432, username: 'u', password: 'p', database: 'db' },
    paperless: { url: 'http://paperless.example.com', token: 't' },
    llm: { url: 'http://llm.example.com', model: 'm', temperature: 0.5, timeoutMs: 1000 },
    auth: { jwtSecret: 'secret' },
    workers: {
      stepExecution: { batchSize: 5, pollIntervalMs: 1000 },
    },
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

  it('defaults an autoProcessTags entry missing fields to all DOCUMENT_FIELDS and missing workflowType to automated', () => {
    const configPath = writeConfig(tmpDir, baseConfig({
      paperless: { url: 'http://paperless.example.com', token: 't', autoProcessTags: [{ tag: 'llm-auto-process' }] },
    }));

    const config = new AppConfig(configPath);

    expect(config.paperless.autoProcessTags).toEqual([
      { tag: 'llm-auto-process', fields: [...DOCUMENT_FIELDS], workflowType: WorkflowType.AUTOMATED },
    ]);
  });

  it('honors explicit fields/workflowType overrides per tag', () => {
    const configPath = writeConfig(tmpDir, baseConfig({
      paperless: {
        url: 'http://paperless.example.com',
        token: 't',
        autoProcessTags: [{ tag: 'llm-invoice', fields: ['title', 'tags'], workflowType: 'approval' }],
      },
    }));

    const config = new AppConfig(configPath);

    expect(config.paperless.autoProcessTags).toEqual([
      { tag: 'llm-invoice', fields: ['title', 'tags'], workflowType: WorkflowType.APPROVAL },
    ]);
  });

  it('defaults to an empty autoProcessTags list when omitted, with auto-queue disabled', () => {
    const configPath = writeConfig(tmpDir, baseConfig());

    const config = new AppConfig(configPath);

    expect(config.paperless.autoProcessTags).toEqual([]);
    expect(config.workers.autoQueue.enabled).toBe(false);
  });

  it('throws when autoProcessTags contains duplicate tag names', () => {
    const configPath = writeConfig(tmpDir, baseConfig({
      paperless: {
        url: 'http://paperless.example.com',
        token: 't',
        autoProcessTags: [{ tag: 'dup' }, { tag: 'dup' }],
      },
    }));

    expect(() => new AppConfig(configPath)).toThrow(/duplicate tag/);
  });

  it('throws when autoQueue is enabled but autoProcessTags is empty', () => {
    const configPath = writeConfig(tmpDir, baseConfig({
      workers: {
        stepExecution: { batchSize: 5, pollIntervalMs: 1000 },
        autoQueue: { enabled: true },
      },
    }));

    expect(() => new AppConfig(configPath)).toThrow(/autoProcessTags is empty/);
  });
});
