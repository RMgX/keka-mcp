# Built-in reports

Invoke these MCP tools directly; no custom joins, pagination scripts or spreadsheet building are required. Each tool returns ready-to-read Markdown plus structured JSON. Set `format: "json"` for JSON text. Reports only read Keka and inherit the deployment's module and exact read-tool permissions.

| Report tool | Use | Required modules |
|---|---|---|
| `keka_report_active_projects` | In-progress, non-archived projects with current employed headcount, allocation FTE and managers | `psa,hris` |
| `keka_report_project_staffing` | People allocated to one project on a date, with roles, allocation percentages and dates | `psa,hris` |
| `keka_report_project_availability` | Monthly daily calendar, approved leave, holidays, available days and allocation-weighted days | `psa,hris,time` |
| `keka_report_exited_allocations` | All-project audit of assignments extending beyond relieved employees' exit dates | `psa,hris` |

Example requests to your AI tool:

- “Run the active projects report.”
- “Run the staffing report for Kautilya-1 as of November 11, 2026.”
- “Run eShipper-Ongoing Support's availability report for November 2026.”
- “Audit all projects for allocations belonging to exited employees. Do not change anything.”

## Explicit tool calls

```json
{"name":"keka_report_active_projects","arguments":{}}
```

```json
{
  "name":"keka_report_project_staffing",
  "arguments":{"projectName":"Kautilya-1","asOf":"2026-11-11"}
}
```

```json
{
  "name":"keka_report_project_availability",
  "arguments":{
    "projectName":"eShipper-Ongoing Support",
    "month":"2026-11",
    "asOf":"2026-11-11",
    "includeDaily":true
  }
}
```

```json
{"name":"keka_report_exited_allocations","arguments":{"format":"json","maxRequests":200}}
```

Project reports accept exactly one of `projectId` or `projectName`. An exact name wins; otherwise a unique substring can match. Ambiguous matches fail rather than choosing a project. `asOf` defaults to the current date in Asia/Kolkata. `month` is required for availability.

## Definitions

- Active project means Keka status `InProgress` (0), not archived. Past scheduled end dates are flagged rather than silently reclassifying the project.
- Staffing uses allocations whose dates contain `asOf`, intersects employment dates, and excludes zero-percent assignments. Employment exit dates are inclusive. Headcount is distinct people per project; FTE sums allocation percentages and can include multiple assignments per person. Do not sum project headcounts to infer distinct company headcount.
- Availability counts working days within allocation and employment dates, less approved leave. Pending, rejected and cancelled leave do not reduce availability. First/second-half sessions contribute 0.5 day; overlapping leave sessions are not deducted twice. Hour/minute-based leave is unsupported and fails with a specific error rather than being treated as a full day.
- Mandatory employee-calendar holidays are OFF. Optional/floating holidays are working unless selected through approved leave. Saturday/Sunday is an explicitly labeled assumption for the `Weekend OFF` policy label. Sunday/Monday labels are handled separately. Unrecognized policies fail unless the caller supplies `weekendDays` (Sunday=0 through Saturday=6) as a deliberate report-wide override.
- `availablePercent` is available days divided by the employee's full-month working-day denominator, expressed from 0 to 100. A partial-month assignment can therefore have a lower percentage without leave.
- `allocatedDayEquivalents` also applies daily project allocation percentages. A person available 20 days at 25% contributes 5 allocated day equivalents. Overlaps exceeding 100% are flagged, not capped or hidden.
- Dates after `asOf` are planned availability. The report does not establish attendance, actual hours worked, productivity or billing eligibility.
- The exited-allocation report covers all projects, including completed and archived ones. Assignments already ended on or before exit are preserved. Missing exit dates or assignments starting after exit are review exceptions. This report never deallocates anyone.

## Completeness, permissions and runtime

Required underlying reads must all be enabled. For example, staffing needs GET projects, GET project allocations and GET employees. Availability also needs GET leave requests, GET calendar holidays and GET weekly-off policies. Reports are hidden from discovery and rejected at execution if any dependency is disallowed by `KEKA_MODULES` or `KEKA_READ_TOOLS`. Enabling a report does not expand permissions or enable writes.

Each call retrieves all required pages using the server's fixed Keka tenant and shared throttle. It never follows returned pagination URLs. Default budget: 120 logical reads; caller-adjustable up to 200. A 100-page-per-collection limit, 10,000 fetched-row limit and two-MiB response limit apply. Elapsed time is checked before reads against an eight-minute budget; an already-running Keka retry can take longer. Large reports can take several minutes under Keka's quota. Configure client timeouts accordingly; set `includeDaily:false` for a compact monthly report.

Missing required profiles, dates, unsupported calendar policies, inconsistent page totals, duplicate page IDs, upstream failures or exhausted budgets produce an error. Partial data is not labeled complete. Data is fetched sequentially, not as an atomic database snapshot; `asOf` selects dates against currently stored records, not a historical audit snapshot. No durable report cache, export files or employee data store is created.

When exposed tools change, restart your MCP host and resync Composio's custom toolkit. Four new reports make the maximum executable tool count 188 (184 REST operations plus four reports), before permission filtering.
