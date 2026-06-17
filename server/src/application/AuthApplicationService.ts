import jwt from 'jsonwebtoken';
import { IPaperlessAuthService } from '../domain/auth/IPaperlessAuthService.js';
import { IUsersRepository } from '../domain/auth/IUsersRepository.js';
import { AuthConfig } from '../config/AppConfig.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { getLogger } from '../utils/logger.js';

export class AuthApplicationService {
  constructor(
    private readonly paperlessAuth: IPaperlessAuthService,
    private readonly usersRepo: IUsersRepository,
    private readonly uowFactory: UoWFactory,
    private readonly authConfig: AuthConfig,
  ) {}

  async login(username: string, password: string): Promise<{ token: string }> {
    const logger = getLogger();

    const paperlessToken = await this.paperlessAuth.authenticate(username, password);

    await this.usersRepo.upsert(username, paperlessToken);
    logger.info({ username }, 'User logged in, token stored');

    await this.ensureUserHasPrompts(username);

    const token = jwt.sign(
      { sub: username, username },
      this.authConfig.jwtSecret,
      { expiresIn: this.authConfig.jwtExpiresIn } as jwt.SignOptions,
    );

    return { token };
  }

  private async ensureUserHasPrompts(username: string): Promise<void> {
    await using uow = await this.uowFactory.createUoW({ username });
    await uow.start();
    const prompts = uow.getPrompts();

    const userPrompts = await prompts.getAllForUser(username);
    if (userPrompts.length === 0) {
      const defaults = await prompts.getGlobalDefaults();
      if (defaults.length > 0) {
        await prompts.copyForUser(defaults, username);
      }
    }

    await uow.save();
    await uow.commit();
  }
}
