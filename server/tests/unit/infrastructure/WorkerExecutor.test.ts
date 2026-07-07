import pino from 'pino';
import { WorkerExecutor, WorkerRunResult } from '../../../src/infrastructure/WorkerExecutor.js';
import { createFakeUoW, makeFakeUoWFactory } from '../helpers/fakeUoW.js';

const silentLogger = pino({ level: 'silent' });

describe('WorkerExecutor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('start/stop lifecycle', () => {
    it('runs the work function immediately on start, and again after the interval', async () => {
      const fakeUoW = createFakeUoW();
      fakeUoW.repos.workerExecutions.start.mockResolvedValue('exec-1');
      const workFn = jest.fn<Promise<WorkerRunResult>, []>().mockResolvedValue({});
      const executor = new WorkerExecutor('test_worker', workFn, () => 1000, makeFakeUoWFactory(fakeUoW), silentLogger);

      executor.start();
      await jest.advanceTimersByTimeAsync(0);
      expect(workFn).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1000);
      expect(workFn).toHaveBeenCalledTimes(2);

      executor.stop();
    });

    it('does not schedule further runs after stop()', async () => {
      const fakeUoW = createFakeUoW();
      fakeUoW.repos.workerExecutions.start.mockResolvedValue('exec-1');
      const workFn = jest.fn<Promise<WorkerRunResult>, []>().mockResolvedValue({});
      const executor = new WorkerExecutor('test_worker', workFn, () => 1000, makeFakeUoWFactory(fakeUoW), silentLogger);

      executor.start();
      await jest.advanceTimersByTimeAsync(0);
      executor.stop();

      await jest.advanceTimersByTimeAsync(5000);

      expect(workFn).toHaveBeenCalledTimes(1);
      expect(executor.isRunning()).toBe(false);
    });

    it('warns and no-ops when start() is called while already running', () => {
      const fakeUoW = createFakeUoW();
      const executor = new WorkerExecutor('test_worker', jest.fn().mockResolvedValue({}), () => 1000, makeFakeUoWFactory(fakeUoW), silentLogger);

      executor.start();
      expect(executor.isRunning()).toBe(true);
      executor.start(); // should be a no-op, not throw
      expect(executor.isRunning()).toBe(true);

      executor.stop();
    });
  });

  describe('execution tracking', () => {
    it('records start then success via short-lived system UoWs, passing through items/summary', async () => {
      const fakeUoW = createFakeUoW();
      fakeUoW.repos.workerExecutions.start.mockResolvedValue('exec-1');
      const result: WorkerRunResult = { summary: { processed: 3 }, items: [{ id: 'item-1' } as never] };
      const workFn = jest.fn<Promise<WorkerRunResult>, []>().mockResolvedValue(result);
      const executor = new WorkerExecutor('test_worker', workFn, () => 1000, makeFakeUoWFactory(fakeUoW), silentLogger);

      executor.start();
      await jest.advanceTimersByTimeAsync(0);
      executor.stop();

      expect(fakeUoW.repos.workerExecutions.start).toHaveBeenCalledWith('test_worker');
      expect(fakeUoW.repos.workerExecutions.recordItems).toHaveBeenCalledWith('exec-1', result.items);
      expect(fakeUoW.repos.workerExecutions.complete).toHaveBeenCalledWith('exec-1', result.summary);
    });

    it('records failure via a short-lived UoW and keeps scheduling when workFn rejects', async () => {
      const fakeUoW = createFakeUoW();
      fakeUoW.repos.workerExecutions.start.mockResolvedValue('exec-1');
      const workFn = jest.fn<Promise<WorkerRunResult>, []>().mockRejectedValue(new Error('boom'));
      const executor = new WorkerExecutor('test_worker', workFn, () => 1000, makeFakeUoWFactory(fakeUoW), silentLogger);

      executor.start();
      await jest.advanceTimersByTimeAsync(0);

      expect(fakeUoW.repos.workerExecutions.fail).toHaveBeenCalledWith('exec-1', 'boom');

      // Still alive and scheduling further runs despite the failure
      await jest.advanceTimersByTimeAsync(1000);
      expect(workFn).toHaveBeenCalledTimes(2);

      executor.stop();
    });

    it('still runs the work (untracked) if recording the execution start itself fails', async () => {
      const fakeUoW = createFakeUoW();
      fakeUoW.repos.workerExecutions.start.mockRejectedValue(new Error('db down'));
      const workFn = jest.fn<Promise<WorkerRunResult>, []>().mockResolvedValue({});
      const executor = new WorkerExecutor('test_worker', workFn, () => 1000, makeFakeUoWFactory(fakeUoW), silentLogger);

      executor.start();
      await jest.advanceTimersByTimeAsync(0);

      expect(workFn).toHaveBeenCalledTimes(1);
      expect(fakeUoW.repos.workerExecutions.complete).not.toHaveBeenCalled();

      executor.stop();
    });
  });
});
