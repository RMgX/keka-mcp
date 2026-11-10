# Run Keka MCP locally

Requires Node.js 22.22+ and Keka API credentials. Clone the [GitLab source](https://gitlab.rmgx.in/rmgx-firm/tools/keka-mcp) or its [GitHub mirror](https://github.com/RMgX/keka-mcp), then run:

```sh
npm ci --ignore-scripts
npm run build
```

Configure a trusted desktop MCP host to start `node /absolute/path/to/keka-mcp/dist/index.js`. For an HTTP client, follow the [deployment guide](deployment.md).

```json
{
  "mcpServers": {
    "rmgx-keka": {
      "command": "node",
      "args": ["/absolute/path/to/keka-mcp/dist/index.js"],
      "env": {
        "KEKA_COMPANY": "your-company",
        "KEKA_ENVIRONMENT": "kekademo",
        "KEKA_MODULES": "hris,psa,time",
        "KEKA_ALLOW_WRITES": "false",
        "MCP_TOOL_MODE": "reports"
      }
    }
  }
}
```

Supply credentials separately through the host's secret configuration. Node does not automatically read `.env`. [`.env.example`](../../.env.example) lists the settings.

| Variable | Meaning |
|---|---|
| `KEKA_COMPANY` | Tenant DNS label |
| `KEKA_ENVIRONMENT` | `kekademo` (default) or `keka` |
| `KEKA_CLIENT_ID`, `KEKA_CLIENT_SECRET`, `KEKA_API_KEY` | API-key token credentials, or use `KEKA_ACCESS_TOKEN` instead of all three |
| `KEKA_MODULES` | Comma-separated modules; default `hris`. An explicit blank enables none. |
| `KEKA_READ_TOOLS` | Optional exact read-tool allowlist; blank permits reads in enabled modules |
| `KEKA_ALLOW_WRITES`, `KEKA_WRITE_TOOLS` | Writes require `true` and an exact write-tool allowlist |
| `MCP_TOOL_MODE` | `full` (default), `reports` or `compact` |
| `MCP_REPORT_CACHE_SECONDS` | Optional report cache TTL, 0–300; default 0 |

Credentials support `_FILE` alternatives for mounted secrets. Use one source per credential. Permission checks apply at discovery and execution. See [security](../../SECURITY.md) and the [mode and caching guide](../usage/efficient-mcp.md).

Try “Run the HR dashboard, summary only.” To call a REST operation directly, use `full` mode. Supply documented `path`, `query` and `body` arguments. Each read returns one page; use page numbers and stop when `nextPage` is null. Page size is capped at 100 and returned pagination URLs are never followed. Reports handle paging on the server.
