import jwt from 'jsonwebtoken';
import { IPaperlessAuthService } from '../domain/auth/IPaperlessAuthService.js';
import { IUsersRepository } from '../domain/auth/IUsersRepository.js';
import { AuthConfig } from '../config/AppConfig.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { getLogger } from '../utils/logger.js';
import { SETTINGS_RESOURCE_ID } from '../domain/authorization/IPermissionsRepository.js';

export class AuthApplicationService {
  constructor(
    private readonly paperlessAuth: IPaperlessAuthService,
    private readonly usersRepo: IUsersRepository,
    private readonly uowFactory: UoWFactory,
    private readonly authConfig: AuthConfig,
  ) {}

  async login(username: string, password: string): Promise<{ token: string, success: boolean, status?: number, message?: string }> {
    const logger = getLogger();

    // Paperless authenticates usernames case-insensitively, but everything
    // downstream of here (users table PK, permission grants, prompts,
    // JWT subject) keys off this string exactly. Normalize once, up front,
    // so "Tino" and "tino" always resolve to the same local identity.
    username = username.trim().toLowerCase();

    const paperlessToken = await this.paperlessAuth.authenticate(username, password)

    if (!paperlessToken.success) {
      return { token: "", success: false, status: paperlessToken.status, message: paperlessToken.message };
    }

    await this.usersRepo.upsert(username, paperlessToken.token as string);
    logger.info({ username }, 'User logged in, token stored');

    await this.ensureUserHasPrompts(username);
    await this.ensureSettingsPermissionSynced(username, paperlessToken.isAdmin);

    const token = jwt.sign(
      { sub: username, username },
      this.authConfig.jwtSecret,
      { expiresIn: this.authConfig.jwtExpiresIn } as jwt.SignOptions,
    );

    return { token, success: true };
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

  /**
   * Keeps the local 'settings' permission grant in sync with Paperless's own
   * is_superuser/is_staff flags on every login: grants it if the user is a
   * superuser or admin (Paperless's "Admin" account toggle, i.e. is_staff)
   * and doesn't already hold it, revokes it if they're neither (and held it
   * from a previous login before being demoted in Paperless). isAdmin being
   * undefined means the lookup itself failed — leave existing access as-is
   * rather than guessing.
   */
  private async ensureSettingsPermissionSynced(username: string, isAdmin: boolean | undefined): Promise<void> {
    if (isAdmin === undefined) return;

    await using uow = await this.uowFactory.createUoW({ username });
    await uow.start();
    const permissions = uow.getPermissions();
    const hasSettingsPermission = await permissions.hasPermission('settings', SETTINGS_RESOURCE_ID, username);

    if (isAdmin && !hasSettingsPermission) {
      await permissions.grant('settings', SETTINGS_RESOURCE_ID, username);
    } else if (!isAdmin && hasSettingsPermission) {
      await permissions.revoke('settings', SETTINGS_RESOURCE_ID, username);
    }

    await uow.save();
    await uow.commit();
  }
}
