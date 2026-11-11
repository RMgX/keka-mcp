import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Ajv} from 'ajv';
import addFormats from 'ajv-formats';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {config} from '../src/config.js';
import {loadCatalog,permitted,type Operation} from '../src/catalog.js';
import {Gate,KekaClient} from '../src/client.js';
import {createServer} from '../src/server.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const c = ()=>config({KEKA_COMPANY:'test',KEKA_ACCESS_TOKEN:'secret',KEKA_MODULES:'hris,pms,hire'});
const catalog=loadCatalog();
const goals=catalog.find(x=>x.path==='/pms/goals')!;
const gate=()=>new Gate(0);
const json=(x:unknown,status=200,headers={})=>new Response(JSON.stringify(x),{status,headers});
test('configuration restricts hosts, credentials, flags, and defaults',()=>{
  assert.equal(c().baseUrl,'https://test.kekademo.com/api/v1/');
  for(const env of [{KEKA_COMPANY:'../evil'},{KEKA_COMPANY:'test',KEKA_ENVIRONMENT:'evil'},{KEKA_COMPANY:'test'},{KEKA_COMPANY:'test',KEKA_ACCESS_TOKEN:'x',KEKA_CLIENT_ID:'x'},{KEKA_COMPANY:'test',KEKA_ACCESS_TOKEN:'x',KEKA_ALLOW_WRITES:'yes'}])assert.throws(()=>config(env));
  assert.equal(c().allowWrites,false);
});
test('catalog has unique MCP names and all nine PMS operations',()=>{
  assert.equal(new Set(catalog.map(x=>x.name)).size,catalog.length);
  assert.ok(catalog.every(x=>x.name.length<=64));
  assert.equal(catalog.filter(x=>x.module==='pms').length,9);
  assert.ok(catalog.some(x=>x.module==='hire' && x.path.startsWith('/hire/')));
});
test('all executable input schemas compile against captured references',()=>{
  const ajv=new Ajv({strict:false,logger:false});(addFormats as any)(ajv);
  for(const op of catalog.filter(x=>x.supported))assert.doesNotThrow(()=>ajv.compile(op.inputSchema),op.name);
});
test('permissions enforce module and exact read/write allowlists',()=>{
  const cfg=c(), write=catalog.find(x=>x.module==='pms'&&x.method==='put')!;
  assert.ok(permitted(goals,cfg));assert.equal(permitted(write,cfg),false);
  cfg.allowWrites=true;assert.equal(permitted(write,cfg),false);cfg.writeTools.add(write.name);assert.ok(permitted(write,cfg));
  cfg.modules.delete('pms');assert.equal(permitted(write,cfg),false);
  cfg.modules.add('pms');cfg.readTools.add('other');assert.equal(permitted(goals,cfg),false);
});
test('request preserves paging metadata and serializes documented filters',async()=>{
  let seen='';const payload={data:[],nextPage:null,pageNumber:2};
  const client=new KekaClient(c(),async(url,init)=>{seen=String(url);assert.equal((init?.headers as any).Authorization,'Bearer secret');assert.equal(init?.redirect,'error');return json(payload)},gate());
  assert.deepEqual(await client.execute(goals,{query:{pageNumber:2,pageSize:100,employeeIds:'a,b'}}),payload);
  assert.ok(seen.includes('pageNumber=2'));assert.ok(seen.includes('employeeIds=a%2Cb'));
});
test('invalid arguments fail before network',async()=>{
  const client=new KekaClient(c(),async()=>{throw Error('must not call')},gate());
  await assert.rejects(client.execute(goals,{query:{unknown:'x'}}),/INVALID_ARGUMENTS/);
  await assert.rejects(client.execute(goals,{query:{pageNumber:'bad'}}),/INVALID_ARGUMENTS/);
});
test('read retries 429 and 503, honoring Retry-After',async()=>{
  let n=0;const waits:number[]=[];
  const client=new KekaClient(c(),async()=>++n===1?json({},429,{'retry-after':'2'}):n===2?json({},503):json({ok:true}),gate(),async(ms)=>{waits.push(ms)});
  assert.deepEqual(await client.execute(goals,{}),{ok:true});assert.equal(n,3);assert.ok(waits[0]>=2000);
});
test('writes are never retried',async()=>{
  const cfg=c();cfg.allowWrites=true;
  const op:Operation={...goals,name:'test_write',method:'post',inputSchema:{type:'object'},bodyType:'application/json'};cfg.writeTools.add(op.name);
  let n=0;const client=new KekaClient(cfg,async()=>{n++;return json({},503)},gate());
  await assert.rejects(client.execute(op,{}),/503/);assert.equal(n,1);
});
test('OAuth uses documented form grant and single-flight cache',async()=>{
  const cfg=config({KEKA_COMPANY:'test',KEKA_CLIENT_ID:'id',KEKA_CLIENT_SECRET:'client-secret',KEKA_API_KEY:'api-key',KEKA_MODULES:'pms'});
  let tokens=0;
  const client=new KekaClient(cfg,async(url,init)=>{if(String(url).includes('/connect/token')){tokens++;const b=init?.body as URLSearchParams;assert.equal(b.get('grant_type'),'kekaapi');assert.equal(b.get('scope'),'kekaapi');assert.equal(b.get('api_key'),'api-key');return json({access_token:'new',expires_in:3600})}return json({})},gate());
  await Promise.all([client.execute(goals,{}),client.execute(goals,{})]);assert.equal(tokens,1);
});
test('401 refreshes once; 403 reports scope without leaking body',async()=>{
  const cfg=config({KEKA_COMPANY:'test',KEKA_CLIENT_ID:'id',KEKA_CLIENT_SECRET:'s',KEKA_API_KEY:'k',KEKA_MODULES:'pms'});
  let tokens=0,calls=0;
  const client=new KekaClient(cfg,async(url)=>String(url).includes('/connect/token')?(tokens++,json({access_token:'x',expires_in:3600})):(++calls===1?json({},401):json({secret:'sensitive'},403)),gate());
  await assert.rejects(client.execute(goals,{}),e=>String(e).includes('TENANT_SCOPE_OR_FEATURE_DENIED')&&!String(e).includes('sensitive'));assert.equal(tokens,2);
});
test('network errors redact secrets and response size is bounded',async()=>{
  const client=new KekaClient(c(),async()=>{throw Error('secret')},gate());
  await assert.rejects(client.execute(goals,{}),/NETWORK_OR_TIMEOUT/);
  const large=new KekaClient(c(),async()=>new Response('x'.repeat(4*1024*1024+1)),gate());
  await assert.rejects(large.execute(goals,{}),/RESPONSE_TOO_LARGE/);
});
test('path traversal is rejected',async()=>{
  const op={...goals,path:'/pms/goals/{id}',inputSchema:{type:'object'}};
  const client=new KekaClient(c(),async()=>{throw Error('must not call')},gate());
  for(const id of ['..','a/b','a%2fb','a?x'])await assert.rejects(client.execute(op,{path:{id}}),/INVALID_PATH_PARAMETER/);
});
test('throttle serializes concurrent request slots',async()=>{
  let now=0;const waits:number[]=[];
  const g=new Gate(1250,()=>now,async(n)=>{waits.push(n);now+=n});
  await Promise.all([g.wait(),g.wait(),g.wait()]);assert.deepEqual(waits,[0,1250,1250]);
});
test('MCP client initializes, lists tools, calls tool, and receives safe errors',async()=>{
  const server=createServer(c(),new KekaClient(c(),async()=>json({data:[{id:'goal'}],nextPage:null}),gate()));
  const client=new Client({name:'test',version:'1.0.0'});
  const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);
  try {const tools=await client.listTools();assert.ok(tools.tools.some(t=>t.name===goals.name));assert.ok(tools.tools.every(t=>t.annotations?.readOnlyHint));
    const result=await client.callTool({name:goals.name,arguments:{}});assert.equal(result.isError,undefined);
    const bad=await client.callTool({name:'disabled',arguments:{}});assert.equal(bad.isError,true);
  } finally {await client.close();await server.close()}
});
test('paging rejects zero, negatives, and excessive page size',async()=>{
  const client=new KekaClient(c(),async()=>{throw Error('network forbidden')},gate());
  for(const query of [{pageNumber:0},{pageNumber:-1},{pageSize:0},{pageSize:101}])await assert.rejects(client.execute(goals,{query}),/INVALID_ARGUMENTS/);
});
test('unavailable operations never become executable',()=>{
  const cfg=c();cfg.allowWrites=true;
  for(const op of catalog.filter(x=>!x.supported)){cfg.modules.add(op.module);cfg.writeTools.add(op.name);assert.equal(permitted(op,cfg),false)}
});
test('malformed JSON and oversized Retry-After fail safely',async()=>{
  const malformed=new KekaClient(c(),async()=>new Response('not json'),gate());
  await assert.rejects(malformed.execute(goals,{}),/INVALID_JSON_RESPONSE/);
  const retry=new KekaClient(c(),async()=>json({},429,{'retry-after':'9999'}),gate());
  await assert.rejects(retry.execute(goals,{}),/RETRY_LATER/);
});
test('pre-issued tokens never trigger identity requests on 401',async()=>{
  let n=0;const client=new KekaClient(c(),async()=>{n++;return json({},401)},gate());
  await assert.rejects(client.execute(goals,{}),/UNAUTHORIZED/);assert.equal(n,1);
});
test('request body size limit is enforced before sending',async()=>{
  const cfg=c();cfg.allowWrites=true;cfg.writeTools.add('write');
  const op={...goals,name:'write',method:'post',inputSchema:{type:'object'},bodyType:'application/json'};
  const client=new KekaClient(cfg,async()=>{throw Error('network forbidden')},gate());
  await assert.rejects(client.execute(op,{body:{text:'x'.repeat(1024*1024)}}),/REQUEST_TOO_LARGE/);
});
test('compiled executable speaks MCP over real stdio without credentials leaving host',async()=>{
  const transport=new StdioClientTransport({command:process.execPath,args:['dist/index.js'],env:{KEKA_COMPANY:'test',KEKA_ACCESS_TOKEN:'fixture-only',KEKA_MODULES:'pms'},stderr:'pipe'});
  const client=new Client({name:'stdio-test',version:'1.0.0'});
  try {await client.connect(transport);const result=await client.listTools();assert.equal(result.tools.length,7)}
  finally {await client.close()}
});
