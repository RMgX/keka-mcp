import {Ajv} from 'ajv';
import type {Schema} from './catalog.js';
import {KekaError} from './client.js';

export interface Discoverable {
 name:string;description:string;module:string;kind:'report'|'read'|'write';schema:()=>Schema;
}

const searchSchema={type:'object' as const,additionalProperties:false,properties:{
 query:{type:'string',minLength:1,maxLength:160,description:'Exact tool name or words, for example project health.'},
 module:{type:'string',minLength:1,maxLength:40},kind:{type:'string',enum:['report','read','write']},
 limit:{type:'integer',minimum:1,maximum:20,default:5},offset:{type:'integer',minimum:0,maximum:200,default:0},
 includeSchema:{type:'boolean',default:false,description:'Return argument schema for an exact-name match only.'},
}};
const callSchema={type:'object' as const,additionalProperties:false,required:['name'],properties:{
 name:{type:'string',pattern:'^keka_[A-Za-z0-9_]+$',maxLength:64},arguments:{type:'object'},
}};
const ajv=new Ajv();
const validSearch=ajv.compile(searchSchema),validCall=ajv.compile(callSchema);

export const SEARCH_TOOL={name:'keka_search_tools',description:'Find permitted Keka reports and REST tools by words or exact name. Request includeSchema with the exact name to see its arguments.',inputSchema:searchSchema,annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}};
export const CALL_TOOL={name:'keka_call_tool',description:'Invoke one permitted tool by exact name with its original arguments. Find its argument schema via keka_search_tools first. May write only if that exact write is enabled.',inputSchema:callSchema,annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:true}};

export function searchTools(args:unknown,tools:Discoverable[]){
 if(!validSearch(args))throw new KekaError('INVALID_TOOL_SEARCH_ARGUMENTS');
 const {query,module,kind,limit=5,offset=0,includeSchema}=args as {query?:string;module?:string;kind?:string;limit?:number;offset?:number;includeSchema?:boolean};
 const normalized=query?.trim().toLowerCase()??'',words=normalized.split(/[^a-z0-9]+/).filter(Boolean);
 if(query!==undefined&&!words.length)throw new KekaError('INVALID_TOOL_SEARCH_ARGUMENTS');
 const visible=tools.filter(t=>(!module||module===t.module)&&(!kind||kind===t.kind));
 const exact=visible.find(t=>t.name.toLowerCase()===normalized);
 if(includeSchema&&!exact)throw new KekaError('TOOL_SCHEMA_REQUIRES_EXACT_NAME');
 const matches=exact?[exact]:visible.filter(t=>words.every(word=>`${t.name} ${t.description} ${t.module}`.toLowerCase().includes(word)));
 return {total:matches.length,nextOffset:offset+limit<matches.length?offset+limit:null,tools:matches.slice(offset,offset+limit).map(t=>({name:t.name,description:t.description,module:t.module,kind:t.kind,...(includeSchema?{inputSchema:t.schema()}:{})}))};
}

export function callArguments(args:unknown):{name:string;arguments?:Record<string,unknown>}{
 if(!validCall(args))throw new KekaError('INVALID_TOOL_CALL_ARGUMENTS');
 return args as {name:string;arguments?:Record<string,unknown>};
}

/** Ship only the transitive OpenAPI component schemas referenced by the input. */
export function compactInputSchema(input:Schema):Schema{
 const {components,...root}=input;
 if(!components?.schemas)return root;
 const used:Schema=Object.create(null);
 const visit=(value:unknown)=>{
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){for(const item of value)visit(item);return}
  const node=value as Schema;
  if(typeof node.$ref==='string'&&node.$ref.startsWith('#/components/schemas/')){
   const key=node.$ref.slice('#/components/schemas/'.length).replaceAll('~1','/').replaceAll('~0','~');
   if(Object.hasOwn(components.schemas,key)&&!Object.hasOwn(used,key)){used[key]=components.schemas[key];visit(used[key])}
  }
  for(const item of Object.values(node))visit(item);
 };
 visit(root);
 return Object.keys(used).length?{...root,components:{schemas:used}}:root;
}
