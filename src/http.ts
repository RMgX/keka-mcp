import {createServer as createNodeServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {createServer} from './server.js';
import {KekaClient} from './client.js';
import {loadCatalog} from './catalog.js';
import {secret} from './secrets.js';
import type {Config} from './config.js';

export interface HttpConfig {token:string;host:string;port:number;publicUrl:string;allowedOrigins:Set<string>;maxInFlight:number}
export function httpConfig(env:NodeJS.ProcessEnv=process.env):HttpConfig {
  const token=secret(env,'MCP_AUTH_TOKEN');
  if(!token || token.length<32 || /\s/.test(token))throw new Error('MCP_AUTH_TOKEN must be at least 32 non-whitespace characters');
  const url=new URL(env.MCP_PUBLIC_URL ?? '');
  const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if((url.protocol!=='https:' && !(loopback&&url.protocol==='http:')) || url.username || url.password || url.search || url.hash || url.pathname!=='/mcp')throw new Error('MCP_PUBLIC_URL must be the final HTTPS /mcp URL');
  const port=Number(env.PORT ?? 3000);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
  const allowedOrigins=new Set((env.MCP_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean));
  for(const origin of allowedOrigins){if(new URL(origin).origin!==origin)throw new Error('Invalid MCP_ALLOWED_ORIGINS')}
  return {token,host:env.MCP_BIND_HOST ?? '127.0.0.1',port,publicUrl:url.href,allowedOrigins,maxInFlight:8};
}
const digest=(value:string)=>createHash('sha256').update(value).digest();
function reply(res:ServerResponse,status:number,message:string){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify({error:message}))}
async function body(req:IncomingMessage):Promise<unknown>{
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>1_100_000)throw new Error('BODY_LIMIT');chunks.push(Buffer.from(chunk))}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
/** One tenant and one permission profile per process; stateless MCP, shared quota gate. */
export function createHttpServer(c:Config,h:HttpConfig,client=new KekaClient(c)) {
  const expected=digest(`Bearer ${h.token}`),catalog=loadCatalog(),hostname=new URL(h.publicUrl).hostname;
  let active=0;
  const app=createNodeServer({maxHeaderSize:16_384},async(req,res)=>{
    res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');
    if(req.url==='/health' && req.method==='GET'){res.writeHead(200,{'content-type':'application/json'});res.end('{"status":"ok"}');return}
    if(req.url!=='/mcp'){reply(res,404,'NOT_FOUND');return}
    let host:string;
    try{host=new URL(`http://${req.headers.host ?? ''}`).hostname}catch{reply(res,400,'INVALID_HOST');return}
    if(host!==hostname){reply(res,403,'HOST_DENIED');return}
    const origin=req.headers.origin;
    if(origin && !h.allowedOrigins.has(origin)){reply(res,403,'ORIGIN_DENIED');return}
    // No ambient cookies, no wildcard CORS, and no credentials in query strings.
    if(origin){res.setHeader('access-control-allow-origin',origin);res.setHeader('vary','Origin')}
    if(req.method==='OPTIONS'){
      if(!origin || req.headers['access-control-request-method']!=='POST'){reply(res,403,'PREFLIGHT_DENIED');return}
      res.writeHead(204,{'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'Authorization, Content-Type, Accept, MCP-Protocol-Version'});res.end();return;
    }
    const auth=req.headers.authorization ?? '';
    if(!timingSafeEqual(digest(auth),expected)){res.setHeader('www-authenticate','Bearer realm="rmgx-keka-mcp"');reply(res,401,'UNAUTHORIZED');return}
    if(req.method!=='POST'){res.setHeader('allow','POST, OPTIONS');reply(res,405,'METHOD_NOT_ALLOWED');return}
    if(req.headers['content-type']?.split(';')[0].trim()!=='application/json'){reply(res,415,'JSON_REQUIRED');return}
    if(Number(req.headers['content-length'] ?? 0)>1_100_000){req.resume();reply(res,413,'REQUEST_TOO_LARGE');return}
    if(active>=h.maxInFlight){res.setHeader('retry-after','5');reply(res,503,'SERVER_BUSY');return}
    active++;
    const server=createServer(c,client,catalog);
    const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
    let closed=false;
    const close=()=>{if(closed)return;closed=true;active--;void server.close().catch(()=>{});void transport.close().catch(()=>{})};
    res.once('close',close);
    try {
      const parsed=await body(req);
      await server.connect(transport);
      await transport.handleRequest(req,res,parsed);
    } catch(error){if(!res.headersSent)reply(res,error instanceof SyntaxError?400:error instanceof Error&&error.message==='BODY_LIMIT'?413:500,'INVALID_OR_FAILED_REQUEST')}
  });
  app.headersTimeout=15_000;app.requestTimeout=30_000;app.keepAliveTimeout=5000;
  return app;
}
