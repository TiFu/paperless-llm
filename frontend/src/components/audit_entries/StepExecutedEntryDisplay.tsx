import { AuditLogColor, AuditLogEntryDisplay } from './AuditLogEntryDisplay';
import { StepExecutedEntry } from '../../services/api/generated/models/StepExecutedEntry';
import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';

export class StepExecutedEntryDisplay implements AuditLogEntryDisplay {
  private entry: StepExecutedEntry;
  alwaysDisplayFields;

  constructor(entry: StepExecutedEntry) {
    this.entry = entry;
    if (this.entry.success) {
        this.alwaysDisplayFields = [ 'Step ID', 'Message']
    } else {
        this.alwaysDisplayFields = ['Step ID', 'Message', 'Next Retry', 'Prompt']
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

    if (!this.entry.success) {
        result.push({ label: 'Next Retry: ', value: this.entry.nextRetryTime})
    }

    return result
  }
}
