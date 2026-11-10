#!/usr/bin/env node
import {config} from './config.js';
import {createHttpServer,httpConfig} from './http.js';
try {
  const h=httpConfig(),app=createHttpServer(config(),h);
  app.on('error',()=>{process.stderr.write('HTTP listener failed.\n');process.exitCode=1});
  app.listen(h.port,h.host,()=>process.stderr.write('RMgX Keka MCP HTTP listener started.\n'));
  const stop=()=>{app.close(()=>{process.exitCode=0});setTimeout(()=>process.exit(0),10_000).unref()};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
}catch{process.stderr.write('Keka HTTP startup failed. Check tenant, secrets and MCP_PUBLIC_URL.\n');process.exitCode=1}
