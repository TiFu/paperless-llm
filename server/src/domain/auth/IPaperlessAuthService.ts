export interface PaperlessAuthResult {
  token: string | null;
  success: boolean;
  /** HTTP status to surface to the API client when success is false (e.g. 401, 500) */
  status?: number;
  message?: string;
}

export interface IPaperlessAuthService {
  authenticate(username: string, password: string): Promise<PaperlessAuthResult>;
}
