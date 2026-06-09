# .StatsApi

All URIs are relative to *http://localhost:3000/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**statsDashboardGet**](StatsApi.md#statsDashboardGet) | **GET** /stats/dashboard | Summarized statistics for in progress


# **statsDashboardGet**
> DashboardStats statsDashboardGet()


### Example


```typescript
import { createConfiguration, StatsApi } from '';

const configuration = createConfiguration();
const apiInstance = new StatsApi(configuration);

const request = {};

const data = await apiInstance.statsDashboardGet(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**DashboardStats**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | All okay |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)


