export interface IPaperlessAuthService {
  authenticate(username: string, password: string): Promise<string>;
}
