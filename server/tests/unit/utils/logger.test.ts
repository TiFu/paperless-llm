import { createChildLogger, applyLogLevels } from '../../../src/utils/logger.js';
import { LogArea } from '../../../src/utils/LogArea.js';

describe('logger area-level registry', () => {
  it('applyLogLevels sets the level on every child registered for that area', () => {
    const a = createChildLogger(LogArea.WORKER, 'registry-test-worker-a');
    const b = createChildLogger(LogArea.WORKER, 'registry-test-worker-b');

    applyLogLevels({ [LogArea.WORKER]: 'debug' }, 'info');

    expect(a.level).toBe('debug');
    expect(b.level).toBe('debug');
  });

  it('falls back to the provided default for an area not present in levels', () => {
    const child = createChildLogger(LogArea.CACHE, 'registry-test-cache');

    applyLogLevels({}, 'warn');

    expect(child.level).toBe('warn');
  });

  it('a later applyLogLevels call updates instances created by an earlier one, not just new ones', () => {
    const child = createChildLogger(LogArea.AUTH, 'registry-test-auth');

    applyLogLevels({ [LogArea.AUTH]: 'error' }, 'info');
    expect(child.level).toBe('error');

    applyLogLevels({ [LogArea.AUTH]: 'debug' }, 'info');
    expect(child.level).toBe('debug');
  });

  it('an explicit area override does not leak onto a different area, which still gets the fallback', () => {
    const settingsChild = createChildLogger(LogArea.SETTINGS, 'registry-test-settings-2');
    const dbChild = createChildLogger(LogArea.DATABASE, 'registry-test-database-2');

    applyLogLevels({ [LogArea.SETTINGS]: 'warn' }, 'debug');

    expect(settingsChild.level).toBe('warn');
    expect(dbChild.level).toBe('debug');
  });
});
