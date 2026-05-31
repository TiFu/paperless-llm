import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { StuckStepResetEntry } from '../../services/api/generated/models/StuckStepResetEntry';
import { WarningAmber as WarningIcon } from '@mui/icons-material';

export class StuckStepResetEntryDisplay implements AuditLogEntryDisplay {
  private entry: StuckStepResetEntry;
  constructor(entry: StuckStepResetEntry) {
    this.entry = entry;
  }
  getLabel() {
    return 'Stuck Step Reset: ' + this.entry.stepType;
  }
  getColor(): AuditLogColor {
    return 'warning';
  }
  getIcon() {
    return <WarningIcon />;
  }
  getFields() {
    return [
      { label: 'Step ID', value: this.entry.stepId }
    ];
  }
  alwaysDisplayFields = ['Step ID'];
}
