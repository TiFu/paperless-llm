import { ResponseContext, RequestContext, HttpFile, HttpInfo } from '../http/http.js';
import { Configuration, ConfigurationOptions } from '../configuration.js'
import type { Middleware } from '../middleware.js';

import { ApprovalDecision } from '../models/ApprovalDecision.js';
import { ApprovalItem } from '../models/ApprovalItem.js';
import { ApprovalItemProposedActionsInner } from '../models/ApprovalItemProposedActionsInner.js';
import { ApprovalStats } from '../models/ApprovalStats.js';
import { ApprovalsResponse } from '../models/ApprovalsResponse.js';
import { AuditEventType } from '../models/AuditEventType.js';
import { AuditLogEntry } from '../models/AuditLogEntry.js';
import { AuditLogResponse } from '../models/AuditLogResponse.js';
import { BaseAuditLogEntry } from '../models/BaseAuditLogEntry.js';
import { BatchJobRequest } from '../models/BatchJobRequest.js';
import { BatchJobRequestDocumentsInner } from '../models/BatchJobRequestDocumentsInner.js';
import { ComponentHealth } from '../models/ComponentHealth.js';
import { Correspondent } from '../models/Correspondent.js';
import { CorrespondentsList } from '../models/CorrespondentsList.js';
import { DashboardStats } from '../models/DashboardStats.js';
import { DecisionRequestedEntry } from '../models/DecisionRequestedEntry.js';
import { DecisionSubmittedEntry } from '../models/DecisionSubmittedEntry.js';
import { Document } from '../models/Document.js';
import { DocumentAction } from '../models/DocumentAction.js';
import { DocumentType } from '../models/DocumentType.js';
import { DocumentTypesList } from '../models/DocumentTypesList.js';
import { DocumentsList } from '../models/DocumentsList.js';
import { DocumentsListWithPagination } from '../models/DocumentsListWithPagination.js';
import { EntityDescriptionEntity } from '../models/EntityDescriptionEntity.js';
import { EntityDescriptionType } from '../models/EntityDescriptionType.js';
import { EntityDescriptionsResponse } from '../models/EntityDescriptionsResponse.js';
import { EntityValue } from '../models/EntityValue.js';
import { EntityValueType } from '../models/EntityValueType.js';
import { EntityValuesResponse } from '../models/EntityValuesResponse.js';
import { ErrorEntry } from '../models/ErrorEntry.js';
import { GetCorrespondents200Response } from '../models/GetCorrespondents200Response.js';
import { GetDocumentTypes200Response } from '../models/GetDocumentTypes200Response.js';
import { GetJobTypes200Response } from '../models/GetJobTypes200Response.js';
import { GetTags200Response } from '../models/GetTags200Response.js';
import { HealthStatus } from '../models/HealthStatus.js';
import { JobCompletedEntry } from '../models/JobCompletedEntry.js';
import { JobCreatedEntry } from '../models/JobCreatedEntry.js';
import { JobFailedEntry } from '../models/JobFailedEntry.js';
import { JobListResponse } from '../models/JobListResponse.js';
import { JobResponse } from '../models/JobResponse.js';
import { JobState } from '../models/JobState.js';
import { JobStats } from '../models/JobStats.js';
import { JobStep } from '../models/JobStep.js';
import { JobStepsResponse } from '../models/JobStepsResponse.js';
import { JobSubmissionResponse } from '../models/JobSubmissionResponse.js';
import { JobSubmissionResponseJobsInner } from '../models/JobSubmissionResponseJobsInner.js';
import { JobTypesList } from '../models/JobTypesList.js';
import { MakeApprovalDecision200Response } from '../models/MakeApprovalDecision200Response.js';
import { MakeApprovalDecisionRequest } from '../models/MakeApprovalDecisionRequest.js';
import { MakeApprovalDecisionRequestActionsInner } from '../models/MakeApprovalDecisionRequestActionsInner.js';
import { OperationResult } from '../models/OperationResult.js';
import { Pagination } from '../models/Pagination.js';
import { ProblemDetails } from '../models/ProblemDetails.js';
import { PromptResponse } from '../models/PromptResponse.js';
import { PromptsListResponse } from '../models/PromptsListResponse.js';
import { ProposedActionFieldType } from '../models/ProposedActionFieldType.js';
import { QueueItem } from '../models/QueueItem.js';
import { QueueItemsResponse } from '../models/QueueItemsResponse.js';
import { QueueItemsResponsePagination } from '../models/QueueItemsResponsePagination.js';
import { QueueStats } from '../models/QueueStats.js';
import { ServiceStatus } from '../models/ServiceStatus.js';
import { StepCancelledEntry } from '../models/StepCancelledEntry.js';
import { StepCompletedEntry } from '../models/StepCompletedEntry.js';
import { StepCreatedEntry } from '../models/StepCreatedEntry.js';
import { StepExecutedEntry } from '../models/StepExecutedEntry.js';
import { StepManuallyRetriedEntry } from '../models/StepManuallyRetriedEntry.js';
import { StepStatus } from '../models/StepStatus.js';
import { StepType } from '../models/StepType.js';
import { StuckStepResetEntry } from '../models/StuckStepResetEntry.js';
import { SystemHealthResponse } from '../models/SystemHealthResponse.js';
import { SystemHealthResponseComponents } from '../models/SystemHealthResponseComponents.js';
import { SystemStatus } from '../models/SystemStatus.js';
import { Tag } from '../models/Tag.js';
import { TagsList } from '../models/TagsList.js';
import { UpdateEntityDescriptionRequest } from '../models/UpdateEntityDescriptionRequest.js';
import { UpdatePromptRequest } from '../models/UpdatePromptRequest.js';
import { WorkItemStatus } from '../models/WorkItemStatus.js';
import { WorkflowType } from '../models/WorkflowType.js';

import { ObservableApprovalsApi } from "./ObservableAPI.js";
import { ApprovalsApiRequestFactory, ApprovalsApiResponseProcessor} from "../apis/ApprovalsApi.js";

export interface ApprovalsApiGetApprovalStatsRequest {
}

export interface ApprovalsApiListApprovalsRequest {
    /**
     * Maximum number of approvals to return
     * Minimum: 1
     * Maximum: 100
     * Defaults to: 50
     * @type number
     * @memberof ApprovalsApilistApprovals
     */
    limit?: number
    /**
     * Pagination cursor from a previous response
     * Defaults to: undefined
     * @type string
     * @memberof ApprovalsApilistApprovals
     */
    cursor?: string
}

export interface ApprovalsApiMakeApprovalDecisionRequest {
    /**
     * Step ID awaiting approval
     * Defaults to: undefined
     * @type string
     * @memberof ApprovalsApimakeApprovalDecision
     */
    stepId: string
    /**
     * 
     * @type MakeApprovalDecisionRequest
     * @memberof ApprovalsApimakeApprovalDecision
     */
    makeApprovalDecisionRequest: MakeApprovalDecisionRequest
}

export class ObjectApprovalsApi {
    private api: ObservableApprovalsApi

    public constructor(configuration: Configuration, requestFactory?: ApprovalsApiRequestFactory, responseProcessor?: ApprovalsApiResponseProcessor) {
        this.api = new ObservableApprovalsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Returns count of pending approval requests
     * Get approval statistics
     * @param param the request object
     */
    public getApprovalStatsWithHttpInfo(param: ApprovalsApiGetApprovalStatsRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<ApprovalStats>> {
        return this.api.getApprovalStatsWithHttpInfo( options).toPromise();
    }

    /**
     * Returns count of pending approval requests
     * Get approval statistics
     * @param param the request object
     */
    public getApprovalStats(param: ApprovalsApiGetApprovalStatsRequest = {}, options?: ConfigurationOptions): Promise<ApprovalStats> {
        return this.api.getApprovalStats( options).toPromise();
    }

    /**
     * Retrieve a paginated list of steps awaiting approval decisions
     * List pending approvals
     * @param param the request object
     */
    public listApprovalsWithHttpInfo(param: ApprovalsApiListApprovalsRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<ApprovalsResponse>> {
        return this.api.listApprovalsWithHttpInfo(param.limit, param.cursor,  options).toPromise();
    }

    /**
     * Retrieve a paginated list of steps awaiting approval decisions
     * List pending approvals
     * @param param the request object
     */
    public listApprovals(param: ApprovalsApiListApprovalsRequest = {}, options?: ConfigurationOptions): Promise<ApprovalsResponse> {
        return this.api.listApprovals(param.limit, param.cursor,  options).toPromise();
    }

    /**
     * Submit an approval decision (approve/reject) for a pending step. The decision must match one of the possibleDecisions from the approval item. 
     * Make approval decision
     * @param param the request object
     */
    public makeApprovalDecisionWithHttpInfo(param: ApprovalsApiMakeApprovalDecisionRequest, options?: ConfigurationOptions): Promise<HttpInfo<MakeApprovalDecision200Response>> {
        return this.api.makeApprovalDecisionWithHttpInfo(param.stepId, param.makeApprovalDecisionRequest,  options).toPromise();
    }

    /**
     * Submit an approval decision (approve/reject) for a pending step. The decision must match one of the possibleDecisions from the approval item. 
     * Make approval decision
     * @param param the request object
     */
    public makeApprovalDecision(param: ApprovalsApiMakeApprovalDecisionRequest, options?: ConfigurationOptions): Promise<MakeApprovalDecision200Response> {
        return this.api.makeApprovalDecision(param.stepId, param.makeApprovalDecisionRequest,  options).toPromise();
    }

}

import { ObservableDocsApi } from "./ObservableAPI.js";
import { DocsApiRequestFactory, DocsApiResponseProcessor} from "../apis/DocsApi.js";

export interface DocsApiDocsGetRequest {
}

export interface DocsApiDocsOpenapiYamlGetRequest {
}

export class ObjectDocsApi {
    private api: ObservableDocsApi

    public constructor(configuration: Configuration, requestFactory?: DocsApiRequestFactory, responseProcessor?: DocsApiResponseProcessor) {
        this.api = new ObservableDocsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * OpenAPI Documentation
     * @param param the request object
     */
    public docsGetWithHttpInfo(param: DocsApiDocsGetRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<void>> {
        return this.api.docsGetWithHttpInfo( options).toPromise();
    }

    /**
     * OpenAPI Documentation
     * @param param the request object
     */
    public docsGet(param: DocsApiDocsGetRequest = {}, options?: ConfigurationOptions): Promise<void> {
        return this.api.docsGet( options).toPromise();
    }

    /**
     * @param param the request object
     */
    public docsOpenapiYamlGetWithHttpInfo(param: DocsApiDocsOpenapiYamlGetRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<void>> {
        return this.api.docsOpenapiYamlGetWithHttpInfo( options).toPromise();
    }

    /**
     * @param param the request object
     */
    public docsOpenapiYamlGet(param: DocsApiDocsOpenapiYamlGetRequest = {}, options?: ConfigurationOptions): Promise<void> {
        return this.api.docsOpenapiYamlGet( options).toPromise();
    }

}

import { ObservableDocumentsApi } from "./ObservableAPI.js";
import { DocumentsApiRequestFactory, DocumentsApiResponseProcessor} from "../apis/DocumentsApi.js";

export interface DocumentsApiGetCorrespondentsRequest {
}

export interface DocumentsApiGetDocumentTypesRequest {
}

export interface DocumentsApiGetEntityValuesRequest {
    /**
     * The entity type to retrieve values for
     * Defaults to: undefined
     * @type EntityValueType
     * @memberof DocumentsApigetEntityValues
     */
    type: EntityValueType
}

export interface DocumentsApiGetTagsRequest {
}

export interface DocumentsApiListDocumentsRequest {
    /**
     * Tag ID to filter documents
     * Defaults to: undefined
     * @type string
     * @memberof DocumentsApilistDocuments
     */
    tag: string
    /**
     * Maximum number of documents to return (upper limit)
     * Defaults to: undefined
     * @type number
     * @memberof DocumentsApilistDocuments
     */
    limit?: number
    /**
     * Cursor returned from prior queries
     * Defaults to: undefined
     * @type string
     * @memberof DocumentsApilistDocuments
     */
    cursor?: string
}

export class ObjectDocumentsApi {
    private api: ObservableDocumentsApi

    public constructor(configuration: Configuration, requestFactory?: DocumentsApiRequestFactory, responseProcessor?: DocumentsApiResponseProcessor) {
        this.api = new ObservableDocumentsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Retrieve all correspondents from Paperless-NGX
     * Get all available correspondents
     * @param param the request object
     */
    public getCorrespondentsWithHttpInfo(param: DocumentsApiGetCorrespondentsRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<GetCorrespondents200Response>> {
        return this.api.getCorrespondentsWithHttpInfo( options).toPromise();
    }

    /**
     * Retrieve all correspondents from Paperless-NGX
     * Get all available correspondents
     * @param param the request object
     */
    public getCorrespondents(param: DocumentsApiGetCorrespondentsRequest = {}, options?: ConfigurationOptions): Promise<GetCorrespondents200Response> {
        return this.api.getCorrespondents( options).toPromise();
    }

    /**
     * Retrieve all document types from Paperless-NGX
     * Get all available document types
     * @param param the request object
     */
    public getDocumentTypesWithHttpInfo(param: DocumentsApiGetDocumentTypesRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<GetDocumentTypes200Response>> {
        return this.api.getDocumentTypesWithHttpInfo( options).toPromise();
    }

    /**
     * Retrieve all document types from Paperless-NGX
     * Get all available document types
     * @param param the request object
     */
    public getDocumentTypes(param: DocumentsApiGetDocumentTypesRequest = {}, options?: ConfigurationOptions): Promise<GetDocumentTypes200Response> {
        return this.api.getDocumentTypes( options).toPromise();
    }

    /**
     * Retrieve all available values for a given entity type (tags, correspondents, document types). Returns a uniform list of id/name pairs regardless of entity type, keeping the frontend decoupled from entity-type-specific endpoints. 
     * Get available values for an entity type
     * @param param the request object
     */
    public getEntityValuesWithHttpInfo(param: DocumentsApiGetEntityValuesRequest, options?: ConfigurationOptions): Promise<HttpInfo<EntityValuesResponse>> {
        return this.api.getEntityValuesWithHttpInfo(param.type,  options).toPromise();
    }

    /**
     * Retrieve all available values for a given entity type (tags, correspondents, document types). Returns a uniform list of id/name pairs regardless of entity type, keeping the frontend decoupled from entity-type-specific endpoints. 
     * Get available values for an entity type
     * @param param the request object
     */
    public getEntityValues(param: DocumentsApiGetEntityValuesRequest, options?: ConfigurationOptions): Promise<EntityValuesResponse> {
        return this.api.getEntityValues(param.type,  options).toPromise();
    }

    /**
     * Retrieve all tags from Paperless-NGX
     * Get all available tags
     * @param param the request object
     */
    public getTagsWithHttpInfo(param: DocumentsApiGetTagsRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<GetTags200Response>> {
        return this.api.getTagsWithHttpInfo( options).toPromise();
    }

    /**
     * Retrieve all tags from Paperless-NGX
     * Get all available tags
     * @param param the request object
     */
    public getTags(param: DocumentsApiGetTagsRequest = {}, options?: ConfigurationOptions): Promise<GetTags200Response> {
        return this.api.getTags( options).toPromise();
    }

    /**
     * Retrieve documents from Paperless-NGX filtered by tag ID
     * List documents by tag
     * @param param the request object
     */
    public listDocumentsWithHttpInfo(param: DocumentsApiListDocumentsRequest, options?: ConfigurationOptions): Promise<HttpInfo<DocumentsListWithPagination>> {
        return this.api.listDocumentsWithHttpInfo(param.tag, param.limit, param.cursor,  options).toPromise();
    }

    /**
     * Retrieve documents from Paperless-NGX filtered by tag ID
     * List documents by tag
     * @param param the request object
     */
    public listDocuments(param: DocumentsApiListDocumentsRequest, options?: ConfigurationOptions): Promise<DocumentsListWithPagination> {
        return this.api.listDocuments(param.tag, param.limit, param.cursor,  options).toPromise();
    }

}

import { ObservableEntityDescriptionsApi } from "./ObservableAPI.js";
import { EntityDescriptionsApiRequestFactory, EntityDescriptionsApiResponseProcessor} from "../apis/EntityDescriptionsApi.js";

export interface EntityDescriptionsApiEntityDescriptionsGetRequest {
}

export interface EntityDescriptionsApiEntityDescriptionsSyncPostRequest {
}

export interface EntityDescriptionsApiEntityDescriptionsTypeIdPutRequest {
    /**
     * 
     * Defaults to: undefined
     * @type &#39;tag&#39; | &#39;correspondent&#39; | &#39;document_type&#39;
     * @memberof EntityDescriptionsApientityDescriptionsTypeIdPut
     */
    type: 'tag' | 'correspondent' | 'document_type'
    /**
     * 
     * Defaults to: undefined
     * @type number
     * @memberof EntityDescriptionsApientityDescriptionsTypeIdPut
     */
    id: number
    /**
     * 
     * @type UpdateEntityDescriptionRequest
     * @memberof EntityDescriptionsApientityDescriptionsTypeIdPut
     */
    updateEntityDescriptionRequest: UpdateEntityDescriptionRequest
}

export class ObjectEntityDescriptionsApi {
    private api: ObservableEntityDescriptionsApi

    public constructor(configuration: Configuration, requestFactory?: EntityDescriptionsApiRequestFactory, responseProcessor?: EntityDescriptionsApiResponseProcessor) {
        this.api = new ObservableEntityDescriptionsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Returns all registered entity types (tags, correspondents, document types) with their entities and descriptions. All types are always present; entities may be empty if sync has not yet run.
     * Get all entity types with descriptions
     * @param param the request object
     */
    public entityDescriptionsGetWithHttpInfo(param: EntityDescriptionsApiEntityDescriptionsGetRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<EntityDescriptionsResponse>> {
        return this.api.entityDescriptionsGetWithHttpInfo( options).toPromise();
    }

    /**
     * Returns all registered entity types (tags, correspondents, document types) with their entities and descriptions. All types are always present; entities may be empty if sync has not yet run.
     * Get all entity types with descriptions
     * @param param the request object
     */
    public entityDescriptionsGet(param: EntityDescriptionsApiEntityDescriptionsGetRequest = {}, options?: ConfigurationOptions): Promise<EntityDescriptionsResponse> {
        return this.api.entityDescriptionsGet( options).toPromise();
    }

    /**
     * Fetches all entities from Paperless and syncs them into the local database.
     * Trigger manual entity sync
     * @param param the request object
     */
    public entityDescriptionsSyncPostWithHttpInfo(param: EntityDescriptionsApiEntityDescriptionsSyncPostRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<OperationResult>> {
        return this.api.entityDescriptionsSyncPostWithHttpInfo( options).toPromise();
    }

    /**
     * Fetches all entities from Paperless and syncs them into the local database.
     * Trigger manual entity sync
     * @param param the request object
     */
    public entityDescriptionsSyncPost(param: EntityDescriptionsApiEntityDescriptionsSyncPostRequest = {}, options?: ConfigurationOptions): Promise<OperationResult> {
        return this.api.entityDescriptionsSyncPost( options).toPromise();
    }

    /**
     * Update entity description
     * @param param the request object
     */
    public entityDescriptionsTypeIdPutWithHttpInfo(param: EntityDescriptionsApiEntityDescriptionsTypeIdPutRequest, options?: ConfigurationOptions): Promise<HttpInfo<OperationResult>> {
        return this.api.entityDescriptionsTypeIdPutWithHttpInfo(param.type, param.id, param.updateEntityDescriptionRequest,  options).toPromise();
    }

    /**
     * Update entity description
     * @param param the request object
     */
    public entityDescriptionsTypeIdPut(param: EntityDescriptionsApiEntityDescriptionsTypeIdPutRequest, options?: ConfigurationOptions): Promise<OperationResult> {
        return this.api.entityDescriptionsTypeIdPut(param.type, param.id, param.updateEntityDescriptionRequest,  options).toPromise();
    }

}

import { ObservableHealthApi } from "./ObservableAPI.js";
import { HealthApiRequestFactory, HealthApiResponseProcessor} from "../apis/HealthApi.js";

export interface HealthApiGetHealthRequest {
}

export interface HealthApiGetSystemStatusRequest {
}

export class ObjectHealthApi {
    private api: ObservableHealthApi

    public constructor(configuration: Configuration, requestFactory?: HealthApiRequestFactory, responseProcessor?: HealthApiResponseProcessor) {
        this.api = new ObservableHealthApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Returns a basic health status indicating the API is responsive
     * Simple health check
     * @param param the request object
     */
    public getHealthWithHttpInfo(param: HealthApiGetHealthRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<HealthStatus>> {
        return this.api.getHealthWithHttpInfo( options).toPromise();
    }

    /**
     * Returns a basic health status indicating the API is responsive
     * Simple health check
     * @param param the request object
     */
    public getHealth(param: HealthApiGetHealthRequest = {}, options?: ConfigurationOptions): Promise<HealthStatus> {
        return this.api.getHealth( options).toPromise();
    }

    /**
     * Returns comprehensive health information for all system components including database, Paperless-NGX, and LLM services
     * Detailed system health status
     * @param param the request object
     */
    public getSystemStatusWithHttpInfo(param: HealthApiGetSystemStatusRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<SystemHealthResponse>> {
        return this.api.getSystemStatusWithHttpInfo( options).toPromise();
    }

    /**
     * Returns comprehensive health information for all system components including database, Paperless-NGX, and LLM services
     * Detailed system health status
     * @param param the request object
     */
    public getSystemStatus(param: HealthApiGetSystemStatusRequest = {}, options?: ConfigurationOptions): Promise<SystemHealthResponse> {
        return this.api.getSystemStatus( options).toPromise();
    }

}

import { ObservableJobsApi } from "./ObservableAPI.js";
import { JobsApiRequestFactory, JobsApiResponseProcessor} from "../apis/JobsApi.js";

export interface JobsApiGetAvailableFieldsRequest {
}

export interface JobsApiGetJobRequest {
    /**
     * Job ID
     * Defaults to: undefined
     * @type string
     * @memberof JobsApigetJob
     */
    id: string
}

export interface JobsApiGetJobAuditLogRequest {
    /**
     * Job ID
     * Defaults to: undefined
     * @type string
     * @memberof JobsApigetJobAuditLog
     */
    id: string
}

export interface JobsApiGetJobStatsRequest {
}

export interface JobsApiGetJobStepsRequest {
    /**
     * Job ID
     * Defaults to: undefined
     * @type string
     * @memberof JobsApigetJobSteps
     */
    id: string
}

export interface JobsApiGetJobTypesRequest {
}

export interface JobsApiListJobsRequest {
    /**
     * Maximum number of jobs to return (default 50, max 100)
     * Minimum: 1
     * Maximum: 100
     * Defaults to: 50
     * @type number
     * @memberof JobsApilistJobs
     */
    limit?: number
    /**
     * Pagination cursor from a previous response
     * Defaults to: undefined
     * @type string
     * @memberof JobsApilistJobs
     */
    cursor?: string
    /**
     * Filter jobs by state
     * Defaults to: undefined
     * @type JobState
     * @memberof JobsApilistJobs
     */
    state?: JobState
}

export interface JobsApiSubmitJobRequest {
    /**
     * 
     * @type BatchJobRequest
     * @memberof JobsApisubmitJob
     */
    batchJobRequest: BatchJobRequest
}

export class ObjectJobsApi {
    private api: ObservableJobsApi

    public constructor(configuration: Configuration, requestFactory?: JobsApiRequestFactory, responseProcessor?: JobsApiResponseProcessor) {
        this.api = new ObservableJobsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Returns available fields for LLM generation
     * @param param the request object
     */
    public getAvailableFieldsWithHttpInfo(param: JobsApiGetAvailableFieldsRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<Array<string>>> {
        return this.api.getAvailableFieldsWithHttpInfo( options).toPromise();
    }

    /**
     * Returns available fields for LLM generation
     * @param param the request object
     */
    public getAvailableFields(param: JobsApiGetAvailableFieldsRequest = {}, options?: ConfigurationOptions): Promise<Array<string>> {
        return this.api.getAvailableFields( options).toPromise();
    }

    /**
     * Retrieve detailed information about a specific job including its current status and document actions
     * Get job details
     * @param param the request object
     */
    public getJobWithHttpInfo(param: JobsApiGetJobRequest, options?: ConfigurationOptions): Promise<HttpInfo<JobResponse>> {
        return this.api.getJobWithHttpInfo(param.id,  options).toPromise();
    }

    /**
     * Retrieve detailed information about a specific job including its current status and document actions
     * Get job details
     * @param param the request object
     */
    public getJob(param: JobsApiGetJobRequest, options?: ConfigurationOptions): Promise<JobResponse> {
        return this.api.getJob(param.id,  options).toPromise();
    }

    /**
     * Retrieve the complete audit trail for a specific job, including all step executions, retries, approvals, and state changes
     * Get job audit log
     * @param param the request object
     */
    public getJobAuditLogWithHttpInfo(param: JobsApiGetJobAuditLogRequest, options?: ConfigurationOptions): Promise<HttpInfo<AuditLogResponse>> {
        return this.api.getJobAuditLogWithHttpInfo(param.id,  options).toPromise();
    }

    /**
     * Retrieve the complete audit trail for a specific job, including all step executions, retries, approvals, and state changes
     * Get job audit log
     * @param param the request object
     */
    public getJobAuditLog(param: JobsApiGetJobAuditLogRequest, options?: ConfigurationOptions): Promise<AuditLogResponse> {
        return this.api.getJobAuditLog(param.id,  options).toPromise();
    }

    /**
     * Returns count of jobs grouped by their current state
     * Get job statistics
     * @param param the request object
     */
    public getJobStatsWithHttpInfo(param: JobsApiGetJobStatsRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<JobStats>> {
        return this.api.getJobStatsWithHttpInfo( options).toPromise();
    }

    /**
     * Returns count of jobs grouped by their current state
     * Get job statistics
     * @param param the request object
     */
    public getJobStats(param: JobsApiGetJobStatsRequest = {}, options?: ConfigurationOptions): Promise<JobStats> {
        return this.api.getJobStats( options).toPromise();
    }

    /**
     * Retrieve all workflow steps for a specific job including their execution status and retry information
     * Get job workflow steps
     * @param param the request object
     */
    public getJobStepsWithHttpInfo(param: JobsApiGetJobStepsRequest, options?: ConfigurationOptions): Promise<HttpInfo<JobStepsResponse>> {
        return this.api.getJobStepsWithHttpInfo(param.id,  options).toPromise();
    }

    /**
     * Retrieve all workflow steps for a specific job including their execution status and retry information
     * Get job workflow steps
     * @param param the request object
     */
    public getJobSteps(param: JobsApiGetJobStepsRequest, options?: ConfigurationOptions): Promise<JobStepsResponse> {
        return this.api.getJobSteps(param.id,  options).toPromise();
    }

    /**
     * Returns all supported workflow types that can be submitted
     * List available job types
     * @param param the request object
     */
    public getJobTypesWithHttpInfo(param: JobsApiGetJobTypesRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<GetJobTypes200Response>> {
        return this.api.getJobTypesWithHttpInfo( options).toPromise();
    }

    /**
     * Returns all supported workflow types that can be submitted
     * List available job types
     * @param param the request object
     */
    public getJobTypes(param: JobsApiGetJobTypesRequest = {}, options?: ConfigurationOptions): Promise<GetJobTypes200Response> {
        return this.api.getJobTypes( options).toPromise();
    }

    /**
     * Retrieve a paginated list of jobs, optionally filtered by job state
     * List jobs with pagination
     * @param param the request object
     */
    public listJobsWithHttpInfo(param: JobsApiListJobsRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<JobListResponse>> {
        return this.api.listJobsWithHttpInfo(param.limit, param.cursor, param.state,  options).toPromise();
    }

    /**
     * Retrieve a paginated list of jobs, optionally filtered by job state
     * List jobs with pagination
     * @param param the request object
     */
    public listJobs(param: JobsApiListJobsRequest = {}, options?: ConfigurationOptions): Promise<JobListResponse> {
        return this.api.listJobs(param.limit, param.cursor, param.state,  options).toPromise();
    }

    /**
     * Submit one or more documents for processing. Each document can have multiple job types. Jobs are processed asynchronously through a multi-step workflow. 
     * Submit batch job
     * @param param the request object
     */
    public submitJobWithHttpInfo(param: JobsApiSubmitJobRequest, options?: ConfigurationOptions): Promise<HttpInfo<JobSubmissionResponse>> {
        return this.api.submitJobWithHttpInfo(param.batchJobRequest,  options).toPromise();
    }

    /**
     * Submit one or more documents for processing. Each document can have multiple job types. Jobs are processed asynchronously through a multi-step workflow. 
     * Submit batch job
     * @param param the request object
     */
    public submitJob(param: JobsApiSubmitJobRequest, options?: ConfigurationOptions): Promise<JobSubmissionResponse> {
        return this.api.submitJob(param.batchJobRequest,  options).toPromise();
    }

}

import { ObservablePromptsApi } from "./ObservableAPI.js";
import { PromptsApiRequestFactory, PromptsApiResponseProcessor} from "../apis/PromptsApi.js";

export interface PromptsApiListPromptsRequest {
}

export interface PromptsApiUpdatePromptRequest {
    /**
     * Step type for the prompt
     * Defaults to: undefined
     * @type StepType
     * @memberof PromptsApiupdatePrompt
     */
    stepType: StepType
    /**
     * 
     * @type UpdatePromptRequest
     * @memberof PromptsApiupdatePrompt
     */
    updatePromptRequest: UpdatePromptRequest
}

export class ObjectPromptsApi {
    private api: ObservablePromptsApi

    public constructor(configuration: Configuration, requestFactory?: PromptsApiRequestFactory, responseProcessor?: PromptsApiResponseProcessor) {
        this.api = new ObservablePromptsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Retrieve all LLM prompt templates configured in the system
     * List all prompts
     * @param param the request object
     */
    public listPromptsWithHttpInfo(param: PromptsApiListPromptsRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<PromptsListResponse>> {
        return this.api.listPromptsWithHttpInfo( options).toPromise();
    }

    /**
     * Retrieve all LLM prompt templates configured in the system
     * List all prompts
     * @param param the request object
     */
    public listPrompts(param: PromptsApiListPromptsRequest = {}, options?: ConfigurationOptions): Promise<PromptsListResponse> {
        return this.api.listPrompts( options).toPromise();
    }

    /**
     * Update an existing prompt template or create a new one for the specified step type. The version number is automatically incremented. 
     * Update or create prompt
     * @param param the request object
     */
    public updatePromptWithHttpInfo(param: PromptsApiUpdatePromptRequest, options?: ConfigurationOptions): Promise<HttpInfo<PromptResponse>> {
        return this.api.updatePromptWithHttpInfo(param.stepType, param.updatePromptRequest,  options).toPromise();
    }

    /**
     * Update an existing prompt template or create a new one for the specified step type. The version number is automatically incremented. 
     * Update or create prompt
     * @param param the request object
     */
    public updatePrompt(param: PromptsApiUpdatePromptRequest, options?: ConfigurationOptions): Promise<PromptResponse> {
        return this.api.updatePrompt(param.stepType, param.updatePromptRequest,  options).toPromise();
    }

}

import { ObservableQueueApi } from "./ObservableAPI.js";
import { QueueApiRequestFactory, QueueApiResponseProcessor} from "../apis/QueueApi.js";

export interface QueueApiGetQueueStatsRequest {
}

export interface QueueApiListQueueItemsRequest {
    /**
     * Maximum number of items to return
     * Minimum: 1
     * Maximum: 100
     * Defaults to: 50
     * @type number
     * @memberof QueueApilistQueueItems
     */
    limit?: number
    /**
     * Pagination cursor from a previous response
     * Defaults to: undefined
     * @type string
     * @memberof QueueApilistQueueItems
     */
    cursor?: string
    /**
     * Filter by work item status
     * Defaults to: undefined
     * @type WorkItemStatus
     * @memberof QueueApilistQueueItems
     */
    status?: WorkItemStatus
}

export class ObjectQueueApi {
    private api: ObservableQueueApi

    public constructor(configuration: Configuration, requestFactory?: QueueApiRequestFactory, responseProcessor?: QueueApiResponseProcessor) {
        this.api = new ObservableQueueApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Returns aggregated statistics for all queue items across the system
     * Get unified queue statistics
     * @param param the request object
     */
    public getQueueStatsWithHttpInfo(param: QueueApiGetQueueStatsRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<QueueStats>> {
        return this.api.getQueueStatsWithHttpInfo( options).toPromise();
    }

    /**
     * Returns aggregated statistics for all queue items across the system
     * Get unified queue statistics
     * @param param the request object
     */
    public getQueueStats(param: QueueApiGetQueueStatsRequest = {}, options?: ConfigurationOptions): Promise<QueueStats> {
        return this.api.getQueueStats( options).toPromise();
    }

    /**
     * Retrieve a paginated list of queue items, optionally filtered by status
     * List queue items
     * @param param the request object
     */
    public listQueueItemsWithHttpInfo(param: QueueApiListQueueItemsRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<QueueItemsResponse>> {
        return this.api.listQueueItemsWithHttpInfo(param.limit, param.cursor, param.status,  options).toPromise();
    }

    /**
     * Retrieve a paginated list of queue items, optionally filtered by status
     * List queue items
     * @param param the request object
     */
    public listQueueItems(param: QueueApiListQueueItemsRequest = {}, options?: ConfigurationOptions): Promise<QueueItemsResponse> {
        return this.api.listQueueItems(param.limit, param.cursor, param.status,  options).toPromise();
    }

}

import { ObservableStatsApi } from "./ObservableAPI.js";
import { StatsApiRequestFactory, StatsApiResponseProcessor} from "../apis/StatsApi.js";

export interface StatsApiStatsDashboardGetRequest {
}

export class ObjectStatsApi {
    private api: ObservableStatsApi

    public constructor(configuration: Configuration, requestFactory?: StatsApiRequestFactory, responseProcessor?: StatsApiResponseProcessor) {
        this.api = new ObservableStatsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Summarized statistics for in progress
     * @param param the request object
     */
    public statsDashboardGetWithHttpInfo(param: StatsApiStatsDashboardGetRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<DashboardStats>> {
        return this.api.statsDashboardGetWithHttpInfo( options).toPromise();
    }

    /**
     * Summarized statistics for in progress
     * @param param the request object
     */
    public statsDashboardGet(param: StatsApiStatsDashboardGetRequest = {}, options?: ConfigurationOptions): Promise<DashboardStats> {
        return this.api.statsDashboardGet( options).toPromise();
    }

}

import { ObservableStepsApi } from "./ObservableAPI.js";
import { StepsApiRequestFactory, StepsApiResponseProcessor} from "../apis/StepsApi.js";

export interface StepsApiCancelStepRequest {
    /**
     * Step ID to cancel
     * Defaults to: undefined
     * @type string
     * @memberof StepsApicancelStep
     */
    id: string
}

export interface StepsApiRetryStepRequest {
    /**
     * Step ID to retry
     * Defaults to: undefined
     * @type string
     * @memberof StepsApiretryStep
     */
    id: string
}

export class ObjectStepsApi {
    private api: ObservableStepsApi

    public constructor(configuration: Configuration, requestFactory?: StepsApiRequestFactory, responseProcessor?: StepsApiResponseProcessor) {
        this.api = new ObservableStepsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Cancel a step by marking it as FAILED with a cancellation message. This also marks the parent job as FAILED. 
     * Cancel a step
     * @param param the request object
     */
    public cancelStepWithHttpInfo(param: StepsApiCancelStepRequest, options?: ConfigurationOptions): Promise<HttpInfo<OperationResult>> {
        return this.api.cancelStepWithHttpInfo(param.id,  options).toPromise();
    }

    /**
     * Cancel a step by marking it as FAILED with a cancellation message. This also marks the parent job as FAILED. 
     * Cancel a step
     * @param param the request object
     */
    public cancelStep(param: StepsApiCancelStepRequest, options?: ConfigurationOptions): Promise<OperationResult> {
        return this.api.cancelStep(param.id,  options).toPromise();
    }

    /**
     * Trigger a manual retry for a failed step. The step will be reset to WAITING status and re-queued for execution. This bypasses the automatic retry mechanism. 
     * Manually retry a failed step
     * @param param the request object
     */
    public retryStepWithHttpInfo(param: StepsApiRetryStepRequest, options?: ConfigurationOptions): Promise<HttpInfo<OperationResult>> {
        return this.api.retryStepWithHttpInfo(param.id,  options).toPromise();
    }

    /**
     * Trigger a manual retry for a failed step. The step will be reset to WAITING status and re-queued for execution. This bypasses the automatic retry mechanism. 
     * Manually retry a failed step
     * @param param the request object
     */
    public retryStep(param: StepsApiRetryStepRequest, options?: ConfigurationOptions): Promise<OperationResult> {
        return this.api.retryStep(param.id,  options).toPromise();
    }

}
