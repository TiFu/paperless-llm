# .PromptsApi

All URIs are relative to *http://localhost:3000/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**listPrompts**](PromptsApi.md#listPrompts) | **GET** /prompts | List all prompts
[**updatePrompt**](PromptsApi.md#updatePrompt) | **PUT** /prompts/{stepType} | Update or create prompt


# **listPrompts**
> PromptsListResponse listPrompts()

Retrieve all LLM prompt templates configured in the system

### Example


```typescript
import { createConfiguration, PromptsApi } from '';

const configuration = createConfiguration();
const apiInstance = new PromptsApi(configuration);

const request = {};

const data = await apiInstance.listPrompts(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters
This endpoint does not need any parameter.


### Return type

**PromptsListResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of prompts |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)

# **updatePrompt**
> PromptResponse updatePrompt(updatePromptRequest)

Update an existing prompt template or create a new one for the specified step type. The version number is automatically incremented. 

### Example


```typescript
import { createConfiguration, PromptsApi } from '';
import type { PromptsApiUpdatePromptRequest } from '';

const configuration = createConfiguration();
const apiInstance = new PromptsApi(configuration);

const request: PromptsApiUpdatePromptRequest = {
    // Step type for the prompt
  stepType: "LLM_GENERATE_TITLE",
  
  updatePromptRequest: {
    template: `Generate a concise title for this document:

{{documentContent}}`,
  },
};

const data = await apiInstance.updatePrompt(request);
console.log('API called successfully. Returned data:', data);
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **updatePromptRequest** | **UpdatePromptRequest**|  |
 **stepType** | **StepType** | Step type for the prompt | defaults to undefined


### Return type

**PromptResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Prompt updated successfully |  -  |
**400** | Bad request - validation error or malformed input |  -  |
**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](README.md#documentation-for-api-endpoints) [[Back to Model list]](README.md#documentation-for-models) [[Back to README]](README.md)


