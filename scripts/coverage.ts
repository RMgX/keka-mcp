import {writeFileSync} from 'node:fs';
import {loadCatalog} from '../src/catalog.js';
const ops=loadCatalog();
const modules=[...new Set(ops.map(x=>x.module))].sort();
let md='# Endpoint coverage\n\nVerified against public Keka operation schemas on November 10, 2026. Documentation verification does not establish tenant availability or live behavior. Duplicate documentation pages are deduplicated by method and source path. Hire paths documented under `/api/v1` are normalized from the `/api` server plus `/v1/hire` path.\n\n';
md+='| Module | Executable reads | Executable writes | Unavailable transport |\n|---|---:|---:|---:|\n';
for(const m of modules){const a=ops.filter(x=>x.module===m);md+=`| ${m} | ${a.filter(x=>x.supported&&x.method==='get').length} | ${a.filter(x=>x.supported&&x.method!=='get').length} | ${a.filter(x=>!x.supported).length} |\n`}
md+='\n## Operation inventory\n\n| Tool | Method and normalized path | Implementation | Official source |\n|---|---|---|---|\n';
for(const op of ops)md+=`| ${op.name} | ${op.method.toUpperCase()} ${op.path} | ${op.supported?'Implemented':op.reason} | [Reference](${op.source}) |\n`;
md+='\n## Unavailable or outside this implementation\n\nMultipart uploads and form-encoded business operations are cataloged but disabled. Local file reads, remote attachment downloads, OAuth app-portal installation/code/refresh flows, SSO, webhook receiving, and arbitrary HTTP requests are not exposed. API-key token acquisition is implemented separately. Goal creation/deletion, review submission and other unlisted PMS actions are not invented. Their availability is not established by this catalog.\n';
writeFileSync(new URL('../docs/COVERAGE.md',import.meta.url),md);
writeFileSync(new URL('../docs/catalog.json',import.meta.url),JSON.stringify(ops.map(({inputSchema,components,...op})=>op),null,2));
console.log(JSON.stringify({unique:ops.length,reads:ops.filter(x=>x.supported&&x.method==='get').length,writes:ops.filter(x=>x.supported&&x.method!=='get').length,unavailable:ops.filter(x=>!x.supported).length,modules}));
