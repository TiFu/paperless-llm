import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { StepCreatedEntry } from '../../services/api/generated/models/StepCreatedEntry';
import { AddCircle as AddCircleIcon } from '@mui/icons-material';

export class StepCreatedEntryDisplay implements AuditLogEntryDisplay {
  private entry: StepCreatedEntry;
  constructor(entry: StepCreatedEntry) {
    this.entry = entry;
  }
  getLabel() {
    return 'Step Created: ' + this.entry.stepType;
  }
  getColor(): AuditLogColor {
    return 'info';
  }
  getIcon() {
    return <AddCircleIcon />;
  }
  getFields() {
    return [
      { label: 'Step ID', value: this.entry.stepId },
      { label: 'Step Type', value: this.entry.stepType },
    ];
  }
  alwaysDisplayFields = ['Step ID'];
}
