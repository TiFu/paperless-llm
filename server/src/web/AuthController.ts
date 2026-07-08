import { AuthApplicationService } from '../application/AuthApplicationService.js';
import { UserContext } from '../domain/auth/UserContext.js';
import { UoWFactory } from '../infrastructure/UoW.js';

export class AuthController {
  constructor(
    private readonly authService: AuthApplicationService,
    private readonly uowFactory: UoWFactory,
  ) {}

  async login(username: string, password: string): Promise<{ token: string, success: boolean, status?: number, message?: string }> {
    return this.authService.login(username, password);
  }

  async me(user: UserContext): Promise<{ username: string; canEditSettings: boolean }> {
    return { username: user.username, canEditSettings: true };
  }
}
