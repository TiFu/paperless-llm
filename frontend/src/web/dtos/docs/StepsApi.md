# .StepsApi

All URIs are relative to *http://localhost:3000/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**cancelStep**](StepsApi.md#cancelStep) | **POST** /steps/{id}/cancel | Cancel a step
[**retryStep**](StepsApi.md#retryStep) | **POST** /steps/{id}/retry | Manually retry a failed step


# **cancelStep**
> OperationResult cancelStep()

Cancel a step by marking it as FAILED with a cancellation message. This also marks the parent job as FAILED. 

### Example


```typescript
import { createConfiguration, StepsApi } from '';
import type { StepsApiCancelStepRequest } from '';

const configuration = createConfiguration();
const apiInstance = new StepsApi(configuration);

const request: StepsApiCancelStepRequest = {
    // Step ID to cancel
  id: "id_example",
};

const data = await apiInstance.cancelStep(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | [**string**] | Step ID to cancel | defaults to undefined


### Return type

**OperationResult**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Step cancelled successfully |  -  |
**400** | Bad request - validation error or malformed input |  -  |
**404** | Resource not found |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **retryStep**
> OperationResult retryStep()

Trigger a manual retry for a failed step. The step will be reset to WAITING status and re-queued for execution. This bypasses the automatic retry mechanism. 

### Example


```typescript
import { createConfiguration, StepsApi } from '';
import type { StepsApiRetryStepRequest } from '';

const configuration = createConfiguration();
const apiInstance = new StepsApi(configuration);

const request: StepsApiRetryStepRequest = {
    // Step ID to retry
  id: "id_example",
};

const data = await apiInstance.retryStep(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | [**string**] | Step ID to retry | defaults to undefined


### Return type

**OperationResult**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Step retry initiated successfully |  -  |
**400** | Bad request - validation error or malformed input |  -  |
**404** | Resource not found |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)


