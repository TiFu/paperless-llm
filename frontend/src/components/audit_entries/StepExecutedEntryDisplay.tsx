import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { StepExecutedEntry } from '../../services/api/generated/models/StepExecutedEntry';
import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';

export class StepExecutedEntryDisplay implements AuditLogEntryDisplay {
  private entry: StepExecutedEntry;
  alwaysDisplayFields;
  popupFields;

  constructor(entry: StepExecutedEntry) {
    this.entry = entry;
    if (this.entry.success) {
        this.alwaysDisplayFields = [ 'Step ID']
        this.popupFields = ['Prompt', 'Raw Response'];
    } else {
        // Errors must always be visible inline, not hidden behind the "Show Details" popup.
        this.alwaysDisplayFields = ['Step ID', 'Message', 'Next Retry']
        this.popupFields = [];
    }
  }
  getLabel() {
    return 'Step Executed: ' + this.entry.stepType;
  }
  getColor(): AuditLogColor {
    return this.entry.success ? 'success' : 'error';
  }
  getIcon() {
    return <PlayArrowIcon />;
  }
  getFields() {
    const result =[
      { label: 'Step ID', value: this.entry.stepId },
      { label: 'Message', value: this.entry.message},
    ]
    
    if (this.entry.success && this.entry.prompt) {
        result.push(      { label: 'Prompt', value: this.entry.prompt})
    }

    if (this.entry.success && this.entry.rawResponse) {
        result.push(      { label: 'Raw Response', value: this.entry.rawResponse})
    }

    if (!this.entry.success) {
        const formatted = this.entry.nextRetryTime
          ? new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(this.entry.nextRetryTime))
          : '';
        result.push({ label: 'Next Retry', value: formatted });
    }

    return result
  }
}
