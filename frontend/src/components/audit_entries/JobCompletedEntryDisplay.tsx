import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { JobCompletedEntry } from '../../services/api/generated/models/JobCompletedEntry';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

export class JobCompletedEntryDisplay implements AuditLogEntryDisplay {
  private entry: JobCompletedEntry;
  constructor(entry: JobCompletedEntry) {
    this.entry = entry;
  }
  getLabel() {
    return 'Job Completed';
  }
  getColor(): AuditLogColor {
    return 'success';
  }
  getIcon() {
    return <CheckCircleIcon />;
  }
  getFields() {
    return [
      { label: 'Job ID', value: this.entry.jobId },
      { label: 'Completed At', value: this.entry.eventTimestamp },
    ];
  }
  alwaysDisplayFields = ['Job ID'];
}
