import type { AuditLogEntry as DtoAuditLogEntry } from '../web/dtos/models/AuditLogEntry.js';
import { AuditEventType, AuditLogEntry as DomainAuditLogEntry } from '../domain/audit/AuditLogEntry.js';
import type { QueueItem as DtoQueueItem } from '../web/dtos/models/QueueItem.js';

import { StepType as DomainStepType } from '../domain/steps/IStep.js';
import { StepType as DtoStepType } from '../web/dtos/models/StepType.js';
import { Prompt } from '../domain/prompt/Prompt.js';
import type { PromptResponse } from '../web/dtos/models/PromptResponse.js';
import { IDocument } from '../domain/document/IDocument.js';
import { ICorrespondent, IDocumentType, ITag } from '../domain/document/IDocumentEntities.js';
import { QueueItemWithDocument } from '../application/QueueApplicationService.js';
import { Document } from '../web/dtos/models/Document.js';
import { DocumentListItem } from '../web/dtos/models/DocumentListItem.js';
import { DocumentWithStatus } from '../application/DocumentApplicationService.js';
import { Correspondent } from '../web/dtos/models/Correspondent.js';
import { DocumentType } from '../web/dtos/models/DocumentType.js';
import { Tag } from '../web/dtos/models/Tag.js';
import { JobCreatedEntry } from '../web/dtos/models/JobCreatedEntry.js';
import { metadata } from 'reflect-metadata/no-conflict';

export class AppMapper {
  // --- Job Mapping ---
  static toJobResponse(job: any, paperlessBaseUrl: string): any {
    // Accepts DocumentEnriched<Job> (domain + document)
    return {
      id: job.id,
      documentId: job.documentId,
      jobType: job.jobType,
      status: job.state,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      documentActions: job.documentActions,
      document: job.document ? AppMapper.toDocument(job.document) : undefined,
      fields: job.fields,
      paperlessUrl: `${paperlessBaseUrl}/documents/${job.documentId}`,
    };
  }

  // --- JobStep Mapping ---
  static toJobStep(step: any): any {
    return {
      stepId: step.getStepId(),
      stepType: step.getStepType(),
      stepStatus: step.getStepStatus(),
      children: step.hasChildren() ? step.getChildren().map(AppMapper.toJobStep) : null,
      startedAt: step.getStartedAt(),
      retryCount: step.getRetryCount(),
      retryAfter: step.getRetryAfter(),
    };
  }
  // --- AuditLogEntry Mapping ---
  static toAuditLogEntry(domain: DomainAuditLogEntry): DtoAuditLogEntry {
    const base = {
      id: domain.id ?? undefined,
      jobId: domain.jobId,
      stepId: domain.stepId ?? undefined,
      eventType: domain.eventType,
      eventTimestamp: domain.eventTimestamp instanceof Date ? domain.eventTimestamp.toISOString() : domain.eventTimestamp,
      processingStartTime: domain.processingStartTime ? (domain.processingStartTime instanceof Date ? domain.processingStartTime.toISOString() : domain.processingStartTime) : undefined,
      processingEndTime: domain.processingEndTime ? (domain.processingEndTime instanceof Date ? domain.processingEndTime.toISOString() : domain.processingEndTime) : undefined,
      processingDurationMs: typeof domain.getProcessingDurationMs === 'function' ? domain.getProcessingDurationMs() : undefined,
      ...domain.metadata
    };

    // Assume 1:1
    return base as any;

    const m = domain.metadata ?? {};
    switch (domain.eventType) {
      case AuditEventType.JOB_CREATED:
        return {
          ...base,
          documentId: (m as any).documentId,
          jobType: (m as any).jobType,
          message: (m as any).message ?? null,
        } as any;
      case AuditEventType.JOB_COMPLETED:
        return {
          ...base,
          documentId: (m as any).documentId,
          jobType: (m as any).jobType,
        } as any;
      case AuditEventType.JOB_FAILED:
        return {
          ...base,
          message: (m as any).message,
        } as any;
      case AuditEventType.STEP_CREATED:
        return {
          ...base,
          stepType: (m as any).stepType,
        } as any;
      case AuditEventType.STEP_EXECUTED:
        return {
          ...base,
          stepType: (m as any).stepType,
          retryCount: (m as any).retryCount,
          prompt: (m as any).prompt,
          message: (m as any).message,
        } as any;
      case AuditEventType.STEP_COMPLETED:
        return {
          ...base,
          message: (m as any).message,
          success: (m as any).success,
          stepType: (m as any).stepType,
        } as any;
      case AuditEventType.DECISION_REQUESTED:
        return {
          ...base,
          stepType: (m as any).stepType,
        } as any;
      case AuditEventType.DECISION_SUBMITTED:
        return {
          ...base,
          decision: (m as any).decision,
          approver: (m as any).approver,
        } as any;
      case AuditEventType.STEP_MANUALLY_RETRIED:
        return {
          ...base,
          previousRetryCount: (m as any).previousRetryCount,
          stepType: (m as any).stepType,
        } as any;
      case AuditEventType.STEP_CANCELLED:
        return {
          ...base,
          previousStatus: (m as any).previousStatus,
          stepType: (m as any).stepType,
        } as any;
      case AuditEventType.STUCK_STEP_RESET:
        return {
          ...base,
          stuckDurationMs: (m as any).stuckDurationMs,
          previousStartedAt: (m as any).previousStartedAt,
          stepType: (m as any).stepType,
        } as any;
      case AuditEventType.ERROR:
        return {
          ...base,
          message: (m as any).message,
        } as any;
      default:
        // fallback: return as generic object
        return { ...base, metadata: domain.metadata ?? undefined } as unknown as DtoAuditLogEntry;
    }
  }

  static toAuditLogEntryList(domains: DomainAuditLogEntry[]): DtoAuditLogEntry[] {
    return domains.map(AppMapper.toAuditLogEntry);
  }
  // --- QueueItem Mapping ---
  static toQueueItem(domain: QueueItemWithDocument): DtoQueueItem {
    return {
      id: domain.id,
      jobId: domain.jobId,
      documentId: domain.documentId,
      document: domain.document ? AppMapper.toDocument(domain.document) : null,
      stepType: domain.stepType,
      jobType: domain.jobType,
      status: domain.status as any, // Should match WorkItemStatus
      retryCount: domain.retryCount,
      retryAfter: domain.retryAfter,
      claimedBy: domain.claimedBy,
      claimedAt: domain.claimedAt,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      jobState: domain.jobState,
    };
  }

  static toQueueItemList(domains: QueueItemWithDocument[]): DtoQueueItem[] {
    return domains.map(AppMapper.toQueueItem);
  }
  // Map a single Prompt domain object to a PromptResponse DTO
  static toPromptResponse(prompt: Prompt): PromptResponse {
    return {
      stepType: prompt.stepType,
      template: prompt.template,
      version: prompt.version,
      updatedAt: prompt.updatedAt,
    };
  }

  // Map an array of Prompts to PromptResponse DTOs
  static toPromptResponseList(prompts: Prompt[]): PromptResponse[] {
    return prompts.map(AppMapper.toPromptResponse);
  }

  // Map domain StepType (enum) to DTO StepType (string)
  static toDtoStepType(domainStepType: DomainStepType): DtoStepType {
    // The values are identical, but types differ (enum vs string union)
    return domainStepType as unknown as DtoStepType;
  }

  // Map DTO StepType (string) to domain StepType (enum)
  static toDomainStepType(dtoStepType: DtoStepType): DomainStepType {
    // The values are identical, but types differ (string union vs enum)
    return dtoStepType as unknown as DomainStepType;
  }
  
  // --- Document Mapping ---
  static toDocument(dto: IDocument): Document {
    return {
      id: dto.id,
      title: dto.title ?? '',
      content: dto.content,
    };
  }

  static toDocumentList(docs: IDocument[]): Document[] {
    return docs.map(AppMapper.toDocument);
  }

  // --- DocumentListItem Mapping (document-listing endpoint only; carries inProgress) ---
  static toDocumentListItem(dto: DocumentWithStatus): DocumentListItem {
    return {
      ...AppMapper.toDocument(dto),
      inProgress: dto.inProgress,
    };
  }

  static toDocumentListItemList(docs: DocumentWithStatus[]): DocumentListItem[] {
    return docs.map(AppMapper.toDocumentListItem);
  }

  // --- Tag Mapping ---
  static toTag(tag: ITag): Tag {
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      isInboxTag: tag.isInboxTag,
    };
  }

  static toTagList(tags: ITag[]): Tag[] {
    return tags.map(AppMapper.toTag);
  }

  // --- Correspondent Mapping ---
  static toCorrespondent(c: ICorrespondent): Correspondent {
    return {
      id: c.id,
      name: c.name,
    };
  }

  static toCorrespondentList(cs: ICorrespondent[]): Correspondent[] {
    return cs.map(AppMapper.toCorrespondent);
  }

  // --- DocumentType Mapping ---
  static toDocumentType(dt: IDocumentType): DocumentType {
    return {
      id: dt.id,
      name: dt.name,
    };
  }

  static toDocumentTypeList(dts: IDocumentType[]): DocumentType[] {
    return dts.map(AppMapper.toDocumentType);
  }

  // --- Paginated Documents Mapping (for DocumentsListWithPagination DTO) ---
  static toDocumentsListWithPagination(paged: { documents: DocumentWithStatus[]; pagination: { limit: number; nextCursor: string | null } }) {
    return {
      documents: AppMapper.toDocumentListItemList(paged.documents),
      pagination: {
        limit: paged.pagination.limit,
        nextCursor: paged.pagination.nextCursor ?? null,
      },
    };
  }
}
