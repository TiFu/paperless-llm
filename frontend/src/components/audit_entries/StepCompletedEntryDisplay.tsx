import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { StepCompletedEntry } from '../../services/api/generated/models/StepCompletedEntry';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

export class StepCompletedEntryDisplay implements AuditLogEntryDisplay {
  private entry: StepCompletedEntry;
  constructor(entry: StepCompletedEntry) {
    this.entry = entry;
  }
  getLabel() {
    return 'Step Completed: ' + this.entry.stepType;
  }
  getColor(): AuditLogColor {
    return 'success';
  }
  getIcon() {
    return <CheckCircleIcon />;
  }
  getFields() {
    return [
      { label: 'Step ID', value: this.entry.stepId }
    ];
  }
  alwaysDisplayFields = ['Step ID'];
}
