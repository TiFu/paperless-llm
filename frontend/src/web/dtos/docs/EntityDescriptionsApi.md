# .EntityDescriptionsApi

All URIs are relative to *http://localhost:3000/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**entityDescriptionsGet**](EntityDescriptionsApi.md#entityDescriptionsGet) | **GET** /entity-descriptions | Get all entity types with descriptions
[**entityDescriptionsSyncPost**](EntityDescriptionsApi.md#entityDescriptionsSyncPost) | **POST** /entity-descriptions/sync | Trigger manual entity sync
[**entityDescriptionsTypeIdPut**](EntityDescriptionsApi.md#entityDescriptionsTypeIdPut) | **PUT** /entity-descriptions/{type}/{id} | Update entity description


# **entityDescriptionsGet**
> EntityDescriptionsResponse entityDescriptionsGet()

Returns all registered entity types (tags, correspondents, document types) with their entities and descriptions. All types are always present; entities may be empty if sync has not yet run.

### Example


```typescript
import { createConfiguration, EntityDescriptionsApi } from '';

const configuration = createConfiguration();
const apiInstance = new EntityDescriptionsApi(configuration);

const request = {};

const data = await apiInstance.entityDescriptionsGet(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**EntityDescriptionsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Entity descriptions grouped by type |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **entityDescriptionsSyncPost**
> OperationResult entityDescriptionsSyncPost()

Fetches all entities from Paperless and syncs them into the local database.

### Example


```typescript
import { createConfiguration, EntityDescriptionsApi } from '';

const configuration = createConfiguration();
const apiInstance = new EntityDescriptionsApi(configuration);

const request = {};

const data = await apiInstance.entityDescriptionsSyncPost(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


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
**200** | Sync completed |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **entityDescriptionsTypeIdPut**
> OperationResult entityDescriptionsTypeIdPut(updateEntityDescriptionRequest)


### Example


```typescript
import { createConfiguration, EntityDescriptionsApi } from '';
import type { EntityDescriptionsApiEntityDescriptionsTypeIdPutRequest } from '';

const configuration = createConfiguration();
const apiInstance = new EntityDescriptionsApi(configuration);

const request: EntityDescriptionsApiEntityDescriptionsTypeIdPutRequest = {
  
  type: "tag",
  
  id: 1,
  
  updateEntityDescriptionRequest: {
    description: "description_example",
  },
};

const data = await apiInstance.entityDescriptionsTypeIdPut(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **updateEntityDescriptionRequest** | **UpdateEntityDescriptionRequest**|  |
 **type** | [**&#39;tag&#39; | &#39;correspondent&#39; | &#39;document_type&#39;**]**Array<&#39;tag&#39; &#124; &#39;correspondent&#39; &#124; &#39;document_type&#39;>** |  | defaults to undefined
 **id** | [**number**] |  | defaults to undefined


### Return type

**OperationResult**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Description updated |  -  |
**400** | Bad request - validation error or malformed input |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)


