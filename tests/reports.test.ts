import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {config} from '../src/config.js';
import {loadCatalog} from '../src/catalog.js';
import {Gate,KekaClient} from '../src/client.js';
import {createServer} from '../src/server.js';
import {REPORTS,reportPermitted,runReport,availabilityCalendar,resolveProject,renderReport} from '../src/reports.js';
const catalog=loadCatalog();
const calendarId='11111111-1111-4111-8111-111111111111';
const employee=(id='e1',extra:Record<string,any>={})=>({id,displayName:id,employeeNumber:'TEST-'+id,joiningDate:'2025-01-01',exitDate:null,employmentStatus:0,holidayCalendarId:calendarId,weeklyOffPolicyInfo:{title:'Weekend OFF'},...extra});
const allocation=(id='a1',employeeId='e1',extra:Record<string,any>={})=>({id,employee:{id:employeeId,firstName:employeeId},startDate:'2025-01-01',endDate:'2028-01-01',allocationPercentage:50,billingRole:{name:'Engineer'},...extra});
const cfg=(modules='psa,hris,time')=>config({KEKA_COMPANY:'test',KEKA_ACCESS_TOKEN:'fixture',KEKA_MODULES:modules});
const report=(name:string)=>REPORTS.find(r=>r.name==='keka_report_'+name)!;
const project=(id='p1',name='Example',extra:Record<string,any>={})=>({id,name,status:0,isArchived:false,projectManagers:[],...extra});
const baseCalendar=(extra:Record<string,any>={})=>({month:'2026-11',asOf:'2026-11-11',allocations:[allocation()],people:new Map([['e1',employee()]]),leaves:[],holidays:[],policies:[],...extra});
const leave=(extra:Record<string,any>={})=>({id:'l1',employeeIdentifier:'e1',fromDate:'2026-11-02',toDate:'2026-11-02',fromSession:0,toSession:1,status:1,...extra});
function mocked(c=cfg(),handler:(path:string,query:URLSearchParams)=>any=()=>({data:[],nextPage:null})){
 const calls:string[]=[];
 const client=new KekaClient(c,async(url)=>{const u=new URL(String(url));calls.push(u.pathname+u.search);return new Response(JSON.stringify(handler(u.pathname.replace('/api/v1',''),u.searchParams)))},new Gate(0));
 return {client,calls};
}
test('report discovery and execution require every underlying read permission',async()=>{
 const c=cfg('psa,hris');assert.equal(reportPermitted(report('project_staffing'),c,catalog),true);assert.equal(reportPermitted(report('project_availability'),c,catalog),false);
 c.readTools.add('keka_get_psa_projects');const {client,calls}=mocked(c);
 assert.equal(reportPermitted(report('project_staffing'),c,catalog),false);
 await assert.rejects(runReport(report('project_staffing'),{projectName:'Example'},c,client,catalog),/REPORT_PERMISSION_DENIED/);assert.equal(calls.length,0);
});
test('project resolution prefers exact match and refuses ambiguous prefixes',()=>{
 const rows=[project('1','Team'),project('2','Team Alpha')];assert.equal(resolveProject(rows,{projectName:'team'}).id,'1');assert.throws(()=>resolveProject(rows,{projectName:'Tea'}),/REPORT_AMBIGUOUS_PROJECT/);assert.throws(()=>resolveProject(rows,{projectId:'missing'}),/REPORT_PROJECT_NOT_FOUND/);
});
test('calendar handles approved half days, ignores pending leave and prevents double deduction',()=>{
 const r=availabilityCalendar(baseCalendar({leaves:[leave(),leave({id:'duplicate'}),leave({id:'half',fromDate:'2026-11-03',toDate:'2026-11-03',toSession:0}),leave({id:'pending',fromDate:'2026-11-04',toDate:'2026-11-04',status:0})]}));
 assert.equal(r.rows[0].workingDays,21);assert.equal(r.rows[0].availableDays,19.5);assert.equal(r.rows[0].allocatedDayEquivalents,9.75);assert.equal(r.rows[0].daily[2].state,'HALF_DAY_LEAVE');assert.equal(r.rows[0].daily[3].state,'AVAILABLE');assert.equal(r.summary.containsFutureDays,true);
});
test('mandatory holidays affect the denominator; optional holidays need approved leave',()=>{
 const r=availabilityCalendar(baseCalendar({holidays:[{calendarId,date:'2026-11-04',isFloater:false},{calendarId,date:'2026-11-09',isFloater:true}],leaves:[leave()]}));
 assert.equal(r.rows[0].workingDays,20);assert.equal(r.rows[0].availableDays,19);assert.equal(r.rows[0].daily[3].state,'OFF');assert.equal(r.rows[0].daily[8].state,'AVAILABLE');
});
test('calendar respects allocation start dates and excludes departed staff from the month',()=>{
 const r=availabilityCalendar(baseCalendar({people:new Map([['e1',employee()],['e2',employee('e2',{employmentStatus:1,exitDate:'2026-09-01'})]]),allocations:[allocation('a1','e1',{startDate:'2026-11-16',allocationPercentage:100}),allocation('a2','e2')]}));
 assert.equal(r.rows.length,1);assert.equal(r.rows[0].availableDays,11);assert.equal(r.rows[0].daily[1].state,'NOT_ALLOCATED');assert.equal(r.excluded.length,1);
});
test('employment exit date is inclusive and zero allocation is not available project capacity',()=>{
 const r=availabilityCalendar(baseCalendar({people:new Map([['e1',employee('e1',{employmentStatus:1,exitDate:'2026-11-10'})]])}));assert.equal(r.rows[0].availableDays,7);
 const zero=availabilityCalendar(baseCalendar({allocations:[allocation('a1','e1',{allocationPercentage:0})]}));assert.equal(zero.rows[0].availableDays,0);assert.equal(zero.rows[0].allocatedDayEquivalents,0);
});
test('overlapping allocation rows do not duplicate personal days; recorded capacity is flagged',()=>{
 const r=availabilityCalendar(baseCalendar({allocations:[allocation('a1','e1',{allocationPercentage:75}),allocation('a2','e1',{allocationPercentage:50})]}));
 assert.equal(r.rows[0].availableDays,21);assert.equal(r.rows[0].allocatedDayEquivalents,26.25);assert.ok(r.warnings.some(w=>w.includes('100%')));
});
test('unknown weekly-off policy fails unless the caller provides explicit days',()=>{
 const input=baseCalendar({people:new Map([['e1',employee('e1',{weeklyOffPolicyInfo:{title:'Custom'}})]])});
 assert.throws(()=>availabilityCalendar(input),/REPORT_WEEKEND_POLICY_UNSUPPORTED/);
 assert.equal(availabilityCalendar({...input,weekendDays:[0,6]}).rows[0].workingDays,21);
});
test('calendar clips cross-month leave and honors second-half sessions',()=>{
 const r=availabilityCalendar(baseCalendar({leaves:[leave({fromDate:'2026-10-30',toDate:'2026-11-02',fromSession:0,toSession:0}),leave({id:'last',fromDate:'2026-11-30',toDate:'2026-12-02',fromSession:1,toSession:1})]}));assert.equal(r.rows[0].availableDays,20);assert.equal(r.rows[0].daily[1].availableDays,.5);assert.equal(r.rows[0].daily[29].availableDays,.5);
});
test('invalid sessions and missing employment/calendar data cannot yield complete results',()=>{
 assert.throws(()=>availabilityCalendar(baseCalendar({leaves:[leave({fromSession:1,toSession:0})]})),/REPORT_INVALID_LEAVE_SESSIONS/);
 assert.throws(()=>availabilityCalendar(baseCalendar({people:new Map([['e1',employee('e1',{joiningDate:null})]])})),/REPORT_EMPLOYMENT_DATES_MISSING/);
 assert.throws(()=>availabilityCalendar(baseCalendar({people:new Map([['e1',employee('e1',{holidayCalendarId:null})]])})),/REPORT_HOLIDAY_CALENDAR_MISSING/);
 assert.throws(()=>availabilityCalendar(baseCalendar({holidays:[{calendarId,date:'2026-11-02'}]})),/REPORT_HOLIDAY_METADATA_MISSING/);
 assert.throws(()=>availabilityCalendar(baseCalendar({allocations:[allocation('a1','e1',{startDate:'2026-02-30'})]})),/REPORT_INVALID_ALLOCATION_DATES/);
 assert.throws(()=>availabilityCalendar(baseCalendar({leaves:[leave({selection:[{duration:{unit:1,duration:4}}]})]})),/REPORT_LEAVE_DURATION_UNSUPPORTED/);
});
test('staffing report joins names, excludes exited staff and omits unrelated HR fields',async()=>{
 const c=cfg();const {client}=mocked(c,(path)=>({data:path==='/psa/projects'?[project()]:path.includes('/allocations')?[allocation(),allocation('a2','e2')]:[employee('e1',{displayName:'Current',personalEmail:'must-not-appear'}),employee('e2',{exitDate:'2026-09-01',employmentStatus:1})],nextPage:null}));
 const result=await runReport(report('project_staffing'),{projectName:'Example',asOf:'2026-11-11'},c,client,catalog);assert.equal(result.summary.headcount,1);assert.equal(result.summary.allocatedFTE,.5);assert.equal(result.rows[0].name,'Current');assert.equal(JSON.stringify(result).includes('must-not-appear'),false);assert.equal(result.complete,true);
});
test('active-project report filters archived/completed projects and flags expired schedules',async()=>{
 const c=cfg(),{client,calls}=mocked(c,(path)=>({data:path==='/psa/projects'?[project('p1','Active',{endDate:'2026-01-01'}),project('p2','Archived',{isArchived:true}),project('p3','Done',{status:1})]:[],nextPage:null}));
 const result=await runReport(report('active_projects'),{asOf:'2026-11-11'},c,client,catalog);assert.equal(result.summary.activeProjects,1);assert.equal(result.rows[0].headcount,0);assert.equal(calls.filter(p=>p.includes('/allocations')).length,1);assert.ok(result.warnings.length);
});
test('exited-allocation audit includes completed projects, preserves history and reports exceptions',async()=>{
 const c=cfg();const {client}=mocked(c,path=>({data:path==='/psa/projects'?[project('p1','Done',{status:1})]:path==='/hris/employees'?[employee('e1',{employmentStatus:1,exitDate:'2026-09-01'}),employee('missing',{employmentStatus:1})]:[allocation('stale'),allocation('ended','e1',{endDate:'2026-08-01'}),allocation('bad','e1',{startDate:'2026-10-01'})],nextPage:null}));
 const result=await runReport(report('exited_allocations'),{asOf:'2026-11-11'},c,client,catalog);assert.equal(result.summary.staleAllocations,1);assert.equal(result.summary.alreadyEnded,1);assert.equal(result.summary.exceptions,2);assert.equal(result.rows[0].proposedEndDate,'2026-09-01');assert.equal(result.summary.readOnly,true);
});
test('reports paginate locally without following returned URLs',async()=>{
 const c=cfg();const {client,calls}=mocked(c,(path,q)=>path==='/psa/projects'?{data:q.get('pageNumber')==='1'?[project('p1')]:[project('p2','Other')],pageNumber:Number(q.get('pageNumber')),nextPage:q.get('pageNumber')==='1'?'https://evil.example/steal':null}:{data:[],nextPage:null});
 const result=await runReport(report('active_projects'),{asOf:'2026-11-11'},c,client,catalog);assert.equal(result.summary.activeProjects,2);assert.ok(calls.some(p=>p.includes('pageNumber=2')));assert.ok(calls.every(p=>!p.includes('evil')));
});
test('missing pagination, duplicate pages and budget exhaustion fail instead of returning partial success',async()=>{
 const c=cfg();
 const missing=mocked(c,()=>({data:[project()]}));await assert.rejects(runReport(report('active_projects'),{},c,missing.client,catalog),/REPORT_PAGINATION_METADATA_MISSING/);
 const duplicate=mocked(c,()=>({data:[project()],nextPage:'next'}));await assert.rejects(runReport(report('active_projects'),{},c,duplicate.client,catalog),/REPORT_DUPLICATE_PAGE_RECORD/);
 const budget=mocked(c,()=>({data:[project()],nextPage:null}));await assert.rejects(runReport(report('active_projects'),{maxRequests:1},c,budget.client,catalog),/REPORT_REQUEST_BUDGET_EXCEEDED/);
});
test('report argument validation rejects unknown filters, invalid dates and ambiguous selectors',async()=>{
 const c=cfg(),{client,calls}=mocked(c);
 for(const args of [{projectId:'p1',projectName:'Example'},{projectId:'p1',asOf:'2026-02-30'},{projectId:'p1',unknown:true}])await assert.rejects(runReport(report('project_staffing'),args,c,client,catalog),/INVALID_REPORT_ARGUMENTS/);
 assert.equal(calls.length,0);
});
test('availability report orchestrates all data sources and exposes daily detail on demand',async()=>{
 const c=cfg(),{client}=mocked(c,path=>({data:path==='/psa/projects'?[project()]:path.includes('/allocations')?[allocation()]:path==='/hris/employees'?[employee()]:[],nextPage:null}));
 const result=await runReport(report('project_availability'),{projectId:'p1',month:'2026-11',asOf:'2026-11-11',includeDaily:false},c,client,catalog);assert.equal(result.rows[0].availableDays,21);assert.equal(result.rows[0].daily,undefined);assert.equal(result.summary.allocatedDayEquivalents,10.5);assert.ok(renderReport(result).includes('Example'));assert.equal(JSON.parse(renderReport(result,'json')).complete,true);
});
test('MCP discovers only permitted reports and returns structured report responses',async()=>{
 const c=cfg('psa,hris'),{client:rest}=mocked(c,path=>({data:path==='/psa/projects'?[project()]:[],nextPage:null}));
 const server=createServer(c,rest),client=new Client({name:'report-test',version:'1.0'});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);
 try{const tools=(await client.listTools()).tools;assert.deepEqual(tools.filter(t=>t.name.startsWith('keka_report_')).map(t=>t.name).sort(),REPORTS.filter(r=>!r.dependencies.some(d=>d.startsWith('/time/'))).map(r=>r.name).sort());const result=await client.callTool({name:'keka_report_active_projects',arguments:{asOf:'2026-11-11'}});assert.equal(result.isError,undefined);assert.equal(result.structuredContent?.complete,true);const denied=await client.callTool({name:'keka_report_project_availability',arguments:{}});assert.equal(denied.isError,true);}finally{await client.close();await server.close()}
});

test('HR dashboard counts inclusive employment, separate monthly movements and only aggregate details',async()=>{
 const c=cfg('hris'),{client,calls}=mocked(c,()=>({nextPage:null,data:[employee('e1',{joiningDate:'2026-11-11',jobTitle:{title:'Engineer'},personalEmail:'private'}),employee('e2',{employmentStatus:1,exitDate:'2026-11-11'}),employee('e3',{employmentStatus:1,exitDate:'2026-11-10'}),employee('e4',{joiningDate:'2026-11-12'})]}));
 const r=await runReport(report('hr_dashboard'),{asOf:'2026-11-11'},c,client,catalog);
 assert.equal(r.summary.headcount,2);assert.equal(r.summary.joinersInMonth,2);assert.equal(r.summary.exitsInMonth,2);assert.equal(r.summary.monthContainsFutureDays,true);assert.deepEqual(r.rows,[{jobTitle:'Engineer',headcount:1},{jobTitle:'Unspecified',headcount:1}]);assert.equal(JSON.stringify(r).includes('private'),false);assert.equal(calls.length,1);
});

test('portfolio works with PSA alone and includes archive metadata only on request',async()=>{
 const c=cfg('psa'),{client}=mocked(c,()=>({data:[project('active','Active',{isBillable:true}),project('archived','Archived',{isArchived:true}),project('other','Other',{status:1})],nextPage:null}));
 const active=await runReport(report('project_portfolio'),{},c,client,catalog),all=await runReport(report('project_portfolio'),{scope:'all'},c,client,catalog);
 assert.equal(active.rows.length,1);assert.equal(active.rows[0].billable,true);assert.equal(all.rows.length,3);assert.equal(all.summary.archivedProjects,1);assert.equal(all.rows[2].statusCode,1);
});

test('resourcing distinguishes unallocated capacity and cross-project overload; skips archive reads by default',async()=>{
 const c=cfg('psa,hris'),{client,calls}=mocked(c,path=>({nextPage:null,data:path==='/psa/projects'?[project('p1','One'),project('p2','Two'),project('p3','Archived',{isArchived:true})]:path==='/hris/employees'?[employee('e1'),employee('e2'),employee('e3'),employee('e4',{employmentStatus:1,exitDate:'2026-11-10'})]:path.includes('/p1/')?[allocation('a1','e1',{allocationPercentage:80}),allocation('a2','e2',{allocationPercentage:25}),allocation('a3','e4')]:[allocation('a4','e1',{allocationPercentage:50})]}));
 const r=await runReport(report('project_resourcing'),{asOf:'2026-11-11'},c,client,catalog);
 assert.equal(r.summary.people,3);assert.equal(r.summary.fullyUnallocated,1);assert.equal(r.summary.unallocatedFTE,1.75);assert.equal(r.summary.allocatedFTE,1.55);assert.equal(r.summary.overallocated,1);assert.equal(r.rows[0].projectCount,2);assert.ok(!calls.some(p=>p.includes('/p3/')));
});

test('project health flags overdue, missing staffing and cross-project risk without inferring delivery health',async()=>{
 const c=cfg('psa,hris'),{client}=mocked(c,path=>({nextPage:null,data:path==='/psa/projects'?[project('p1','One',{startDate:'2026-01-01',endDate:'2026-11-10'}),project('p2','Two',{startDate:'2025-01-01',projectManagers:[{firstName:'Manager'}]})]:path==='/hris/employees'?[employee()]:path.includes('/p1/')?[allocation('a1','e1',{allocationPercentage:80})]:[allocation('a2','e1',{allocationPercentage:60})]}));
 const r=await runReport(report('project_health'),{asOf:'2026-11-11'},c,client,catalog);
 assert.match(r.rows[0].signals,/SCHEDULE_END_PASSED/);assert.match(r.rows[0].signals,/NO_PROJECT_MANAGER/);assert.match(r.rows[0].signals,/ALLOCATION_OUTSIDE_PROJECT_DATES/);assert.match(r.rows[1].signals,/ALLOCATION_OVER_100_PERCENT/);assert.equal(r.summary.projectsWithSignals,2);
});

test('invalid live-style employment records are disclosed without misclassifying an unverified project as unstaffed',async()=>{
 const c=cfg('psa,hris'),{client}=mocked(c,path=>({nextPage:null,data:path==='/psa/projects'?[project('p1','One',{startDate:'2025-01-01'})]:path==='/hris/employees'?[employee('e1',{joiningDate:null}),employee('e2')]:[allocation()]}));
 const args={asOf:'2026-11-11'},hr=await runReport(report('hr_dashboard'),args,c,client,catalog),capacity=await runReport(report('project_resourcing'),args,c,client,catalog),health=await runReport(report('project_health'),args,c,client,catalog);
 assert.equal(hr.summary.headcount,1);assert.equal(hr.summary.invalidEmployeeRecords,1);assert.equal(hr.warnings.length,1);
 assert.equal(capacity.summary.excludedAllocations,1);assert.equal(capacity.summary.allocatedFTE,0);assert.equal(capacity.warnings.length,2);
 assert.match(health.rows[0].signals,/STAFFING_DATA_UNVERIFIED/);assert.doesNotMatch(health.rows[0].signals,/NO_CURRENT_EMPLOYED_STAFF/);
});

test('validation audits all projects and distinguishes missing profiles, bad dates and expired employment',async()=>{
 const c=cfg('psa,hris'),{client}=mocked(c,path=>({nextPage:null,data:path==='/psa/projects'?[project('p1','Archive',{isArchived:true,startDate:'2026-01-01'})]:path==='/hris/employees'?[employee('e1',{employmentStatus:1,exitDate:'2026-11-10'})]:[allocation('stale'),allocation('orphan','missing',{startDate:'invalid'})]}));
 const r=await runReport(report('validation'),{asOf:'2026-11-11'},c,client,catalog);
 assert.equal(r.summary.projectsChecked,1);assert.equal(r.summary.allocationsChecked,2);assert.equal(r.summary.readOnly,true);assert.equal(r.summary.errors,3);assert.deepEqual(r.rows.filter(x=>x.severity==='error').map(x=>x.code),['ALLOCATION_PAST_EXIT','ALLOCATION_EMPLOYEE','ALLOCATION_DATES']);
});

test('leave clips calendar sessions, deduplicates approved overlap, omits reasons and preserves unsupported units as null',async()=>{
 const c=cfg('hris,time'),{client,calls}=mocked(c,path=>({nextPage:null,data:path==='/hris/employees'?[employee()]:[leave({fromDate:'2026-10-31',toDate:'2026-11-01',toSession:0,note:'private leave note'}),leave({id:'overlap',fromDate:'2026-11-01',toDate:'2026-11-01',toSession:0}),leave({id:'hours',selection:[{duration:{unit:1,duration:4}}]}),leave({id:'pending',status:0})]}));
 const r=await runReport(report('leave'),{month:'2026-11',employeeIds:['e1'],asOf:'2026-11-11'},c,client,catalog);
 assert.equal(r.summary.approvedCalendarDayEquivalents,.5);assert.equal(r.summary.unsupportedDurationRequests,1);assert.equal(r.summary.pendingRequests,1);assert.equal(r.rows[2].calendarDayEquivalentsInMonth,null);assert.equal(JSON.stringify(r).includes('private leave note'),false);assert.ok(calls[0].includes('employeeIds=e1'));assert.match(calls[0],/from=2026-11-01/);
});
test('missing profiles, record IDs and inconsistent page totals fail without leaking upstream messages',async()=>{
 const c=cfg();
 const missing=mocked(c,path=>({data:path==='/psa/projects'?[project()]:path.includes('/allocations')?[allocation()]:[],nextPage:null}));await assert.rejects(runReport(report('project_staffing'),{projectId:'p1'},c,missing.client,catalog),/REPORT_EMPLOYEE_DATA_MISSING/);
 const id=mocked(c,()=>({data:[{name:'No identifier'}],nextPage:null}));await assert.rejects(runReport(report('active_projects'),{},c,id.client,catalog),/REPORT_RECORD_IDENTIFIER_MISSING/);
 const totals=mocked(c,()=>({data:[project()],nextPage:null,totalRecords:2}));await assert.rejects(runReport(report('active_projects'),{},c,totals.client,catalog),/REPORT_PAGINATION_TOTAL_MISMATCH/);
 const failed=mocked(c,()=>({data:[],succeeded:false,message:'private details',nextPage:null}));await assert.rejects(runReport(report('active_projects'),{},c,failed.client,catalog),e=>String(e).includes('REPORT_UPSTREAM_DATA_INVALID')&&!String(e).includes('private details'));
});
