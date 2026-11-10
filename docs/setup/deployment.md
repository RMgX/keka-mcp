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
