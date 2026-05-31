import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { StepManuallyRetriedEntry } from '../../services/api/generated/models/StepManuallyRetriedEntry';
import { Refresh as RefreshIcon } from '@mui/icons-material';

export class StepManuallyRetriedEntryDisplay implements AuditLogEntryDisplay {
  private entry: StepManuallyRetriedEntry;
  constructor(entry: StepManuallyRetriedEntry) {
    this.entry = entry;
  }
  getLabel() {
    return 'Step Manually Retried: ' + this.entry.stepType;
  }
  getColor(): AuditLogColor {
    return 'warning';
  }
  getIcon() {
    return <RefreshIcon />;
  }
  getFields() {
    return [
      { label: 'Step ID', value: this.entry.stepId },
      { label: 'Previous Status', value: this.entry.previousStatus },
    ];
  }
  alwaysDisplayFields = ['Step ID'];
}
