import { ResponseContext, RequestContext, HttpFile, HttpInfo } from '../http/http.js';
import { Configuration, ConfigurationOptions, mergeConfiguration } from '../configuration.js'
import type { Middleware } from '../middleware.js';
import { Observable, of, from } from '../rxjsStub.js';
import {mergeMap, map} from  '../rxjsStub.js';
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

import { ApprovalsApiRequestFactory, ApprovalsApiResponseProcessor} from "../apis/ApprovalsApi.js";
export class ObservableApprovalsApi {
    private requestFactory: ApprovalsApiRequestFactory;
    private responseProcessor: ApprovalsApiResponseProcessor;
    private configuration: Configuration;

    public constructor(
        configuration: Configuration,
        requestFactory?: ApprovalsApiRequestFactory,
        responseProcessor?: ApprovalsApiResponseProcessor
    ) {
        this.configuration = configuration;
        this.requestFactory = requestFactory || new ApprovalsApiRequestFactory(configuration);
        this.responseProcessor = responseProcessor || new ApprovalsApiResponseProcessor();
    }

    /**
     * Returns count of pending approval requests
     * Get approval statistics
     */
    public getApprovalStatsWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<ApprovalStats>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getApprovalStats(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getApprovalStatsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Returns count of pending approval requests
     * Get approval statistics
     */
    public getApprovalStats(_options?: ConfigurationOptions): Observable<ApprovalStats> {
        return this.getApprovalStatsWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<ApprovalStats>) => apiResponse.data));
    }

    /**
     * Retrieve a paginated list of steps awaiting approval decisions
     * List pending approvals
     * @param [limit] Maximum number of approvals to return
     * @param [cursor] Pagination cursor from a previous response
     */
    public listApprovalsWithHttpInfo(limit?: number, cursor?: string, _options?: ConfigurationOptions): Observable<HttpInfo<ApprovalsResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.listApprovals(limit, cursor, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.listApprovalsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve a paginated list of steps awaiting approval decisions
     * List pending approvals
     * @param [limit] Maximum number of approvals to return
     * @param [cursor] Pagination cursor from a previous response
     */
    public listApprovals(limit?: number, cursor?: string, _options?: ConfigurationOptions): Observable<ApprovalsResponse> {
        return this.listApprovalsWithHttpInfo(limit, cursor, _options).pipe(map((apiResponse: HttpInfo<ApprovalsResponse>) => apiResponse.data));
    }

    /**
     * Submit an approval decision (approve/reject) for a pending step. The decision must match one of the possibleDecisions from the approval item. 
     * Make approval decision
     * @param stepId Step ID awaiting approval
     * @param makeApprovalDecisionRequest
     */
    public makeApprovalDecisionWithHttpInfo(stepId: string, makeApprovalDecisionRequest: MakeApprovalDecisionRequest, _options?: ConfigurationOptions): Observable<HttpInfo<MakeApprovalDecision200Response>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.makeApprovalDecision(stepId, makeApprovalDecisionRequest, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.makeApprovalDecisionWithHttpInfo(rsp)));
            }));
    }

    /**
     * Submit an approval decision (approve/reject) for a pending step. The decision must match one of the possibleDecisions from the approval item. 
     * Make approval decision
     * @param stepId Step ID awaiting approval
     * @param makeApprovalDecisionRequest
     */
    public makeApprovalDecision(stepId: string, makeApprovalDecisionRequest: MakeApprovalDecisionRequest, _options?: ConfigurationOptions): Observable<MakeApprovalDecision200Response> {
        return this.makeApprovalDecisionWithHttpInfo(stepId, makeApprovalDecisionRequest, _options).pipe(map((apiResponse: HttpInfo<MakeApprovalDecision200Response>) => apiResponse.data));
    }

}

import { DocsApiRequestFactory, DocsApiResponseProcessor} from "../apis/DocsApi.js";
export class ObservableDocsApi {
    private requestFactory: DocsApiRequestFactory;
    private responseProcessor: DocsApiResponseProcessor;
    private configuration: Configuration;

    public constructor(
        configuration: Configuration,
        requestFactory?: DocsApiRequestFactory,
        responseProcessor?: DocsApiResponseProcessor
    ) {
        this.configuration = configuration;
        this.requestFactory = requestFactory || new DocsApiRequestFactory(configuration);
        this.responseProcessor = responseProcessor || new DocsApiResponseProcessor();
    }

    /**
     * OpenAPI Documentation
     */
    public docsGetWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<void>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.docsGet(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.docsGetWithHttpInfo(rsp)));
            }));
    }

    /**
     * OpenAPI Documentation
     */
    public docsGet(_options?: ConfigurationOptions): Observable<void> {
        return this.docsGetWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<void>) => apiResponse.data));
    }

    /**
     */
    public docsOpenapiYamlGetWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<void>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.docsOpenapiYamlGet(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.docsOpenapiYamlGetWithHttpInfo(rsp)));
            }));
    }

    /**
     */
    public docsOpenapiYamlGet(_options?: ConfigurationOptions): Observable<void> {
        return this.docsOpenapiYamlGetWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<void>) => apiResponse.data));
    }

}

import { DocumentsApiRequestFactory, DocumentsApiResponseProcessor} from "../apis/DocumentsApi.js";
export class ObservableDocumentsApi {
    private requestFactory: DocumentsApiRequestFactory;
    private responseProcessor: DocumentsApiResponseProcessor;
    private configuration: Configuration;

    public constructor(
        configuration: Configuration,
        requestFactory?: DocumentsApiRequestFactory,
        responseProcessor?: DocumentsApiResponseProcessor
    ) {
        this.configuration = configuration;
        this.requestFactory = requestFactory || new DocumentsApiRequestFactory(configuration);
        this.responseProcessor = responseProcessor || new DocumentsApiResponseProcessor();
    }

    /**
     * Retrieve all correspondents from Paperless-NGX
     * Get all available correspondents
     */
    public getCorrespondentsWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<GetCorrespondents200Response>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getCorrespondents(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getCorrespondentsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve all correspondents from Paperless-NGX
     * Get all available correspondents
     */
    public getCorrespondents(_options?: ConfigurationOptions): Observable<GetCorrespondents200Response> {
        return this.getCorrespondentsWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<GetCorrespondents200Response>) => apiResponse.data));
    }

    /**
     * Retrieve all document types from Paperless-NGX
     * Get all available document types
     */
    public getDocumentTypesWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<GetDocumentTypes200Response>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getDocumentTypes(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getDocumentTypesWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve all document types from Paperless-NGX
     * Get all available document types
     */
    public getDocumentTypes(_options?: ConfigurationOptions): Observable<GetDocumentTypes200Response> {
        return this.getDocumentTypesWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<GetDocumentTypes200Response>) => apiResponse.data));
    }

    /**
     * Retrieve all available values for a given entity type (tags, correspondents, document types). Returns a uniform list of id/name pairs regardless of entity type, keeping the frontend decoupled from entity-type-specific endpoints. 
     * Get available values for an entity type
     * @param type The entity type to retrieve values for
     */
    public getEntityValuesWithHttpInfo(type: EntityValueType, _options?: ConfigurationOptions): Observable<HttpInfo<EntityValuesResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getEntityValues(type, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getEntityValuesWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve all available values for a given entity type (tags, correspondents, document types). Returns a uniform list of id/name pairs regardless of entity type, keeping the frontend decoupled from entity-type-specific endpoints. 
     * Get available values for an entity type
     * @param type The entity type to retrieve values for
     */
    public getEntityValues(type: EntityValueType, _options?: ConfigurationOptions): Observable<EntityValuesResponse> {
        return this.getEntityValuesWithHttpInfo(type, _options).pipe(map((apiResponse: HttpInfo<EntityValuesResponse>) => apiResponse.data));
    }

    /**
     * Retrieve all tags from Paperless-NGX
     * Get all available tags
     */
    public getTagsWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<GetTags200Response>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getTags(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getTagsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve all tags from Paperless-NGX
     * Get all available tags
     */
    public getTags(_options?: ConfigurationOptions): Observable<GetTags200Response> {
        return this.getTagsWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<GetTags200Response>) => apiResponse.data));
    }

    /**
     * Retrieve documents from Paperless-NGX filtered by tag ID
     * List documents by tag
     * @param tag Tag ID to filter documents
     * @param [limit] Maximum number of documents to return (upper limit)
     * @param [cursor] Cursor returned from prior queries
     */
    public listDocumentsWithHttpInfo(tag: string, limit?: number, cursor?: string, _options?: ConfigurationOptions): Observable<HttpInfo<DocumentsListWithPagination>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.listDocuments(tag, limit, cursor, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.listDocumentsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve documents from Paperless-NGX filtered by tag ID
     * List documents by tag
     * @param tag Tag ID to filter documents
     * @param [limit] Maximum number of documents to return (upper limit)
     * @param [cursor] Cursor returned from prior queries
     */
    public listDocuments(tag: string, limit?: number, cursor?: string, _options?: ConfigurationOptions): Observable<DocumentsListWithPagination> {
        return this.listDocumentsWithHttpInfo(tag, limit, cursor, _options).pipe(map((apiResponse: HttpInfo<DocumentsListWithPagination>) => apiResponse.data));
    }

}

import { EntityDescriptionsApiRequestFactory, EntityDescriptionsApiResponseProcessor} from "../apis/EntityDescriptionsApi.js";
export class ObservableEntityDescriptionsApi {
    private requestFactory: EntityDescriptionsApiRequestFactory;
    private responseProcessor: EntityDescriptionsApiResponseProcessor;
    private configuration: Configuration;

    public constructor(
        configuration: Configuration,
        requestFactory?: EntityDescriptionsApiRequestFactory,
        responseProcessor?: EntityDescriptionsApiResponseProcessor
    ) {
        this.configuration = configuration;
        this.requestFactory = requestFactory || new EntityDescriptionsApiRequestFactory(configuration);
        this.responseProcessor = responseProcessor || new EntityDescriptionsApiResponseProcessor();
    }

    /**
     * Returns all registered entity types (tags, correspondents, document types) with their entities and descriptions. All types are always present; entities may be empty if sync has not yet run.
     * Get all entity types with descriptions
     */
    public entityDescriptionsGetWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<EntityDescriptionsResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.entityDescriptionsGet(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.entityDescriptionsGetWithHttpInfo(rsp)));
            }));
    }

    /**
     * Returns all registered entity types (tags, correspondents, document types) with their entities and descriptions. All types are always present; entities may be empty if sync has not yet run.
     * Get all entity types with descriptions
     */
    public entityDescriptionsGet(_options?: ConfigurationOptions): Observable<EntityDescriptionsResponse> {
        return this.entityDescriptionsGetWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<EntityDescriptionsResponse>) => apiResponse.data));
    }

    /**
     * Fetches all entities from Paperless and syncs them into the local database.
     * Trigger manual entity sync
     */
    public entityDescriptionsSyncPostWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<OperationResult>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.entityDescriptionsSyncPost(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.entityDescriptionsSyncPostWithHttpInfo(rsp)));
            }));
    }

    /**
     * Fetches all entities from Paperless and syncs them into the local database.
     * Trigger manual entity sync
     */
    public entityDescriptionsSyncPost(_options?: ConfigurationOptions): Observable<OperationResult> {
        return this.entityDescriptionsSyncPostWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<OperationResult>) => apiResponse.data));
    }

    /**
     * Update entity description
     * @param type
     * @param id
     * @param updateEntityDescriptionRequest
     */
    public entityDescriptionsTypeIdPutWithHttpInfo(type: 'tag' | 'correspondent' | 'document_type', id: number, updateEntityDescriptionRequest: UpdateEntityDescriptionRequest, _options?: ConfigurationOptions): Observable<HttpInfo<OperationResult>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.entityDescriptionsTypeIdPut(type, id, updateEntityDescriptionRequest, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.entityDescriptionsTypeIdPutWithHttpInfo(rsp)));
            }));
    }

    /**
     * Update entity description
     * @param type
     * @param id
     * @param updateEntityDescriptionRequest
     */
    public entityDescriptionsTypeIdPut(type: 'tag' | 'correspondent' | 'document_type', id: number, updateEntityDescriptionRequest: UpdateEntityDescriptionRequest, _options?: ConfigurationOptions): Observable<OperationResult> {
        return this.entityDescriptionsTypeIdPutWithHttpInfo(type, id, updateEntityDescriptionRequest, _options).pipe(map((apiResponse: HttpInfo<OperationResult>) => apiResponse.data));
    }

}

import { HealthApiRequestFactory, HealthApiResponseProcessor} from "../apis/HealthApi.js";
export class ObservableHealthApi {
    private requestFactory: HealthApiRequestFactory;
    private responseProcessor: HealthApiResponseProcessor;
    private configuration: Configuration;

    public constructor(
        configuration: Configuration,
        requestFactory?: HealthApiRequestFactory,
        responseProcessor?: HealthApiResponseProcessor
    ) {
        this.configuration = configuration;
        this.requestFactory = requestFactory || new HealthApiRequestFactory(configuration);
        this.responseProcessor = responseProcessor || new HealthApiResponseProcessor();
    }

    /**
     * Returns a basic health status indicating the API is responsive
     * Simple health check
     */
    public getHealthWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<HealthStatus>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getHealth(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getHealthWithHttpInfo(rsp)));
            }));
    }

    /**
     * Returns a basic health status indicating the API is responsive
     * Simple health check
     */
    public getHealth(_options?: ConfigurationOptions): Observable<HealthStatus> {
        return this.getHealthWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<HealthStatus>) => apiResponse.data));
    }

    /**
     * Returns comprehensive health information for all system components including database, Paperless-NGX, and LLM services
     * Detailed system health status
     */
    public getSystemStatusWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<SystemHealthResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getSystemStatus(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getSystemStatusWithHttpInfo(rsp)));
            }));
    }

    /**
     * Returns comprehensive health information for all system components including database, Paperless-NGX, and LLM services
     * Detailed system health status
     */
    public getSystemStatus(_options?: ConfigurationOptions): Observable<SystemHealthResponse> {
        return this.getSystemStatusWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<SystemHealthResponse>) => apiResponse.data));
    }

}

import { JobsApiRequestFactory, JobsApiResponseProcessor} from "../apis/JobsApi.js";
export class ObservableJobsApi {
    private requestFactory: JobsApiRequestFactory;
    private responseProcessor: JobsApiResponseProcessor;
    private configuration: Configuration;

    public constructor(
        configuration: Configuration,
        requestFactory?: JobsApiRequestFactory,
        responseProcessor?: JobsApiResponseProcessor
    ) {
        this.configuration = configuration;
        this.requestFactory = requestFactory || new JobsApiRequestFactory(configuration);
        this.responseProcessor = responseProcessor || new JobsApiResponseProcessor();
    }

    /**
     * Returns available fields for LLM generation
     */
    public getAvailableFieldsWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<Array<string>>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getAvailableFields(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getAvailableFieldsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Returns available fields for LLM generation
     */
    public getAvailableFields(_options?: ConfigurationOptions): Observable<Array<string>> {
        return this.getAvailableFieldsWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<Array<string>>) => apiResponse.data));
    }

    /**
     * Retrieve detailed information about a specific job including its current status and document actions
     * Get job details
     * @param id Job ID
     */
    public getJobWithHttpInfo(id: string, _options?: ConfigurationOptions): Observable<HttpInfo<JobResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getJob(id, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getJobWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve detailed information about a specific job including its current status and document actions
     * Get job details
     * @param id Job ID
     */
    public getJob(id: string, _options?: ConfigurationOptions): Observable<JobResponse> {
        return this.getJobWithHttpInfo(id, _options).pipe(map((apiResponse: HttpInfo<JobResponse>) => apiResponse.data));
    }

    /**
     * Retrieve the complete audit trail for a specific job, including all step executions, retries, approvals, and state changes
     * Get job audit log
     * @param id Job ID
     */
    public getJobAuditLogWithHttpInfo(id: string, _options?: ConfigurationOptions): Observable<HttpInfo<AuditLogResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getJobAuditLog(id, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getJobAuditLogWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve the complete audit trail for a specific job, including all step executions, retries, approvals, and state changes
     * Get job audit log
     * @param id Job ID
     */
    public getJobAuditLog(id: string, _options?: ConfigurationOptions): Observable<AuditLogResponse> {
        return this.getJobAuditLogWithHttpInfo(id, _options).pipe(map((apiResponse: HttpInfo<AuditLogResponse>) => apiResponse.data));
    }

    /**
     * Returns count of jobs grouped by their current state
     * Get job statistics
     */
    public getJobStatsWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<JobStats>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getJobStats(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getJobStatsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Returns count of jobs grouped by their current state
     * Get job statistics
     */
    public getJobStats(_options?: ConfigurationOptions): Observable<JobStats> {
        return this.getJobStatsWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<JobStats>) => apiResponse.data));
    }

    /**
     * Retrieve all workflow steps for a specific job including their execution status and retry information
     * Get job workflow steps
     * @param id Job ID
     */
    public getJobStepsWithHttpInfo(id: string, _options?: ConfigurationOptions): Observable<HttpInfo<JobStepsResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getJobSteps(id, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getJobStepsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve all workflow steps for a specific job including their execution status and retry information
     * Get job workflow steps
     * @param id Job ID
     */
    public getJobSteps(id: string, _options?: ConfigurationOptions): Observable<JobStepsResponse> {
        return this.getJobStepsWithHttpInfo(id, _options).pipe(map((apiResponse: HttpInfo<JobStepsResponse>) => apiResponse.data));
    }

    /**
     * Returns all supported workflow types that can be submitted
     * List available job types
     */
    public getJobTypesWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<GetJobTypes200Response>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getJobTypes(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getJobTypesWithHttpInfo(rsp)));
            }));
    }

    /**
     * Returns all supported workflow types that can be submitted
     * List available job types
     */
    public getJobTypes(_options?: ConfigurationOptions): Observable<GetJobTypes200Response> {
        return this.getJobTypesWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<GetJobTypes200Response>) => apiResponse.data));
    }

    /**
     * Retrieve a paginated list of jobs, optionally filtered by job state
     * List jobs with pagination
     * @param [limit] Maximum number of jobs to return (default 50, max 100)
     * @param [cursor] Pagination cursor from a previous response
     * @param [state] Filter jobs by state
     */
    public listJobsWithHttpInfo(limit?: number, cursor?: string, state?: JobState, _options?: ConfigurationOptions): Observable<HttpInfo<JobListResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.listJobs(limit, cursor, state, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.listJobsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve a paginated list of jobs, optionally filtered by job state
     * List jobs with pagination
     * @param [limit] Maximum number of jobs to return (default 50, max 100)
     * @param [cursor] Pagination cursor from a previous response
     * @param [state] Filter jobs by state
     */
    public listJobs(limit?: number, cursor?: string, state?: JobState, _options?: ConfigurationOptions): Observable<JobListResponse> {
        return this.listJobsWithHttpInfo(limit, cursor, state, _options).pipe(map((apiResponse: HttpInfo<JobListResponse>) => apiResponse.data));
    }

    /**
     * Submit one or more documents for processing. Each document can have multiple job types. Jobs are processed asynchronously through a multi-step workflow. 
     * Submit batch job
     * @param batchJobRequest
     */
    public submitJobWithHttpInfo(batchJobRequest: BatchJobRequest, _options?: ConfigurationOptions): Observable<HttpInfo<JobSubmissionResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.submitJob(batchJobRequest, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.submitJobWithHttpInfo(rsp)));
            }));
    }

    /**
     * Submit one or more documents for processing. Each document can have multiple job types. Jobs are processed asynchronously through a multi-step workflow. 
     * Submit batch job
     * @param batchJobRequest
     */
    public submitJob(batchJobRequest: BatchJobRequest, _options?: ConfigurationOptions): Observable<JobSubmissionResponse> {
        return this.submitJobWithHttpInfo(batchJobRequest, _options).pipe(map((apiResponse: HttpInfo<JobSubmissionResponse>) => apiResponse.data));
    }

}

import { PromptsApiRequestFactory, PromptsApiResponseProcessor} from "../apis/PromptsApi.js";
export class ObservablePromptsApi {
    private requestFactory: PromptsApiRequestFactory;
    private responseProcessor: PromptsApiResponseProcessor;
    private configuration: Configuration;

    public constructor(
        configuration: Configuration,
        requestFactory?: PromptsApiRequestFactory,
        responseProcessor?: PromptsApiResponseProcessor
    ) {
        this.configuration = configuration;
        this.requestFactory = requestFactory || new PromptsApiRequestFactory(configuration);
        this.responseProcessor = responseProcessor || new PromptsApiResponseProcessor();
    }

    /**
     * Retrieve all LLM prompt templates configured in the system
     * List all prompts
     */
    public listPromptsWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<PromptsListResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.listPrompts(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.listPromptsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve all LLM prompt templates configured in the system
     * List all prompts
     */
    public listPrompts(_options?: ConfigurationOptions): Observable<PromptsListResponse> {
        return this.listPromptsWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<PromptsListResponse>) => apiResponse.data));
    }

    /**
     * Update an existing prompt template or create a new one for the specified step type. The version number is automatically incremented. 
     * Update or create prompt
     * @param stepType Step type for the prompt
     * @param updatePromptRequest
     */
    public updatePromptWithHttpInfo(stepType: StepType, updatePromptRequest: UpdatePromptRequest, _options?: ConfigurationOptions): Observable<HttpInfo<PromptResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.updatePrompt(stepType, updatePromptRequest, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.updatePromptWithHttpInfo(rsp)));
            }));
    }

    /**
     * Update an existing prompt template or create a new one for the specified step type. The version number is automatically incremented. 
     * Update or create prompt
     * @param stepType Step type for the prompt
     * @param updatePromptRequest
     */
    public updatePrompt(stepType: StepType, updatePromptRequest: UpdatePromptRequest, _options?: ConfigurationOptions): Observable<PromptResponse> {
        return this.updatePromptWithHttpInfo(stepType, updatePromptRequest, _options).pipe(map((apiResponse: HttpInfo<PromptResponse>) => apiResponse.data));
    }

}

import { QueueApiRequestFactory, QueueApiResponseProcessor} from "../apis/QueueApi.js";
export class ObservableQueueApi {
    private requestFactory: QueueApiRequestFactory;
    private responseProcessor: QueueApiResponseProcessor;
    private configuration: Configuration;

    public constructor(
        configuration: Configuration,
        requestFactory?: QueueApiRequestFactory,
        responseProcessor?: QueueApiResponseProcessor
    ) {
        this.configuration = configuration;
        this.requestFactory = requestFactory || new QueueApiRequestFactory(configuration);
        this.responseProcessor = responseProcessor || new QueueApiResponseProcessor();
    }

    /**
     * Returns aggregated statistics for all queue items across the system
     * Get unified queue statistics
     */
    public getQueueStatsWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<QueueStats>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.getQueueStats(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.getQueueStatsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Returns aggregated statistics for all queue items across the system
     * Get unified queue statistics
     */
    public getQueueStats(_options?: ConfigurationOptions): Observable<QueueStats> {
        return this.getQueueStatsWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<QueueStats>) => apiResponse.data));
    }

    /**
     * Retrieve a paginated list of queue items, optionally filtered by status
     * List queue items
     * @param [limit] Maximum number of items to return
     * @param [cursor] Pagination cursor from a previous response
     * @param [status] Filter by work item status
     */
    public listQueueItemsWithHttpInfo(limit?: number, cursor?: string, status?: WorkItemStatus, _options?: ConfigurationOptions): Observable<HttpInfo<QueueItemsResponse>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.listQueueItems(limit, cursor, status, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.listQueueItemsWithHttpInfo(rsp)));
            }));
    }

    /**
     * Retrieve a paginated list of queue items, optionally filtered by status
     * List queue items
     * @param [limit] Maximum number of items to return
     * @param [cursor] Pagination cursor from a previous response
     * @param [status] Filter by work item status
     */
    public listQueueItems(limit?: number, cursor?: string, status?: WorkItemStatus, _options?: ConfigurationOptions): Observable<QueueItemsResponse> {
        return this.listQueueItemsWithHttpInfo(limit, cursor, status, _options).pipe(map((apiResponse: HttpInfo<QueueItemsResponse>) => apiResponse.data));
    }

}

import { StatsApiRequestFactory, StatsApiResponseProcessor} from "../apis/StatsApi.js";
export class ObservableStatsApi {
    private requestFactory: StatsApiRequestFactory;
    private responseProcessor: StatsApiResponseProcessor;
    private configuration: Configuration;

    public constructor(
        configuration: Configuration,
        requestFactory?: StatsApiRequestFactory,
        responseProcessor?: StatsApiResponseProcessor
    ) {
        this.configuration = configuration;
        this.requestFactory = requestFactory || new StatsApiRequestFactory(configuration);
        this.responseProcessor = responseProcessor || new StatsApiResponseProcessor();
    }

    /**
     * Summarized statistics for in progress
     */
    public statsDashboardGetWithHttpInfo(_options?: ConfigurationOptions): Observable<HttpInfo<DashboardStats>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.statsDashboardGet(_config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.statsDashboardGetWithHttpInfo(rsp)));
            }));
    }

    /**
     * Summarized statistics for in progress
     */
    public statsDashboardGet(_options?: ConfigurationOptions): Observable<DashboardStats> {
        return this.statsDashboardGetWithHttpInfo(_options).pipe(map((apiResponse: HttpInfo<DashboardStats>) => apiResponse.data));
    }

}

import { StepsApiRequestFactory, StepsApiResponseProcessor} from "../apis/StepsApi.js";
export class ObservableStepsApi {
    private requestFactory: StepsApiRequestFactory;
    private responseProcessor: StepsApiResponseProcessor;
    private configuration: Configuration;

    public constructor(
        configuration: Configuration,
        requestFactory?: StepsApiRequestFactory,
        responseProcessor?: StepsApiResponseProcessor
    ) {
        this.configuration = configuration;
        this.requestFactory = requestFactory || new StepsApiRequestFactory(configuration);
        this.responseProcessor = responseProcessor || new StepsApiResponseProcessor();
    }

    /**
     * Cancel a step by marking it as FAILED with a cancellation message. This also marks the parent job as FAILED. 
     * Cancel a step
     * @param id Step ID to cancel
     */
    public cancelStepWithHttpInfo(id: string, _options?: ConfigurationOptions): Observable<HttpInfo<OperationResult>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.cancelStep(id, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.cancelStepWithHttpInfo(rsp)));
            }));
    }

    /**
     * Cancel a step by marking it as FAILED with a cancellation message. This also marks the parent job as FAILED. 
     * Cancel a step
     * @param id Step ID to cancel
     */
    public cancelStep(id: string, _options?: ConfigurationOptions): Observable<OperationResult> {
        return this.cancelStepWithHttpInfo(id, _options).pipe(map((apiResponse: HttpInfo<OperationResult>) => apiResponse.data));
    }

    /**
     * Trigger a manual retry for a failed step. The step will be reset to WAITING status and re-queued for execution. This bypasses the automatic retry mechanism. 
     * Manually retry a failed step
     * @param id Step ID to retry
     */
    public retryStepWithHttpInfo(id: string, _options?: ConfigurationOptions): Observable<HttpInfo<OperationResult>> {
        const _config = mergeConfiguration(this.configuration, _options);

        const requestContextPromise = this.requestFactory.retryStep(id, _config);
        // build promise chain
        let middlewarePreObservable = from<RequestContext>(requestContextPromise);
        for (const middleware of _config.middleware) {
            middlewarePreObservable = middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => middleware.pre(ctx)));
        }

        return middlewarePreObservable.pipe(mergeMap((ctx: RequestContext) => _config.httpApi.send(ctx))).
            pipe(mergeMap((response: ResponseContext) => {
                let middlewarePostObservable = of(response);
                for (const middleware of _config.middleware.reverse()) {
                    middlewarePostObservable = middlewarePostObservable.pipe(mergeMap((rsp: ResponseContext) => middleware.post(rsp)));
                }
                return middlewarePostObservable.pipe(map((rsp: ResponseContext) => this.responseProcessor.retryStepWithHttpInfo(rsp)));
            }));
    }

    /**
     * Trigger a manual retry for a failed step. The step will be reset to WAITING status and re-queued for execution. This bypasses the automatic retry mechanism. 
     * Manually retry a failed step
     * @param id Step ID to retry
     */
    public retryStep(id: string, _options?: ConfigurationOptions): Observable<OperationResult> {
        return this.retryStepWithHttpInfo(id, _options).pipe(map((apiResponse: HttpInfo<OperationResult>) => apiResponse.data));
    }

}
