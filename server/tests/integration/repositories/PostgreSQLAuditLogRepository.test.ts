import crypto from 'node:crypto';
import { withRepositoryTransaction } from '../helpers/db.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';
import { AuditLogEntry } from '../../../src/domain/audit/AuditLogEntry.js';

describe('PostgreSQLAuditLogRepository (integration)', () => {
  it('create persists a single entry, readable via getByJobId', async () => {
    await withRepositoryTransaction(async (repos) => {
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
      const entry = AuditLogEntry.createJobCreated(job);

      await repos.getAuditLog().create(entry);
      const entries = await repos.getAuditLog().getByJobId(job.id);

      expect(entries).toHaveLength(1);
      expect(entries[0].jobId).toBe(job.id);
      expect(entries[0].eventType).toBe('JOB_CREATED');
      expect(entries[0].metadata).toMatchObject({ documentId: job.documentId, jobType: job.jobType });
    });
  });

  it('createAll bulk-inserts entries, ordered most-recent-first by getByJobId', async () => {
    await withRepositoryTransaction(async (repos) => {
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
      const first = AuditLogEntry.createJobCreated(job);
      const second = AuditLogEntry.createError(job.id, null, { message: 'second' });

      await repos.getAuditLog().createAll([first, second]);
      const entries = await repos.getAuditLog().getByJobId(job.id);

      expect(entries).toHaveLength(2);
      expect(entries.map(e => e.eventType)).toEqual(
        expect.arrayContaining(['JOB_CREATED', 'ERROR']),
      );
    });
  });

  it('createAll is a no-op for an empty array', async () => {
    await withRepositoryTransaction(async (repos) => {
      await expect(repos.getAuditLog().createAll([])).resolves.toBeUndefined();
    });
  });

  it('getByStepId only returns entries for that step', async () => {
    await withRepositoryTransaction(async (repos) => {
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
      const stepAId = crypto.randomUUID();
      const stepBId = crypto.randomUUID();
      const forStepA = AuditLogEntry.createError(job.id, stepAId, { message: 'a' });
      const forStepB = AuditLogEntry.createError(job.id, stepBId, { message: 'b' });
      await repos.getAuditLog().createAll([forStepA, forStepB]);

      const entries = await repos.getAuditLog().getByStepId(stepAId);

      expect(entries).toHaveLength(1);
      expect(entries[0].stepId).toBe(stepAId);
    });
  });

  it('deleteByJobId removes all entries for that job', async () => {
    await withRepositoryTransaction(async (repos) => {
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
      await repos.getAuditLog().create(AuditLogEntry.createJobCreated(job));

      await repos.getAuditLog().deleteByJobId(job.id);

      expect(await repos.getAuditLog().getByJobId(job.id)).toEqual([]);
    });
  });
});
