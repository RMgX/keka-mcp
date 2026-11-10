<p align="center"><img src="assets/rmgx-logo.png" alt="RMgX Technologies LLP" width="300"></p>
<h1 align="center">Keka MCP by RMgX</h1>
<p align="center">Keka reports and REST tools for AI clients, with explicit access controls.</p>

[Quickstart](docs/setup/quickstart.md) · [Reports](docs/usage/reports.md) · [Deploy with NGINX](docs/setup/deployment.md) · [Connect Composio](docs/setup/composio.md) · [All documentation](docs/README.md)

Keka MCP is an RMgX Technologies LLP engineering initiative. It runs on Node.js using the MCP SDK and Keka's documented REST API. It supports local stdio and authenticated remote Streamable HTTP.

## What you can do

- Run ten ready-made reports: HR dashboard, project portfolio, resourcing, project health, leave, validation, active projects, project staffing, monthly availability and exited allocations.
- Read documented HR, PSA, leave, PMS and other enabled modules. The inventory covers 186 operations: 111 reads, 73 opt-in writes and two unavailable upload transports. See the [operation reference](docs/reference/coverage.md).
- Choose [reports-only or compact discovery](docs/usage/efficient-mcp.md) to send fewer tool schemas to the AI client. Reports can return just totals or selected columns. An optional short-lived cache reduces repeat Keka reads.

Try asking: **“Run the project health report for active projects, showing only the summary.”** Or: **“Show eShipper-Ongoing Support's availability for November 2026 without the daily calendar.”**

## Start here

| Goal | Guide |
|---|---|
| Run locally with a trusted MCP host | [Quickstart](docs/setup/quickstart.md) |
| Connect other tools over HTTPS | [NGINX deployment](docs/setup/deployment.md) and [Composio setup](docs/setup/composio.md) |
| Understand report inputs, calculations and limits | [Report catalog](docs/usage/reports.md) |
| Restrict discovery and reduce response size | [Efficient MCP usage](docs/usage/efficient-mcp.md) |
| Check what was tested or upgrade an existing install | [Release validation](docs/maintainers/validation.md) and [migration](docs/maintainers/migration.md) |

The default instance permits only HR reads. Grant only the required modules and exact read tools. Writes are disabled by default and require an explicit write-tool allowlist. Each deployment has one tenant and one permission profile; everyone holding its access key shares that access. See [Security](SECURITY.md).

Keka Learning course creation through the signed-in web app was verified separately. The standard integration token was rejected by Learning, so no direct Learning tool is exposed. See [Learning authentication and API findings](docs/reference/learning.md).

## Maintainers

[GitLab](https://gitlab.rmgx.in/rmgx-firm/tools/keka-mcp) is the source and runs CI; [GitHub](https://github.com/RMgX/keka-mcp) mirrors it. Use Node.js 22.22+ and run `npm ci --ignore-scripts`, `npm run check`, and `npm test`. See [repository maintenance](docs/maintainers/repositories.md) for mirror and catalog workflows. Keep credentials and employee exports out of both repositories.

Independent of Keka and Composio; their names describe compatibility. See [Notice](NOTICE.md) for provenance and reuse boundaries.
