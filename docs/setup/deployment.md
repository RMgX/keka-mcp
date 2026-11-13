# Deploy RMgX Keka MCP

Recommended: **one Docker container on an RMgX-managed Linux host behind NGINX or existing HTTPS ingress**. Composio must be able to reach the final HTTPS endpoint. Caddy remains an optional alternative.

## Host and DNS

Install Docker Engine with Compose and a reverse proxy. Choose a DNS name and point it at the host. `keka-mcp.example.com` below is an example, not a provisioned endpoint. Expose HTTPS on 443, and port 80 if certificate issuance needs it. Keep application port 3000 on loopback.

## Secrets and permissions

Copy `.env.example` to `.env` and set non-secret deployment values:

```dotenv
KEKA_COMPANY=your-company
KEKA_ENVIRONMENT=kekademo
KEKA_MODULES=hris,pms,psa,time
MCP_TOOL_MODE=reports
MCP_PUBLIC_URL=https://keka-mcp.example.com/mcp
```

Create a restricted `secrets/` directory outside version control and populate these files through a secure editor or secret manager:

| File | Contents |
|---|---|
| `secrets/keka_client_id` | Keka client ID |
| `secrets/keka_client_secret` | Keka client secret |
| `secrets/keka_api_key` | Keka API key |
| `secrets/mcp_auth_token` | Independent random MCP access key |

Generate the MCP key with a secure password manager or `openssl rand -hex 32`. Never reuse your Keka API key. Set exact `KEKA_READ_TOOLS` allowlists before connecting real users. All clients of one instance share its access profile.

The container runs as `node` (UID 1000). Mounted files must be readable by that user without being world-readable. Compose file-backed secrets can preserve host ownership/modes; configure ownership/group access or use your secret manager accordingly.

Direct Node/stdio deployments also accept credential `_FILE` variables. `.env` is read by Compose for interpolation, not by Node. Do not put secrets in Dockerfiles, images, build arguments or the repository. The documented token field is `api_key`; earlier RMgX deployments can opt into `KEKA_API_KEY_PARAMETER=apikey` if their tenant requires it. There is no silent credential fallback.

## Start and secure the endpoint

```sh
docker compose config --quiet
docker compose up --build -d
docker compose ps
curl --fail http://127.0.0.1:3000/health
```

Health checks return only `{"status":"ok"}` and do not prove Keka authentication.

## NGINX reverse proxy

Use `deploy/nginx.conf.example` with the supplied loopback-published Compose service, or with Node running on loopback port 3000. It belongs in a file included inside NGINX's `http` context, normally `/etc/nginx/conf.d/keka-mcp.conf`.

1. Replace `keka-mcp.example.com` everywhere with your chosen hostname, and set `MCP_PUBLIC_URL=https://that-host/mcp`.
2. Provision a certificate through your existing TLS process. Set `ssl_certificate` to the full chain and `ssl_certificate_key` to its protected key. The example's Let's Encrypt paths are placeholders, not issued certificates.
3. Validate with `sudo nginx -t`, then reload with `sudo systemctl reload nginx`. Do not run Caddy and NGINX on the same listening ports.
4. Confirm HTTPS POST `/mcp` returns 401 without the key and permits MCP initialization/tool calls with it. `/mcp/` is not the configured path. Health remains loopback-only.

The example preserves Host and Authorization, disables response buffering/cache and upstream retries, allows long-running report responses and logs paths without query strings or credential headers. Do not add automatic POST retry rules: some MCP calls can perform writes. Use your organization's certificate renewal and log-retention processes.

For containerized NGINX, use an internal Docker network and change the upstream from `127.0.0.1:3000` to the application service name; keep application port 3000 unexposed publicly. NGINX on the host needs no such change. See [NGINX proxy documentation](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) and [HTTPS configuration](https://nginx.org/en/docs/http/configuring_https_servers.html).

For Caddy, adapt `deploy/Caddyfile.example` instead. That example also assumes a host-based proxy.

Keep the original Host header and `Authorization`, `Accept`, `Content-Type`, `MCP-Protocol-Version` headers. Do not redirect the final `/mcp` URL. The hostname is checked against `MCP_PUBLIC_URL`. Allow long responses for Keka quota waits; the example proxy allows ten minutes.

An unauthenticated POST to `/mcp` must return 401. Unapproved browser Origins receive 403. Server-to-server clients usually omit Origin. Set `MCP_ALLOWED_ORIGINS` only for controlled browser origins; comma-separated exact origins, no trailing slash. Preflight responses never authorize tool calls.

## Connect and operate

Connect an MCP client using the final HTTPS URL and `Authorization: Bearer <MCP access key>`. Initialize, list tools and call one permitted read. Start in sandbox; use separate production credentials after acceptance. Follow [Composio setup](composio.md) for its registration flow.

- Run one replica per Keka credential until you add distributed quota coordination. The gate and token cache are in-process.
- `MCP_TOOL_MODE=reports` disables direct REST calls and exposes only permitted reports. For broad direct access use `full`; for two-tool discovery use `compact`. An optional report cache is off by default. See [efficiency settings](../usage/efficient-mcp.md).
- Eight concurrent authenticated requests are admitted. Additional calls receive 503. Add ingress rate limits; this is not DDoS protection.
- Every caller of an instance shares its tenant and permissions. Use separate instances/keys for separate profiles, with quota coordination or separate Keka credentials.
- No per-user Keka RBAC or immutable audit sink is included. Add approved gateway auditing before enabling writes; never log bodies or authorization headers.
- Rotate the MCP key by replacing the secret and recreating the container. Rotate Keka credentials separately. Replace keys shared in chats before broad rollout.
- OAuth-only clients require a compliant external gateway. The backend itself uses API-key authentication.

## Update and rollback

Pull an approved GitLab commit, run tests, rebuild and recreate the service. Record the deployed commit and keep the previous image until checks pass. Rollback restores application/configuration only; it does not undo Keka writes. No application database exists.

Container build, DNS/TLS and Composio account checks must be completed on the deployment host. No cloud resources or hosting charges are created by repository setup.

## RMgX production deployment (as built 2026-11-14)

RMgX runs this server on a dedicated EC2 host, not on the shared web-sites box.

| Item | Value |
| --- | --- |
| Host | `RMgX-MCP-Host` (`i-091d607f2d2689ded`, `t3a.small`, Ubuntu 24.04, Elastic IP `43.204.21.3`) |
| Endpoint | `https://keka.mcp.rmgx.in/mcp` (nginx + Let's Encrypt, no CloudFront) |
| Checkout | `/opt/rmgx/keka-mcp`, owned by `gitlab-runner` |
| Container port | `127.0.0.1:3000` (never published) |
| Secrets | `/opt/rmgx/keka-mcp/secrets/`, `root:ubuntu 0440` |
| Config | `/opt/rmgx/keka-mcp/.env`, `root:gitlab-runner 0640` |
| Runbook | `rmgx-firm/tools/tech-ops` → `docs/runbooks/mcp-hosting.md` |

### Active configuration

```dotenv
KEKA_COMPANY=rmgx
KEKA_ENVIRONMENT=keka            # production, not kekademo
KEKA_MODULES=hris,hire,assets,banks,expense,expensepolicies,helpdesk,loans,payroll,pms,psa,requisition,rnr,time,traveldesk,attendance,clients,app
KEKA_API_KEY_PARAMETER=api_key   # the legacy `apikey` form is not needed for this tenant
KEKA_ALLOW_WRITES=true
KEKA_WRITE_TOOLS=<all 73 write tool names>
MCP_PUBLIC_URL=https://keka.mcp.rmgx.in/mcp
MCP_ALLOWED_ORIGINS=
MCP_TOOL_MODE=full
MCP_REPORT_CACHE_SECONDS=0
```

Two independent gates control the tool surface, both fail-closed:

- `KEKA_MODULES` filters by catalog module. A module omitted here hides every tool in it, silently —
  the default `hris` exposes a small fraction of the catalog.
- Writes need **both** `KEKA_ALLOW_WRITES=true` **and** the tool named in `KEKA_WRITE_TOOLS`. An
  empty `KEKA_WRITE_TOOLS` permits no writes.

As configured above the server exposes 194 tools (121 read + 73 write) across all 18 modules.

`secrets/` files must be readable by the container's uid 1000 (`node`). Compose `secrets:` preserves
the host's ownership and mode, so `0600 root` fails at startup with
`Cannot load KEKA_CLIENT_ID from its secret file`.

### Continuous deployment

A project-scoped GitLab runner (tag `mcp-host`) is registered on the host itself, so the deploy job
needs no cloud credentials or SSH keys. `.gitlab-ci.yml` runs `validate` first, then `deploy` on
pushes to the default branch only:

- `deploy/deploy.sh` builds `<image>:<CI_COMMIT_SHORT_SHA>`, runs `docker compose up -d --no-build`,
  waits for `/health`, asserts `200` there and `401` on a public unauthenticated `POST /mcp`, prunes
  all but the five newest tags, and on any failure restores the previous commit and image tag.
- `compose.yaml` takes `image: ${KEKA_IMAGE:-keka-mcp:local}` so a rollback is a tag change, not a
  rebuild.
- Deploys are serialised by `resource_group: keka-mcp-production`.

Rollback restores application and configuration only; it does not undo Keka writes.
