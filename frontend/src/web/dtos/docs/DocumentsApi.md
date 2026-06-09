# .DocumentsApi

All URIs are relative to *http://localhost:3000/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getCorrespondents**](DocumentsApi.md#getCorrespondents) | **GET** /documents/correspondents | Get all available correspondents
[**getDocumentTypes**](DocumentsApi.md#getDocumentTypes) | **GET** /documents/document-types | Get all available document types
[**getEntityValues**](DocumentsApi.md#getEntityValues) | **GET** /documents/entity-values/{type} | Get available values for an entity type
[**getTags**](DocumentsApi.md#getTags) | **GET** /documents/tags | Get all available tags
[**listDocuments**](DocumentsApi.md#listDocuments) | **GET** /documents | List documents by tag


# **getCorrespondents**
> GetCorrespondents200Response getCorrespondents()

Retrieve all correspondents from Paperless-NGX

### Example


```typescript
import { createConfiguration, DocumentsApi } from '';

const configuration = createConfiguration();
const apiInstance = new DocumentsApi(configuration);

const request = {};

const data = await apiInstance.getCorrespondents(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**GetCorrespondents200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of correspondents |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **getDocumentTypes**
> GetDocumentTypes200Response getDocumentTypes()

Retrieve all document types from Paperless-NGX

### Example


```typescript
import { createConfiguration, DocumentsApi } from '';

const configuration = createConfiguration();
const apiInstance = new DocumentsApi(configuration);

const request = {};

const data = await apiInstance.getDocumentTypes(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**GetDocumentTypes200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of document types |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **getEntityValues**
> EntityValuesResponse getEntityValues()

Retrieve all available values for a given entity type (tags, correspondents, document types). Returns a uniform list of id/name pairs regardless of entity type, keeping the frontend decoupled from entity-type-specific endpoints. 

### Example


```typescript
import { createConfiguration, DocumentsApi } from '';
import type { DocumentsApiGetEntityValuesRequest } from '';

const configuration = createConfiguration();
const apiInstance = new DocumentsApi(configuration);

const request: DocumentsApiGetEntityValuesRequest = {
    // The entity type to retrieve values for
  type: "tag",
};

const data = await apiInstance.getEntityValues(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **type** | **EntityValueType** | The entity type to retrieve values for | defaults to undefined


### Return type

**EntityValuesResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of available entity values |  -  |
**400** | Bad request - validation error or malformed input |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **getTags**
> GetTags200Response getTags()

Retrieve all tags from Paperless-NGX

### Example


```typescript
import { createConfiguration, DocumentsApi } from '';

const configuration = createConfiguration();
const apiInstance = new DocumentsApi(configuration);

const request = {};

const data = await apiInstance.getTags(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**GetTags200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of tags |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **listDocuments**
> DocumentsListWithPagination listDocuments()

Retrieve documents from Paperless-NGX filtered by tag ID

### Example


```typescript
import { createConfiguration, DocumentsApi } from '';
import type { DocumentsApiListDocumentsRequest } from '';

const configuration = createConfiguration();
const apiInstance = new DocumentsApi(configuration);

const request: DocumentsApiListDocumentsRequest = {
    // Tag ID to filter documents
  tag: "tag_example",
    // Maximum number of documents to return (upper limit) (optional)
  limit: 3.14,
    // Cursor returned from prior queries (optional)
  cursor: "cursor_example",
};

const data = await apiInstance.listDocuments(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **tag** | [**string**] | Tag ID to filter documents | defaults to undefined
 **limit** | [**number**] | Maximum number of documents to return (upper limit) | (optional) defaults to undefined
 **cursor** | [**string**] | Cursor returned from prior queries | (optional) defaults to undefined


### Return type

**DocumentsListWithPagination**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of documents |  -  |
**400** | Bad request - validation error or malformed input |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)


