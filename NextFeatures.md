Done
* As a user, I would like to customize my prompts
* As a user, I would like to have API documentation
* As a user, I would like to have documentation in general, i.e. principles, prompts & variables, etc
* As a user, I would like an automated queue that picks up new documents & schedules the relevant job (for now just with one tag)
* As a user, I would like to limit the document list to only show not-yet-in-process documents (to avoid duplication)
* As a user, I would like to remove tags once document processing is completed
* As a user, I would like to look at documents from paperless in a paginated manner based on page & page_size query parameters passed to paperless
* As a user, I would like to see the fallouts I need to respond to
* As a user, I would like to rename the Queue tab to Automated Steps
* As a user, I would like to see an audit log of all step executions (including retries/cancel/...)
* Update prompts to use the new variables that are available
* As a developer, I would like to extract the logic to transform to API Objects from the routes to web layer services
* As a user, I want to see document details in the frontend

In progress
* As a user, I would like to have a properly cached DMS/Paperless Service
* Ability to update fields in the document actions (including remove)


Feature ideas
    Design choices: 
        * 1 document, job per field
        * 1 document, 1 job with multiple, sequential steps
        * 1 document, 1 job with multiple, parallel steps -> needs probably some wrapper that checks pre-requisites/prior job state to decide which transition to emit

Feature ideas 
* As a user, I would like to see document titles/content independently from paperless (-> cache?)

* As a developer, I would like to make sure there are no hard-coded values or value mappings in the frontend (-> We can do these on the backend to look nice!)
* As a user, I want to make sure the pagination works, together with the refresh
* As a user, I want to make sure APIs are called efficiently (eg by combining certain APIs)
* As a user, I would like jobs, automated steps to be sorted by createdDate descending


**Later**
* As a user, I would like to trigger different jobs with different tags
* As a user, I would like to add descriptions for each tag/correspondent to improve matching performance
* As a user, I would like to perform document OCR with LLms
