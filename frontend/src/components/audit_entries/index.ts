import { AuditLogEntry } from '../../services/api/generated/models/AuditLogEntry';
import { JobCreatedEntry } from '../../services/api/generated/models/JobCreatedEntry';
import { DecisionRequestedEntry } from '../../services/api/generated/models/DecisionRequestedEntry';
import { DecisionSubmittedEntry } from '../../services/api/generated/models/DecisionSubmittedEntry';
import { JobCreatedEntryDisplay } from './JobCreatedEntryDisplay';
import { DecisionRequestedEntryDisplay } from './DecisionRequestedEntryDisplay';
import { DecisionSubmittedEntryDisplay } from './DecisionSubmittedEntryDisplay';
import { ErrorEntryDisplay } from './ErrorEntryDisplay';
import { JobCompletedEntryDisplay } from './JobCompletedEntryDisplay';
import { JobFailedEntryDisplay } from './JobFailedEntryDisplay';
import { StepCancelledEntryDisplay } from './StepCancelledEntryDisplay';
import { StepCompletedEntryDisplay } from './StepCompletedEntryDisplay';
import { StepCreatedEntryDisplay } from './StepCreatedEntryDisplay';
import { StepExecutedEntryDisplay } from './StepExecutedEntryDisplay';
import { StepManuallyRetriedEntryDisplay } from './StepManuallyRetriedEntryDisplay';
import { StuckStepResetEntryDisplay } from './StuckStepResetEntryDisplay';
import { DefaultEntryDisplay } from './DefaultEntryDisplay';
import { AuditLogEntryDisplay } from './AuditLogEntryDisplay';

type EntryDisplayClassMap = {
  [key: string]: (entry: any) => AuditLogEntryDisplay;
};

const entryDisplayClassMap: EntryDisplayClassMap = {
  JOB_CREATED: (entry: JobCreatedEntry) => new JobCreatedEntryDisplay(entry),
  DECISION_REQUESTED: (entry: DecisionRequestedEntry) => new DecisionRequestedEntryDisplay(entry),
  DECISION_SUBMITTED: (entry: DecisionSubmittedEntry) => new DecisionSubmittedEntryDisplay(entry),
  ERROR: (entry: any) => new ErrorEntryDisplay(entry),
  JOB_COMPLETED: (entry: any) => new JobCompletedEntryDisplay(entry),
  JOB_FAILED: (entry: any) => new JobFailedEntryDisplay(entry),
  STEP_CANCELLED: (entry: any) => new StepCancelledEntryDisplay(entry),
  STEP_COMPLETED: (entry: any) => new StepCompletedEntryDisplay(entry),
  STEP_CREATED: (entry: any) => new StepCreatedEntryDisplay(entry),
  STEP_EXECUTED: (entry: any) => new StepExecutedEntryDisplay(entry),
  STEP_MANUALLY_RETRIED: (entry: any) => new StepManuallyRetriedEntryDisplay(entry),
  STUCK_STEP_RESET: (entry: any) => new StuckStepResetEntryDisplay(entry),
};

export function getAuditLogEntryDisplay(entry: AuditLogEntry): AuditLogEntryDisplay {
  const factory = entryDisplayClassMap[(entry as any).eventType as string];
  if (factory) return factory(entry);
  return new DefaultEntryDisplay(entry);
}
