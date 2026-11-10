# Built-in reports

Invoke these MCP tools to run the joins, calculations and pagination on the server. Reports only read Keka and inherit the deployment's module and exact read-tool permissions. By default they return Markdown plus structured JSON. For a small response, use `detail: "summary"` and `format: "compact"`. See [response controls and discovery modes](efficient-mcp.md).

| Report tool | Use | Required modules |
|---|---|---|
| `keka_report_hr_dashboard` | Headcount as of a date, monthly joiners and exits, job-title breakdown and profile quality counts | `hris` |
| `keka_report_project_portfolio` | Project status, schedule, managers, archive and billing designation | `psa` |
| `keka_report_project_resourcing` | Cross-project allocation per employed person, unallocated capacity and over-allocation | `psa,hris` |
| `keka_report_project_health` | Overdue schedule, staffing gaps, missing managers, allocation date conflicts and over-allocation signals | `psa,hris` |
| `keka_report_leave` | Monthly requests, approval status and deduplicated calendar half-days; reasons omitted | `time,hris` |
| `keka_report_validation` | Data-quality checks and exceptions across employee, project and allocation records; never modifies Keka | `psa,hris` |
| `keka_report_active_projects` | In-progress, non-archived projects with current employed headcount, allocation FTE and managers | `psa,hris` |
| `keka_report_project_staffing` | People allocated to one project on a date, with roles, allocation percentages and dates | `psa,hris` |
| `keka_report_project_availability` | Monthly daily calendar, approved leave, holidays, available days and allocation-weighted days | `psa,hris,time` |
| `keka_report_exited_allocations` | All-project audit of assignments extending beyond relieved employees' exit dates | `psa,hris` |

Example requests to your AI tool:

- “Run the overall HR dashboard for this month, totals only.”
- “Show all projects, including archived ones.”
- “Show project resourcing and identify over-allocations.”
- “Run the active project health report and show the review signals.”
- “Summarize approved leave for November 2026.”
- “Run the Keka data validation report. Show the first ten findings.”
- “Run the active projects report.”
- “Run the staffing report for Kautilya-1 as of November 11, 2026.”
- “Run eShipper-Ongoing Support's availability report for November 2026.”
- “Audit all projects for allocations belonging to exited employees. Do not change anything.”

## Explicit tool calls

```json
{"name":"keka_report_hr_dashboard","arguments":{"month":"2026-11","detail":"summary"}}
```

```json
{"name":"keka_report_leave","arguments":{"month":"2026-11","status":"approved","detail":"summary"}}
```

```json
{"name":"keka_report_validation","arguments":{"limit":10,"fields":["severity","code","entity","recordId"]}}
```

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

Staffing and availability accept exactly one of `projectId` or `projectName`. An exact name wins; otherwise a unique substring can match. Ambiguous matches fail. `asOf` defaults to today in Asia/Kolkata. Leave and availability require `month` in `YYYY-MM` form. The HR dashboard defaults to the month containing `asOf`.

## Definitions

- HR headcount counts valid employment records whose inclusive joining and exit dates contain `asOf`. Month counts are based on stored joining and exit dates, so they can include future events. The report returns aggregates only and discloses records with invalid or incomplete employment data.
- Portfolio, resourcing and health default to `scope: "active"`. Set `scope: "all"` to include all projects, including completed and archived ones. The portfolio preserves Keka's raw status code and does not infer financial performance from billing designation.
- Resourcing sums current, verified assignments across the selected projects. A 125% allocation counts as 1.25 FTE; unused allocation is floored at zero per employee. Shadow assignments are included. These figures describe recorded allocation, not billable utilization or leave-adjusted capacity. Counts and warnings disclose unverifiable employee or allocation records.
- Health uses operational signals, not a delivery or financial score. A project with no flags can still have issues outside the available data. `STAFFING_DATA_UNVERIFIED` distinguishes incomplete staffing records from a verified lack of staffing. Scope controls cross-project capacity calculations.
- Leave lists requests overlapping the selected month and optionally filters by up to 20 `employeeIds` or `status` (`all`, `approved`, `pending`). Calendar-day equivalents count date and half-day sessions within the month, including non-working days. Approved overlaps are deduplicated across requests. Non-day requests are listed with null equivalents. For working-day capacity, use project availability instead. Leave reasons, notes and rejection text are omitted.
- Validation checks dates, statuses, allocation references and percentages, stale assignments, active projects without managers, and recorded allocation conflicts. It covers all projects and emits record IDs and issue codes for review. Zero findings only means the implemented checks passed; this tool does not certify system integrity or apply fixes.
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

Incomplete pagination, upstream failures and exhausted budgets produce errors. The existing staffing and availability reports also fail if required profiles, dates or calendar data are missing. The standard HR, health and resourcing reports count and disclose excluded unusable records instead. `complete` refers to successful source retrieval and calculation, not absence of data-quality issues. Use `resultPage` to distinguish a complete calculation from the number of rows shown. Reads are sequential; `asOf` applies to currently stored records and cannot reconstruct historical record revisions. No durable report cache, export files or employee data store is created.

After updating or changing modes, restart your MCP host and resync Composio's custom toolkit. Full mode has up to 194 executable tools (184 REST operations and ten reports), before permission filtering.
