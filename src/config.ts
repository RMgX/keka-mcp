import {secret} from './secrets.js';
export interface Config {
  baseUrl: string; tokenUrl: string; accessToken?: string; clientId?: string;
  clientSecret?: string; apiKey?: string; modules: Set<string>;
  allowWrites: boolean; writeTools: Set<string>; readTools: Set<string>; apiKeyParameter?: 'api_key' | 'apikey';
  toolMode?: 'full' | 'reports' | 'compact'; reportCacheSeconds?: number;
}
const list = (s = '') => new Set(s.split(',').map(x => x.trim()).filter(Boolean));
export function config(env: NodeJS.ProcessEnv = process.env): Config {
  env = {...env};
  for (const key of ['KEKA_ACCESS_TOKEN','KEKA_CLIENT_ID','KEKA_CLIENT_SECRET','KEKA_API_KEY']) env[key] = secret(env,key);
  // Preserve the former repository's tenant settings while keeping fixed Keka hosts.
  if (env.KEKA_BASE_URL) {
    const url = new URL(env.KEKA_BASE_URL);
    const match = /^([a-z0-9-]+)\.(keka|kekademo)\.com$/.exec(url.hostname);
    if (!match || url.protocol!=='https:' || url.port || url.username || url.password || url.search || url.hash || !['','/'].includes(url.pathname)) throw new Error('Invalid KEKA_BASE_URL');
    if (env.KEKA_COMPANY && env.KEKA_COMPANY!==match[1]) throw new Error('Conflicting tenant settings');
    if (env.KEKA_ENVIRONMENT && env.KEKA_ENVIRONMENT!==match[2]) throw new Error('Conflicting environment settings');
    env.KEKA_COMPANY=match[1]; env.KEKA_ENVIRONMENT=match[2];
  }
  if (env.KEKA_SANDBOX && !['true','false'].includes(env.KEKA_SANDBOX)) throw new Error('Invalid KEKA_SANDBOX');
  if (env.KEKA_SANDBOX) {
    const legacyEnvironment=env.KEKA_SANDBOX==='true'?'kekademo':'keka';
    if(env.KEKA_ENVIRONMENT && env.KEKA_ENVIRONMENT!==legacyEnvironment)throw new Error('Conflicting environment settings');
    env.KEKA_ENVIRONMENT=legacyEnvironment;
  }
  const apiKeyParameter=env.KEKA_API_KEY_PARAMETER ?? 'api_key';
  if(!['api_key','apikey'].includes(apiKeyParameter))throw new Error('Invalid KEKA_API_KEY_PARAMETER');
  const company = env.KEKA_COMPANY ?? '';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(company)) throw new Error('KEKA_COMPANY must be a DNS tenant label');
  const environment = env.KEKA_ENVIRONMENT ?? 'kekademo';
  if (!['keka', 'kekademo'].includes(environment)) throw new Error('Invalid KEKA_ENVIRONMENT');
  if (env.KEKA_ALLOW_WRITES && !['true','false'].includes(env.KEKA_ALLOW_WRITES)) throw new Error('Invalid KEKA_ALLOW_WRITES');
  const toolMode=env.MCP_TOOL_MODE??'full';
  if(!['full','reports','compact'].includes(toolMode))throw new Error('Invalid MCP_TOOL_MODE');
  const cacheSeconds=env.MCP_REPORT_CACHE_SECONDS??'0';
  if(!/^\d{1,3}$/.test(cacheSeconds)||Number(cacheSeconds)>300)throw new Error('Invalid MCP_REPORT_CACHE_SECONDS');
  const credentials = [env.KEKA_CLIENT_ID, env.KEKA_CLIENT_SECRET, env.KEKA_API_KEY];
  if (env.KEKA_ACCESS_TOKEN ? credentials.some(Boolean) : !credentials.every(Boolean)) throw new Error('Provide a token OR all three API credentials');
  return {baseUrl:`https://${company}.${environment}.com/api/v1/`, tokenUrl:`https://login.${environment}.com/connect/token`,
    accessToken:env.KEKA_ACCESS_TOKEN, clientId:env.KEKA_CLIENT_ID, clientSecret:env.KEKA_CLIENT_SECRET, apiKey:env.KEKA_API_KEY,
    modules:list(env.KEKA_MODULES ?? 'hris'), allowWrites:env.KEKA_ALLOW_WRITES === 'true', writeTools:list(env.KEKA_WRITE_TOOLS), readTools:list(env.KEKA_READ_TOOLS),apiKeyParameter:apiKeyParameter as 'api_key'|'apikey',toolMode:toolMode as Config['toolMode'],reportCacheSeconds:Number(cacheSeconds)};
}
