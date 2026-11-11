import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {request} from 'node:http';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {config} from '../src/config.js';
import {createHttpServer,httpConfig,type HttpConfig} from '../src/http.js';
import {Gate,KekaClient} from '../src/client.js';
import {loadCatalog} from '../src/catalog.js';
const token='test-only-mcp-token-'.padEnd(48,'x');
const cfg=()=>config({KEKA_COMPANY:'test',KEKA_ACCESS_TOKEN:'fixture',KEKA_MODULES:'pms'});
async function running(fn:(url:string,h:HttpConfig)=>Promise<void>){
 const h=httpConfig({MCP_AUTH_TOKEN:token,MCP_PUBLIC_URL:'http://127.0.0.1/mcp'});
 const server=createHttpServer(cfg(),h,new KekaClient(cfg(),async()=>new Response(JSON.stringify({data:[{id:'fixture'}],nextPage:null})),new Gate(0)));
 server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');
 try{await fn(`http://127.0.0.1:${address.port}`,h)}finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()))}
}
test('HTTP configuration rejects weak secrets, insecure public URLs, and malformed origins',()=>{
 for(const e of [{MCP_AUTH_TOKEN:'short',MCP_PUBLIC_URL:'https://example.com/mcp'},{MCP_AUTH_TOKEN:token,MCP_PUBLIC_URL:'http://example.com/mcp'},{MCP_AUTH_TOKEN:token,MCP_PUBLIC_URL:'https://user:pass@example.com/mcp'},{MCP_AUTH_TOKEN:token,MCP_PUBLIC_URL:'https://example.com/mcp?key=x'},{MCP_AUTH_TOKEN:token,MCP_PUBLIC_URL:'https://example.com/mcp',MCP_ALLOWED_ORIGINS:'*'},{MCP_AUTH_TOKEN:token,MCP_PUBLIC_URL:'https://example.com/mcp',PORT:'NaN'}])assert.throws(()=>httpConfig(e));
 assert.equal(httpConfig({MCP_AUTH_TOKEN:token,MCP_PUBLIC_URL:'https://example.com/mcp'}).host,'127.0.0.1');
});
test('health returns no tenant data; MCP rejects missing and incorrect bearer keys',async()=>running(async url=>{
 const health=await fetch(url+'/health');assert.deepEqual(await health.json(),{status:'ok'});
 for(const headers of [{},{Authorization:'Bearer wrong'}]){const response=await fetch(url+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:'{}'});assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'no-store')}
 assert.equal((await fetch(url+'/mcp?token='+token,{method:'POST'})).status,404);
}));
test('HTTP rejects hostile origins, unsupported methods, wrong media and invalid JSON',async()=>running(async url=>{
 const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 assert.equal((await fetch(url+'/mcp',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:'{}'})).status,403);
 assert.equal((await fetch(url+'/mcp',{headers})).status,405);
 assert.equal((await fetch(url+'/mcp',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'text/plain'},body:'{}'})).status,415);
 assert.equal((await fetch(url+'/mcp',{method:'POST',headers,body:'{'})).status,400);
}));
test('CORS preflight is restricted to configured origins; it never authorizes tool calls',async()=>running(async(url,h)=>{
 h.allowedOrigins.add('https://trusted.example');
 const preflight=await fetch(url+'/mcp',{method:'OPTIONS',headers:{Origin:'https://trusted.example','Access-Control-Request-Method':'POST'}});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'https://trusted.example');
 const call=await fetch(url+'/mcp',{method:'POST',headers:{Origin:'https://trusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(call.status,401);
}));
test('SDK client initializes and calls read-only tools over real authenticated HTTP',async()=>running(async url=>{
 const client=new Client({name:'remote-test',version:'1.0'});
 const transport=new StreamableHTTPClientTransport(new URL(url+'/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`}}});
 try{await client.connect(transport);const tools=await client.listTools();assert.equal(tools.tools.length,7);assert.ok(tools.tools.every(t=>t.annotations?.readOnlyHint));const result=await client.callTool({name:'keka_get_pms_goals',arguments:{}});assert.equal(result.isError,undefined);const denied=await client.callTool({name:'keka_put_pms_goals_goalId_progress',arguments:{}});assert.equal(denied.isError,true);}finally{await client.close()}
}));
test('HTTP admission control bounds concurrent authenticated requests',async()=>running(async(url,h)=>{
 h.maxInFlight=0;
 const response=await fetch(url+'/mcp',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'5');
}));
test('HTTP rejects a forged Host and bounds oversized requests',async()=>running(async url=>{
 const status=await new Promise<number>((resolve,reject)=>{const req=request(url+'/mcp',{method:'POST',headers:{Host:'evil.example',Authorization:`Bearer ${token}`,'Content-Type':'application/json'}},res=>{res.resume();resolve(res.statusCode!)});req.on('error',reject);req.end('{}')});assert.equal(status,403);
 const large=await fetch(url+'/mcp',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({value:'x'.repeat(1_100_000)})});assert.equal(large.status,413);
}));
test('secret-file loading and legacy tenant settings preserve controlled migration',()=>{
 const folder=mkdtempSync(join(tmpdir(),'keka-test-'));
 try{const path=join(folder,'token');writeFileSync(path,'fixture\n');const c=config({KEKA_BASE_URL:'https://test.keka.com',KEKA_ACCESS_TOKEN_FILE:path});assert.equal(c.accessToken,'fixture');assert.equal(c.baseUrl,'https://test.keka.com/api/v1/');assert.throws(()=>config({KEKA_COMPANY:'test',KEKA_ACCESS_TOKEN:'fixture',KEKA_ACCESS_TOKEN_FILE:path}));assert.throws(()=>config({KEKA_BASE_URL:'https://test.keka.com/evil',KEKA_ACCESS_TOKEN:'x'}));assert.throws(()=>config({KEKA_BASE_URL:'https://test.keka.com',KEKA_COMPANY:'other',KEKA_ACCESS_TOKEN:'x'}));assert.throws(()=>config({KEKA_COMPANY:'test',KEKA_ACCESS_TOKEN_FILE:join(folder,'missing')}));}finally{rmSync(folder,{recursive:true,force:true})}
});
test('legacy apikey authentication is opt-in and does not silently retry credentials',async()=>{
 const c=config({KEKA_COMPANY:'test',KEKA_CLIENT_ID:'id',KEKA_CLIENT_SECRET:'s',KEKA_API_KEY:'k',KEKA_API_KEY_PARAMETER:'apikey',KEKA_MODULES:'pms'});
 let tokens=0;const client=new KekaClient(c,async(url,init)=>{if(String(url).includes('/connect/token')){tokens++;const body=init?.body as URLSearchParams;assert.equal(body.get('apikey'),'k');assert.equal(body.has('api_key'),false);return new Response(JSON.stringify({access_token:'fixture',expires_in:3600}))}return new Response('{}')},new Gate(0));
 await client.execute(loadCatalog().find(o=>o.path==='/pms/goals')!,{});assert.equal(tokens,1);
});
