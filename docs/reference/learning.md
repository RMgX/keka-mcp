# Keka Learning API research

Checked November 11, 2026. **Learning backend APIs exist, but the standard integration token was rejected by Learn.** No direct Learning tools are exposed in this release.

## Public documentation and collections

The [official API index](https://developers.keka.com/llms.txt) currently contains no Learning/LMS/course/training endpoints. The separate [official Postman documentation](https://apidocs.keka.com/) was also inspected through its public collection JSON: 99 request entries, no Learning requests. Searches of publicly indexed code/examples did not produce a verified customer Learning upload contract.

Keka's help center confirms [course creation and document uploads](https://help.keka.com/hc/en-us/articles/40003564537361-Creating-a-new-course-on-keka-Learn), [SCORM/xAPI package uploads](https://help.keka.com/hc/en-us/articles/44621482047633-Creating-a-course-using-SCORM), live trainings, and a [Udemy integration](https://help.keka.com/hc/en-us/articles/40464643748369-Udemy-Integration-with-keka). The Udemy guide requests API clients created in **Udemy**; it does not document a general Keka upload API for customers. Third-party LMS HRIS sync likewise does not establish Keka Learn course-write access.

## Concrete endpoints found in public application code

Following the script references from Keka's publicly served application led to the Learn route and its service bundles. No sign-in, credentials, employee data or write requests were used for this inspection.

| Operation | Method and path observed in code |
|---|---|
| Browse course catalog | POST `/learn/api/v1/courses/all` |
| List managed courses | POST `/learn/api/v1/courses/manage/all` |
| Create course | POST `/learn/api/v1/courses` |
| Read course | GET `/learn/api/v1/courses/{courseId}` |
| Update course | PUT `/learn/api/v1/courses/{courseId}` |
| Add course content | POST `/learn/api/v1/courses/{courseId}/contents` |
| Publish course | PUT `/learn/api/v1/courses/{courseId}/publish` |
| Upload document/resources | Multipart POST `<configured-file-handler>/api/v1/files/upload/learn/course-contents` |
| Upload SCORM package | Multipart POST `<configured-file-handler>/api/v1/files/upload/learn/scorm-packages` |

The upload service takes its host from application settings (`fileHandler`). Its UI first uploads the file, receives a file ID, then attaches that ID to course content. This is a multi-step flow, not a single course-upload request. No file-handler host is guessed here.

Primary code references, all under Keka's public CDN:

- [Learn base service](https://cdn.keka.com/kekahr/app/v/2026/en-IN/chunk-BXQQYKZF.js)
- [Course management service](https://cdn.keka.com/kekahr/app/v/2026/en-IN/chunk-M7CLBEC3.js)
- [File upload service](https://cdn.keka.com/kekahr/app/v/2026/en-IN/chunk-LALJ64VV.js)
- [Course builder and SCORM upload flow](https://cdn.keka.com/kekahr/app/v/2026/en-IN/chunk-EP5ESLQ2.js)

These are versioned application assets, not stable API documentation. They may be replaced as Keka deploys updates. Observing a method and path does not verify request schemas, authentication, entitlement, rate limits, support or compatibility.

## What is and is not established

Verified: the shipped web app calls Learning course/content/publish endpoints and multipart file services. The API base differs from the standard `/api/v1` integration base used by this MCP.

Live test: the same production integration token succeeded on the standard PMS timeframes endpoint and received HTTP 401 with an invalid-audience challenge on the Learn managed-course list. Keka's [authentication guide](https://developers.keka.com/reference/authentication) documents `kekaapi`; its [published API-key scopes](https://developers.keka.com/reference/scope) do not list Learning. The [app portal OAuth flow](https://developers.keka.com/reference/app-portal-access-token-generation) does not establish Learn access either.

Separately, an unpublished sample course and one five-minute page lesson were created and read back in a signed-in Keka browser. This verifies the web-app workflow. No direct API creation, document upload, publishing or enrollment was tested. Browser credentials are not reused by the MCP.

Before implementation, ask Keka whether it issues a supported machine-to-machine credential for Learn, which audience and scopes are required, and whether course draft creation, multipart uploads and read-back are supported in a sandbox. Request the schema, supported upload host, limits and publish/enrollment side effects. Do not send integration credentials to an unverified host or treat web-app paths as a supported public contract.
