import type { AuditLogEntry as DtoAuditLogEntry } from '../web/dtos/models/AuditLogEntry.js';
import { AuditLogEntry as DomainAuditLogEntry } from '../domain/audit/AuditLogEntry.js';
import type { QueueItem as DtoQueueItem } from '../web/dtos/models/QueueItem.js';
import { WorkItemStatus } from '../web/dtos/models/WorkItemStatus.js';

import { StepType as DomainStepType, IStep } from '../domain/steps/IStep.js';
import { StepType as DtoStepType } from '../web/dtos/models/StepType.js';
import { StepStatus as DtoStepStatus } from '../web/dtos/models/StepStatus.js';
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
import { Job } from '../domain/job/Job.js';
import { JobState as DomainJobState } from '../domain/job/JobState.js';
import { JobState as DtoJobState } from '../web/dtos/models/JobState.js';
import { JobResponse } from '../web/dtos/models/JobResponse.js';
import { JobStep } from '../web/dtos/models/JobStep.js';
import { DocumentEnriched } from '../application/util/documentEnrichment.js';
import type { SettingsResponse as SettingsResponseDTO } from '../web/dtos/models/SettingsResponse.js';
import type { UpdateSettingsRequest as UpdateSettingsRequestDTO } from '../web/dtos/models/UpdateSettingsRequest.js';
import type { AutoProcessTagEntry as AutoProcessTagEntryDTO } from '../web/dtos/models/AutoProcessTagEntry.js';
import { SettingsView } from '../application/SettingsApplicationService.js';
import { AppSettingsData, AutoProcessTagConfig } from '../domain/settings/AppSettingsTypes.js';
import { normalizeAutoProcessTags } from '../domain/settings/SettingsDomainService.js';

export class AppMapper {
  // --- Job Mapping ---
  static toJobResponse(job: DocumentEnriched<Job>, paperlessBaseUrl: string): JobResponse & { paperlessUrl: string } {
    return {
      id: job.id,
      documentId: job.documentId,
      // Domain and DTO enums/shapes share the same runtime values but are declared
      // separately (domain vs OpenAPI-generated), so they need a values-only cast.
      jobType: job.jobType as unknown as JobResponse['jobType'],
      status: AppMapper.toDtoJobState(job.state),
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      documentActions: job.documentActions as unknown as JobResponse['documentActions'],
      document: job.document ? AppMapper.toDocument(job.document) : undefined,
      fields: job.fields as unknown as JobResponse['fields'],
      paperlessUrl: `${paperlessBaseUrl}/documents/${job.documentId}`,
    };
  }

  // Map domain JobState (enum) to DTO JobState (string)
  static toDtoJobState(domainJobState: DomainJobState): DtoJobState {
    // The values are identical, but types differ (enum vs string union)
    return domainJobState as unknown as DtoJobState;
  }

  // --- JobStep Mapping ---
  static toJobStep(step: IStep): JobStep {
    return {
      stepId: step.getStepId(),
      stepType: AppMapper.toDtoStepType(step.getStepType()),
      stepStatus: step.getStepStatus() as unknown as DtoStepStatus,
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
    return base as unknown as DtoAuditLogEntry;
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
      status: domain.status as WorkItemStatus,
      retryCount: domain.retryCount,
      retryAfter: domain.retryAfter,
      claimedBy: domain.claimedBy,
      claimedAt: domain.claimedAt,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      jobState: domain.jobState,
      auditLog: domain.auditLog ? AppMapper.toAuditLogEntryList(domain.auditLog) : undefined,
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
  static toDocumentsListWithPagination(paged: { documents: DocumentWithStatus[]; pagination: { limit: number; nextCursor: string | null } }): { documents: DocumentListItem[]; pagination: { limit: number; nextCursor: string | null } } {
    return {
      documents: AppMapper.toDocumentListItemList(paged.documents),
      pagination: {
        limit: paged.pagination.limit,
        nextCursor: paged.pagination.nextCursor ?? null,
      },
    };
  }

  // --- Settings Mapping ---
  static toSettingsResponse(view: SettingsView): SettingsResponseDTO {
    const { settings } = view;
    return {
      paperless: {
        tags: settings.paperlessTags ?? null,
        autoProcessTags: settings.paperlessAutoProcessTags.map(AppMapper.toAutoProcessTagEntry),
      },
      workers: {
        stepExecution: settings.stepExecution,
        stuckStepReset: settings.stuckStepReset,
        entitySync: settings.entitySync,
        autoQueue: settings.autoQueue,
      },
      retry: settings.retry,
      llm: {
        model: settings.llmModel,
        temperature: settings.llmTemperature,
        timeoutMs: settings.llmTimeoutMs,
      },
      connectedSystems: view.connectedSystems,
      // Domain and DTO shapes are structurally identical ({name, description}[])
      promptVariables: view.promptVariables as unknown as SettingsResponseDTO['promptVariables'],
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy ?? undefined,
    };
  }

  static toAutoProcessTagEntry(tag: AutoProcessTagConfig): AutoProcessTagEntryDTO {
    return {
      tag: tag.tag,
      // Domain and DTO enums/shapes share the same runtime values but are declared
      // separately (domain vs OpenAPI-generated), so they need a values-only cast.
      fields: tag.fields as unknown as AutoProcessTagEntryDTO['fields'],
      workflowType: tag.workflowType as unknown as AutoProcessTagEntryDTO['workflowType'],
    };
  }

  static toAppSettingsData(dto: UpdateSettingsRequestDTO): AppSettingsData {
    return {
      paperlessTags: dto.paperless.tags ?? undefined,
      // Re-applies the same field/workflowType defaulting rules used when
      // loading a row back out of the database, so a partial payload
      // (fields omitted) behaves identically either way.
      paperlessAutoProcessTags: normalizeAutoProcessTags(
        dto.paperless.autoProcessTags.map(t => ({
          tag: t.tag,
          fields: t.fields as unknown as AutoProcessTagConfig['fields'] | undefined,
          workflowType: t.workflowType as unknown as string | undefined,
        })),
      ),
      stepExecution: dto.workers.stepExecution,
      stuckStepReset: dto.workers.stuckStepReset,
      entitySync: dto.workers.entitySync,
      autoQueue: dto.workers.autoQueue,
      retry: dto.retry,
      llmModel: dto.llm.model,
      llmTemperature: dto.llm.temperature,
      llmTimeoutMs: dto.llm.timeoutMs,
    };
  }
}
