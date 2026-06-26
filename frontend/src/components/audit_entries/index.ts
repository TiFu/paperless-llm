import { AuditLogEntry } from '../../services/api/generated/models/AuditLogEntry';
import { JobCreatedEntry } from '../../services/api/generated/models/JobCreatedEntry';
import { DecisionRequestedEntry } from '../../services/api/generated/models/DecisionRequestedEntry';
import { DecisionSubmittedEntry } from '../../services/api/generated/models/DecisionSubmittedEntry';
import { ErrorEntry } from '../../services/api/generated/models/ErrorEntry';
import { JobCompletedEntry } from '../../services/api/generated/models/JobCompletedEntry';
import { JobFailedEntry } from '../../services/api/generated/models/JobFailedEntry';
import { StepCancelledEntry } from '../../services/api/generated/models/StepCancelledEntry';
import { StepCompletedEntry } from '../../services/api/generated/models/StepCompletedEntry';
import { StepCreatedEntry } from '../../services/api/generated/models/StepCreatedEntry';
import { StepExecutedEntry } from '../../services/api/generated/models/StepExecutedEntry';
import { StepManuallyRetriedEntry } from '../../services/api/generated/models/StepManuallyRetriedEntry';
import { StuckStepResetEntry } from '../../services/api/generated/models/StuckStepResetEntry';
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
  [key: string]: (entry: AuditLogEntry) => AuditLogEntryDisplay;
};

const entryDisplayClassMap: EntryDisplayClassMap = {
  JOB_CREATED: (entry) => new JobCreatedEntryDisplay(entry as JobCreatedEntry),
  DECISION_REQUESTED: (entry) => new DecisionRequestedEntryDisplay(entry as DecisionRequestedEntry),
  DECISION_SUBMITTED: (entry) => new DecisionSubmittedEntryDisplay(entry as DecisionSubmittedEntry),
  ERROR: (entry) => new ErrorEntryDisplay(entry as ErrorEntry),
  JOB_COMPLETED: (entry) => new JobCompletedEntryDisplay(entry as JobCompletedEntry),
  JOB_FAILED: (entry) => new JobFailedEntryDisplay(entry as JobFailedEntry),
  STEP_CANCELLED: (entry) => new StepCancelledEntryDisplay(entry as StepCancelledEntry),
  STEP_COMPLETED: (entry) => new StepCompletedEntryDisplay(entry as StepCompletedEntry),
  STEP_CREATED: (entry) => new StepCreatedEntryDisplay(entry as StepCreatedEntry),
  STEP_EXECUTED: (entry) => new StepExecutedEntryDisplay(entry as StepExecutedEntry),
  STEP_MANUALLY_RETRIED: (entry) => new StepManuallyRetriedEntryDisplay(entry as StepManuallyRetriedEntry),
  STUCK_STEP_RESET: (entry) => new StuckStepResetEntryDisplay(entry as StuckStepResetEntry),
};

export function getAuditLogEntryDisplay(entry: AuditLogEntry): AuditLogEntryDisplay {
  const factory = entryDisplayClassMap[entry.eventType];
  if (factory) return factory(entry);
  return new DefaultEntryDisplay(entry);
}
