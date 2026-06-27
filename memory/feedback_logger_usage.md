---
name: feedback-logger-usage
description: When replacing console.* calls with the project logger in the paperless-llm server, always use createChildLogger, never getLogger directly.
metadata:
  type: feedback
---

In `ns-apps/paperless-llm-worktree/server`, when converting `console.log/warn/error` calls to use the pino-based logger (`src/utils/logger.ts`), always call `createChildLogger({ name: '<ClassName>' })` and use the returned child logger — do not call `getLogger()` directly inline.

**Why:** The user explicitly corrected this mid-task while fixing ESLint `no-console` warnings: "Do not use getLogger. Always use createChildLogger then use that logger." Child loggers tag log lines with a `name`/context, which is the established pattern across the codebase (e.g. `StepExecutorDomainService`, route files like `approvals.ts`).

**How to apply:** In domain classes without an injected logger, create the child logger lazily (inside the method, or as an instance field set in the constructor) rather than at module scope — `createChildLogger`/`getLogger` throw if called before `initializeLogger()` runs at bootstrap, so module-level top-of-file instantiation risks import-order failures.
