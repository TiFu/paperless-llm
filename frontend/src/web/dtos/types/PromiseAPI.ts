import { ResponseContext, RequestContext, HttpFile, HttpInfo } from '../http/http.js';
import { Configuration, PromiseConfigurationOptions, wrapOptions } from '../configuration.js'
import { PromiseMiddleware, Middleware, PromiseMiddlewareWrapper } from '../middleware.js';

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
import { ObservableApprovalsApi } from './ObservableAPI.js';

import { ApprovalsApiRequestFactory, ApprovalsApiResponseProcessor} from "../apis/ApprovalsApi.js";
export class PromiseApprovalsApi {
    private api: ObservableApprovalsApi

    public constructor(
        configuration: Configuration,
        requestFactory?: ApprovalsApiRequestFactory,
        responseProcessor?: ApprovalsApiResponseProcessor
    ) {
        this.api = new ObservableApprovalsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Returns count of pending approval requests
     * Get approval statistics
     */
    public getApprovalStatsWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<ApprovalStats>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getApprovalStatsWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Returns count of pending approval requests
     * Get approval statistics
     */
    public getApprovalStats(_options?: PromiseConfigurationOptions): Promise<ApprovalStats> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getApprovalStats(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve a paginated list of steps awaiting approval decisions
     * List pending approvals
     * @param [limit] Maximum number of approvals to return
     * @param [cursor] Pagination cursor from a previous response
     */
    public listApprovalsWithHttpInfo(limit?: number, cursor?: string, _options?: PromiseConfigurationOptions): Promise<HttpInfo<ApprovalsResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.listApprovalsWithHttpInfo(limit, cursor, observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve a paginated list of steps awaiting approval decisions
     * List pending approvals
     * @param [limit] Maximum number of approvals to return
     * @param [cursor] Pagination cursor from a previous response
     */
    public listApprovals(limit?: number, cursor?: string, _options?: PromiseConfigurationOptions): Promise<ApprovalsResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.listApprovals(limit, cursor, observableOptions);
        return result.toPromise();
    }

    /**
     * Submit an approval decision (approve/reject) for a pending step. The decision must match one of the possibleDecisions from the approval item. 
     * Make approval decision
     * @param stepId Step ID awaiting approval
     * @param makeApprovalDecisionRequest
     */
    public makeApprovalDecisionWithHttpInfo(stepId: string, makeApprovalDecisionRequest: MakeApprovalDecisionRequest, _options?: PromiseConfigurationOptions): Promise<HttpInfo<MakeApprovalDecision200Response>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.makeApprovalDecisionWithHttpInfo(stepId, makeApprovalDecisionRequest, observableOptions);
        return result.toPromise();
    }

    /**
     * Submit an approval decision (approve/reject) for a pending step. The decision must match one of the possibleDecisions from the approval item. 
     * Make approval decision
     * @param stepId Step ID awaiting approval
     * @param makeApprovalDecisionRequest
     */
    public makeApprovalDecision(stepId: string, makeApprovalDecisionRequest: MakeApprovalDecisionRequest, _options?: PromiseConfigurationOptions): Promise<MakeApprovalDecision200Response> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.makeApprovalDecision(stepId, makeApprovalDecisionRequest, observableOptions);
        return result.toPromise();
    }


}



import { ObservableDocsApi } from './ObservableAPI.js';

import { DocsApiRequestFactory, DocsApiResponseProcessor} from "../apis/DocsApi.js";
export class PromiseDocsApi {
    private api: ObservableDocsApi

    public constructor(
        configuration: Configuration,
        requestFactory?: DocsApiRequestFactory,
        responseProcessor?: DocsApiResponseProcessor
    ) {
        this.api = new ObservableDocsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * OpenAPI Documentation
     */
    public docsGetWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<void>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.docsGetWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * OpenAPI Documentation
     */
    public docsGet(_options?: PromiseConfigurationOptions): Promise<void> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.docsGet(observableOptions);
        return result.toPromise();
    }

    /**
     */
    public docsOpenapiYamlGetWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<void>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.docsOpenapiYamlGetWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     */
    public docsOpenapiYamlGet(_options?: PromiseConfigurationOptions): Promise<void> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.docsOpenapiYamlGet(observableOptions);
        return result.toPromise();
    }


}



import { ObservableDocumentsApi } from './ObservableAPI.js';

import { DocumentsApiRequestFactory, DocumentsApiResponseProcessor} from "../apis/DocumentsApi.js";
export class PromiseDocumentsApi {
    private api: ObservableDocumentsApi

    public constructor(
        configuration: Configuration,
        requestFactory?: DocumentsApiRequestFactory,
        responseProcessor?: DocumentsApiResponseProcessor
    ) {
        this.api = new ObservableDocumentsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Retrieve all correspondents from Paperless-NGX
     * Get all available correspondents
     */
    public getCorrespondentsWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<GetCorrespondents200Response>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getCorrespondentsWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve all correspondents from Paperless-NGX
     * Get all available correspondents
     */
    public getCorrespondents(_options?: PromiseConfigurationOptions): Promise<GetCorrespondents200Response> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getCorrespondents(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve all document types from Paperless-NGX
     * Get all available document types
     */
    public getDocumentTypesWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<GetDocumentTypes200Response>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getDocumentTypesWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve all document types from Paperless-NGX
     * Get all available document types
     */
    public getDocumentTypes(_options?: PromiseConfigurationOptions): Promise<GetDocumentTypes200Response> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getDocumentTypes(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve all available values for a given entity type (tags, correspondents, document types). Returns a uniform list of id/name pairs regardless of entity type, keeping the frontend decoupled from entity-type-specific endpoints. 
     * Get available values for an entity type
     * @param type The entity type to retrieve values for
     */
    public getEntityValuesWithHttpInfo(type: EntityValueType, _options?: PromiseConfigurationOptions): Promise<HttpInfo<EntityValuesResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getEntityValuesWithHttpInfo(type, observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve all available values for a given entity type (tags, correspondents, document types). Returns a uniform list of id/name pairs regardless of entity type, keeping the frontend decoupled from entity-type-specific endpoints. 
     * Get available values for an entity type
     * @param type The entity type to retrieve values for
     */
    public getEntityValues(type: EntityValueType, _options?: PromiseConfigurationOptions): Promise<EntityValuesResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getEntityValues(type, observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve all tags from Paperless-NGX
     * Get all available tags
     */
    public getTagsWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<GetTags200Response>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getTagsWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve all tags from Paperless-NGX
     * Get all available tags
     */
    public getTags(_options?: PromiseConfigurationOptions): Promise<GetTags200Response> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getTags(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve documents from Paperless-NGX filtered by tag ID
     * List documents by tag
     * @param tag Tag ID to filter documents
     * @param [limit] Maximum number of documents to return (upper limit)
     * @param [cursor] Cursor returned from prior queries
     */
    public listDocumentsWithHttpInfo(tag: string, limit?: number, cursor?: string, _options?: PromiseConfigurationOptions): Promise<HttpInfo<DocumentsListWithPagination>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.listDocumentsWithHttpInfo(tag, limit, cursor, observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve documents from Paperless-NGX filtered by tag ID
     * List documents by tag
     * @param tag Tag ID to filter documents
     * @param [limit] Maximum number of documents to return (upper limit)
     * @param [cursor] Cursor returned from prior queries
     */
    public listDocuments(tag: string, limit?: number, cursor?: string, _options?: PromiseConfigurationOptions): Promise<DocumentsListWithPagination> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.listDocuments(tag, limit, cursor, observableOptions);
        return result.toPromise();
    }


}



import { ObservableEntityDescriptionsApi } from './ObservableAPI.js';

import { EntityDescriptionsApiRequestFactory, EntityDescriptionsApiResponseProcessor} from "../apis/EntityDescriptionsApi.js";
export class PromiseEntityDescriptionsApi {
    private api: ObservableEntityDescriptionsApi

    public constructor(
        configuration: Configuration,
        requestFactory?: EntityDescriptionsApiRequestFactory,
        responseProcessor?: EntityDescriptionsApiResponseProcessor
    ) {
        this.api = new ObservableEntityDescriptionsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Returns all registered entity types (tags, correspondents, document types) with their entities and descriptions. All types are always present; entities may be empty if sync has not yet run.
     * Get all entity types with descriptions
     */
    public entityDescriptionsGetWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<EntityDescriptionsResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.entityDescriptionsGetWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Returns all registered entity types (tags, correspondents, document types) with their entities and descriptions. All types are always present; entities may be empty if sync has not yet run.
     * Get all entity types with descriptions
     */
    public entityDescriptionsGet(_options?: PromiseConfigurationOptions): Promise<EntityDescriptionsResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.entityDescriptionsGet(observableOptions);
        return result.toPromise();
    }

    /**
     * Fetches all entities from Paperless and syncs them into the local database.
     * Trigger manual entity sync
     */
    public entityDescriptionsSyncPostWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<OperationResult>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.entityDescriptionsSyncPostWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Fetches all entities from Paperless and syncs them into the local database.
     * Trigger manual entity sync
     */
    public entityDescriptionsSyncPost(_options?: PromiseConfigurationOptions): Promise<OperationResult> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.entityDescriptionsSyncPost(observableOptions);
        return result.toPromise();
    }

    /**
     * Update entity description
     * @param type
     * @param id
     * @param updateEntityDescriptionRequest
     */
    public entityDescriptionsTypeIdPutWithHttpInfo(type: 'tag' | 'correspondent' | 'document_type', id: number, updateEntityDescriptionRequest: UpdateEntityDescriptionRequest, _options?: PromiseConfigurationOptions): Promise<HttpInfo<OperationResult>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.entityDescriptionsTypeIdPutWithHttpInfo(type, id, updateEntityDescriptionRequest, observableOptions);
        return result.toPromise();
    }

    /**
     * Update entity description
     * @param type
     * @param id
     * @param updateEntityDescriptionRequest
     */
    public entityDescriptionsTypeIdPut(type: 'tag' | 'correspondent' | 'document_type', id: number, updateEntityDescriptionRequest: UpdateEntityDescriptionRequest, _options?: PromiseConfigurationOptions): Promise<OperationResult> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.entityDescriptionsTypeIdPut(type, id, updateEntityDescriptionRequest, observableOptions);
        return result.toPromise();
    }


}



import { ObservableHealthApi } from './ObservableAPI.js';

import { HealthApiRequestFactory, HealthApiResponseProcessor} from "../apis/HealthApi.js";
export class PromiseHealthApi {
    private api: ObservableHealthApi

    public constructor(
        configuration: Configuration,
        requestFactory?: HealthApiRequestFactory,
        responseProcessor?: HealthApiResponseProcessor
    ) {
        this.api = new ObservableHealthApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Returns a basic health status indicating the API is responsive
     * Simple health check
     */
    public getHealthWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<HealthStatus>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getHealthWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Returns a basic health status indicating the API is responsive
     * Simple health check
     */
    public getHealth(_options?: PromiseConfigurationOptions): Promise<HealthStatus> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getHealth(observableOptions);
        return result.toPromise();
    }

    /**
     * Returns comprehensive health information for all system components including database, Paperless-NGX, and LLM services
     * Detailed system health status
     */
    public getSystemStatusWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<SystemHealthResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getSystemStatusWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Returns comprehensive health information for all system components including database, Paperless-NGX, and LLM services
     * Detailed system health status
     */
    public getSystemStatus(_options?: PromiseConfigurationOptions): Promise<SystemHealthResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getSystemStatus(observableOptions);
        return result.toPromise();
    }


}



import { ObservableJobsApi } from './ObservableAPI.js';

import { JobsApiRequestFactory, JobsApiResponseProcessor} from "../apis/JobsApi.js";
export class PromiseJobsApi {
    private api: ObservableJobsApi

    public constructor(
        configuration: Configuration,
        requestFactory?: JobsApiRequestFactory,
        responseProcessor?: JobsApiResponseProcessor
    ) {
        this.api = new ObservableJobsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Returns available fields for LLM generation
     */
    public getAvailableFieldsWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<Array<string>>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getAvailableFieldsWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Returns available fields for LLM generation
     */
    public getAvailableFields(_options?: PromiseConfigurationOptions): Promise<Array<string>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getAvailableFields(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve detailed information about a specific job including its current status and document actions
     * Get job details
     * @param id Job ID
     */
    public getJobWithHttpInfo(id: string, _options?: PromiseConfigurationOptions): Promise<HttpInfo<JobResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getJobWithHttpInfo(id, observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve detailed information about a specific job including its current status and document actions
     * Get job details
     * @param id Job ID
     */
    public getJob(id: string, _options?: PromiseConfigurationOptions): Promise<JobResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getJob(id, observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve the complete audit trail for a specific job, including all step executions, retries, approvals, and state changes
     * Get job audit log
     * @param id Job ID
     */
    public getJobAuditLogWithHttpInfo(id: string, _options?: PromiseConfigurationOptions): Promise<HttpInfo<AuditLogResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getJobAuditLogWithHttpInfo(id, observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve the complete audit trail for a specific job, including all step executions, retries, approvals, and state changes
     * Get job audit log
     * @param id Job ID
     */
    public getJobAuditLog(id: string, _options?: PromiseConfigurationOptions): Promise<AuditLogResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getJobAuditLog(id, observableOptions);
        return result.toPromise();
    }

    /**
     * Returns count of jobs grouped by their current state
     * Get job statistics
     */
    public getJobStatsWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<JobStats>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getJobStatsWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Returns count of jobs grouped by their current state
     * Get job statistics
     */
    public getJobStats(_options?: PromiseConfigurationOptions): Promise<JobStats> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getJobStats(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve all workflow steps for a specific job including their execution status and retry information
     * Get job workflow steps
     * @param id Job ID
     */
    public getJobStepsWithHttpInfo(id: string, _options?: PromiseConfigurationOptions): Promise<HttpInfo<JobStepsResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getJobStepsWithHttpInfo(id, observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve all workflow steps for a specific job including their execution status and retry information
     * Get job workflow steps
     * @param id Job ID
     */
    public getJobSteps(id: string, _options?: PromiseConfigurationOptions): Promise<JobStepsResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getJobSteps(id, observableOptions);
        return result.toPromise();
    }

    /**
     * Returns all supported workflow types that can be submitted
     * List available job types
     */
    public getJobTypesWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<GetJobTypes200Response>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getJobTypesWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Returns all supported workflow types that can be submitted
     * List available job types
     */
    public getJobTypes(_options?: PromiseConfigurationOptions): Promise<GetJobTypes200Response> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getJobTypes(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve a paginated list of jobs, optionally filtered by job state
     * List jobs with pagination
     * @param [limit] Maximum number of jobs to return (default 50, max 100)
     * @param [cursor] Pagination cursor from a previous response
     * @param [state] Filter jobs by state
     */
    public listJobsWithHttpInfo(limit?: number, cursor?: string, state?: JobState, _options?: PromiseConfigurationOptions): Promise<HttpInfo<JobListResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.listJobsWithHttpInfo(limit, cursor, state, observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve a paginated list of jobs, optionally filtered by job state
     * List jobs with pagination
     * @param [limit] Maximum number of jobs to return (default 50, max 100)
     * @param [cursor] Pagination cursor from a previous response
     * @param [state] Filter jobs by state
     */
    public listJobs(limit?: number, cursor?: string, state?: JobState, _options?: PromiseConfigurationOptions): Promise<JobListResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.listJobs(limit, cursor, state, observableOptions);
        return result.toPromise();
    }

    /**
     * Submit one or more documents for processing. Each document can have multiple job types. Jobs are processed asynchronously through a multi-step workflow. 
     * Submit batch job
     * @param batchJobRequest
     */
    public submitJobWithHttpInfo(batchJobRequest: BatchJobRequest, _options?: PromiseConfigurationOptions): Promise<HttpInfo<JobSubmissionResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.submitJobWithHttpInfo(batchJobRequest, observableOptions);
        return result.toPromise();
    }

    /**
     * Submit one or more documents for processing. Each document can have multiple job types. Jobs are processed asynchronously through a multi-step workflow. 
     * Submit batch job
     * @param batchJobRequest
     */
    public submitJob(batchJobRequest: BatchJobRequest, _options?: PromiseConfigurationOptions): Promise<JobSubmissionResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.submitJob(batchJobRequest, observableOptions);
        return result.toPromise();
    }


}



import { ObservablePromptsApi } from './ObservableAPI.js';

import { PromptsApiRequestFactory, PromptsApiResponseProcessor} from "../apis/PromptsApi.js";
export class PromisePromptsApi {
    private api: ObservablePromptsApi

    public constructor(
        configuration: Configuration,
        requestFactory?: PromptsApiRequestFactory,
        responseProcessor?: PromptsApiResponseProcessor
    ) {
        this.api = new ObservablePromptsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Retrieve all LLM prompt templates configured in the system
     * List all prompts
     */
    public listPromptsWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<PromptsListResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.listPromptsWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve all LLM prompt templates configured in the system
     * List all prompts
     */
    public listPrompts(_options?: PromiseConfigurationOptions): Promise<PromptsListResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.listPrompts(observableOptions);
        return result.toPromise();
    }

    /**
     * Update an existing prompt template or create a new one for the specified step type. The version number is automatically incremented. 
     * Update or create prompt
     * @param stepType Step type for the prompt
     * @param updatePromptRequest
     */
    public updatePromptWithHttpInfo(stepType: StepType, updatePromptRequest: UpdatePromptRequest, _options?: PromiseConfigurationOptions): Promise<HttpInfo<PromptResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.updatePromptWithHttpInfo(stepType, updatePromptRequest, observableOptions);
        return result.toPromise();
    }

    /**
     * Update an existing prompt template or create a new one for the specified step type. The version number is automatically incremented. 
     * Update or create prompt
     * @param stepType Step type for the prompt
     * @param updatePromptRequest
     */
    public updatePrompt(stepType: StepType, updatePromptRequest: UpdatePromptRequest, _options?: PromiseConfigurationOptions): Promise<PromptResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.updatePrompt(stepType, updatePromptRequest, observableOptions);
        return result.toPromise();
    }


}



import { ObservableQueueApi } from './ObservableAPI.js';

import { QueueApiRequestFactory, QueueApiResponseProcessor} from "../apis/QueueApi.js";
export class PromiseQueueApi {
    private api: ObservableQueueApi

    public constructor(
        configuration: Configuration,
        requestFactory?: QueueApiRequestFactory,
        responseProcessor?: QueueApiResponseProcessor
    ) {
        this.api = new ObservableQueueApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Returns aggregated statistics for all queue items across the system
     * Get unified queue statistics
     */
    public getQueueStatsWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<QueueStats>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getQueueStatsWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Returns aggregated statistics for all queue items across the system
     * Get unified queue statistics
     */
    public getQueueStats(_options?: PromiseConfigurationOptions): Promise<QueueStats> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.getQueueStats(observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve a paginated list of queue items, optionally filtered by status
     * List queue items
     * @param [limit] Maximum number of items to return
     * @param [cursor] Pagination cursor from a previous response
     * @param [status] Filter by work item status
     */
    public listQueueItemsWithHttpInfo(limit?: number, cursor?: string, status?: WorkItemStatus, _options?: PromiseConfigurationOptions): Promise<HttpInfo<QueueItemsResponse>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.listQueueItemsWithHttpInfo(limit, cursor, status, observableOptions);
        return result.toPromise();
    }

    /**
     * Retrieve a paginated list of queue items, optionally filtered by status
     * List queue items
     * @param [limit] Maximum number of items to return
     * @param [cursor] Pagination cursor from a previous response
     * @param [status] Filter by work item status
     */
    public listQueueItems(limit?: number, cursor?: string, status?: WorkItemStatus, _options?: PromiseConfigurationOptions): Promise<QueueItemsResponse> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.listQueueItems(limit, cursor, status, observableOptions);
        return result.toPromise();
    }


}



import { ObservableStatsApi } from './ObservableAPI.js';

import { StatsApiRequestFactory, StatsApiResponseProcessor} from "../apis/StatsApi.js";
export class PromiseStatsApi {
    private api: ObservableStatsApi

    public constructor(
        configuration: Configuration,
        requestFactory?: StatsApiRequestFactory,
        responseProcessor?: StatsApiResponseProcessor
    ) {
        this.api = new ObservableStatsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Summarized statistics for in progress
     */
    public statsDashboardGetWithHttpInfo(_options?: PromiseConfigurationOptions): Promise<HttpInfo<DashboardStats>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.statsDashboardGetWithHttpInfo(observableOptions);
        return result.toPromise();
    }

    /**
     * Summarized statistics for in progress
     */
    public statsDashboardGet(_options?: PromiseConfigurationOptions): Promise<DashboardStats> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.statsDashboardGet(observableOptions);
        return result.toPromise();
    }


}



import { ObservableStepsApi } from './ObservableAPI.js';

import { StepsApiRequestFactory, StepsApiResponseProcessor} from "../apis/StepsApi.js";
export class PromiseStepsApi {
    private api: ObservableStepsApi

    public constructor(
        configuration: Configuration,
        requestFactory?: StepsApiRequestFactory,
        responseProcessor?: StepsApiResponseProcessor
    ) {
        this.api = new ObservableStepsApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * Cancel a step by marking it as FAILED with a cancellation message. This also marks the parent job as FAILED. 
     * Cancel a step
     * @param id Step ID to cancel
     */
    public cancelStepWithHttpInfo(id: string, _options?: PromiseConfigurationOptions): Promise<HttpInfo<OperationResult>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.cancelStepWithHttpInfo(id, observableOptions);
        return result.toPromise();
    }

    /**
     * Cancel a step by marking it as FAILED with a cancellation message. This also marks the parent job as FAILED. 
     * Cancel a step
     * @param id Step ID to cancel
     */
    public cancelStep(id: string, _options?: PromiseConfigurationOptions): Promise<OperationResult> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.cancelStep(id, observableOptions);
        return result.toPromise();
    }

    /**
     * Trigger a manual retry for a failed step. The step will be reset to WAITING status and re-queued for execution. This bypasses the automatic retry mechanism. 
     * Manually retry a failed step
     * @param id Step ID to retry
     */
    public retryStepWithHttpInfo(id: string, _options?: PromiseConfigurationOptions): Promise<HttpInfo<OperationResult>> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.retryStepWithHttpInfo(id, observableOptions);
        return result.toPromise();
    }

    /**
     * Trigger a manual retry for a failed step. The step will be reset to WAITING status and re-queued for execution. This bypasses the automatic retry mechanism. 
     * Manually retry a failed step
     * @param id Step ID to retry
     */
    public retryStep(id: string, _options?: PromiseConfigurationOptions): Promise<OperationResult> {
        const observableOptions = wrapOptions(_options);
        const result = this.api.retryStep(id, observableOptions);
        return result.toPromise();
    }


}



