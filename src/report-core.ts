import type {Operation,Schema} from './catalog.js';
import {KekaClient,KekaError} from './client.js';
export type Row=Record<string,any>;
const employees='/hris/employees';
export const date=(value:unknown):string|undefined=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value))return undefined;
 const day=value.slice(0,10),time=new Date(day+'T00:00:00Z');
 return Number.isFinite(time.getTime())&&time.toISOString().slice(0,10)===day?day:undefined;
};
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const round=(n:number)=>Math.round(n*10_000)/10_000;
export const name=(e:Row)=>e.displayName||[e.firstName,e.lastName].filter(Boolean).join(' ')||'Unnamed employee';
export function employed(e:Row,on:string){
 const joined=date(e.joiningDate),exit=date(e.exitDate);
 if(!joined || (e.employmentStatus===1&&!exit))throw new KekaError('REPORT_EMPLOYMENT_DATES_MISSING');
 return joined<=on&&(!exit||exit>=on);
}
export function scheduled(a:Row,on:string){
 const start=date(a.startDate),end=date(a.endDate);
 if(!start || (end&&end<start))throw new KekaError('REPORT_INVALID_ALLOCATION_DATES');
 return start<=on&&(!end||end>=on);
}
export function allocation(a:Row){
 const value=a.allocationPercentage;
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100)throw new KekaError('REPORT_INVALID_ALLOCATION_PERCENTAGE');
 return value/100;
}
export interface ReportData {title:string;asOf:string;generatedAt:string;complete:true;readRequests:number;sources:string[];summary:Row;rows:Row[];warnings:string[];[key:string]:unknown}
export class Reader {
 count=0;rowsRead=0;sources=new Set<string>();started=Date.now();
 private employees=new Map<string,Row>();
 constructor(private client:KekaClient,private catalog:Operation[],private maximum:number){}
 async all(path:string,query:Row={},params:Row={}):Promise<Row[]>{
  const op=this.catalog.find(o=>o.method==='get'&&o.path===path);
  if(!op)throw new KekaError('REPORT_DEPENDENCY_UNAVAILABLE');
  const rows:Row[]=[],seen=new Set<string>();
  for(let page=1;page<=100;page++){
   if(this.count>=this.maximum||Date.now()-this.started>8*60_000)throw new KekaError('REPORT_REQUEST_BUDGET_EXCEEDED');
   this.count++;this.sources.add(`GET ${path}`);
   const result=await this.client.execute(op,{...params,query:{...query,pageNumber:page,pageSize:100}});
   if(result?.succeeded===false||!Array.isArray(result?.data))throw new KekaError('REPORT_UPSTREAM_DATA_INVALID');
   if(result.pageNumber!==undefined&&result.pageNumber!==page)throw new KekaError('REPORT_PAGINATION_MISMATCH');
   for(const row of result.data){if(typeof row?.id!=='string'||!row.id)throw new KekaError('REPORT_RECORD_IDENTIFIER_MISSING');if(seen.has(row.id))throw new KekaError('REPORT_DUPLICATE_PAGE_RECORD');seen.add(row.id);rows.push(row)}
   this.rowsRead+=result.data.length;
   if(this.rowsRead>10_000)throw new KekaError('REPORT_ROW_BUDGET_EXCEEDED');
   if(result.nextPage===null || (result.nextPage===undefined&&Number.isInteger(result.totalPages)&&page>=result.totalPages)){
    if(Number.isInteger(result.totalRecords)&&result.totalRecords!==rows.length)throw new KekaError('REPORT_PAGINATION_TOTAL_MISMATCH');
    return rows;
   }
   if(!result.nextPage)throw new KekaError('REPORT_PAGINATION_METADATA_MISSING');
  }
  throw new KekaError('REPORT_PAGE_BUDGET_EXCEEDED');
 }
 async staff(ids:string[]):Promise<Map<string,Row>>{
  const unique=[...new Set(ids)],missing=unique.filter(id=>!this.employees.has(id));
  for(let i=0;i<missing.length;i+=20){const batch=missing.slice(i,i+20);for(const e of await this.all(employees,{employeeIds:batch.join(',')}))if(batch.includes(e.id))this.employees.set(e.id,e)}
  if(unique.some(id=>!this.employees.has(id)))throw new KekaError('REPORT_EMPLOYEE_DATA_MISSING');
  return new Map(unique.map(id=>[id,this.employees.get(id)!]));
 }
}

export const base={asOf:{type:'string',format:'date',description:'Calendar date; defaults to today in Asia/Kolkata.'},format:{type:'string',enum:['markdown','json','compact'],default:'markdown'},maxRequests:{type:'integer',minimum:1,maximum:200,default:120},detail:{type:'string',enum:['summary','rows'],default:'rows'},limit:{type:'integer',minimum:1,maximum:1000,default:100},offset:{type:'integer',minimum:0,maximum:10000,default:0},fields:{type:'array',items:{type:'string',pattern:'^[a-zA-Z][a-zA-Z0-9]*$'},uniqueItems:true,minItems:1,maxItems:30},refresh:{type:'boolean',default:false}};
export const schema=(properties:Schema,extra:Schema={})=>({type:'object',additionalProperties:false,properties:{...base,...properties},...extra});
