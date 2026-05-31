import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { ThumbUp as ThumbUpIcon } from '@mui/icons-material';
import { DecisionSubmittedEntry } from '../../services/api/generated/models/DecisionSubmittedEntry';

export class DecisionSubmittedEntryDisplay implements AuditLogEntryDisplay {
  private entry: DecisionSubmittedEntry;
  constructor(entry: DecisionSubmittedEntry) {
    this.entry = entry;
  }
  getLabel() {
    // TODO: step type is not available here...
    return 'Decision Submitted: ' + this.entry.decision;
  }
  getColor(): AuditLogColor {
    return 'success';
  }
  getIcon() {
    return <ThumbUpIcon />;
  }
  getFields() {
    return [
      { label: 'Decision', value: this.entry.decision },
      // Add more fields as needed for DecisionSubmittedEntry
    ];
  }
  alwaysDisplayFields = ['Decision'];
}
