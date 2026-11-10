# Security model

One tenant and one permission profile per process. Keka credentials are server-side secrets; HTTP uses a separate caller bearer key. Everyone holding an instance's key can invoke its enabled tools. Stdio trusts the local MCP host.

Default controls: fixed HTTPS hosts, redirect rejection, no arbitrary URL requests, module/tool allowlists, writes disabled, schema validation, payload bounds, timeouts, throttling and error redaction. HTTP checks hostname/Origin, requires bearer authentication and bounds concurrent requests.

Not included: per-user Keka RBAC, field-level PII masking, approval screens, OAuth DCR, immutable auditing or distributed quota coordination. MCP annotations are hints, not access controls. Successful results may be retained by clients or Composio.

Never commit `.env`, `secrets/`, keys, employee exports or chat transcripts. Rotate exposed credentials through your organization’s process. Removing a key from Git does not revoke it.

Report security issues privately to the RMgX repository maintainers through established internal channels. Do not put credentials, employee data or exploit details in a public issue. No reporting address or response-time commitment is invented here.
