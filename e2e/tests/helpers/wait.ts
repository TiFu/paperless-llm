export interface PollOptions {
  timeoutMs?: number;
  intervalMs?: number;
  description?: string;
}

/**
 * Polls `fn` until it returns a defined value, or throws once `timeoutMs` elapses.
 * Used throughout the suite to wait on async background work (auto-queue picking
 * up a document, a job progressing through its steps, etc.) instead of fixed sleeps.
 */
export async function poll<T>(fn: () => Promise<T | undefined>, options: PollOptions = {}): Promise<T> {
  const { timeoutMs = 60_000, intervalMs = 1_000, description = 'condition' } = options;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const result = await fn();
    if (result !== undefined) return result;

    if (Date.now() >= deadline) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${description}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
