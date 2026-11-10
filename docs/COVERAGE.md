# Endpoint coverage

Verified against public Keka operation schemas on November 10, 2026. Documentation verification does not establish tenant availability or live behavior. Duplicate documentation pages are deduplicated by method and source path. Hire paths documented under `/api/v1` are normalized from the `/api` server plus `/v1/hire` path.

| Module | Executable reads | Executable writes | Unavailable transport |
|---|---:|---:|---:|
| app | 0 | 1 | 0 |
| assets | 4 | 2 | 0 |
| attendance | 0 | 2 | 0 |
| banks | 1 | 0 | 0 |
| clients | 0 | 1 | 0 |
| expense | 6 | 7 | 0 |
| expensepolicies | 1 | 0 | 0 |
| helpdesk | 3 | 2 | 0 |
| hire | 10 | 9 | 1 |
| hris | 22 | 11 | 1 |
| loans | 1 | 1 | 0 |
| payroll | 23 | 17 | 0 |
| pms | 7 | 2 | 0 |
| psa | 16 | 12 | 0 |
| requisition | 1 | 0 | 0 |
| rnr | 1 | 1 | 0 |
| time | 14 | 3 | 0 |
| traveldesk | 1 | 2 | 0 |

## Operation inventory

| Tool | Method and normalized path | Implementation | Official source |
|---|---|---|---|
| keka_delete_hris_bgv_vendors_bgvId_checks_checkId | DELETE /hris/bgv/vendors/{bgvId}/checks/{checkId} | Implemented | [Reference](https://developers.keka.com/reference/delete_hris-bgv-vendors-bgvid-checks-checkid) |
| keka_delete_v1_hire_vendorId_assessments_assessmentId | DELETE /hire/{vendorId}/assessments/{assessmentId} | Implemented | [Reference](https://developers.keka.com/reference/delete_v1-hire-vendorid-assessments-assessmentid) |
| keka_get_assets | GET /assets | Implemented | [Reference](https://developers.keka.com/reference/get_assets) |
| keka_get_assets_categories | GET /assets/categories | Implemented | [Reference](https://developers.keka.com/reference/get_assets-categories) |
| keka_get_assets_conditions | GET /assets/conditions | Implemented | [Reference](https://developers.keka.com/reference/get_assets-conditions) |
| keka_get_assets_types | GET /assets/types | Implemented | [Reference](https://developers.keka.com/reference/get_assets-types) |
| keka_get_banks | GET /banks | Implemented | [Reference](https://developers.keka.com/reference/get_banks) |
| keka_get_expense_attachment | GET /expense/attachment | Implemented | [Reference](https://developers.keka.com/reference/get_expense-attachment) |
| keka_get_expense_categories | GET /expense/categories | Implemented | [Reference](https://developers.keka.com/reference/get_expense-categories) |
| keka_get_expense_claims | GET /expense/claims | Implemented | [Reference](https://developers.keka.com/reference/get_expense-claims) |
| keka_get_expense_employees_employeeId_expenses | GET /expense/employees/{employeeId}/expenses | Implemented | [Reference](https://developers.keka.com/reference/get_expense-employees-employeeid-expenses) |
| keka_get_expense_employees_expenses | GET /expense/employees/expenses | Implemented | [Reference](https://developers.keka.com/reference/get_expense-employees-expenses) |
| keka_get_expense_expenseId_attachment_attachmentId | GET /expense/{expenseId}/attachment/{attachmentId} | Implemented | [Reference](https://developers.keka.com/reference/get_expense-expenseid-attachment-attachmentid) |
| keka_get_expensepolicies | GET /expensepolicies | Implemented | [Reference](https://developers.keka.com/reference/get_expensepolicies) |
| keka_get_helpdesk_ticket_categories | GET /helpdesk/ticket/categories | Implemented | [Reference](https://developers.keka.com/reference/get_helpdesk-ticket-categories) |
| keka_get_helpdesk_ticket_closingreasons | GET /helpdesk/ticket/closingreasons | Implemented | [Reference](https://developers.keka.com/reference/get_helpdesk-ticket-closingreasons) |
| keka_get_helpdesk_tickets | GET /helpdesk/tickets | Implemented | [Reference](https://developers.keka.com/reference/get_helpdesk-tickets) |
| keka_get_hris_bgv_bgvId_requests | GET /hris/bgv/{bgvId}/requests | Implemented | [Reference](https://developers.keka.com/reference/get_hris-bgv-bgvid-requests) |
| keka_get_hris_bgv_vendors_bgvId_checks | GET /hris/bgv/vendors/{bgvId}/checks | Implemented | [Reference](https://developers.keka.com/reference/get_hris-bgv-vendors-bgvid-checks) |
| keka_get_hris_contingenttypes | GET /hris/contingenttypes | Implemented | [Reference](https://developers.keka.com/reference/get_hris-contingenttypes) |
| keka_get_hris_currencies | GET /hris/currencies | Implemented | [Reference](https://developers.keka.com/reference/get_hris-currencies) |
| keka_get_hris_departments | GET /hris/departments | Implemented | [Reference](https://developers.keka.com/reference/get_hris-departments) |
| keka_get_hris_documents_types | GET /hris/documents/types | Implemented | [Reference](https://developers.keka.com/reference/get_hris-documents-types) |
| keka_get_hris_e_sign_vendorId_letterrequests | GET /hris/e-sign/{vendorId}/letterrequests | Implemented | [Reference](https://developers.keka.com/reference/get_hris-e-sign-vendorid-letterrequests) |
| keka_get_hris_e_sign_vendorId_letterrequests_letterRe_f793382552 | GET /hris/e-sign/{vendorId}/letterrequests/{letterRequestId}/attachments | Implemented | [Reference](https://developers.keka.com/reference/get_hris-e-sign-vendorid-letterrequests-letterrequestid-attachments) |
| keka_get_hris_employees | GET /hris/employees | Implemented | [Reference](https://developers.keka.com/reference/get_hris-employees) |
| keka_get_hris_employees_documents | GET /hris/employees/documents | Implemented | [Reference](https://developers.keka.com/reference/get_hris-employees-documents) |
| keka_get_hris_employees_documents_attachment | GET /hris/employees/documents/attachment | Implemented | [Reference](https://developers.keka.com/reference/get_hris-employees-documents-attachment) |
| keka_get_hris_employees_employeeId | GET /hris/employees/{employeeId} | Implemented | [Reference](https://developers.keka.com/reference/get_hris-employees-employeeid) |
| keka_get_hris_employees_employeeId_skills | GET /hris/employees/{employeeId}/skills | Implemented | [Reference](https://developers.keka.com/reference/get_hris-employees-employeeid-skills) |
| keka_get_hris_employees_updatefields | GET /hris/employees/updatefields | Implemented | [Reference](https://developers.keka.com/reference/get_hris-employees-updatefields) |
| keka_get_hris_exitreasons | GET /hris/exitreasons | Implemented | [Reference](https://developers.keka.com/reference/get_hris-exitreasons) |
| keka_get_hris_groups | GET /hris/groups | Implemented | [Reference](https://developers.keka.com/reference/get_hris-groups) |
| keka_get_hris_grouptypes | GET /hris/grouptypes | Implemented | [Reference](https://developers.keka.com/reference/get_hris-grouptypes) |
| keka_get_hris_jobtitles | GET /hris/jobtitles | Implemented | [Reference](https://developers.keka.com/reference/get_hris-jobtitles) |
| keka_get_hris_locations | GET /hris/locations | Implemented | [Reference](https://developers.keka.com/reference/get_hris-locations) |
| keka_get_hris_noticeperiods | GET /hris/noticeperiods | Implemented | [Reference](https://developers.keka.com/reference/get_hris-noticeperiods) |
| keka_get_hris_skills | GET /hris/skills | Implemented | [Reference](https://developers.keka.com/reference/get_hris-skills) |
| keka_get_hris_webhooks_retrylogs | GET /hris/webhooks/retrylogs | Implemented | [Reference](https://developers.keka.com/reference/get_hris-webhooks-retrylogs) |
| keka_get_loans | GET /loans | Implemented | [Reference](https://developers.keka.com/reference/get_loans) |
| keka_get_payroll_bonustypes | GET /payroll/bonustypes | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-bonustypes) |
| keka_get_payroll_declarations_attachments_downloadurl | GET /payroll/declarations/attachments/downloadurl | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-declarations-attachments-downloadurl) |
| keka_get_payroll_employees_componentclaims | GET /payroll/employees/componentclaims | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-employees-componentclaims) |
| keka_get_payroll_employees_financialdetails | GET /payroll/employees/financialdetails | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-employees-financialdetails) |
| keka_get_payroll_employees_flexibenefits | GET /payroll/employees/flexibenefits | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-employees-flexibenefits) |
| keka_get_payroll_employees_fnf | GET /payroll/employees/fnf | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-employees-fnf) |
| keka_get_payroll_employees_form16 | GET /payroll/employees/form16 | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-employees-form16) |
| keka_get_payroll_employees_routeEmployeeId_form16 | GET /payroll/employees/{routeEmployeeId}/form16 | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-employees-routeemployeeid-form16) |
| keka_get_payroll_employees_taxdeclarations | GET /payroll/employees/taxdeclarations | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-employees-taxdeclarations) |
| keka_get_payroll_paybands | GET /payroll/paybands | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-paybands) |
| keka_get_payroll_paygrades | GET /payroll/paygrades | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-paygrades) |
| keka_get_payroll_paygroups | GET /payroll/paygroups | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-paygroups-1) |
| keka_get_payroll_paygroups_paycycles | GET /payroll/paygroups/paycycles | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-paygroups-paycycles) |
| keka_get_payroll_paygroups_paycycles_paybatches | GET /payroll/paygroups/paycycles/paybatches | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-paygroups-paycycles-paybatches) |
| keka_get_payroll_paygroups_paycycles_paybatches_payments | GET /payroll/paygroups/paycycles/paybatches/payments | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-paygroups-paycycles-paybatches-payments) |
| keka_get_payroll_paygroups_paycycles_payregister | GET /payroll/paygroups/paycycles/payregister | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-paygroups-paycycles-payregister) |
| keka_get_payroll_paygroups_routePayGroupId_paycycles | GET /payroll/paygroups/{routePayGroupId}/paycycles | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-paygroups-routepaygroupid-paycycles) |
| keka_get_payroll_paygroups_routePayGroupId_paycycles__299e4988cb | GET /payroll/paygroups/{routePayGroupId}/paycycles/{routePayCycleId}/payregister | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-paygroups-routepaygroupid-paycycles-routepaycycleid-payregister) |
| keka_get_payroll_paygroups_routePayGroupId_paycycles__34d55e241a | GET /payroll/paygroups/{routePayGroupId}/paycycles/{routePayCycleId}/paybatches/{routePayBatchId}/payments | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-paygroups-routepaygroupid-paycycles-routepaycycleid-paybatches-routepaybatchid-payments) |
| keka_get_payroll_paygroups_routePayGroupId_paycycles__8e2e996720 | GET /payroll/paygroups/{routePayGroupId}/paycycles/{routePayCycleId}/paybatches | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-paygroups-routepaygroupid-paycycles-routepaycycleid-paybatches) |
| keka_get_payroll_salaries | GET /payroll/salaries | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-salaries) |
| keka_get_payroll_salarycomponents | GET /payroll/salarycomponents | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-salarycomponents-1) |
| keka_get_payroll_salarystructures | GET /payroll/salarystructures | Implemented | [Reference](https://developers.keka.com/reference/get_payroll-salarystructures) |
| keka_get_pms_badges | GET /pms/badges | Implemented | [Reference](https://developers.keka.com/reference/get_pms-badges) |
| keka_get_pms_goals | GET /pms/goals | Implemented | [Reference](https://developers.keka.com/reference/get_pms-goals) |
| keka_get_pms_praise | GET /pms/praise | Implemented | [Reference](https://developers.keka.com/reference/get_pms-praise) |
| keka_get_pms_reviewcycles | GET /pms/reviewcycles | Implemented | [Reference](https://developers.keka.com/reference/get_pms-reviewcycles) |
| keka_get_pms_reviewgroups | GET /pms/reviewgroups | Implemented | [Reference](https://developers.keka.com/reference/get_pms-reviewgroups) |
| keka_get_pms_reviews | GET /pms/reviews | Implemented | [Reference](https://developers.keka.com/reference/get_pms-reviews) |
| keka_get_pms_timeframes | GET /pms/timeframes | Implemented | [Reference](https://developers.keka.com/reference/get_pms-timeframes) |
| keka_get_psa_clients | GET /psa/clients | Implemented | [Reference](https://developers.keka.com/reference/get_psa-clients-1) |
| keka_get_psa_clients_clientId_invoices | GET /psa/clients/{clientId}/invoices | Implemented | [Reference](https://developers.keka.com/reference/get_psa-clients-clientid-invoices) |
| keka_get_psa_clients_id | GET /psa/clients/{id} | Implemented | [Reference](https://developers.keka.com/reference/get_psa-clients-id-1) |
| keka_get_psa_clients_id_billingroles | GET /psa/clients/{id}/billingroles | Implemented | [Reference](https://developers.keka.com/reference/get_psa-clients-id-billingroles) |
| keka_get_psa_finances_ratecards | GET /psa/finances/ratecards | Implemented | [Reference](https://developers.keka.com/reference/get_psa-finances-ratecards) |
| keka_get_psa_legalentity_legalEntityId_taxes | GET /psa/legalentity/{legalEntityId}/taxes | Implemented | [Reference](https://developers.keka.com/reference/get_psa-legalentity-legalentityid-taxes) |
| keka_get_psa_legalentity_legalEntityId_taxgroups | GET /psa/legalentity/{legalEntityId}/taxgroups | Implemented | [Reference](https://developers.keka.com/reference/get_psa-legalentity-legalentityid-taxgroups) |
| keka_get_psa_project_resources | GET /psa/project/resources | Implemented | [Reference](https://developers.keka.com/reference/get_psa-project-resources) |
| keka_get_psa_projects | GET /psa/projects | Implemented | [Reference](https://developers.keka.com/reference/get_psa-projects-1) |
| keka_get_psa_projects_id | GET /psa/projects/{id} | Implemented | [Reference](https://developers.keka.com/reference/get_psa-projects-id-1) |
| keka_get_psa_projects_id_allocations | GET /psa/projects/{id}/allocations | Implemented | [Reference](https://developers.keka.com/reference/get_psa-projects-id-allocations) |
| keka_get_psa_projects_id_timeentries | GET /psa/projects/{id}/timeentries | Implemented | [Reference](https://developers.keka.com/reference/get_psa-projects-id-timeentries) |
| keka_get_psa_projects_projectId_phases | GET /psa/projects/{projectId}/phases | Implemented | [Reference](https://developers.keka.com/reference/get_psa-projects-projectid-phases-1) |
| keka_get_psa_projects_projectId_tasks | GET /psa/projects/{projectId}/tasks | Implemented | [Reference](https://developers.keka.com/reference/get_psa-projects-projectid-tasks-1) |
| keka_get_psa_projects_projectId_tasks_taskId_timeentries | GET /psa/projects/{projectId}/tasks/{taskId}/timeentries | Implemented | [Reference](https://developers.keka.com/reference/get_psa-projects-projectid-tasks-taskid-timeentries-1) |
| keka_get_psa_timeentries | GET /psa/timeentries | Implemented | [Reference](https://developers.keka.com/reference/get_psa-timeentries) |
| keka_get_requisition_requests | GET /requisition/requests | Implemented | [Reference](https://developers.keka.com/reference/get_requisition-requests) |
| keka_get_rnr_employee_employeeId_points | GET /rnr/employee/{employeeId}/points | Implemented | [Reference](https://developers.keka.com/reference/get_rnr-employee-employeeid-points) |
| keka_get_time_attendance | GET /time/attendance | Implemented | [Reference](https://developers.keka.com/reference/get_time-attendance-1) |
| keka_get_time_capturescheme | GET /time/capturescheme | Implemented | [Reference](https://developers.keka.com/reference/get_time-capturescheme) |
| keka_get_time_holidayscalendar | GET /time/holidayscalendar | Implemented | [Reference](https://developers.keka.com/reference/get_time-holidayscalendar) |
| keka_get_time_holidayscalendar_calendarId_holidays | GET /time/holidayscalendar/{calendarId}/holidays | Implemented | [Reference](https://developers.keka.com/reference/get_time-holidayscalendar-calendarid-holidays) |
| keka_get_time_leavebalance | GET /time/leavebalance | Implemented | [Reference](https://developers.keka.com/reference/get_time-leavebalance) |
| keka_get_time_leaveplans | GET /time/leaveplans | Implemented | [Reference](https://developers.keka.com/reference/get_time-leaveplans) |
| keka_get_time_leaverequests | GET /time/leaverequests | Implemented | [Reference](https://developers.keka.com/reference/get_time-leaverequests) |
| keka_get_time_leavetypes | GET /time/leavetypes | Implemented | [Reference](https://developers.keka.com/reference/get_time-leavetypes) |
| keka_get_time_od | GET /time/od | Implemented | [Reference](https://developers.keka.com/reference/get_time-od) |
| keka_get_time_penalisationpolicies | GET /time/penalisationpolicies | Implemented | [Reference](https://developers.keka.com/reference/get_time-penalisationpolicies) |
| keka_get_time_regularisationrequests | GET /time/regularisationrequests | Implemented | [Reference](https://developers.keka.com/reference/get_time-regularisationrequests) |
| keka_get_time_shiftpolicies | GET /time/shiftpolicies | Implemented | [Reference](https://developers.keka.com/reference/get_time-shiftpolicies) |
| keka_get_time_weeklyoffpolicies | GET /time/weeklyoffpolicies | Implemented | [Reference](https://developers.keka.com/reference/get_time-weeklyoffpolicies) |
| keka_get_time_wfh | GET /time/wfh | Implemented | [Reference](https://developers.keka.com/reference/get_time-wfh) |
| keka_get_traveldesk_advancerequests | GET /traveldesk/advancerequests | Implemented | [Reference](https://developers.keka.com/reference/get_traveldesk-advancerequests) |
| keka_get_v1_hire_jobboards | GET /hire/jobboards | Implemented | [Reference](https://developers.keka.com/reference/get_v1-hire-jobboards-1) |
| keka_get_v1_hire_jobs | GET /hire/jobs | Implemented | [Reference](https://developers.keka.com/reference/get_v1-hire-jobs) |
| keka_get_v1_hire_jobs_candidate_candidateId_resume | GET /hire/jobs/candidate/{candidateId}/resume | Implemented | [Reference](https://developers.keka.com/reference/get_v1-hire-jobs-candidate-candidateid-resume) |
| keka_get_v1_hire_jobs_jobId_applicationfields | GET /hire/jobs/{jobId}/applicationfields | Implemented | [Reference](https://developers.keka.com/reference/get_v1-hire-jobs-jobid-applicationfields) |
| keka_get_v1_hire_jobs_jobId_candidate_candidateId_interviews | GET /hire/jobs/{jobId}/candidate/{candidateId}/interviews | Implemented | [Reference](https://developers.keka.com/reference/get_v1-hire-jobs-jobid-candidate-candidateid-interviews) |
| keka_get_v1_hire_jobs_jobId_candidate_candidateId_scorecards | GET /hire/jobs/{jobId}/candidate/{candidateId}/scorecards | Implemented | [Reference](https://developers.keka.com/reference/get_v1-hire-jobs-jobid-candidate-candidateid-scorecards) |
| keka_get_v1_hire_jobs_jobId_candidates | GET /hire/jobs/{jobId}/candidates | Implemented | [Reference](https://developers.keka.com/reference/get_v1-hire-jobs-jobid-candidates) |
| keka_get_v1_hire_preboarding_candidates | GET /hire/preboarding/candidates | Implemented | [Reference](https://developers.keka.com/reference/get_v1-hire-preboarding-candidates) |
| keka_get_v1_hire_vendorId_assessmentrequests | GET /hire/{vendorId}/assessmentrequests | Implemented | [Reference](https://developers.keka.com/reference/get_v1-hire-vendorid-assessmentrequests) |
| keka_get_v1_hire_vendorId_assessments | GET /hire/{vendorId}/assessments | Implemented | [Reference](https://developers.keka.com/reference/get_v1-hire-vendorid-assessments) |
| keka_post_attendance_employee_routeEmployeeId_timeentry | POST /attendance/employee/{routeEmployeeId}/timeentry | Implemented | [Reference](https://developers.keka.com/reference/post_attendance-employee-routeemployeeid-timeentry) |
| keka_post_attendance_employee_timeentry | POST /attendance/employee/timeentry | Implemented | [Reference](https://developers.keka.com/reference/post_attendance-employee-timeentry) |
| keka_post_clients_clientId_creditnote | POST /clients/{clientId}/creditnote | Implemented | [Reference](https://developers.keka.com/reference/post_clients-clientid-creditnote) |
| keka_post_expense_claims | POST /expense/claims | Implemented | [Reference](https://developers.keka.com/reference/post_expense-claims) |
| keka_post_expense_employees_employeeId_expenses | POST /expense/employees/{employeeId}/expenses | Implemented | [Reference](https://developers.keka.com/reference/post_expense-employees-employeeid-expenses) |
| keka_post_expense_employees_expenses | POST /expense/employees/expenses | Implemented | [Reference](https://developers.keka.com/reference/post_expense-employees-expenses) |
| keka_post_helpdesk_tickets | POST /helpdesk/tickets | Implemented | [Reference](https://developers.keka.com/reference/post_helpdesk-tickets) |
| keka_post_hris_bgv_vendors_bgvId_checks | POST /hris/bgv/vendors/{bgvId}/checks | Implemented | [Reference](https://developers.keka.com/reference/post_hris-bgv-vendors-bgvid-checks) |
| keka_post_hris_employees | POST /hris/employees | Implemented | [Reference](https://developers.keka.com/reference/post_hris-employees) |
| keka_post_hris_employees_documents | POST /hris/employees/documents | Implemented | [Reference](https://developers.keka.com/reference/post_hris-employees-documents) |
| keka_post_hris_employees_employeeId_skills | POST /hris/employees/{employeeId}/skills | Implemented | [Reference](https://developers.keka.com/reference/post_hris-employees-employeeid-skills) |
| keka_post_hris_employees_id_exitrequest | POST /hris/employees/{id}/exitrequest | Implemented | [Reference](https://developers.keka.com/reference/post_hris-employees-id-exitrequest) |
| keka_post_hris_employees_search | POST /hris/employees/search | Implemented | [Reference](https://developers.keka.com/reference/post_hris-employees-search) |
| keka_post_payroll_employees_componentclaims | POST /payroll/employees/componentclaims | Implemented | [Reference](https://developers.keka.com/reference/post_payroll-employees-componentclaims) |
| keka_post_payroll_employees_flexibenefits | POST /payroll/employees/flexibenefits | Implemented | [Reference](https://developers.keka.com/reference/post_payroll-employees-flexibenefits) |
| keka_post_payroll_employees_routeEmployeeId_salary | POST /payroll/employees/{routeEmployeeId}/salary | Implemented | [Reference](https://developers.keka.com/reference/post_payroll-employees-routeemployeeid-salary) |
| keka_post_payroll_employees_salary | POST /payroll/employees/salary | Implemented | [Reference](https://developers.keka.com/reference/post_payroll-employees-salary) |
| keka_post_payroll_salarycomponentsoverride | POST /payroll/salarycomponentsoverride | Implemented | [Reference](https://developers.keka.com/reference/post_payroll-salarycomponentsoverride) |
| keka_post_payroll_taxdeclaration_incomefromothersources | POST /payroll/taxdeclaration/incomefromothersources | Implemented | [Reference](https://developers.keka.com/reference/post_payroll-taxdeclaration-incomefromothersources) |
| keka_post_payroll_taxdeclaration_ownresidence | POST /payroll/taxdeclaration/ownresidence | Implemented | [Reference](https://developers.keka.com/reference/post_payroll-taxdeclaration-ownresidence) |
| keka_post_payroll_taxdeclaration_rentalresidence | POST /payroll/taxdeclaration/rentalresidence | Implemented | [Reference](https://developers.keka.com/reference/post_payroll-taxdeclaration-rentalresidence) |
| keka_post_pms_praise | POST /pms/praise | Implemented | [Reference](https://developers.keka.com/reference/post_pms-praise) |
| keka_post_psa_clients | POST /psa/clients | Implemented | [Reference](https://developers.keka.com/reference/post_psa-clients-1) |
| keka_post_psa_clients_clientId_invoices_invoiceId_receivepayment | POST /psa/clients/{clientId}/invoices/{invoiceId}/receivepayment | Implemented | [Reference](https://developers.keka.com/reference/post_psa-clients-clientid-invoices-invoiceid-receivepayment) |
| keka_post_psa_employees_employeeId_timeentries | POST /psa/employees/{employeeId}/timeentries | Implemented | [Reference](https://developers.keka.com/reference/post_psa-employees-employeeid-timeentries) |
| keka_post_psa_employees_employeeId_timeentries_submit | POST /psa/employees/{employeeId}/timeentries/submit | Implemented | [Reference](https://developers.keka.com/reference/post_psa-employees-employeeid-timeentries-submit) |
| keka_post_psa_projects | POST /psa/projects | Implemented | [Reference](https://developers.keka.com/reference/post_psa-projects-1) |
| keka_post_psa_projects_id_allocations | POST /psa/projects/{id}/allocations | Implemented | [Reference](https://developers.keka.com/reference/post_psa-projects-id-allocations) |
| keka_post_psa_projects_projectId_phases | POST /psa/projects/{projectId}/phases | Implemented | [Reference](https://developers.keka.com/reference/post_psa-projects-projectid-phases-1) |
| keka_post_psa_projects_projectId_tasks | POST /psa/projects/{projectId}/tasks | Implemented | [Reference](https://developers.keka.com/reference/post_psa-projects-projectid-tasks-1) |
| keka_post_time_leaverequests | POST /time/leaverequests | Implemented | [Reference](https://developers.keka.com/reference/post_time-leaverequests) |
| keka_post_time_od | POST /time/od | Implemented | [Reference](https://developers.keka.com/reference/post_time-od) |
| keka_post_time_wfh | POST /time/wfh | Implemented | [Reference](https://developers.keka.com/reference/post_time-wfh) |
| keka_post_v1_hire_jobs_candidate_candidateId_resume | POST /hire/jobs/candidate/{candidateId}/resume | Transport multipart/form-data intentionally unavailable; no file reads or uploads | [Reference](https://developers.keka.com/reference/post_v1-hire-jobs-candidate-candidateid-resume) |
| keka_post_v1_hire_jobs_jobId_candidate | POST /hire/jobs/{jobId}/candidate | Implemented | [Reference](https://developers.keka.com/reference/post_v1-hire-jobs-jobid-candidate) |
| keka_post_v1_hire_jobs_jobId_candidate_candidateId_notes | POST /hire/jobs/{jobId}/candidate/{candidateId}/notes | Implemented | [Reference](https://developers.keka.com/reference/post_v1-hire-jobs-jobid-candidate-candidateid-notes) |
| keka_post_v1_hire_preboarding_candidates | POST /hire/preboarding/candidates | Implemented | [Reference](https://developers.keka.com/reference/post_v1-hire-preboarding-candidates) |
| keka_post_v1_hire_vendorId_assessmentrequests_assessm_86574d9876 | POST /hire/{vendorId}/assessmentrequests/{assessmentRequestId} | Implemented | [Reference](https://developers.keka.com/reference/post_v1-hire-vendorid-assessmentrequests-assessmentrequestid) |
| keka_post_v1_hire_vendorId_assessments | POST /hire/{vendorId}/assessments | Implemented | [Reference](https://developers.keka.com/reference/post_v1-hire-vendorid-assessments) |
| keka_put_app_status | PUT /app/status | Implemented | [Reference](https://developers.keka.com/reference/put_app-status) |
| keka_put_assets_assetId_allocation | PUT /assets/{assetId}/allocation | Implemented | [Reference](https://developers.keka.com/reference/put_assets-assetid-allocation) |
| keka_put_assets_assetId_recover | PUT /assets/{assetId}/recover | Implemented | [Reference](https://developers.keka.com/reference/put_assets-assetid-recover) |
| keka_put_expense_claims | PUT /expense/claims | Implemented | [Reference](https://developers.keka.com/reference/put_expense-claims) |
| keka_put_expense_claims_expenseClaimId | PUT /expense/claims/{expenseClaimId} | Implemented | [Reference](https://developers.keka.com/reference/put_expense-claims-expenseclaimid) |
| keka_put_expense_employees_employeeId_expenses_expenseId | PUT /expense/employees/{employeeId}/expenses/{expenseId} | Implemented | [Reference](https://developers.keka.com/reference/put_expense-employees-employeeid-expenses-expenseid) |
| keka_put_expense_employees_expenses | PUT /expense/employees/expenses | Implemented | [Reference](https://developers.keka.com/reference/put_expense-employees-expenses) |
| keka_put_helpdesk_tickets_ticketId | PUT /helpdesk/tickets/{ticketId} | Implemented | [Reference](https://developers.keka.com/reference/put_helpdesk-tickets-ticketid) |
| keka_put_hris_bgv_bgvId_requests_requestId | PUT /hris/bgv/{bgvId}/requests/{requestId} | Transport multipart/form-data intentionally unavailable; no file reads or uploads | [Reference](https://developers.keka.com/reference/put_hris-bgv-bgvid-requests-requestid) |
| keka_put_hris_e_sign_vendorId_letterrequests_letterRequestId | PUT /hris/e-sign/{vendorId}/letterrequests/{letterRequestId} | Implemented | [Reference](https://developers.keka.com/reference/put_hris-e-sign-vendorid-letterrequests-letterrequestid) |
| keka_put_hris_employees_id_exitrequest | PUT /hris/employees/{id}/exitrequest | Implemented | [Reference](https://developers.keka.com/reference/put_hris-employees-id-exitrequest) |
| keka_put_hris_employees_jobdetails | PUT /hris/employees/jobdetails | Implemented | [Reference](https://developers.keka.com/reference/put_hris-employees-jobdetails) |
| keka_put_hris_employees_personaldetails | PUT /hris/employees/personaldetails | Implemented | [Reference](https://developers.keka.com/reference/put_hris-employees-personaldetails) |
| keka_put_loans | PUT /loans | Implemented | [Reference](https://developers.keka.com/reference/put_loans) |
| keka_put_payroll_employees_financialdetails | PUT /payroll/employees/financialdetails | Implemented | [Reference](https://developers.keka.com/reference/put_payroll-employees-financialdetails) |
| keka_put_payroll_employees_financialdetails_banks | PUT /payroll/employees/financialdetails/banks | Implemented | [Reference](https://developers.keka.com/reference/put_payroll-employees-financialdetails-banks) |
| keka_put_payroll_employees_routeEmployeeId_salary | PUT /payroll/employees/{routeEmployeeId}/salary | Implemented | [Reference](https://developers.keka.com/reference/put_payroll-employees-routeemployeeid-salary) |
| keka_put_payroll_employees_salary | PUT /payroll/employees/salary | Implemented | [Reference](https://developers.keka.com/reference/put_payroll-employees-salary) |
| keka_put_payroll_employees_taxregime | PUT /payroll/employees/taxregime | Implemented | [Reference](https://developers.keka.com/reference/put_payroll-employees-taxregime) |
| keka_put_payroll_paygroups_paycycles_adhoctransactions | PUT /payroll/paygroups/paycycles/adhoctransactions | Implemented | [Reference](https://developers.keka.com/reference/put_payroll-paygroups-paycycles-adhoctransactions) |
| keka_put_payroll_paygroups_paycycles_paybatches_payments | PUT /payroll/paygroups/paycycles/paybatches/payments | Implemented | [Reference](https://developers.keka.com/reference/put_payroll-paygroups-paycycles-paybatches-payments) |
| keka_put_payroll_paygroups_routePayGroupId_paycycles__fbbd2c96dc | PUT /payroll/paygroups/{routePayGroupId}/paycycles/{routePayCycleId}/paybatches/{routePayBatchId}/payments | Implemented | [Reference](https://developers.keka.com/reference/put_payroll-paygroups-routepaygroupid-paycycles-routepaycycleid-paybatches-routepaybatchid-payments) |
| keka_put_payroll_taxdeclaration | PUT /payroll/taxdeclaration | Implemented | [Reference](https://developers.keka.com/reference/put_payroll-taxdeclaration) |
| keka_put_pms_goals_goalId_progress | PUT /pms/goals/{goalId}/progress | Implemented | [Reference](https://developers.keka.com/reference/put_pms-goals-goalid-progress) |
| keka_put_psa_clients_id | PUT /psa/clients/{id} | Implemented | [Reference](https://developers.keka.com/reference/put_psa-clients-id) |
| keka_put_psa_projects_id | PUT /psa/projects/{id} | Implemented | [Reference](https://developers.keka.com/reference/put_psa-projects-id) |
| keka_put_psa_projects_id_allocations_resources_resourceId | PUT /psa/projects/{id}/allocations/resources/{resourceId} | Implemented | [Reference](https://developers.keka.com/reference/put_psa-projects-id-allocations-resources-resourceid) |
| keka_put_psa_projects_projectId_tasks_taskId | PUT /psa/projects/{projectId}/tasks/{taskId} | Implemented | [Reference](https://developers.keka.com/reference/put_psa-projects-projectid-tasks-taskid) |
| keka_put_rnr_employee_employeeId_points | PUT /rnr/employee/{employeeId}/points | Implemented | [Reference](https://developers.keka.com/reference/put_rnr-employee-employeeid-points) |
| keka_put_traveldesk_advancerequests | PUT /traveldesk/advancerequests | Implemented | [Reference](https://developers.keka.com/reference/put_traveldesk-advancerequests) |
| keka_put_traveldesk_advancerequests_advanceId | PUT /traveldesk/advancerequests/{advanceId} | Implemented | [Reference](https://developers.keka.com/reference/put_traveldesk-advancerequests-advanceid) |
| keka_put_v1_hire_jobs_jobId_candidate_candidateId | PUT /hire/jobs/{jobId}/candidate/{candidateId} | Implemented | [Reference](https://developers.keka.com/reference/put_v1-hire-jobs-jobid-candidate-candidateid) |
| keka_put_v1_hire_preboarding_candidates_id | PUT /hire/preboarding/candidates/{id} | Implemented | [Reference](https://developers.keka.com/reference/put_v1-hire-preboarding-candidates-id) |
| keka_put_v1_hire_vendorId_assessments_assessmentId | PUT /hire/{vendorId}/assessments/{assessmentId} | Implemented | [Reference](https://developers.keka.com/reference/put_v1-hire-vendorid-assessments-assessmentid) |

## Unavailable or outside this implementation

Multipart uploads and form-encoded business operations are cataloged but disabled. Local file reads, remote attachment downloads, OAuth app-portal installation/code/refresh flows, SSO, webhook receiving, and arbitrary HTTP requests are not exposed. API-key token acquisition is implemented separately. Goal creation/deletion, review submission and other unlisted PMS actions are not invented. Their availability is not established by this catalog.
