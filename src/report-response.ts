import type {Config} from './config.js';
import {KekaError,type KekaClient} from './client.js';
import {today,type ReportData,type Row} from './report-core.js';

const byteLimit=8*1024*1024,entryLimit=16;
interface Entry {value:ReportData;bytes:number;expires:number}
class ReportCache {
 readonly entries=new Map<string,Entry>();
 bytes=0;
 generation=0;
 remove(key:string){const entry=this.entries.get(key);if(entry){this.entries.delete(key);this.bytes-=entry.bytes}}
 get(key:string,now:number){
  for(const [k,v]of this.entries)if(v.expires<=now)this.remove(k);
  const entry=this.entries.get(key);
  if(entry){this.entries.delete(key);this.entries.set(key,entry)}
  return entry?.value;
 }
 put(key:string,value:ReportData,expires:number){
  const bytes=Buffer.byteLength(JSON.stringify(value));if(bytes>byteLimit)return;
  this.remove(key);
  while(this.bytes+bytes>byteLimit||this.entries.size>=entryLimit)this.remove(this.entries.keys().next().value!);
  this.entries.set(key,{value,bytes,expires});this.bytes+=bytes;
 }
 clear(){this.entries.clear();this.bytes=0;this.generation++}
}
const caches=new WeakMap<KekaClient,ReportCache>();
export function invalidateReports(client:KekaClient){caches.get(client)?.clear()}

export async function getReport(c:Config,client:KekaClient,name:string,args:Row,fetchReport:(args:Row)=>Promise<ReportData>){
 const {format,detail,limit,offset,fields,refresh,...query}=args;
 query.asOf??=today();
 const ttl=c.reportCacheSeconds??0;
 if(!ttl)return {data:await fetchReport(query),cacheHit:false,ttl};
 let cache=caches.get(client);if(!cache){cache=new ReportCache();caches.set(client,cache)}
 const key=JSON.stringify([c.baseUrl,[...c.modules].sort(),[...c.readTools].sort(),ttl,name,Object.entries(query).sort(([a],[b])=>a.localeCompare(b))]);
 if(refresh)cache.remove(key);
 else {const data=cache.get(key,Date.now());if(data)return {data,cacheHit:true,ttl}}
 const generation=cache.generation,data=await fetchReport(query);
 if(cache.generation===generation)cache.put(key,data,Date.now()+ttl*1000);
 return {data,cacheHit:false,ttl};
}

export function shapeReport(data:ReportData,args:Row,cacheHit:boolean,ttl:number):ReportData{
 const detail=args.detail??'rows',limit=args.limit??100,offset=args.offset??0;
 const totalRows=data.rows.length,fields=args.fields as string[]|undefined;
 if(fields&&data.rows.length&&fields.some(key=>!data.rows.some(row=>Object.hasOwn(row,key))))throw new KekaError('INVALID_REPORT_FIELD');
 const rows=detail==='summary'?[]:data.rows.slice(offset,offset+limit).map(row=>fields?Object.fromEntries(fields.filter(key=>Object.hasOwn(row,key)).map(key=>[key,row[key]])):row);
 const shaped:ReportData={...data,rows,resultPage:{detail,totalRows,returnedRows:rows.length,offset:detail==='rows'?offset:0,nextOffset:detail==='rows'&&offset+limit<totalRows?offset+limit:null},freshness:{cacheHit,ttlSeconds:ttl,ageSeconds:Math.max(0,Math.floor((Date.now()-Date.parse(data.generatedAt))/1000))}};
 for(const key of ['exceptions','excluded'])if(Array.isArray(shaped[key])){
  const items=shaped[key] as Row[];
  if(detail==='summary')delete shaped[key];
  else if(items.length>limit){shaped[key]=items.slice(0,limit);shaped[`${key}Omitted`]=items.length-limit}
 }
 return shaped;
}
