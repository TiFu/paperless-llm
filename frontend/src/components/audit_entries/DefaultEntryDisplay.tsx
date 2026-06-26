import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { AuditLogEntry } from '../../services/api/generated/models/AuditLogEntry';
import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';

export class DefaultEntryDisplay implements AuditLogEntryDisplay {
  private entry: AuditLogEntry;
  constructor(entry: AuditLogEntry) {
    this.entry = entry;
  }
  getLabel() {
    return this.entry.eventType || 'Unknown';
  }
  getColor(): AuditLogColor {
    return 'grey';
  }
  getIcon() {
    return <PlayArrowIcon />;
  }
  getFields() {
    return Object.entries(this.entry)
      .filter(([, v]) => typeof v !== 'object' && v !== undefined && v !== null)
      .map(([k, v]) => ({ label: k, value: v }));
  }
  alwaysDisplayFields = [];
}
