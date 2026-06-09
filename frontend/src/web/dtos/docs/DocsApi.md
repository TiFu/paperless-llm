# .DocsApi

All URIs are relative to *http://localhost:3000/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**docsGet**](DocsApi.md#docsGet) | **GET** /docs | OpenAPI Documentation
[**docsOpenapiYamlGet**](DocsApi.md#docsOpenapiYamlGet) | **GET** /docs/openapi.yaml | 


# **docsGet**
> void docsGet()


### Example


```typescript
import { createConfiguration, DocsApi } from '';

const configuration = createConfiguration();
const apiInstance = new DocsApi(configuration);

const request = {};

const data = await apiInstance.docsGet(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**void**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/html


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | OpenAPI Documentation |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **docsOpenapiYamlGet**
> void docsOpenapiYamlGet()


### Example


```typescript
import { createConfiguration, DocsApi } from '';

const configuration = createConfiguration();
const apiInstance = new DocsApi(configuration);

const request = {};

const data = await apiInstance.docsOpenapiYamlGet(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**void**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/html


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Yaml |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)


