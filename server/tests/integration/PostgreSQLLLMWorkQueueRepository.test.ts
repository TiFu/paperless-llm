import { Pool } from 'pg';
import { TestDatabase } from '../helpers/TestDatabase';
import { PostgreSQLLLMWorkQueueRepository } from '../../src/repositories/postgresql/PostgreSQLLLMWorkQueueRepository';
import { JobType } from '../../src/domain/enums/JobType';
import { WorkItemStatus } from '../../src/domain/enums/WorkItemStatus';

describe('PostgreSQLLLMWorkQueueRepository Integration Tests', () => {
  let testDb: TestDatabase;
  let pool: Pool;
  let repository: PostgreSQLLLMWorkQueueRepository;

  beforeAll(async () => {
    testDb = new TestDatabase();
    pool = await testDb.start();
    repository = new PostgreSQLLLMWorkQueueRepository(pool);
  }, 60000); // Increase timeout for container startup

  afterAll(async () => {
    await testDb.stop();
  });

  beforeEach(async () => {
    // Clear the table before each test
    await pool.query('TRUNCATE TABLE llm_work_queue CASCADE');
  });

  describe('insert', () => {
    it('should insert a new work item', async () => {
      const documentId = 'doc-123';
      const jobType = JobType.TITLE;

      const workItem = await repository.insert(documentId, jobType);

      expect(workItem.id).toBeDefined();
      expect(workItem.documentId).toBe(documentId);
      expect(workItem.jobType).toBe(jobType);
      expect(workItem.status).toBe(WorkItemStatus.PENDING);
      expect(workItem.retryCount).toBe(0);
      expect(workItem.claimedAt).toBeNull();
      expect(workItem.claimedBy).toBeNull();
    });
  });

  describe('claimBatch', () => {
    it('should claim pending work items', async () => {
      // Insert test data
      await repository.insert('doc-1', JobType.TITLE);
      await repository.insert('doc-2', JobType.TITLE);
      await repository.insert('doc-3', JobType.TAG);

      // Claim batch
      const claimed = await repository.claimBatch(2, 'worker-1', 300000);

      expect(claimed).toHaveLength(2);
      expect(claimed[0].status).toBe(WorkItemStatus.PROCESSING);
      expect(claimed[0].claimedBy).toBe('worker-1');
      expect(claimed[0].claimedAt).toBeDefined();
    });

    it('should not claim items already claimed by another worker', async () => {
      // Insert and claim with worker-1
      await repository.insert('doc-1', JobType.TITLE);
      const claimed1 = await repository.claimBatch(1, 'worker-1', 300000);
      expect(claimed1).toHaveLength(1);

      // Try to claim with worker-2
      const claimed2 = await repository.claimBatch(1, 'worker-2', 300000);
      expect(claimed2).toHaveLength(0);
    });

    it('should reclaim timed-out items', async () => {
      // Insert item
      const item = await repository.insert('doc-1', JobType.TITLE);

      // Manually set claimed_at to old timestamp (simulate timeout)
      await pool.query(
        'UPDATE llm_work_queue SET status = $1, claimed_at = NOW() - INTERVAL \'10 minutes\', claimed_by = $2 WHERE id = $3',
        [WorkItemStatus.PROCESSING, 'old-worker', item.id],
      );

      // Claim with short timeout (should reclaim)
      const claimed = await repository.claimBatch(1, 'new-worker', 60000); // 1 minute timeout
      expect(claimed).toHaveLength(1);
      expect(claimed[0].claimedBy).toBe('new-worker');
    });

    it('should respect retry_after timestamp', async () => {
      // Insert item with future retry_after
      const item = await repository.insert('doc-1', JobType.TITLE);
      await pool.query('UPDATE llm_work_queue SET retry_after = NOW() + INTERVAL \'1 hour\' WHERE id = $1', [
        item.id,
      ]);

      // Try to claim - should not get the item
      const claimed = await repository.claimBatch(1, 'worker-1', 300000);
      expect(claimed).toHaveLength(0);
    });
  });

  describe('markCompleted', () => {
    it('should mark work item as completed', async () => {
      const item = await repository.insert('doc-1', JobType.TITLE);

      await repository.markCompleted(item.id);

      const result = await pool.query('SELECT status FROM llm_work_queue WHERE id = $1', [item.id]);
      expect(result.rows[0].status).toBe(WorkItemStatus.COMPLETED);
    });
  });

  describe('markFailed', () => {
    it('should mark work item as failed with retry', async () => {
      const item = await repository.insert('doc-1', JobType.TITLE);
      const retryAfter = new Date(Date.now() + 60000);

      await repository.markFailed(item.id, retryAfter);

      const result = await pool.query(
        'SELECT status, retry_count, retry_after FROM llm_work_queue WHERE id = $1',
        [item.id],
      );
      expect(result.rows[0].status).toBe(WorkItemStatus.PENDING);
      expect(result.rows[0].retry_count).toBe(1);
      expect(new Date(result.rows[0].retry_after).getTime()).toBeCloseTo(retryAfter.getTime(), -3);
    });

    it('should mark work item as failed without retry (max retries)', async () => {
      const item = await repository.insert('doc-1', JobType.TITLE);

      await repository.markFailed(item.id, null);

      const result = await pool.query('SELECT status FROM llm_work_queue WHERE id = $1', [item.id]);
      expect(result.rows[0].status).toBe(WorkItemStatus.FAILED);
    });
  });

  describe('getById', () => {
    it('should retrieve work item by id', async () => {
      const inserted = await repository.insert('doc-1', JobType.TITLE);

      const retrieved = await repository.getById(inserted.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(inserted.id);
      expect(retrieved?.documentId).toBe('doc-1');
    });

    it('should return null for non-existent id', async () => {
      const retrieved = await repository.getById('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });
});
