import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { ErrorEntry } from '../../services/api/generated/models/ErrorEntry';
import { Error as ErrorIcon } from '@mui/icons-material';

export class ErrorEntryDisplay implements AuditLogEntryDisplay {
  private entry: ErrorEntry;
  constructor(entry: ErrorEntry) {
    this.entry = entry;
  }
  getLabel() {
    return 'Error';
  }
  getColor(): AuditLogColor {
    return 'error';
  }
  getIcon() {
    return <ErrorIcon />;
  }
  getFields() {
    return [
      { label: 'Message', value: this.entry.message },
    ];
  }
  alwaysDisplayFields = ['Message'];
}
