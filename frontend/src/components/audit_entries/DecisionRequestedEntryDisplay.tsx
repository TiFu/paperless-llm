
import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { DecisionRequestedEntry } from '../../services/api/generated/models/DecisionRequestedEntry';

export class DecisionRequestedEntryDisplay implements AuditLogEntryDisplay {
  private entry: DecisionRequestedEntry;
  constructor(entry: DecisionRequestedEntry) {
    this.entry = entry;
  }
  getLabel() {
    return 'Decision Requested: ' + this.entry.stepType;
  }
  getColor(): AuditLogColor {
    return 'grey';
  }
  getIcon() {
    return <PlayArrowIcon />;
  }
  getFields() {
    return [
      { label: 'Step Type', value: this.entry.stepType },
    ];
  }
  alwaysDisplayFields = ['Step Type'];
}
