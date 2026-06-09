# .QueueApi

All URIs are relative to *http://localhost:3000/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getQueueStats**](QueueApi.md#getQueueStats) | **GET** /queue/stats | Get unified queue statistics
[**listQueueItems**](QueueApi.md#listQueueItems) | **GET** /queue/items | List queue items


# **getQueueStats**
> QueueStats getQueueStats()

Returns aggregated statistics for all queue items across the system

### Example


```typescript
import { createConfiguration, QueueApi } from '';

const configuration = createConfiguration();
const apiInstance = new QueueApi(configuration);

const request = {};

const data = await apiInstance.getQueueStats(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**QueueStats**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Queue statistics |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **listQueueItems**
> QueueItemsResponse listQueueItems()

Retrieve a paginated list of queue items, optionally filtered by status

### Example


```typescript
import { createConfiguration, QueueApi } from '';
import type { QueueApiListQueueItemsRequest } from '';

const configuration = createConfiguration();
const apiInstance = new QueueApi(configuration);

const request: QueueApiListQueueItemsRequest = {
    // Maximum number of items to return (optional)
  limit: 50,
    // Pagination cursor from a previous response (optional)
  cursor: "cursor_example",
    // Filter by work item status (optional)
  status: "pending",
};

const data = await apiInstance.listQueueItems(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | [**number**] | Maximum number of items to return | (optional) defaults to 50
 **cursor** | [**string**] | Pagination cursor from a previous response | (optional) defaults to undefined
 **status** | **WorkItemStatus** | Filter by work item status | (optional) defaults to undefined


### Return type

**QueueItemsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of queue items |  -  |
**400** | Bad request - validation error or malformed input |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)


