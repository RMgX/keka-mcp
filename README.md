<p align="center"><img src="assets/rmgx-logo.png" alt="RMgX Technologies LLP" width="300"></p>
<h1 align="center">Keka MCP by RMgX</h1>
<p align="center">Controlled access to Keka HR, performance and project data for AI tools.</p>
<p align="center"><a href="docs/DEPLOYMENT.md">Deploy</a> · <a href="docs/COMPOSIO.md">Connect Composio</a> · <a href="docs/COVERAGE.md">Coverage</a> · <a href="docs/VALIDATION.md">Validation</a></p>

An **RMgX Technologies LLP engineering initiative** that connects enterprise operations to AI tools through the Model Context Protocol. Built with TypeScript, Node.js, the official MCP SDK and Keka's documented REST API schemas.

Inspect project staffing, employee information, approved leave, PMS goals and review cycles. Writes require explicit tool-level permission. Keka's tenant scopes and this server's allowlists control what callers can access.

## What is included

| Area | Coverage |
|---|---|
| Catalog | 186 documented operations across 18 modules |
| Implemented | 111 reads and 73 writes; two upload operations explicitly disabled |
| PMS | Time frames, goals, progress updates, badges, praise, review groups, cycles and reviews |
| Projects | Clients, projects, allocations, tasks and timesheets |
| Other modules | Core HR, leave, attendance, payroll, expenses, hiring, assets and helpdesk |
| Local clients | Stdio for a trusted desktop MCP host |
| Remote clients | Authenticated Streamable HTTP for Composio and header-capable MCP clients |
| Controls | Secret files, fixed tenant hosts, schema validation, pagination, throttling and safe errors |

Documentation coverage does not establish that a tenant enables every API. See the [operation inventory](docs/COVERAGE.md) for exact methods, paths and limits.

## Start locally

Requires **Node.js 22.22+**, npm and Keka API credentials. Clone the [GitLab source](https://gitlab.rmgx.in/rmgx-firm/tools/keka-mcp) or [GitHub mirror](https://github.com/RMgX/keka-mcp), then:

```sh
npm ci --ignore-scripts
npm run build
npm test
```

Configure your MCP host to run `node /absolute/path/to/keka-mcp/dist/index.js`. Inject secrets through the host's secret facilities. The Node process does **not** automatically load `.env` files.

| Variable | Purpose |
|---|---|
| `KEKA_COMPANY` | Tenant DNS label, for example `your-company` |
| `KEKA_ENVIRONMENT` | `kekademo` (default) or `keka` |
| `KEKA_CLIENT_ID`, `KEKA_CLIENT_SECRET`, `KEKA_API_KEY` | API-key OAuth credentials |
| `KEKA_ACCESS_TOKEN` | Alternative to all three credentials above |
| `KEKA_MODULES` | Comma-separated modules; default `hris` |
| `KEKA_READ_TOOLS` | Optional exact read-tool allowlist |
| `KEKA_ALLOW_WRITES`, `KEKA_WRITE_TOOLS` | Writes need `true` plus exact tool names |

Credentials support `_FILE` variants for mounted secrets. Use exactly one source per credential. A blank `KEKA_MODULES` exposes no business tools. Permissions apply to discovery and execution.

Example host configuration, with credentials supplied separately:

```json
{
  "mcpServers": {
    "rmgx-keka": {
      "command": "node",
      "args": ["/absolute/path/to/keka-mcp/dist/index.js"],
      "env": {
        "KEKA_COMPANY": "your-company",
        "KEKA_ENVIRONMENT": "kekademo",
        "KEKA_MODULES": "hris,pms,psa,time",
        "KEKA_ALLOW_WRITES": "false"
      }
    }
  }
}
```

## Deploy once, connect your AI tools

**Recommended:** one read-only Docker service behind HTTPS with a separate MCP bearer key. Keep Keka credentials in server-side secret files. Start with exact read-tool allowlists.

```text
Composio / remote MCP client
             |
       HTTPS + MCP key
             |
      Reverse proxy (TLS)
             |
      RMgX Keka MCP /mcp
             |
      Keka credentials + scopes
             |
        Your Keka tenant
```

Included: a multi-stage [Dockerfile](Dockerfile), a read-only [Compose service](compose.yaml), and a [Caddy proxy example](deploy/Caddyfile.example). Only the TLS proxy should be publicly accessible; Compose publishes the application on loopback.

Follow [deployment](docs/DEPLOYMENT.md), then [connect Composio](docs/COMPOSIO.md). Remote clients must support Streamable HTTP and an `Authorization` header. OAuth-only clients need a separate MCP-compatible OAuth gateway. This server does not implement OAuth discovery or Dynamic Client Registration.

No cloud resources, public DNS, certificates or Composio accounts have been provisioned by these examples.

## Tool calls and pagination

Tools accept documented `path`, `query` and `body` sections:

```json
{
  "name": "keka_get_psa_projects_id_allocations",
  "arguments": {
    "path": {"id": "project-identifier"},
    "query": {"pageNumber": 1, "pageSize": 100}
  }
}
```

Each call returns one page with Keka's metadata. Start at page 1 and increment until `nextPage` is null, within a finite consumer-side page budget. Page size is capped at 100. The server never follows pagination URLs, arbitrary URLs or redirects.

Keka documents 50 requests/minute. A shared in-process gate spaces requests at least 1.25 seconds apart, including authentication and retries. GET retries are bounded and respect Retry-After. Writes are never automatically retried. Multiple deployments sharing credentials need shared quota coordination.

## Access and trust boundary

- Default: core-HR reads. Enable only needed modules and exact read tools.
- Non-GET operations need both write settings. Compose keeps writes disabled.
- HTTP requires a separate 32-character-minimum bearer key. Keka credentials never come from callers.
- One process has one tenant and one permission profile. All holders of its MCP key share that access; it is not per-employee authorization.
- Successful responses contain business data and may be retained by the AI host or Composio. Error bodies and credentials are not logged or returned.
- Uploads, SSO, app-portal installation, webhooks and attachment downloads are outside the implementation.

Read [SECURITY.md](SECURITY.md) and the [migration notes](docs/MIGRATION.md) before upgrading an existing deployment.

## Validation and maintenance

Tests cover schema compatibility, permissions, OAuth encoding, pagination, retry limits, redaction, throttling, stdio and authenticated HTTP. The [validation report](docs/VALIDATION.md) distinguishes automated results, limited live checks and deployment limits.

```sh
npm run check
npm test
npm run coverage:catalog
```

To refresh documentation, run `python scripts/verify_docs.py`, update its verification date, regenerate coverage, inspect the diff and rerun tests. Runtime uses local snapshots only. Ship `dist`, `specs`, `package.json` and production dependencies together.

GitLab is the source repository. GitHub is a mirror; make changes through GitLab. Keep credentials, employee exports and local launcher configuration out of both repositories.

## About RMgX

RMgX builds digital products, applied AI systems and enterprise integrations. This project turns repeatable integration work into a maintained engineering capability.

Independent of Keka and Composio; their names describe compatibility, not endorsement. See [NOTICE.md](NOTICE.md) for provenance and reuse boundaries.
