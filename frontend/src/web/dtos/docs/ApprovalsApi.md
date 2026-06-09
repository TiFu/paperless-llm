# .ApprovalsApi

All URIs are relative to *http://localhost:3000/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getApprovalStats**](ApprovalsApi.md#getApprovalStats) | **GET** /approvals/stats | Get approval statistics
[**listApprovals**](ApprovalsApi.md#listApprovals) | **GET** /approvals | List pending approvals
[**makeApprovalDecision**](ApprovalsApi.md#makeApprovalDecision) | **POST** /approvals/{stepId} | Make approval decision


# **getApprovalStats**
> ApprovalStats getApprovalStats()

Returns count of pending approval requests

### Example


```typescript
import { createConfiguration, ApprovalsApi } from '';

const configuration = createConfiguration();
const apiInstance = new ApprovalsApi(configuration);

const request = {};

const data = await apiInstance.getApprovalStats(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**ApprovalStats**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Approval statistics |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **listApprovals**
> ApprovalsResponse listApprovals()

Retrieve a paginated list of steps awaiting approval decisions

### Example


```typescript
import { createConfiguration, ApprovalsApi } from '';
import type { ApprovalsApiListApprovalsRequest } from '';

const configuration = createConfiguration();
const apiInstance = new ApprovalsApi(configuration);

const request: ApprovalsApiListApprovalsRequest = {
    // Maximum number of approvals to return (optional)
  limit: 50,
    // Pagination cursor from a previous response (optional)
  cursor: "cursor_example",
};

const data = await apiInstance.listApprovals(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | [**number**] | Maximum number of approvals to return | (optional) defaults to 50
 **cursor** | [**string**] | Pagination cursor from a previous response | (optional) defaults to undefined


### Return type

**ApprovalsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of pending approvals |  -  |
**400** | Bad request - validation error or malformed input |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **makeApprovalDecision**
> MakeApprovalDecision200Response makeApprovalDecision(makeApprovalDecisionRequest)

Submit an approval decision (approve/reject) for a pending step. The decision must match one of the possibleDecisions from the approval item. 

### Example


```typescript
import { createConfiguration, ApprovalsApi } from '';
import type { ApprovalsApiMakeApprovalDecisionRequest } from '';

const configuration = createConfiguration();
const apiInstance = new ApprovalsApi(configuration);

const request: ApprovalsApiMakeApprovalDecisionRequest = {
    // Step ID awaiting approval
  stepId: "stepId_example",
  
  makeApprovalDecisionRequest: {
    decision: "approve",
    actions: [
      {
        id: "id_example",
        newValue: "newValue_example",
      },
    ],
  },
};

const data = await apiInstance.makeApprovalDecision(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **makeApprovalDecisionRequest** | **MakeApprovalDecisionRequest**|  |
 **stepId** | [**string**] | Step ID awaiting approval | defaults to undefined


### Return type

**MakeApprovalDecision200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Decision processed successfully |  -  |
**400** | Bad request - validation error or malformed input |  -  |
**404** | Resource not found |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)


