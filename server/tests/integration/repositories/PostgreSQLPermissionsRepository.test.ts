import { withRepositoryTransaction } from '../helpers/db.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';
import { SETTINGS_RESOURCE_ID } from '../../../src/domain/authorization/IPermissionsRepository.js';

describe('PostgreSQLPermissionsRepository (integration)', () => {
  it('grants and revokes the settings permission (no job/object it belongs to — uses SETTINGS_RESOURCE_ID)', async () => {
    await withRepositoryTransaction(async (repos) => {
      await repos.getUsers().upsert('alice', 'token');

      expect(await repos.getPermissions().hasPermission('settings', SETTINGS_RESOURCE_ID, 'alice')).toBe(false);

      await repos.getPermissions().grant('settings', SETTINGS_RESOURCE_ID, 'alice');
      expect(await repos.getPermissions().hasPermission('settings', SETTINGS_RESOURCE_ID, 'alice')).toBe(true);

      await repos.getPermissions().revoke('settings', SETTINGS_RESOURCE_ID, 'alice');
      expect(await repos.getPermissions().hasPermission('settings', SETTINGS_RESOURCE_ID, 'alice')).toBe(false);
    });
  });

  it('revoke is a no-op when the grant does not exist', async () => {
    await withRepositoryTransaction(async (repos) => {
      await repos.getUsers().upsert('alice', 'token');

      await expect(
        repos.getPermissions().revoke('settings', SETTINGS_RESOURCE_ID, 'alice'),
      ).resolves.not.toThrow();
    });
  });

  it('grant + hasPermission round-trip, and is false for an ungranted user', async () => {
    await withRepositoryTransaction(async (repos) => {
      await repos.getUsers().upsert('alice', 'token');
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);

      await repos.getPermissions().grant('job', job.id, 'alice');

      expect(await repos.getPermissions().hasPermission('job', job.id, 'alice')).toBe(true);
      expect(await repos.getPermissions().hasPermission('job', job.id, 'bob')).toBe(false);
    });
  });

  it('grant is idempotent (ON CONFLICT DO NOTHING)', async () => {
    await withRepositoryTransaction(async (repos) => {
      await repos.getUsers().upsert('alice', 'token');
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);

      await repos.getPermissions().grant('job', job.id, 'alice');
      await repos.getPermissions().grant('job', job.id, 'alice'); // should not throw or duplicate

      expect(await repos.getPermissions().listObjectIdsForUser('job', 'alice')).toEqual([job.id]);
    });
  });

  it('getOwner returns the first-granted username, or null when nobody owns the object', async () => {
    await withRepositoryTransaction(async (repos) => {
      await repos.getUsers().upsert('alice', 'token');
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);

      expect(await repos.getPermissions().getOwner('job', job.id)).toBeNull();

      await repos.getPermissions().grant('job', job.id, 'alice');

      expect(await repos.getPermissions().getOwner('job', job.id)).toBe('alice');
    });
  });

  it('listObjectIdsForUser only returns objects granted to that user', async () => {
    await withRepositoryTransaction(async (repos) => {
      await repos.getUsers().upsert('alice', 'token');
      await repos.getUsers().upsert('bob', 'token');
      const aliceJob = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
      const bobJob = await repos.getJobs().create('2', WorkflowType.AUTOMATED, []);
      await repos.getPermissions().grant('job', aliceJob.id, 'alice');
      await repos.getPermissions().grant('job', bobJob.id, 'bob');

      expect(await repos.getPermissions().listObjectIdsForUser('job', 'alice')).toEqual([aliceJob.id]);
    });
  });

  describe('entity visibility', () => {
    it('setEntityVisibility + canSeeEntity / getVisibleEntityIds', async () => {
      await withRepositoryTransaction(async (repos) => {
        await repos.getUsers().upsert('alice', 'token');

        await repos.getPermissions().setEntityVisibility('alice', [
          { type: 'tag', paperlessId: 1 },
          { type: 'tag', paperlessId: 2 },
        ]);

        expect(await repos.getPermissions().canSeeEntity('alice', 'tag', 1)).toBe(true);
        expect(await repos.getPermissions().canSeeEntity('alice', 'tag', 99)).toBe(false);
        expect((await repos.getPermissions().getVisibleEntityIds('alice', 'tag')).sort()).toEqual([1, 2]);
      });
    });

    it('a second setEntityVisibility call replaces the previous visible set for that type', async () => {
      await withRepositoryTransaction(async (repos) => {
        await repos.getUsers().upsert('alice', 'token');
        await repos.getPermissions().setEntityVisibility('alice', [{ type: 'tag', paperlessId: 1 }]);

        await repos.getPermissions().setEntityVisibility('alice', [{ type: 'tag', paperlessId: 2 }]);

        expect(await repos.getPermissions().getVisibleEntityIds('alice', 'tag')).toEqual([2]);
      });
    });

    it('setEntityVisibility with an empty list clears all visibility for that user', async () => {
      await withRepositoryTransaction(async (repos) => {
        await repos.getUsers().upsert('alice', 'token');
        await repos.getPermissions().setEntityVisibility('alice', [{ type: 'tag', paperlessId: 1 }]);

        await repos.getPermissions().setEntityVisibility('alice', []);

        expect(await repos.getPermissions().getVisibleEntityIds('alice', 'tag')).toEqual([]);
      });
    });

    it('prunes a type that becomes empty on resync, even though other types still have items', async () => {
      await withRepositoryTransaction(async (repos) => {
        await repos.getUsers().upsert('alice', 'token');
        await repos.getPermissions().setEntityVisibility('alice', [
          { type: 'tag', paperlessId: 1 },
          { type: 'correspondent', paperlessId: 5 },
        ]);

        // Correspondent 5 was deleted in Paperless — the next sync fetches zero correspondents.
        await repos.getPermissions().setEntityVisibility('alice', [{ type: 'tag', paperlessId: 1 }]);

        expect(await repos.getPermissions().getVisibleEntityIds('alice', 'tag')).toEqual([1]);
        expect(await repos.getPermissions().getVisibleEntityIds('alice', 'correspondent')).toEqual([]);
      });
    });
  });
});
