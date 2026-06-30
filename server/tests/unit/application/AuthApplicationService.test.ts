import jwt from 'jsonwebtoken';
import { AuthApplicationService } from '../../../src/application/AuthApplicationService.js';
import { AuthConfig } from '../../../src/config/AppConfig.js';
import { IPaperlessAuthService, PaperlessAuthResult } from '../../../src/domain/auth/IPaperlessAuthService.js';
import { IUsersRepository } from '../../../src/domain/auth/IUsersRepository.js';
import { Prompt } from '../../../src/domain/prompt/Prompt.js';
import { StepType } from '../../../src/domain/steps/IStep.js';
import { createFakeUoW, makeFakeUoWFactory } from '../helpers/fakeUoW.js';

const authConfig: AuthConfig = { jwtSecret: 'test-secret', jwtExpiresIn: '1h' };

function makeFakePaperlessAuth(result: PaperlessAuthResult): jest.Mocked<IPaperlessAuthService> {
  return { authenticate: jest.fn().mockResolvedValue(result) };
}

function makeFakeUsersRepo(): jest.Mocked<IUsersRepository> {
  return {
    upsert: jest.fn(),
    getPaperlessToken: jest.fn(),
    findAll: jest.fn(),
  };
}

describe('AuthApplicationService.login', () => {
  it('returns a failure result without issuing a token when Paperless authentication fails', async () => {
    const paperlessAuth = makeFakePaperlessAuth({ token: null, success: false, status: 401, message: 'Invalid credentials' });
    const usersRepo = makeFakeUsersRepo();
    const fakeUoW = createFakeUoW();
    const service = new AuthApplicationService(paperlessAuth, usersRepo, makeFakeUoWFactory(fakeUoW), authConfig);

    const result = await service.login('alice', 'wrong-password');

    expect(result).toEqual({ token: '', success: false, status: 401, message: 'Invalid credentials' });
    expect(usersRepo.upsert).not.toHaveBeenCalled();
  });

  it('stores the Paperless token and issues a signed JWT on success', async () => {
    const paperlessAuth = makeFakePaperlessAuth({ token: 'paperless-token', success: true });
    const usersRepo = makeFakeUsersRepo();
    const fakeUoW = createFakeUoW();
    fakeUoW.repos.prompts.getAllForUser.mockResolvedValue([]);
    fakeUoW.repos.prompts.getGlobalDefaults.mockResolvedValue([]);
    const service = new AuthApplicationService(paperlessAuth, usersRepo, makeFakeUoWFactory(fakeUoW), authConfig);

    const result = await service.login('alice', 'correct-password');

    expect(usersRepo.upsert).toHaveBeenCalledWith('alice', 'paperless-token');
    expect(result.success).toBe(true);
    const decoded = jwt.verify(result.token, authConfig.jwtSecret) as { username: string };
    expect(decoded.username).toBe('alice');
  });

  it('copies global default prompts for a first-time user with none of their own', async () => {
    const paperlessAuth = makeFakePaperlessAuth({ token: 'paperless-token', success: true });
    const usersRepo = makeFakeUsersRepo();
    const fakeUoW = createFakeUoW();
    const defaults = [new Prompt('p1', StepType.LLM_GENERATE_TITLE, 'tmpl', 1, new Date(), new Date())];
    fakeUoW.repos.prompts.getAllForUser.mockResolvedValue([]);
    fakeUoW.repos.prompts.getGlobalDefaults.mockResolvedValue(defaults);
    const service = new AuthApplicationService(paperlessAuth, usersRepo, makeFakeUoWFactory(fakeUoW), authConfig);

    await service.login('alice', 'correct-password');

    expect(fakeUoW.repos.prompts.copyForUser).toHaveBeenCalledWith(defaults, 'alice');
    expect(fakeUoW.save).toHaveBeenCalled();
    expect(fakeUoW.commit).toHaveBeenCalled();
  });

  it('does not copy defaults when the user already has prompts', async () => {
    const paperlessAuth = makeFakePaperlessAuth({ token: 'paperless-token', success: true });
    const usersRepo = makeFakeUsersRepo();
    const fakeUoW = createFakeUoW();
    fakeUoW.repos.prompts.getAllForUser.mockResolvedValue([
      new Prompt('p1', StepType.LLM_GENERATE_TITLE, 'tmpl', 1, new Date(), new Date()),
    ]);
    const service = new AuthApplicationService(paperlessAuth, usersRepo, makeFakeUoWFactory(fakeUoW), authConfig);

    await service.login('alice', 'correct-password');

    expect(fakeUoW.repos.prompts.copyForUser).not.toHaveBeenCalled();
  });
});
