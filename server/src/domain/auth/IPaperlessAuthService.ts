export interface PaperlessAuthResult {
  token: string | null;
  success: boolean;
  /** HTTP status to surface to the API client when success is false (e.g. 401, 500) */
  status?: number;
  message?: string;
  /**
   * Whether this Paperless user is a superuser (from GET /api/users/?username=...,
   * UserSerializer's `is_superuser` field). Drives local settings-edit access —
   * see AuthApplicationService.ensureSettingsPermissionSynced. Undefined if the
   * lookup itself failed (e.g. Paperless unreachable after auth succeeded);
   * treated as "leave existing access as-is" rather than granting or revoking.
   */
  isSuperuser?: boolean;
}

export interface IPaperlessAuthService {
  authenticate(username: string, password: string): Promise<PaperlessAuthResult>;
}
