# .JobsApi

All URIs are relative to *http://localhost:3000/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getAvailableFields**](JobsApi.md#getAvailableFields) | **GET** /jobs/fields | Returns available fields for LLM generation
[**getJob**](JobsApi.md#getJob) | **GET** /jobs/{id} | Get job details
[**getJobAuditLog**](JobsApi.md#getJobAuditLog) | **GET** /jobs/{id}/audit-log | Get job audit log
[**getJobStats**](JobsApi.md#getJobStats) | **GET** /jobs/stats | Get job statistics
[**getJobSteps**](JobsApi.md#getJobSteps) | **GET** /jobs/{id}/steps | Get job workflow steps
[**getJobTypes**](JobsApi.md#getJobTypes) | **GET** /jobs/types | List available job types
[**listJobs**](JobsApi.md#listJobs) | **GET** /jobs | List jobs with pagination
[**submitJob**](JobsApi.md#submitJob) | **POST** /jobs | Submit batch job


# **getAvailableFields**
> Array<string> getAvailableFields()


### Example


```typescript
import { createConfiguration, JobsApi } from '';

const configuration = createConfiguration();
const apiInstance = new JobsApi(configuration);

const request = {};

const data = await apiInstance.getAvailableFields(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**Array<string>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Fields returned |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **getJob**
> JobResponse getJob()

Retrieve detailed information about a specific job including its current status and document actions

### Example


```typescript
import { createConfiguration, JobsApi } from '';
import type { JobsApiGetJobRequest } from '';

const configuration = createConfiguration();
const apiInstance = new JobsApi(configuration);

const request: JobsApiGetJobRequest = {
    // Job ID
  id: "id_example",
};

const data = await apiInstance.getJob(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | [**string**] | Job ID | defaults to undefined


### Return type

**JobResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Job details |  -  |
**404** | Resource not found |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **getJobAuditLog**
> AuditLogResponse getJobAuditLog()

Retrieve the complete audit trail for a specific job, including all step executions, retries, approvals, and state changes

### Example


```typescript
import { createConfiguration, JobsApi } from '';
import type { JobsApiGetJobAuditLogRequest } from '';

const configuration = createConfiguration();
const apiInstance = new JobsApi(configuration);

const request: JobsApiGetJobAuditLogRequest = {
    // Job ID
  id: "id_example",
};

const data = await apiInstance.getJobAuditLog(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | [**string**] | Job ID | defaults to undefined


### Return type

**AuditLogResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Job audit log entries |  -  |
**404** | Resource not found |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **getJobStats**
> JobStats getJobStats()

Returns count of jobs grouped by their current state

### Example


```typescript
import { createConfiguration, JobsApi } from '';

const configuration = createConfiguration();
const apiInstance = new JobsApi(configuration);

const request = {};

const data = await apiInstance.getJobStats(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**JobStats**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Job statistics |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **getJobSteps**
> JobStepsResponse getJobSteps()

Retrieve all workflow steps for a specific job including their execution status and retry information

### Example


```typescript
import { createConfiguration, JobsApi } from '';
import type { JobsApiGetJobStepsRequest } from '';

const configuration = createConfiguration();
const apiInstance = new JobsApi(configuration);

const request: JobsApiGetJobStepsRequest = {
    // Job ID
  id: "id_example",
};

const data = await apiInstance.getJobSteps(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | [**string**] | Job ID | defaults to undefined


### Return type

**JobStepsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Job workflow steps |  -  |
**404** | Resource not found |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **getJobTypes**
> GetJobTypes200Response getJobTypes()

Returns all supported workflow types that can be submitted

### Example


```typescript
import { createConfiguration, JobsApi } from '';

const configuration = createConfiguration();
const apiInstance = new JobsApi(configuration);

const request = {};

const data = await apiInstance.getJobTypes(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**GetJobTypes200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of available job types |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **listJobs**
> JobListResponse listJobs()

Retrieve a paginated list of jobs, optionally filtered by job state

### Example


```typescript
import { createConfiguration, JobsApi } from '';
import type { JobsApiListJobsRequest } from '';

const configuration = createConfiguration();
const apiInstance = new JobsApi(configuration);

const request: JobsApiListJobsRequest = {
    // Maximum number of jobs to return (default 50, max 100) (optional)
  limit: 50,
    // Pagination cursor from a previous response (optional)
  cursor: "cursor_example",
    // Filter jobs by state (optional)
  state: "pending",
};

const data = await apiInstance.listJobs(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | [**number**] | Maximum number of jobs to return (default 50, max 100) | (optional) defaults to 50
 **cursor** | [**string**] | Pagination cursor from a previous response | (optional) defaults to undefined
 **state** | **JobState** | Filter jobs by state | (optional) defaults to undefined


### Return type

**JobListResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of jobs |  -  |
**400** | Bad request - validation error or malformed input |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **submitJob**
> JobSubmissionResponse submitJob(batchJobRequest)

Submit one or more documents for processing. Each document can have multiple job types. Jobs are processed asynchronously through a multi-step workflow. 

### Example


```typescript
import { createConfiguration, JobsApi } from '';
import type { JobsApiSubmitJobRequest } from '';

const configuration = createConfiguration();
const apiInstance = new JobsApi(configuration);

const request: JobsApiSubmitJobRequest = {
  
  batchJobRequest: {
    documents: [
      {
        documentId: 123,
        jobType: "approval",
        fields: [
          "title",
        ],
      },
    ],
  },
};

const data = await apiInstance.submitJob(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **batchJobRequest** | **BatchJobRequest**|  |


### Return type

**JobSubmissionResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Jobs submitted successfully |  -  |
**400** | Bad request - validation error or malformed input |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)


