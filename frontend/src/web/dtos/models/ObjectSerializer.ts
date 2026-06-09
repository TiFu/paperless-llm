export * from '../models/ApprovalDecision.js';
export * from '../models/ApprovalItem.js';
export * from '../models/ApprovalItemProposedActionsInner.js';
export * from '../models/ApprovalStats.js';
export * from '../models/ApprovalsResponse.js';
export * from '../models/AuditEventType.js';
export * from '../models/AuditLogEntry.js';
export * from '../models/AuditLogResponse.js';
export * from '../models/BaseAuditLogEntry.js';
export * from '../models/BatchJobRequest.js';
export * from '../models/BatchJobRequestDocumentsInner.js';
export * from '../models/ComponentHealth.js';
export * from '../models/Correspondent.js';
export * from '../models/CorrespondentsList.js';
export * from '../models/DashboardStats.js';
export * from '../models/DecisionRequestedEntry.js';
export * from '../models/DecisionSubmittedEntry.js';
export * from '../models/Document.js';
export * from '../models/DocumentAction.js';
export * from '../models/DocumentType.js';
export * from '../models/DocumentTypesList.js';
export * from '../models/DocumentsList.js';
export * from '../models/DocumentsListWithPagination.js';
export * from '../models/EntityDescriptionEntity.js';
export * from '../models/EntityDescriptionType.js';
export * from '../models/EntityDescriptionsResponse.js';
export * from '../models/EntityValue.js';
export * from '../models/EntityValueType.js';
export * from '../models/EntityValuesResponse.js';
export * from '../models/ErrorEntry.js';
export * from '../models/GetCorrespondents200Response.js';
export * from '../models/GetDocumentTypes200Response.js';
export * from '../models/GetJobTypes200Response.js';
export * from '../models/GetTags200Response.js';
export * from '../models/HealthStatus.js';
export * from '../models/JobCompletedEntry.js';
export * from '../models/JobCreatedEntry.js';
export * from '../models/JobFailedEntry.js';
export * from '../models/JobListResponse.js';
export * from '../models/JobResponse.js';
export * from '../models/JobState.js';
export * from '../models/JobStats.js';
export * from '../models/JobStep.js';
export * from '../models/JobStepsResponse.js';
export * from '../models/JobSubmissionResponse.js';
export * from '../models/JobSubmissionResponseJobsInner.js';
export * from '../models/JobTypesList.js';
export * from '../models/MakeApprovalDecision200Response.js';
export * from '../models/MakeApprovalDecisionRequest.js';
export * from '../models/MakeApprovalDecisionRequestActionsInner.js';
export * from '../models/OperationResult.js';
export * from '../models/Pagination.js';
export * from '../models/ProblemDetails.js';
export * from '../models/PromptResponse.js';
export * from '../models/PromptsListResponse.js';
export * from '../models/ProposedActionFieldType.js';
export * from '../models/QueueItem.js';
export * from '../models/QueueItemsResponse.js';
export * from '../models/QueueItemsResponsePagination.js';
export * from '../models/QueueStats.js';
export * from '../models/ServiceStatus.js';
export * from '../models/StepCancelledEntry.js';
export * from '../models/StepCompletedEntry.js';
export * from '../models/StepCreatedEntry.js';
export * from '../models/StepExecutedEntry.js';
export * from '../models/StepManuallyRetriedEntry.js';
export * from '../models/StepStatus.js';
export * from '../models/StepType.js';
export * from '../models/StuckStepResetEntry.js';
export * from '../models/SystemHealthResponse.js';
export * from '../models/SystemHealthResponseComponents.js';
export * from '../models/SystemStatus.js';
export * from '../models/Tag.js';
export * from '../models/TagsList.js';
export * from '../models/UpdateEntityDescriptionRequest.js';
export * from '../models/UpdatePromptRequest.js';
export * from '../models/WorkItemStatus.js';
export * from '../models/WorkflowType.js';

import { ApprovalDecision } from '../models/ApprovalDecision.js';
import { ApprovalItem } from '../models/ApprovalItem.js';
import { ApprovalItemProposedActionsInner       } from '../models/ApprovalItemProposedActionsInner.js';
import { ApprovalStats } from '../models/ApprovalStats.js';
import { ApprovalsResponse } from '../models/ApprovalsResponse.js';
import { AuditEventType } from '../models/AuditEventType.js';
import { AuditLogEntryClass } from '../models/AuditLogEntry.js';
import { AuditLogResponse } from '../models/AuditLogResponse.js';
import { BaseAuditLogEntry         } from '../models/BaseAuditLogEntry.js';
import { BatchJobRequest } from '../models/BatchJobRequest.js';
import { BatchJobRequestDocumentsInner  , BatchJobRequestDocumentsInnerFieldsEnum   } from '../models/BatchJobRequestDocumentsInner.js';
import { ComponentHealth  } from '../models/ComponentHealth.js';
import { Correspondent } from '../models/Correspondent.js';
import { CorrespondentsList } from '../models/CorrespondentsList.js';
import { DashboardStats } from '../models/DashboardStats.js';
import { DecisionRequestedEntry   , DecisionRequestedEntryEventTypeEnum        } from '../models/DecisionRequestedEntry.js';
import { DecisionSubmittedEntry   , DecisionSubmittedEntryEventTypeEnum        } from '../models/DecisionSubmittedEntry.js';
import { Document } from '../models/Document.js';
import { DocumentAction } from '../models/DocumentAction.js';
import { DocumentType } from '../models/DocumentType.js';
import { DocumentTypesList } from '../models/DocumentTypesList.js';
import { DocumentsList } from '../models/DocumentsList.js';
import { DocumentsListWithPagination } from '../models/DocumentsListWithPagination.js';
import { EntityDescriptionEntity } from '../models/EntityDescriptionEntity.js';
import { EntityDescriptionType, EntityDescriptionTypeTypeEnum     } from '../models/EntityDescriptionType.js';
import { EntityDescriptionsResponse } from '../models/EntityDescriptionsResponse.js';
import { EntityValue } from '../models/EntityValue.js';
import { EntityValueType } from '../models/EntityValueType.js';
import { EntityValuesResponse } from '../models/EntityValuesResponse.js';
import { ErrorEntry   , ErrorEntryEventTypeEnum        } from '../models/ErrorEntry.js';
import { GetCorrespondents200Response } from '../models/GetCorrespondents200Response.js';
import { GetDocumentTypes200Response } from '../models/GetDocumentTypes200Response.js';
import { GetJobTypes200Response } from '../models/GetJobTypes200Response.js';
import { GetTags200Response } from '../models/GetTags200Response.js';
import { HealthStatus, HealthStatusStatusEnum    } from '../models/HealthStatus.js';
import { JobCompletedEntry   , JobCompletedEntryEventTypeEnum         } from '../models/JobCompletedEntry.js';
import { JobCreatedEntry   , JobCreatedEntryEventTypeEnum          } from '../models/JobCreatedEntry.js';
import { JobFailedEntry   , JobFailedEntryEventTypeEnum        } from '../models/JobFailedEntry.js';
import { JobListResponse } from '../models/JobListResponse.js';
import { JobResponse , JobResponseFieldsEnum            } from '../models/JobResponse.js';
import { JobState } from '../models/JobState.js';
import { JobStats } from '../models/JobStats.js';
import { JobStep        } from '../models/JobStep.js';
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
import { PromptResponse     } from '../models/PromptResponse.js';
import { PromptsListResponse } from '../models/PromptsListResponse.js';
import { ProposedActionFieldType } from '../models/ProposedActionFieldType.js';
import { QueueItem               } from '../models/QueueItem.js';
import { QueueItemsResponse } from '../models/QueueItemsResponse.js';
import { QueueItemsResponsePagination } from '../models/QueueItemsResponsePagination.js';
import { QueueStats } from '../models/QueueStats.js';
import { ServiceStatus } from '../models/ServiceStatus.js';
import { StepCancelledEntry   , StepCancelledEntryEventTypeEnum         } from '../models/StepCancelledEntry.js';
import { StepCompletedEntry   , StepCompletedEntryEventTypeEnum          } from '../models/StepCompletedEntry.js';
import { StepCreatedEntry   , StepCreatedEntryEventTypeEnum        } from '../models/StepCreatedEntry.js';
import { StepExecutedEntry   , StepExecutedEntryEventTypeEnum             } from '../models/StepExecutedEntry.js';
import { StepManuallyRetriedEntry   , StepManuallyRetriedEntryEventTypeEnum         } from '../models/StepManuallyRetriedEntry.js';
import { StepStatus } from '../models/StepStatus.js';
import { StepType } from '../models/StepType.js';
import { StuckStepResetEntry   , StuckStepResetEntryEventTypeEnum          } from '../models/StuckStepResetEntry.js';
import { SystemHealthResponse    } from '../models/SystemHealthResponse.js';
import { SystemHealthResponseComponents } from '../models/SystemHealthResponseComponents.js';
import { SystemStatus } from '../models/SystemStatus.js';
import { Tag } from '../models/Tag.js';
import { TagsList } from '../models/TagsList.js';
import { UpdateEntityDescriptionRequest } from '../models/UpdateEntityDescriptionRequest.js';
import { UpdatePromptRequest } from '../models/UpdatePromptRequest.js';
import { WorkItemStatus } from '../models/WorkItemStatus.js';
import { WorkflowType } from '../models/WorkflowType.js';

/* tslint:disable:no-unused-variable */
let primitives = [
                    "string",
                    "boolean",
                    "double",
                    "integer",
                    "long",
                    "float",
                    "number",
                    "any"
                 ];

let enumsMap: Set<string> = new Set<string>([
    "AuditEventType",
    "AuditLogEntryEventTypeEnum",
    "BatchJobRequestDocumentsInnerFieldsEnum",
    "DecisionRequestedEntryEventTypeEnum",
    "DecisionSubmittedEntryEventTypeEnum",
    "EntityDescriptionTypeTypeEnum",
    "EntityValueType",
    "ErrorEntryEventTypeEnum",
    "HealthStatusStatusEnum",
    "JobCompletedEntryEventTypeEnum",
    "JobCreatedEntryEventTypeEnum",
    "JobFailedEntryEventTypeEnum",
    "JobResponseFieldsEnum",
    "JobState",
    "ProposedActionFieldType",
    "ServiceStatus",
    "StepCancelledEntryEventTypeEnum",
    "StepCompletedEntryEventTypeEnum",
    "StepCreatedEntryEventTypeEnum",
    "StepExecutedEntryEventTypeEnum",
    "StepManuallyRetriedEntryEventTypeEnum",
    "StepStatus",
    "StepType",
    "StuckStepResetEntryEventTypeEnum",
    "SystemStatus",
    "WorkItemStatus",
    "WorkflowType",
]);

let typeMap: {[index: string]: any} = {
    "ApprovalDecision": ApprovalDecision,
    "ApprovalItem": ApprovalItem,
    "ApprovalItemProposedActionsInner": ApprovalItemProposedActionsInner,
    "ApprovalStats": ApprovalStats,
    "ApprovalsResponse": ApprovalsResponse,
    "AuditLogEntry": AuditLogEntryClass,
    "AuditLogResponse": AuditLogResponse,
    "BaseAuditLogEntry": BaseAuditLogEntry,
    "BatchJobRequest": BatchJobRequest,
    "BatchJobRequestDocumentsInner": BatchJobRequestDocumentsInner,
    "ComponentHealth": ComponentHealth,
    "Correspondent": Correspondent,
    "CorrespondentsList": CorrespondentsList,
    "DashboardStats": DashboardStats,
    "DecisionRequestedEntry": DecisionRequestedEntry,
    "DecisionSubmittedEntry": DecisionSubmittedEntry,
    "Document": Document,
    "DocumentAction": DocumentAction,
    "DocumentType": DocumentType,
    "DocumentTypesList": DocumentTypesList,
    "DocumentsList": DocumentsList,
    "DocumentsListWithPagination": DocumentsListWithPagination,
    "EntityDescriptionEntity": EntityDescriptionEntity,
    "EntityDescriptionType": EntityDescriptionType,
    "EntityDescriptionsResponse": EntityDescriptionsResponse,
    "EntityValue": EntityValue,
    "EntityValuesResponse": EntityValuesResponse,
    "ErrorEntry": ErrorEntry,
    "GetCorrespondents200Response": GetCorrespondents200Response,
    "GetDocumentTypes200Response": GetDocumentTypes200Response,
    "GetJobTypes200Response": GetJobTypes200Response,
    "GetTags200Response": GetTags200Response,
    "HealthStatus": HealthStatus,
    "JobCompletedEntry": JobCompletedEntry,
    "JobCreatedEntry": JobCreatedEntry,
    "JobFailedEntry": JobFailedEntry,
    "JobListResponse": JobListResponse,
    "JobResponse": JobResponse,
    "JobStats": JobStats,
    "JobStep": JobStep,
    "JobStepsResponse": JobStepsResponse,
    "JobSubmissionResponse": JobSubmissionResponse,
    "JobSubmissionResponseJobsInner": JobSubmissionResponseJobsInner,
    "JobTypesList": JobTypesList,
    "MakeApprovalDecision200Response": MakeApprovalDecision200Response,
    "MakeApprovalDecisionRequest": MakeApprovalDecisionRequest,
    "MakeApprovalDecisionRequestActionsInner": MakeApprovalDecisionRequestActionsInner,
    "OperationResult": OperationResult,
    "Pagination": Pagination,
    "ProblemDetails": ProblemDetails,
    "PromptResponse": PromptResponse,
    "PromptsListResponse": PromptsListResponse,
    "QueueItem": QueueItem,
    "QueueItemsResponse": QueueItemsResponse,
    "QueueItemsResponsePagination": QueueItemsResponsePagination,
    "QueueStats": QueueStats,
    "StepCancelledEntry": StepCancelledEntry,
    "StepCompletedEntry": StepCompletedEntry,
    "StepCreatedEntry": StepCreatedEntry,
    "StepExecutedEntry": StepExecutedEntry,
    "StepManuallyRetriedEntry": StepManuallyRetriedEntry,
    "StuckStepResetEntry": StuckStepResetEntry,
    "SystemHealthResponse": SystemHealthResponse,
    "SystemHealthResponseComponents": SystemHealthResponseComponents,
    "Tag": Tag,
    "TagsList": TagsList,
    "UpdateEntityDescriptionRequest": UpdateEntityDescriptionRequest,
    "UpdatePromptRequest": UpdatePromptRequest,
}

type MimeTypeDescriptor = {
    type: string;
    subtype: string;
    subtypeTokens: string[];
};

/**
 * Every mime-type consists of a type, subtype, and optional parameters.
 * The subtype can be composite, including information about the content format.
 * For example: `application/json-patch+json`, `application/merge-patch+json`.
 *
 * This helper transforms a string mime-type into an internal representation.
 * This simplifies the implementation of predicates that in turn define common rules for parsing or stringifying
 * the payload.
 */
const parseMimeType = (mimeType: string): MimeTypeDescriptor => {
    const [type = '', subtype = ''] = mimeType.split('/');
    return {
        type,
        subtype,
        subtypeTokens: subtype.split('+'),
    };
};

type MimeTypePredicate = (mimeType: string) => boolean;

// This factory creates a predicate function that checks a string mime-type against defined rules.
const mimeTypePredicateFactory = (predicate: (descriptor: MimeTypeDescriptor) => boolean): MimeTypePredicate => (mimeType) => predicate(parseMimeType(mimeType));

// Use this factory when you need to define a simple predicate based only on type and, if applicable, subtype.
const mimeTypeSimplePredicateFactory = (type: string, subtype?: string): MimeTypePredicate => mimeTypePredicateFactory((descriptor) => {
    if (descriptor.type !== type) return false;
    if (subtype != null && descriptor.subtype !== subtype) return false;
    return true;
});

// Creating a set of named predicates that will help us determine how to handle different mime-types
const isTextLikeMimeType = mimeTypeSimplePredicateFactory('text');
const isJsonMimeType = mimeTypeSimplePredicateFactory('application', 'json');
const isJsonLikeMimeType = mimeTypePredicateFactory((descriptor) => descriptor.type === 'application' && descriptor.subtypeTokens.some((item) => item === 'json'));
const isOctetStreamMimeType = mimeTypeSimplePredicateFactory('application', 'octet-stream');
const isFormUrlencodedMimeType = mimeTypeSimplePredicateFactory('application', 'x-www-form-urlencoded');

// Defining a list of mime-types in the order of prioritization for handling.
const supportedMimeTypePredicatesWithPriority: MimeTypePredicate[] = [
    isJsonMimeType,
    isJsonLikeMimeType,
    isTextLikeMimeType,
    isOctetStreamMimeType,
    isFormUrlencodedMimeType,
];

const nullableSuffix = " | null";
const optionalSuffix = " | undefined";
const arrayPrefix = "Array<";
const arraySuffix = ">";
const mapPrefix = "{ [key: string]: ";
const mapSuffix = "; }";

export class ObjectSerializer {
    public static findCorrectType(data: any, expectedType: string) {
        if (data == undefined) {
            return expectedType;
        } else if (primitives.indexOf(expectedType.toLowerCase()) !== -1) {
            return expectedType;
        } else if (expectedType === "Date") {
            return expectedType;
        } else {
            if (enumsMap.has(expectedType)) {
                return expectedType;
            }

            if (!typeMap[expectedType]) {
                return expectedType; // w/e we don't know the type
            }

            // Check the discriminator
            let discriminatorProperty = typeMap[expectedType].discriminator;
            if (discriminatorProperty == null) {
                return expectedType; // the type does not have a discriminator. use it.
            } else {
                if (data[discriminatorProperty]) {
                    var discriminatorType = data[discriminatorProperty];
                    let mapping = typeMap[expectedType].mapping;
                    if (mapping != undefined && mapping[discriminatorType]) {
                        return mapping[discriminatorType]; // use the type given in the discriminator
                    } else if(typeMap[discriminatorType]) {
                        return discriminatorType;
                    } else {
                        return expectedType; // discriminator did not map to a type
                    }
                } else {
                    return expectedType; // discriminator was not present (or an empty string)
                }
            }
        }
    }

    public static serialize(data: any, type: string, format: string): any {
        if (data == undefined) {
            return data;
        } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        } else if (type.endsWith(nullableSuffix)) {
            let subType: string = type.slice(0, -nullableSuffix.length); // Type | null => Type
            return ObjectSerializer.serialize(data, subType, format);
        } else if (type.endsWith(optionalSuffix)) {
            let subType: string = type.slice(0, -optionalSuffix.length); // Type | undefined => Type
            return ObjectSerializer.serialize(data, subType, format);
        } else if (type.startsWith(arrayPrefix)) {
            let subType: string = type.slice(arrayPrefix.length, -arraySuffix.length); // Array<Type> => Type
            let transformedData: any[] = [];
            for (let date of data) {
                transformedData.push(ObjectSerializer.serialize(date, subType, format));
            }
            return transformedData;
        } else if (type.startsWith(mapPrefix)) {
            let subType: string = type.slice(mapPrefix.length, -mapSuffix.length); // { [key: string]: Type; } => Type
            let transformedData: { [key: string]: any } = {};
            for (let key in data) {
                transformedData[key] = ObjectSerializer.serialize(
                    data[key],
                    subType,
                    format,
                );
            }
            return transformedData;
        } else if (type === "Date") {
            if (!(data instanceof Date)) {
                return data;
            }
            if (format == "date") {
                let month = data.getMonth()+1
                let monthStr = month < 10 ? "0" + month.toString() : month.toString()
                let day = data.getDate();
                let dayStr = day < 10 ? "0" + day.toString() : day.toString();

                return data.getFullYear() + "-" + monthStr + "-" + dayStr;
            } else {
                return data.toISOString();
            }
        } else {
            if (enumsMap.has(type)) {
                return data;
            }
            if (!typeMap[type]) { // in case we dont know the type
                return data;
            }

            // Get the actual type of this object
            type = this.findCorrectType(data, type);

            // get the map for the correct type.
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            let instance: {[index: string]: any} = {};
            for (let attributeType of attributeTypes) {
                instance[attributeType.baseName] = ObjectSerializer.serialize(data[attributeType.name], attributeType.type, attributeType.format);
            }
            return instance;
        }
    }

    public static deserialize(data: any, type: string, format: string): any {
        // polymorphism may change the actual type.
        type = ObjectSerializer.findCorrectType(data, type);
        if (data == undefined) {
            return data;
        } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        } else if (type.endsWith(nullableSuffix)) {
            let subType: string = type.slice(0, -nullableSuffix.length); // Type | null => Type
            return ObjectSerializer.deserialize(data, subType, format);
        } else if (type.endsWith(optionalSuffix)) {
            let subType: string = type.slice(0, -optionalSuffix.length); // Type | undefined => Type
            return ObjectSerializer.deserialize(data, subType, format);
        } else if (type.startsWith(arrayPrefix)) {
            let subType: string = type.slice(arrayPrefix.length, -arraySuffix.length); // Array<Type> => Type
            let transformedData: any[] = [];
            for (let date of data) {
                transformedData.push(ObjectSerializer.deserialize(date, subType, format));
            }
            return transformedData;
        } else if (type.startsWith(mapPrefix)) {
            let subType: string = type.slice(mapPrefix.length, -mapSuffix.length); // { [key: string]: Type; } => Type
            let transformedData: { [key: string]: any } = {};
            for (let key in data) {
                transformedData[key] = ObjectSerializer.deserialize(
                    data[key],
                    subType,
                    format,
                );
            }
            return transformedData;
        } else if (type === "Date") {
            return new Date(data);
        } else {
            if (enumsMap.has(type)) {// is Enum
                return data;
            }

            if (!typeMap[type]) { // dont know the type
                return data;
            }
            let instance = new typeMap[type]();
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            for (let attributeType of attributeTypes) {
                let value = ObjectSerializer.deserialize(data[attributeType.baseName], attributeType.type, attributeType.format);
                if (value !== undefined) {
                    instance[attributeType.name] = value;
                }
            }
            return instance;
        }
    }


    /**
     * Normalize media type
     *
     * We currently do not handle any media types attributes, i.e. anything
     * after a semicolon. All content is assumed to be UTF-8 compatible.
     */
    public static normalizeMediaType(mediaType: string | undefined): string | undefined {
        if (mediaType === undefined) {
            return undefined;
        }
        return (mediaType.split(";")[0] ?? '').trim().toLowerCase();
    }

    /**
     * From a list of possible media types, choose the one we can handle best.
     *
     * The order of the given media types does not have any impact on the choice
     * made.
     */
    public static getPreferredMediaType(mediaTypes: Array<string>): string {
        /** According to OAS 3 we should default to json */
        if (mediaTypes.length === 0) {
            return "application/json";
        }

        const normalMediaTypes = mediaTypes.map(ObjectSerializer.normalizeMediaType);

        for (const predicate of supportedMimeTypePredicatesWithPriority) {
            for (const mediaType of normalMediaTypes) {
                if (mediaType != null && predicate(mediaType)) {
                    return mediaType;
                }
            }
        }

        throw new Error("None of the given media types are supported: " + mediaTypes.join(", "));
    }

    /**
     * Convert data to a string according the given media type
     */
    public static stringify(data: any, mediaType: string): string {
        if (isTextLikeMimeType(mediaType)) {
            return String(data);
        }

        if (isJsonLikeMimeType(mediaType)) {
            return JSON.stringify(data);
        }

        throw new Error("The mediaType " + mediaType + " is not supported by ObjectSerializer.stringify.");
    }

    /**
     * Parse data from a string according to the given media type
     */
    public static parse(rawData: string, mediaType: string | undefined) {
        if (mediaType === undefined) {
            throw new Error("Cannot parse content. No Content-Type defined.");
        }

        if (isTextLikeMimeType(mediaType)) {
            return rawData;
        }

        if (isJsonLikeMimeType(mediaType)) {
            return JSON.parse(rawData);
        }

        throw new Error("The mediaType " + mediaType + " is not supported by ObjectSerializer.parse.");
    }
}
