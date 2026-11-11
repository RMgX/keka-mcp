import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {Config} from './config.js';
export type Schema = Record<string, any>;
export interface Operation {name:string; module:string; method:string; path:string; source:string; summary:string; inputSchema:Schema; bodyType?:string; supported:boolean; reason?:string; components:Schema}
// OpenAPI 3.0 nullable also occurs on $ref/allOf nodes. Convert to JSON Schema.
function normalize(value:any):any {
  if(Array.isArray(value))return value.map(normalize);
  if(!value || typeof value!=='object')return value;
  const {nullable,...rest}=value;
  const result=Object.fromEntries(Object.entries(rest).map(([k,v])=>[k,normalize(v)]));
  return nullable===true ? {anyOf:[result,{type:'null'}]} : result;
}
export function loadCatalog(): Operation[] {
  const pages = JSON.parse(readFileSync(new URL('../specs/operations.json', import.meta.url),'utf8'));
  const out = new Map<string,Operation>();
  for (const page of pages) {
    const api = page.api, spec = normalize(api.schema), method = api.method.toLowerCase(), path = api.path;
    const op = spec.paths?.[path]?.[method];
    if (!op || !['get','post','put','patch','delete'].includes(method)) continue;
    const key = `${method} ${path}`;
    const wirePath = path.startsWith('/v1/') ? path.slice(3) : path;
    const module = wirePath.split('/').filter(Boolean)[0];
    const name = `keka_${method}_${path.replace(/[{}]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'')}`;
    const toolName = name.length <= 64 ? name : name.slice(0,53)+'_'+createHash('sha256').update(key).digest('hex').slice(0,10);
    const properties:Schema = {}, required:string[] = [];
    let supported = true, reason:string|undefined;
    for (const location of ['path','query']) {
      const params = [...(spec.paths[path].parameters ?? []),...(op.parameters ?? [])].filter((p:any)=>p.in===location);
      if (params.length) {
        properties[location] = {type:'object',additionalProperties:false,properties:Object.fromEntries(params.map((p:any)=>[p.name,p.schema ?? {type:'string'}])),required:params.filter((p:any)=>p.required || location==='path').map((p:any)=>p.name)};
        if (properties[location].required.length) required.push(location);
        if(location==='query') {
          const q=properties[location].properties;
          if(q.pageNumber)q.pageNumber={...q.pageNumber,minimum:1};
          if(q.pageSize)q.pageSize={...q.pageSize,minimum:1,maximum:Math.min(q.pageSize.maximum ?? 100,100)};
        }
      }
    }
    const content = op.requestBody?.content ?? {};
    const bodyType = content['application/json'] ? 'application/json' : Object.keys(content)[0];
    if (bodyType) {
      properties.body = content[bodyType].schema ?? {type:'object'};
      if (op.requestBody.required) required.push('body');
      if (bodyType !== 'application/json') {supported=false;reason=`Transport ${bodyType} intentionally unavailable; no file reads or uploads`}
    }
    if ((op.parameters ?? []).some((p:any)=>p.$ref || (p.required && !['path','query'].includes(p.in)))) {supported=false;reason='Unsupported required parameter location or reference'}
    out.set(key,{name:toolName,module,method,path:wirePath,source:page.source,summary:op.summary ?? key,inputSchema:{type:'object',properties,required,additionalProperties:false,components:spec.components ?? {}},bodyType,supported,reason,components:spec.components ?? {}});
  }
  return [...out.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export function permitted(op:Operation,c:Config):boolean {
  if (!op.supported || !c.modules.has(op.module)) return false;
  return op.method==='get' ? (!c.readTools.size || c.readTools.has(op.name)) : c.allowWrites && c.writeTools.has(op.name);
}
