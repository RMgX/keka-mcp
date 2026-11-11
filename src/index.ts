#!/usr/bin/env node
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {config} from './config.js';
import {createServer} from './server.js';
try {
  const server=createServer(config());
  const stop=async()=>{await server.close();process.exitCode=0};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
  await server.connect(new StdioServerTransport());
} catch {process.stderr.write('Keka MCP startup failed. Check configuration and local specification files.\n');process.exitCode=1}
