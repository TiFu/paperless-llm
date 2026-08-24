/**
 * Small helper for logging per-step timing breakdowns of a multi-step
 * operation, e.g. `permissions check -> main query -> row enrichment`.
 * Generalizes the ad-hoc Date.now() diffing that used to be hand-rolled
 * per call site.
 */
export class StepTimer {
  private readonly start = Date.now();
  private last = this.start;
  private readonly steps: Record<string, number> = {};

  /** Record the elapsed time since the previous mark (or construction) under `${label}Ms`. */
  mark(label: string): void {
    const now = Date.now();
    this.steps[`${label}Ms`] = now - this.last;
    this.last = now;
  }

  /** Returns all recorded step durations plus the overall `totalMs` since construction. */
  finish(): Record<string, number> {
    return { ...this.steps, totalMs: Date.now() - this.start };
  }
}
