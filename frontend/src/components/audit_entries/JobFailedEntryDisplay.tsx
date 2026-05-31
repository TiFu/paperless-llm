import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { JobFailedEntry } from '../../services/api/generated/models/JobFailedEntry';
import { Error as ErrorIcon } from '@mui/icons-material';

export class JobFailedEntryDisplay implements AuditLogEntryDisplay {
  private entry: JobFailedEntry;
  constructor(entry: JobFailedEntry) {
    this.entry = entry;
  }
  getLabel() {
    return 'Job Failed';
  }
  getColor(): AuditLogColor {
    return 'error';
  }
  getIcon() {
    return <ErrorIcon />;
  }
  getFields() {
    return [
      { label: 'Job ID', value: this.entry.jobId },
      { label: 'Error', value: this.entry.message },
    ];
  }
  alwaysDisplayFields = ['Job ID'];
}
