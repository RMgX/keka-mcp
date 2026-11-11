import {Ajv} from 'ajv';
import {default as formats} from 'ajv-formats';
import type {Config} from './config.js';
import {permitted, type Operation} from './catalog.js';
export class KekaError extends Error {
  constructor(public code:string, public status?:number) {super(status ? `${code} (HTTP ${status})` : code)}
}
export type Fetch = typeof fetch;
export class Gate {
  private tail:Promise<void> = Promise.resolve();
  private next = 0;
  constructor(private interval=1250, private now=()=>Date.now(), private sleep=(n:number)=>new Promise<void>(r=>setTimeout(r,n))) {}
  wait():Promise<void> {
    const turn = this.tail.then(async()=>{await this.sleep(Math.max(0,this.next-this.now()));this.next=this.now()+this.interval});
    this.tail=turn.catch(()=>{}); return turn;
  }
}
export class KekaClient {
  private cached?:{value:string;expires:number};
  private pending?:Promise<string>;
  private validators = new Map<string, ReturnType<Ajv['compile']>>();
  private ajv = new Ajv({strict:false,allErrors:true,validateFormats:true});
  constructor(private c:Config, private request:Fetch=fetch, private gate=new Gate(), private sleep=(n:number)=>new Promise<void>(r=>setTimeout(r,n))) {
    (formats as unknown as (a:Ajv)=>void)(this.ajv);
  }
  private async response(url:string,init:RequestInit):Promise<Response> {
    await this.gate.wait();
    try {return await this.request(url,{...init,redirect:'error',signal:AbortSignal.timeout(30_000)})}
    catch {throw new KekaError('NETWORK_OR_TIMEOUT')}
  }
  private async json(response:Response):Promise<any> {
    // Bound decoded response size; never include upstream bodies in errors.
    const reader=response.body?.getReader();
    if (!reader) throw new KekaError('EMPTY_RESPONSE');
    const chunks:Uint8Array[]=[]; let size=0;
    try {
      for (;;) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4*1024*1024){await reader.cancel();throw new KekaError('RESPONSE_TOO_LARGE')}chunks.push(value)}
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch(e) {if(e instanceof KekaError)throw e;throw new KekaError('INVALID_JSON_RESPONSE')}
  }
  private token():Promise<string> {
    if(this.c.accessToken)return Promise.resolve(this.c.accessToken);
    if(this.cached && this.cached.expires>Date.now())return Promise.resolve(this.cached.value);
    if(this.pending)return this.pending;
    this.pending=(async()=>{
      const body=new URLSearchParams({grant_type:'kekaapi',scope:'kekaapi',client_id:this.c.clientId!,client_secret:this.c.clientSecret!,[this.c.apiKeyParameter ?? 'api_key']:this.c.apiKey!});
      const response=await this.response(this.c.tokenUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Keka-MCP/1.0'},body});
      if(!response.ok){await response.body?.cancel();throw new KekaError('AUTH_FAILED',response.status)}
      const data=await this.json(response);
      if(typeof data.access_token!=='string' || !data.access_token || !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in)<=0)throw new KekaError('INVALID_TOKEN_RESPONSE');
      this.cached={value:data.access_token,expires:Date.now()+Math.max(0,Number(data.expires_in)*1000-60_000)};
      return this.cached.value;
    })().finally(()=>{this.pending=undefined});
    return this.pending;
  }
  validate(op:Operation,args:unknown):asserts args is {path?:Record<string,any>;query?:Record<string,any>;body?:any} {
    let validate=this.validators.get(op.name);
    if(!validate){validate=this.ajv.compile(op.inputSchema);this.validators.set(op.name,validate)}
    if(!validate(args))throw new KekaError('INVALID_ARGUMENTS');
  }
  async execute(op:Operation,args:unknown):Promise<any> {
    if(!permitted(op,this.c))throw new KekaError('PERMISSION_DENIED');
    this.validate(op,args);
    const path=op.path.replace(/\{([^}]+)\}/g,(_,name)=>{
      const value=String(args.path?.[name] ?? '');
      if(!value || value==='.' || value==='..' || /[\/\\?#%]/.test(value))throw new KekaError('INVALID_PATH_PARAMETER');
      return encodeURIComponent(value);
    });
    if(!path.startsWith('/') || path.startsWith('//') || path.includes('..'))throw new KekaError('INVALID_ENDPOINT');
    const url=new URL(path.slice(1),this.c.baseUrl);
    for(const [key,value] of Object.entries(args.query ?? {}))if(value!==undefined && value!==null)url.searchParams.set(key,Array.isArray(value)?value.join(','):String(value));
    if(args.body!==undefined && Buffer.byteLength(JSON.stringify(args.body))>1024*1024)throw new KekaError('REQUEST_TOO_LARGE');
    let refreshed=false;
    for(let attempt=0;attempt<4;attempt++) {
      const token=await this.token();
      const response=await this.response(url.href,{method:op.method.toUpperCase(),headers:{Authorization:`Bearer ${token}`,Accept:'application/json','User-Agent':'Keka-MCP/1.0',...(op.bodyType?{'Content-Type':op.bodyType}:{})},...(args.body!==undefined?{body:JSON.stringify(args.body)}:{})});
      if(response.ok)return response.status===204 ? {success:true} : this.json(response);
      const status=response.status, retry=response.headers.get('retry-after');
      await response.body?.cancel();
      // Writes are never retried, including ambiguous authorization failures.
      if(op.method==='get' && status===401 && !this.c.accessToken && !refreshed){this.cached=undefined;refreshed=true;continue}
      if(op.method==='get' && (status===429 || [502,503,504].includes(status)) && attempt<3){
        const seconds=retry ? Number(retry) : NaN;
        const requested=retry ? (Number.isFinite(seconds)?seconds*1000:Date.parse(retry)-Date.now()) : status===429?60_000:1000*2**attempt;
        if(!Number.isFinite(requested) || requested>120_000)throw new KekaError('RETRY_LATER',status);
        await this.sleep(Math.max(0,requested)+Math.floor(Math.random()*250));continue;
      }
      throw new KekaError(status===403?'TENANT_SCOPE_OR_FEATURE_DENIED':status===401?'UNAUTHORIZED':'UPSTREAM_ERROR',status);
    }
    throw new KekaError('RETRY_EXHAUSTED');
  }
}
