import { Pool, PoolClient } from 'pg';
import { IUsersRepository, UserRecord } from '../../domain/auth/IUsersRepository.js';

export class PostgreSQLUsersRepository implements IUsersRepository {
  constructor(private readonly pool: Pool | PoolClient) {}

  async upsert(username: string, paperlessToken: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (username, paperless_token, last_login)
       VALUES ($1, $2, NOW())
       ON CONFLICT (username) DO UPDATE SET
         paperless_token = EXCLUDED.paperless_token,
         last_login = NOW()`,
      [username, paperlessToken],
    );
  }

  async getPaperlessToken(username: string): Promise<string | null> {
    const result = await this.pool.query<{ paperless_token: string }>(
      `SELECT paperless_token FROM users WHERE username = $1`,
      [username],
    );
    return result.rows[0]?.paperless_token ?? null;
  }

  async findAll(): Promise<UserRecord[]> {
    const result = await this.pool.query<{ username: string; paperless_token: string; last_login: Date }>(
      `SELECT username, paperless_token, last_login FROM users ORDER BY last_login DESC`,
    );
    return result.rows.map(row => ({
      username: row.username,
      paperlessToken: row.paperless_token,
      lastLogin: row.last_login,
    }));
  }
}
