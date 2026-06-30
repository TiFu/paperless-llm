import { withRepositoryTransaction } from '../helpers/db.js';
import { StepType } from '../../../src/domain/steps/IStep.js';

// Migration 002/017 seed 5 global default prompts (one per LLM_GENERATE_*
// step type) that persist for the lifetime of the test database — only
// per-test transactions roll back, not migration-time seed data. Tests use
// StepType.UPDATE_DOCUMENT (no seeded prompt) where a clean slate matters,
// and otherwise assert relative to whatever getGlobalDefaults() returns
// rather than assuming an exact starting count.
describe('PostgreSQLPromptsRepository (integration)', () => {
  it('upsert creates a global prompt, then updates it (bumping version) on conflict', async () => {
    await withRepositoryTransaction(async (repos) => {
      const created = await repos.getPrompts().upsert(StepType.UPDATE_DOCUMENT, 'template v1');
      expect(created.version).toBe(1);

      const updated = await repos.getPrompts().upsert(StepType.UPDATE_DOCUMENT, 'template v2');

      expect(updated.id).toBe(created.id);
      expect(updated.template).toBe('template v2');
      expect(updated.version).toBe(2);
    });
  });

  it('getByStepType falls back to the global default when the user has no override', async () => {
    // upsert() always writes under the UoW's current user (null -> global
    // row, set -> per-user row), so the global default must be written via
    // the system (no-user) registry, not the alice-scoped `repos`.
    await withRepositoryTransaction(async (repos, _user, reposFor) => {
      await reposFor().getPrompts().upsert(StepType.UPDATE_DOCUMENT, 'global template');

      const prompt = await repos.getPrompts().getByStepType(StepType.UPDATE_DOCUMENT);

      expect(prompt?.template).toBe('global template');
    }, { username: 'alice' });
  });

  it('getByStepType prefers a user-specific prompt over the global default', async () => {
    await withRepositoryTransaction(async (repos, user, reposFor) => {
      await reposFor().getPrompts().upsert(StepType.UPDATE_DOCUMENT, 'global template');
      await repos.getUsers().upsert(user!.username, 'token'); // prompts.username FKs to users
      await repos.getPrompts().upsert(StepType.UPDATE_DOCUMENT, 'alice template');

      const prompt = await repos.getPrompts().getByStepType(StepType.UPDATE_DOCUMENT);

      expect(prompt?.template).toBe('alice template');
    }, { username: 'alice' });
  });

  describe('copyForUser / getGlobalDefaults / getAllForUser', () => {
    it('copies every global default prompt into the user namespace exactly once', async () => {
      await withRepositoryTransaction(async (repos) => {
        await repos.getUsers().upsert('alice', 'token'); // prompts.username FKs to users
        await repos.getPrompts().upsert(StepType.UPDATE_DOCUMENT, 'update-document template');

        const defaults = await repos.getPrompts().getGlobalDefaults();
        expect(defaults.map(p => p.stepType)).toContain(StepType.UPDATE_DOCUMENT);

        await repos.getPrompts().copyForUser(defaults, 'alice');
        const userPrompts = await repos.getPrompts().getAllForUser('alice');

        expect(userPrompts).toHaveLength(defaults.length);
        expect(userPrompts.find(p => p.stepType === StepType.UPDATE_DOCUMENT)?.template).toBe(
          'update-document template',
        );

        // Calling copyForUser again must not duplicate (ON CONFLICT DO NOTHING)
        await repos.getPrompts().copyForUser(defaults, 'alice');
        expect(await repos.getPrompts().getAllForUser('alice')).toHaveLength(defaults.length);
      });
    });
  });
});
