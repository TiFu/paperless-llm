import { EntitySyncApplicationService } from '../../../src/application/EntitySyncApplicationService.js';
import { IUsersRepository, UserRecord } from '../../../src/domain/auth/IUsersRepository.js';
import { IEntityDescriptionsRepository } from '../../../src/domain/entityDescriptions/IEntityDescriptionsRepository.js';
import { UoWFactory } from '../../../src/infrastructure/UoW.js';
import { UserContext } from '../../../src/domain/auth/UserContext.js';
import { createFakeUoW, FakeUoW } from '../helpers/fakeUoW.js';

function makeUser(username: string): UserRecord {
  return { username, paperlessToken: 'token', lastLogin: new Date() };
}

function makeFakeUsersRepo(users: UserRecord[]): jest.Mocked<IUsersRepository> {
  return {
    upsert: jest.fn(),
    getPaperlessToken: jest.fn(),
    findAll: jest.fn().mockResolvedValue(users),
  };
}

function makeFakeEntityDescRepo(): jest.Mocked<IEntityDescriptionsRepository> {
  return {
    findAllGrouped: jest.fn(),
    findAll: jest.fn(),
    upsertMany: jest.fn(),
    deleteByTypeExcluding: jest.fn(),
    updateDescription: jest.fn(),
  };
}

/** A uowFactory whose createUoW() hands back a distinct fake keyed by username. */
function makeMultiUserUoWFactory(
  perUserUoW: Record<string, FakeUoW>,
  systemUoW: FakeUoW,
): jest.Mocked<UoWFactory> {
  return {
    createUoW: jest.fn((user: UserContext) => Promise.resolve(perUserUoW[user.username])),
    createSystemUoW: jest.fn(() => Promise.resolve(systemUoW)),
  } as unknown as jest.Mocked<UoWFactory>;
}

describe('EntitySyncApplicationService.syncAll', () => {
  it('prunes each type globally using the union of IDs seen across all successful user syncs', async () => {
    const alice = createFakeUoW();
    alice.repos.dms.getTags.mockResolvedValue([{ id: 1, name: 'tag-1' }]);
    alice.repos.dms.getCorrespondents.mockResolvedValue([]);
    alice.repos.dms.getDocumentTypes.mockResolvedValue([]);

    const bob = createFakeUoW();
    bob.repos.dms.getTags.mockResolvedValue([{ id: 2, name: 'tag-2' }]);
    bob.repos.dms.getCorrespondents.mockResolvedValue([{ id: 7, name: 'corr-7' }]);
    bob.repos.dms.getDocumentTypes.mockResolvedValue([]);

    const system = createFakeUoW();
    const entityDescRepo = makeFakeEntityDescRepo();
    const usersRepo = makeFakeUsersRepo([makeUser('alice'), makeUser('bob')]);
    const uowFactory = makeMultiUserUoWFactory({ alice, bob }, system);

    const service = new EntitySyncApplicationService(usersRepo, entityDescRepo, uowFactory);
    await service.syncAll();

    expect(entityDescRepo.deleteByTypeExcluding).toHaveBeenCalledWith('tag', expect.arrayContaining([1, 2]));
    expect(entityDescRepo.deleteByTypeExcluding.mock.calls.find(c => c[0] === 'tag')![1]).toHaveLength(2);
    expect(entityDescRepo.deleteByTypeExcluding).toHaveBeenCalledWith('correspondent', [7]);
    expect(entityDescRepo.deleteByTypeExcluding).toHaveBeenCalledWith('document_type', []);
  });

  it('still prunes using the successful users only, when one user sync fails', async () => {
    const alice = createFakeUoW();
    alice.repos.dms.getTags.mockResolvedValue([{ id: 5, name: 'tag-5' }]);
    alice.repos.dms.getCorrespondents.mockResolvedValue([]);
    alice.repos.dms.getDocumentTypes.mockResolvedValue([]);

    const bob = createFakeUoW();
    bob.repos.dms.getTags.mockRejectedValue(new Error('paperless unreachable for bob'));
    bob.repos.dms.getCorrespondents.mockResolvedValue([]);
    bob.repos.dms.getDocumentTypes.mockResolvedValue([]);

    const system = createFakeUoW();
    const entityDescRepo = makeFakeEntityDescRepo();
    const usersRepo = makeFakeUsersRepo([makeUser('alice'), makeUser('bob')]);
    const uowFactory = makeMultiUserUoWFactory({ alice, bob }, system);

    const service = new EntitySyncApplicationService(usersRepo, entityDescRepo, uowFactory);
    const result = await service.syncAll();

    expect(result.items.find(i => i.username === 'bob')?.outcome).toBe('failed');
    expect(entityDescRepo.deleteByTypeExcluding).toHaveBeenCalledWith('tag', [5]);
  });

  it('skips the global prune entirely when every user sync fails', async () => {
    const alice = createFakeUoW();
    alice.repos.dms.getTags.mockRejectedValue(new Error('boom'));

    const system = createFakeUoW();
    const entityDescRepo = makeFakeEntityDescRepo();
    const usersRepo = makeFakeUsersRepo([makeUser('alice')]);
    const uowFactory = makeMultiUserUoWFactory({ alice }, system);

    const service = new EntitySyncApplicationService(usersRepo, entityDescRepo, uowFactory);
    await service.syncAll();

    expect(entityDescRepo.deleteByTypeExcluding).not.toHaveBeenCalled();
  });
});
