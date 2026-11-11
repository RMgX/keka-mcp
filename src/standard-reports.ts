import type {Report} from './reports.js';
import {Reader,schema,date,round,name,employed,scheduled,allocation,type Row,type ReportData} from './report-core.js';
import {KekaError} from './client.js';

const employees='/hris/employees',projects='/psa/projects',allocations='/psa/projects/{id}/allocations';
const staffing=[projects,allocations,employees];
const month={type:'string',pattern:'^20[0-9]{2}-(0[1-9]|1[0-2])$'};
const scope={type:'string',enum:['active','all'],default:'active',description:'Active means status 0 and not archived.'};
export const STANDARD_REPORTS:Report[]=[
 {name:'keka_report_hr_dashboard',description:'Overall HR dashboard: date-based headcount, monthly joiners/exits, job-title distribution and profile-quality counts. No salary, sensitive demographics or inferred performance.',dependencies:[employees],inputSchema:schema({month})},
 {name:'keka_report_project_portfolio',description:'Project portfolio: status, dates, managers and billing designation. Defaults to active projects; scope all includes archived projects. No inferred financial results.',dependencies:[projects],inputSchema:schema({scope})},
 {name:'keka_report_project_resourcing',description:'Company resourcing: employed people, distinct project assignments, recorded allocation, unallocated FTE and over-allocation. Defaults to active projects. Not attendance or skill suitability.',dependencies:staffing,inputSchema:schema({scope})},
 {name:'keka_report_project_health',description:'Operational project-health signals: overdue schedule, no manager, no employed staffing, over-allocation and allocations outside project dates. Not a delivery-quality, profit or financial-health score.',dependencies:staffing,inputSchema:schema({scope})},
 {name:'keka_report_leave',description:'Monthly leave requests, status counts and approved calendar-day equivalents. Omits leave reasons. Calendar equivalents include non-working days; not payroll or working-day leave deductions.',dependencies:[employees,'/time/leaverequests'],inputSchema:schema({month,employeeIds:{type:'array',items:{type:'string',pattern:'^[A-Za-z0-9_-]+$',maxLength:128},minItems:1,maxItems:20,uniqueItems:true},status:{type:'string',enum:['all','approved','pending'],default:'all'}},{required:['month']})},
 {name:'keka_report_validation',description:'Read-only Keka data-quality validation across employees, all projects and allocations: dates, orphan profiles, stale exits, missing managers, unknown status and capacity conflicts. Never fixes records.',dependencies:staffing,inputSchema:schema({})},
];

function period(month:string){
 const start=`${month}-01`,last=new Date(start+'T00:00:00Z');
 last.setUTCMonth(last.getUTCMonth()+1,0);
 return {start,end:last.toISOString().slice(0,10)};
}
function validEmployee(e:Row){
 const joined=date(e.joiningDate),exit=date(e.exitDate);
 return [0,1].includes(e.employmentStatus)&&!!joined&&(!e.exitDate||!!exit)&&(e.employmentStatus!==1||!!exit)&&(!exit||exit>=joined);
}
function validAssignment(a:Row){
 const start=date(a.startDate),end=date(a.endDate),percent=a.allocationPercentage;
 return typeof a.employee?.id==='string'&&!!a.employee.id&&!!start&&(!a.endDate||!!end)&&(!end||end>=start)&&typeof percent==='number'&&Number.isFinite(percent)&&percent>=0&&percent<=100;
}
function portfolio(p:Row){return {projectId:p.id,project:p.name,statusCode:p.status,archived:p.isArchived===true,startDate:date(p.startDate)??null,endDate:date(p.endDate)??null,managers:(p.projectManagers??[]).map((m:Row)=>name(m)).join(', '),billable:typeof p.isBillable==='boolean'?p.isBillable:null}}
function selectedProjects(rows:Row[],scope:string='active'){return scope==='all'?rows:rows.filter(p=>p.status===0&&!p.isArchived)}
interface Dataset {projects:Row[];people:Map<string,Row>;allocations:Row[]}
async function dataset(reader:Reader,scope:string):Promise<Dataset>{
 const projectRows=selectedProjects(await reader.all(projects),scope),staff=await reader.all(employees),assignments:Row[]=[];
 for(const p of projectRows)for(const a of await reader.all(allocations,{}, {path:{id:p.id}}))assignments.push({...a,projectId:p.id,project:p.name});
 return {projects:projectRows,people:new Map(staff.map(e=>[e.id,e])),allocations:assignments};
}
function currentAssignments(data:Dataset,on:string,scope:string){
 const ids=new Set(selectedProjects(data.projects,scope).map(p=>p.id)),unverifiedProjects=new Set<string>();let excludedAllocations=0;
 const assignments=data.allocations.filter(a=>{
  if(!ids.has(a.projectId))return false;
  const valid=validAssignment(a);
  if(valid&&!scheduled(a,on))return false;
  const e=data.people.get(a.employee?.id);
  if(!valid||!e||!validEmployee(e)){excludedAllocations++;unverifiedProjects.add(a.projectId);return false}
  return employed(e,on)&&allocation(a)>0;
 });
 return {assignments,excludedAllocations,unverifiedProjects};
}
function dataWarnings(invalidEmployees:number,excludedAllocations=0){return [
 ...(invalidEmployees?[`${invalidEmployees} employee records have invalid or incomplete employment data and were excluded from employment metrics. See the validation report.`]:[]),
 ...(excludedAllocations?[`${excludedAllocations} allocation records could not be verified and were excluded from staffing/capacity metrics. See the validation report.`]:[]),
]}

function dashboard(people:Row[],on:string,month:string){
 const usable=people.filter(validEmployee),invalidEmployees=people.length-usable.length;
 const {start,end}=period(month),current=usable.filter(e=>employed(e,on)),titles=new Map<string,number>();
 for(const e of current){const title=e.jobTitle?.title||'Unspecified';titles.set(title,(titles.get(title)??0)+1)}
 return {rows:[...titles].sort(([a],[b])=>a.localeCompare(b)).map(([jobTitle,headcount])=>({jobTitle,headcount})),summary:{headcount:current.length,joinersInMonth:usable.filter(e=>date(e.joiningDate)!>=start&&date(e.joiningDate)!<=end).length,exitsInMonth:usable.filter(e=>date(e.exitDate)&&date(e.exitDate)!>=start&&date(e.exitDate)!<=end).length,incompleteProfiles:current.filter(e=>e.isProfileComplete===false).length,missingJobTitles:current.filter(e=>!e.jobTitle?.title).length,employeesRead:people.length,invalidEmployeeRecords:invalidEmployees,month,monthContainsFutureDays:end>on,basis:'Headcount uses inclusive joining/exit dates on valid records. Monthly events use stored dates, including future dates; not an attrition rate or historical audit snapshot.'},warnings:dataWarnings(invalidEmployees)};
}

function resourcing(data:Dataset,on:string,scope:string){
 const people=[...data.people.values()].filter(validEmployee),invalidEmployees=data.people.size-people.length;
 const {assignments,excludedAllocations}=currentAssignments(data,on,scope),rows:Row[]=[];
 const byEmployee=new Map<string,Row[]>();
 for(const a of assignments){const items=byEmployee.get(a.employee.id)??[];items.push(a);byEmployee.set(a.employee.id,items)}
 for(const e of people)if(employed(e,on)){
  const a=byEmployee.get(e.id)??[],percent=round(a.reduce((n,a)=>n+a.allocationPercentage,0));
  rows.push({employeeId:e.id,name:name(e),jobTitle:e.jobTitle?.title??null,projectCount:new Set(a.map(a=>a.projectId)).size,projects:[...new Set(a.map(a=>a.project))].join('; '),allocationPercentage:percent,unallocatedPercentage:Math.max(0,round(100-percent)),overallocated:percent>100});
 }
 rows.sort((a,b)=>b.allocationPercentage-a.allocationPercentage||a.name.localeCompare(b.name));
 return {rows,summary:{people:rows.length,fullyUnallocated:rows.filter(r=>r.allocationPercentage===0).length,partiallyAllocated:rows.filter(r=>r.allocationPercentage>0&&r.allocationPercentage<100).length,overallocated:rows.filter(r=>r.overallocated).length,allocatedFTE:round(rows.reduce((n,r)=>n+r.allocationPercentage/100,0)),unallocatedFTE:round(rows.reduce((n,r)=>n+r.unallocatedPercentage/100,0)),invalidEmployeeRecords:invalidEmployees,excludedAllocations,projectScope:scope,basis:'Verified date-based assignments in the selected project scope; includes shadow allocations. Unverified allocations are omitted and can affect capacity estimates. Not leave-adjusted availability, billable utilization or employee suitability.'},warnings:dataWarnings(invalidEmployees,excludedAllocations)};
}

function health(data:Dataset,on:string,scope:string){
 const {assignments,excludedAllocations,unverifiedProjects}=currentAssignments(data,on,scope),totals=new Map<string,number>();
 for(const a of assignments)totals.set(a.employee.id,(totals.get(a.employee.id)??0)+a.allocationPercentage);
 const rows=selectedProjects(data.projects,scope).map(p=>{
  const a=assignments.filter(a=>a.projectId===p.id),signals:string[]=[];
  if(p.status===0&&date(p.endDate)&&date(p.endDate)!<on)signals.push('SCHEDULE_END_PASSED');
  if(!p.projectManagers?.length)signals.push('NO_PROJECT_MANAGER');
  if(unverifiedProjects.has(p.id))signals.push('STAFFING_DATA_UNVERIFIED');
  else if(p.status===0&&!p.isArchived&&!a.length)signals.push('NO_CURRENT_EMPLOYED_STAFF');
  if(a.some(a=>totals.get(a.employee.id)!>100))signals.push('ALLOCATION_OVER_100_PERCENT');
  if(data.allocations.some(a=>a.projectId===p.id&&validAssignment(a)&&((date(p.startDate)&&date(a.startDate)!<date(p.startDate)!)||(date(p.endDate)&&(!date(a.endDate)||date(a.endDate)!>date(p.endDate)!)))))signals.push('ALLOCATION_OUTSIDE_PROJECT_DATES');
  if(!date(p.startDate)||(p.endDate&&!date(p.endDate))||(date(p.endDate)&&date(p.endDate)!<date(p.startDate)!))signals.push('INVALID_PROJECT_DATES');
  return {...portfolio(p),headcount:new Set(a.map(a=>a.employee.id)).size,allocatedFTE:round(a.reduce((n,a)=>n+a.allocationPercentage/100,0)),signalCount:signals.length,signals:signals.join('; '),assessment:signals.length?'REVIEW':'NO_FLAGS_IN_CHECKED_DATA'};
 });
 return {rows,summary:{projectsChecked:rows.length,projectsWithSignals:rows.filter(r=>r.signalCount>0).length,signals:rows.reduce((n,r)=>n+r.signalCount,0),excludedAllocations,projectScope:scope,basis:'Operational signals only. Budget consumption, delivery milestones, defects, revenue, margin and customer satisfaction are not evaluated.'},warnings:dataWarnings(0,excludedAllocations)};
}

function validate(data:Dataset,on:string){
 const rows:Row[]=[];let checks=0;
 const check=(ok:boolean,code:string,entity:string,id:string,description:string,severity='warning')=>{checks++;if(!ok)rows.push({severity,code,entity,recordId:id,description})};
 for(const e of data.people.values()){
  const joined=date(e.joiningDate),exit=date(e.exitDate);
  check(!!joined,'EMPLOYEE_JOIN_DATE','employee',e.id,'Missing or invalid joining date.','error');
  check([0,1].includes(e.employmentStatus),'EMPLOYEE_STATUS','employee',e.id,'Unknown employment status.','error');
  check(!e.exitDate||!!exit,'EMPLOYEE_EXIT_DATE','employee',e.id,'Invalid exit date.','error');
  check(e.employmentStatus!==1||!!exit,'RELIEVED_EXIT_DATE','employee',e.id,'Relieved employee has no valid exit date.','error');
  check(!exit||!joined||exit>=joined,'EMPLOYMENT_DATE_ORDER','employee',e.id,'Exit date precedes joining date.','error');
  check(!(e.employmentStatus===0&&exit&&exit<on),'WORKING_PAST_EXIT','employee',e.id,'Working status with an exit date before the report date.');
 }
 for(const p of data.projects){
  check(!!date(p.startDate)&&(!p.endDate||!!date(p.endDate))&&(!date(p.endDate)||date(p.endDate)!>=date(p.startDate)!),'PROJECT_DATES','project',p.id,'Missing, invalid or reversed project dates.','error');
  check([0,1,2].includes(p.status),'PROJECT_STATUS','project',p.id,'Unknown project status.');
  if(p.status===0&&!p.isArchived)check(!!p.projectManagers?.length,'PROJECT_MANAGER','project',p.id,'Active project has no manager.');
 }
 const totals=new Map<string,number>();
 for(const a of data.allocations){
  const e=data.people.get(a.employee?.id),start=date(a.startDate),end=date(a.endDate),percent=a.allocationPercentage;
  check(!!e,'ALLOCATION_EMPLOYEE','allocation',a.id,'Employee profile was not found.','error');
  check(!!start&&(!a.endDate||!!end)&&(!end||!!start&&end>=start),'ALLOCATION_DATES','allocation',a.id,'Missing, invalid or reversed allocation dates.','error');
  const validPercent=typeof percent==='number'&&Number.isFinite(percent)&&percent>=0&&percent<=100;
  check(validPercent,'ALLOCATION_PERCENTAGE','allocation',a.id,'Allocation percentage is outside 0 to 100.','error');
  if(e){
   const exit=date(e.exitDate),joined=date(e.joiningDate);
   check(!joined||!start||start>=joined,'ALLOCATION_BEFORE_JOIN','allocation',a.id,'Allocation starts before employment.');
   if(exit&&exit<=on)check(!!end&&end<=exit,'ALLOCATION_PAST_EXIT','allocation',a.id,'Allocation extends beyond employment exit.','error');
   if(validPercent&&start&&(!a.endDate||end)&&(!end||end>=start)&&start<=on&&(!end||end>=on)&&joined&&joined<=on&&(!exit||exit>=on)&&[0,1].includes(e.employmentStatus))totals.set(e.id,(totals.get(e.id)??0)+percent);
  }
 }
 for(const [id,total]of totals)check(total<=100,'EMPLOYEE_OVERALLOCATION','employee',id,'Recorded current allocations across all projects exceed 100%.');
 return {rows,summary:{employeesChecked:data.people.size,projectsChecked:data.projects.length,allocationsChecked:data.allocations.length,checksRun:checks,findings:rows.length,errors:rows.filter(r=>r.severity==='error').length,warnings:rows.filter(r=>r.severity==='warning').length,readOnly:true,basis:'Data-quality checks only; not a security audit, integration certification or automatic correction.'}};
}

async function leaveReport(reader:Reader,input:Row,on:string){
 const {start,end}=period(input.month),requests=await reader.all('/time/leaverequests',{from:start+'T00:00:00Z',to:end+'T23:59:59Z',...(input.employeeIds?{employeeIds:input.employeeIds.join(',')}:{})});
 const filtered=requests.filter(l=>{
  const from=date(l.fromDate),to=date(l.toDate);
  if(!from||!to||to<from||typeof l.employeeIdentifier!=='string'||!l.employeeIdentifier||![0,1,2,3,4].includes(l.status))throw new KekaError('REPORT_LEAVE_DATA_INVALID');
  return from<=end&&to>=start&&(!input.employeeIds||input.employeeIds.includes(l.employeeIdentifier))&&(input.status==='approved'?l.status===1:input.status==='pending'?l.status===0:true);
 });
 const people=await reader.staff(filtered.map(l=>l.employeeIdentifier)),approvedSessions=new Set<string>();let unsupported=0;
 const rows=filtered.map(l=>{
  const from=date(l.fromDate)!,to=date(l.toDate)!,first=from<start?start:from,last=to>end?end:to;
  let calendarDays:number|null=0;
  if((l.selection??[]).some((s:Row)=>s.duration?.unit!==undefined&&s.duration.unit!==2)){calendarDays=null;unsupported++}
  else {
   if(![0,1].includes(l.fromSession)||![0,1].includes(l.toSession)||(from===to&&l.fromSession>l.toSession))throw new KekaError('REPORT_INVALID_LEAVE_SESSIONS');
   for(let d=first;d<=last;d=new Date(Date.parse(d+'T00:00:00Z')+86_400_000).toISOString().slice(0,10))for(const half of [0,1])if((d>from||half>=l.fromSession)&&(d<to||half<=l.toSession)){calendarDays!+=.5;if(l.status===1)approvedSessions.add(`${l.employeeIdentifier}|${d}|${half}`)}
  }
  return {requestId:l.id,employeeId:l.employeeIdentifier,name:name(people.get(l.employeeIdentifier)!),fromDate:from,toDate:to,periodStart:first,periodEnd:last,statusCode:l.status,status:l.status===1?'Approved':l.status===0?'Pending':`Other (${l.status})`,leaveTypes:[...new Set((l.selection??[]).map((s:Row)=>s.leaveTypeName).filter(Boolean))].join('; '),calendarDayEquivalentsInMonth:calendarDays};
 });
 return {rows,summary:{month:input.month,requests:rows.length,people:new Set(rows.map(r=>r.employeeId)).size,approvedRequests:rows.filter(r=>r.statusCode===1).length,pendingRequests:rows.filter(r=>r.statusCode===0).length,approvedCalendarDayEquivalents:approvedSessions.size/2,unsupportedDurationRequests:unsupported,containsFutureDays:end>on,basis:'Calendar half-days within the month, including weekends/holidays; overlapping approved sessions deduplicated. Hour/minute requests remain listed with null equivalents. Not leave balance, working-day deduction or attendance.'},warnings:unsupported?['Some leave requests use non-day units; calendar equivalents omit those requests.']:[]};
}

export async function runStandardReport(report:Report,input:Row,on:string,reader:Reader):Promise<ReportData>{
 let result:{rows:Row[];summary:Row;warnings?:string[]};
 if(report.name==='keka_report_hr_dashboard')result=dashboard(await reader.all(employees),on,input.month??on.slice(0,7));
 else if(report.name==='keka_report_project_portfolio'){
  const all=await reader.all(projects),rows=selectedProjects(all,input.scope).map(portfolio);
  result={rows,summary:{projects:rows.length,activeProjects:rows.filter(r=>r.statusCode===0&&!r.archived).length,archivedProjects:rows.filter(r=>r.archived).length,projectScope:input.scope??'active',basis:'Stored project metadata only; financial amounts and delivery outcomes are not inferred.'}};
 }else if(report.name==='keka_report_leave')result=await leaveReport(reader,input,on);
 else {
  const data=await dataset(reader,report.name==='keka_report_validation'?'all':input.scope??'active');
  result=report.name==='keka_report_project_resourcing'?resourcing(data,on,input.scope??'active'):report.name==='keka_report_project_health'?health(data,on,input.scope??'active'):validate(data,on);
 }
 return {title:report.name.replace('keka_report_','').replaceAll('_',' '),asOf:on,generatedAt:new Date().toISOString(),complete:true,snapshotConsistency:'Sequential live reads, not an atomic or historical audit snapshot.',readRequests:reader.count,sources:[...reader.sources],...result,warnings:result.warnings??[]};
}
