import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Ajv} from 'ajv';
import formats from 'ajv-formats';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {config} from '../src/config.js';
import {loadCatalog} from '../src/catalog.js';
import {Gate,KekaClient} from '../src/client.js';
import {createServer} from '../src/server.js';
import {getReport,invalidateReports} from '../src/report-response.js';
import {compactInputSchema} from '../src/tool-discovery.js';
import type {ReportData} from '../src/report-core.js';

const catalog=loadCatalog(),env={KEKA_COMPANY:'test',KEKA_ACCESS_TOKEN:'fixture',KEKA_MODULES:'hris,psa,time'};
async function connected(c:ReturnType<typeof config>,rest:KekaClient){
 const server=createServer(c,rest,catalog),client=new Client({name:'efficiency-test',version:'1.0'}),[s,k]=InMemoryTransport.createLinkedPair();
 await server.connect(s);await client.connect(k);
 return {client,close:async()=>{await client.close();await server.close()}};
}
function fixture(c:ReturnType<typeof config>){
 let reads=0;
 const rest=new KekaClient(c,async()=>{reads++;return Response.json({data:[{id:'1',name:'First',status:0,isArchived:false},{id:'2',name:'Second',status:0,isArchived:false}],nextPage:null})},new Gate(0));
 return {rest,reads:()=>reads};
}

test('compact discovery is much smaller and neither search nor dispatch bypasses permissions',async()=>{
 const full=config({...env,KEKA_MODULES:'psa'}),compact=config({...env,KEKA_MODULES:'psa',MCP_TOOL_MODE:'compact'}),{rest,reads}=fixture(compact);
 const f=await connected(full,rest),m=await connected(compact,rest);
 try{
  const fullList=await f.client.listTools(),list=await m.client.listTools();
  assert.deepEqual(list.tools.map(t=>t.name),['keka_search_tools','keka_call_tool']);assert.ok(JSON.stringify(list).length<JSON.stringify(fullList).length/4);
  const search=await m.client.callTool({name:'keka_search_tools',arguments:{query:'project',kind:'report'}});
  assert.deepEqual((search.structuredContent?.tools as {name:string}[]).map(t=>t.name),['keka_report_project_portfolio']);
  const found=await m.client.callTool({name:'keka_search_tools',arguments:{query:'keka_report_project_portfolio',includeSchema:true}});
  assert.ok((found.structuredContent?.tools as {inputSchema:unknown}[])[0].inputSchema);
  const broad=await m.client.callTool({name:'keka_search_tools',arguments:{query:'project',includeSchema:true}});assert.equal(broad.isError,true);
  for(const name of ['keka_report_hr_dashboard','keka_post_psa_projects','keka_search_tools'])assert.equal((await m.client.callTool({name:'keka_call_tool',arguments:{name}})).isError,true);
  assert.equal((await m.client.callTool({name:'keka_report_project_portfolio',arguments:{}})).isError,true);assert.equal(reads(),0);
  const run=await m.client.callTool({name:'keka_call_tool',arguments:{name:'keka_report_project_portfolio',arguments:{detail:'summary'}}});
  assert.equal(run.structuredContent?.complete,true);assert.deepEqual(run.structuredContent?.rows,[]);assert.ok(!JSON.stringify(run.content).includes('projectScope'));assert.equal(reads(),1);
 }finally{await m.close();await f.close()}
});

test('reports-only mode hides and blocks raw calls while retaining underlying read permissions',async()=>{
 const c=config({...env,MCP_TOOL_MODE:'reports',KEKA_READ_TOOLS:'keka_get_psa_projects'}),{rest,reads}=fixture(c),m=await connected(c,rest);
 try{
  assert.deepEqual((await m.client.listTools()).tools.map(t=>t.name),['keka_report_project_portfolio']);
  assert.equal((await m.client.callTool({name:'keka_get_psa_projects',arguments:{}})).isError,true);assert.equal(reads(),0);
  assert.equal((await m.client.callTool({name:'keka_report_project_portfolio',arguments:{}})).isError,undefined);assert.equal(reads(),1);
 }finally{await m.close()}
});

test('report projection and result paging preserve full totals and reuse a bounded cache across sessions',async()=>{
 const c=config({...env,MCP_REPORT_CACHE_SECONDS:'60'}),{rest,reads}=fixture(c),a=await connected(c,rest),b=await connected(c,rest);
 const call=(client:Client,args:Record<string,unknown>)=>client.callTool({name:'keka_report_project_portfolio',arguments:{asOf:'2026-11-11',...args}});
 try{
  const first=(await call(a.client,{fields:['project'],limit:1})).structuredContent!;
  assert.deepEqual(first.rows,[{project:'First'}]);assert.deepEqual(first.resultPage,{detail:'rows',totalRows:2,returnedRows:1,offset:0,nextOffset:1});
  const next=(await call(b.client,{fields:['project'],limit:1,offset:1,format:'compact'})).structuredContent!;
  assert.deepEqual(next.rows,[{project:'Second'}]);assert.equal((next.freshness as Record<string,unknown>).cacheHit,true);assert.equal(reads(),1);
  assert.equal((await call(b.client,{fields:['privateField']})).isError,true);assert.equal((await call(b.client,{limit:0})).isError,true);assert.equal(reads(),1);
  const refreshed=(await call(b.client,{detail:'summary',refresh:true})).structuredContent!;
  assert.equal((refreshed.freshness as Record<string,unknown>).cacheHit,false);assert.equal(reads(),2);
  invalidateReports(rest);await call(a.client,{});assert.equal(reads(),3);
 }finally{await a.close();await b.close()}
});

test('cache keys isolate permissions and TTLs; expired and failed results cannot be served as fresh',async t=>{
 t.mock.method(Date,'now',()=>1000);
 const c=config({...env,MCP_REPORT_CACHE_SECONDS:'1'}),{rest}=fixture(c);
 let n=0;
 const data:ReportData={title:'fixture',complete:true,generatedAt:new Date().toISOString(),asOf:'2026-11-11',readRequests:1,sources:[],summary:{},rows:[],warnings:[]};
 const get=(profile=c)=>getReport(profile,rest,'fixture',{asOf:'2026-11-11'},async()=>{n++;return data});
 assert.equal((await get()).cacheHit,false);assert.equal((await get()).cacheHit,true);
 assert.equal((await get({...c,readTools:new Set(['another-permission'])})).cacheHit,false);
 t.mock.method(Date,'now',()=>3000);
 await assert.rejects(getReport(c,rest,'fixture',{asOf:'2026-11-11'},async()=>{throw new Error('fixture failure')}));
 assert.equal((await get()).cacheHit,false);assert.equal(n,3);
});

test('in-flight report cannot repopulate cache after write invalidation',async()=>{
 const c=config({...env,MCP_REPORT_CACHE_SECONDS:'60'}),{rest}=fixture(c),args={asOf:'2026-11-11'};
 const data:ReportData={title:'fixture',complete:true,generatedAt:new Date().toISOString(),asOf:args.asOf,readRequests:1,sources:[],summary:{},rows:[],warnings:[]};
 let finish!:(value:ReportData)=>void;
 const pending=getReport(c,rest,'fixture',args,()=>new Promise(resolve=>{finish=resolve}));
 invalidateReports(rest);finish(data);await pending;
 const next=await getReport(c,rest,'fixture',args,async()=>data);assert.equal(next.cacheHit,false);
});

test('pruned schemas retain all executable reference dependencies and reduce discovery payload',()=>{
 const ajv=new Ajv({strict:false});(formats as unknown as (x:Ajv)=>void)(ajv);
 let original=0,compressed=0;
 for(const op of catalog.filter(o=>o.supported)){
  const schema=compactInputSchema(op.inputSchema);ajv.compile(schema);original+=JSON.stringify(op.inputSchema).length;compressed+=JSON.stringify(schema).length;
 }
 assert.ok(compressed<original/2);
 for(const key of ['MCP_TOOL_MODE','MCP_REPORT_CACHE_SECONDS'])assert.throws(()=>config({...env,[key]:'invalid'}));
});
