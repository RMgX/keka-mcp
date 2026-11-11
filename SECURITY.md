# Security model

One tenant and one permission profile per process. Keka credentials are server-side secrets; HTTP uses a separate caller bearer key. Everyone holding an instance's key can invoke its enabled tools. Stdio trusts the local MCP host.

Default controls: fixed HTTPS hosts, redirect rejection, no arbitrary URL requests, module/tool allowlists, writes disabled, schema validation, payload bounds, timeouts, throttling and error redaction. HTTP checks hostname/Origin, requires bearer authentication and bounds concurrent requests.

Reports require all underlying read permissions. Reports-only mode blocks direct calls; compact dispatch uses the same permission checks as direct calls. The optional report cache is off by default, scoped to each server client and permission profile, bounded in memory and invalidated around writes through that server. Separate callers on one instance still share the same access profile.

Not included: per-user Keka RBAC, field-level PII masking, approval screens, OAuth DCR, immutable auditing or distributed quota coordination. MCP annotations are hints, not access controls. Successful results may be retained by clients or Composio.

Never commit `.env`, `secrets/`, keys, employee exports or chat transcripts. Rotate exposed credentials through your organization’s process. Removing a key from Git does not revoke it.

Report vulnerabilities using [GitHub private vulnerability reporting](https://github.com/RMgX/keka-mcp/security/advisories/new). Keep credentials and employee records out of reports.
