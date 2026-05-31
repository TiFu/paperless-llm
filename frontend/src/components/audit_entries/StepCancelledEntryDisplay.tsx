import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { StepCancelledEntry } from '../../services/api/generated/models/StepCancelledEntry';
import { Cancel as CancelIcon } from '@mui/icons-material';

export class StepCancelledEntryDisplay implements AuditLogEntryDisplay {
  private entry: StepCancelledEntry;
  constructor(entry: StepCancelledEntry) {
    this.entry = entry;
  }
  getLabel() {
    return 'Step Cancelled';
  }
  getColor(): AuditLogColor {
    return 'grey';
  }
  getIcon() {
    return <CancelIcon />;
  }
  getFields() {
    return [
      { label: 'Step ID', value: this.entry.stepId },
      { label: 'Previous Status', value: this.entry.previousStatus },
    ];
  }
  alwaysDisplayFields = ['Step ID'];
}
