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
 try{const tools=(await client.listTools()).tools;assert.equal(tools.filter(t=>t.name.startsWith('keka_report_')).length,3);const result=await client.callTool({name:'keka_report_active_projects',arguments:{asOf:'2026-11-11'}});assert.equal(result.isError,undefined);assert.equal(result.structuredContent?.complete,true);const denied=await client.callTool({name:'keka_report_project_availability',arguments:{}});assert.equal(denied.isError,true);}finally{await client.close();await server.close()}
});
test('missing profiles, record IDs and inconsistent page totals fail without leaking upstream messages',async()=>{
 const c=cfg();
 const missing=mocked(c,path=>({data:path==='/psa/projects'?[project()]:path.includes('/allocations')?[allocation()]:[],nextPage:null}));await assert.rejects(runReport(report('project_staffing'),{projectId:'p1'},c,missing.client,catalog),/REPORT_EMPLOYEE_DATA_MISSING/);
 const id=mocked(c,()=>({data:[{name:'No identifier'}],nextPage:null}));await assert.rejects(runReport(report('active_projects'),{},c,id.client,catalog),/REPORT_RECORD_IDENTIFIER_MISSING/);
 const totals=mocked(c,()=>({data:[project()],nextPage:null,totalRecords:2}));await assert.rejects(runReport(report('active_projects'),{},c,totals.client,catalog),/REPORT_PAGINATION_TOTAL_MISMATCH/);
 const failed=mocked(c,()=>({data:[],succeeded:false,message:'private details',nextPage:null}));await assert.rejects(runReport(report('active_projects'),{},c,failed.client,catalog),e=>String(e).includes('REPORT_UPSTREAM_DATA_INVALID')&&!String(e).includes('private details'));
});
