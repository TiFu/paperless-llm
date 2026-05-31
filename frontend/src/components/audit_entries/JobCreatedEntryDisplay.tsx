import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { AddCircle as AddCircleIcon } from '@mui/icons-material';
import { JobCreatedEntry } from '../../services/api/generated/models/JobCreatedEntry';

export class JobCreatedEntryDisplay implements AuditLogEntryDisplay {
  private entry: JobCreatedEntry;
  constructor(entry: JobCreatedEntry) {
    this.entry = entry;
  }
  getLabel() {
    return 'Job Created';
  }
  getColor(): AuditLogColor {
    return 'info';
  }
  getIcon() {
    return <AddCircleIcon />;
  }
  getFields() {
    return [
      { label: 'Document ID', value: this.entry.documentId },
      { label: 'Job Type', value: this.entry.jobType },
      { label: 'Message', value: this.entry.message },
    ];
  }
  alwaysDisplayFields = ['Document ID', 'Job Type'];
}
