import { AuthApplicationService } from '../application/AuthApplicationService.js';
import { UserContext } from '../domain/auth/UserContext.js';

export class AuthController {
  constructor(private readonly authService: AuthApplicationService) {}

  async login(username: string, password: string): Promise<{ token: string, success: boolean, status?: number, message?: string }> {
    return this.authService.login(username, password);
  }

  me(user: UserContext): { username: string } {
    return { username: user.username };
  }
}
