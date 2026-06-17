export interface UserRecord {
  username: string;
  paperlessToken: string;
  lastLogin: Date;
}

export interface IUsersRepository {
  upsert(username: string, paperlessToken: string): Promise<void>;
  getPaperlessToken(username: string): Promise<string | null>;
  findAll(): Promise<UserRecord[]>;
}
