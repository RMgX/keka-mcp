# Validation report

Release candidate: 2.0.0. Updated November 11, 2026.

## Actual automated results

- TypeScript build passed.
- **29 tests passed, zero failed**, covering the REST client, permissions, schemas, stdio and authenticated HTTP.
- Production dependency audit reported **zero known vulnerabilities** at validation time. This is time-specific, not a security guarantee.
- `docker compose config --quiet` passed using non-secret example deployment values.
- GitLab's hosted validation pipeline passed for the initial v2 release. Validation is owned by GitLab; no GitHub Actions workflow is required for the mirror.
- A Docker image build/container run was **not performed**: Docker Desktop's engine was not running. Dockerfile and Compose are provided for deployment-host validation.

Tests exercise configuration rejection, file-based secrets, legacy tenant settings, API-key field selection, schema compilation for every executable operation, exact module/read/write permissions, query serialization, page bounds, preserved pagination metadata, token caching and refresh, bounded read retries, no automatic write retries, safe error handling, path restrictions and payload limits. MCP tests initialize real SDK clients over linked transport, child-process stdio and loopback HTTP. HTTP tests verify bearer authentication, Host/Origin rejection, CORS preflight isolation, media/JSON handling, admission control and disabled writes.

The original 20-test suite ran on Node 24 on Windows. The expanded 29-test suite passed on Node 24 and Node 22.22.0. The Node 22 compatibility run caught an oversized-request connection reset, which was corrected and retested. Hosted CI results must be checked on the published commit rather than inferred from local tests.

## Documentation verification

On November 10, 2026 the official [Keka overview](https://developers.keka.com/reference/getting-started-with-your-api) and [index](https://developers.keka.com/llms.txt) were used to retrieve 207 public operation pages. Zero fetch failures were recorded. Source URLs, verification date and HTML SHA-256 hashes accompany the embedded OpenAPI operation schemas in `specs/operations.json`.

Deduplication gives 186 method/path operations across 18 modules: 111 executable reads, 73 executable writes and two intentionally unavailable upload transports. All nine documented PMS operations are included. The [coverage inventory](COVERAGE.md) lists exact tools and limitations.

Authentication, pagination, quota and scope documentation were reviewed. The token schema specifies form encoding, `grant_type=kekaapi`, `scope=kekaapi` and `api_key`. The legacy `apikey` tenant variant remains an explicit opt-in. Documentation establishes contract presence, not tenant entitlement or universal correctness.

## Limited live checks

With privately supplied tenant credentials, an earlier validation run successfully obtained a token and read one record each from `/hris/employees`, `/pms/timeframes`, `/pms/goals` and `/pms/reviewcycles` on November 10. Each returned HTTP 200 and pagination metadata. A subsequent user-authorized workflow retrieved paginated project/allocation, employee, leave and holiday records and verified a small number of project allocation end-date updates by reading them back. No customer records, credential values or operational reports are included in this source repository.

On November 11, the version 2 compiled HTTP server was exercised on loopback with a real MCP SDK client, a randomly generated inbound key and a single-tool read allowlist. Initialization and discovery succeeded; exactly one tool was visible; `/pms/goals` returned one record from the live Keka tenant. Credentials, token and record contents were not saved or printed.

These checks do **not** establish live coverage for the entire catalog or deployment over public HTTPS. The tests did not provoke real quota exhaustion, real token expiry, broad write flows or unavailable uploads.

## Remaining deployment acceptance

1. Build and run the container on the intended host; check secret-file readability as the non-root container user.
2. Configure DNS, TLS and the final hostname. Confirm 401 without the MCP key, permitted initialization/discovery with it, and one sandbox read through the public URL.
3. Register/connect a Composio custom toolkit and confirm tool synchronization and a sandbox call. The guide is checked against current documentation; no Composio account integration has been performed.
4. Review who can hold the shared MCP key and which module/tool allowlists they receive. Add organization-approved auditing before enabling writes.
5. Keep one replica per credential until shared throttling is added. Scope production credentials separately from sandbox credentials.

No load test, penetration test, external security review, public TLS validation, OAuth gateway integration or multi-tenant/user authorization validation was performed. MCP cancellation does not yet abort a quota wait or in-flight Keka call; native fetch timeouts and process lifecycle bound execution. Underspecified vendor request schemas still require upstream validation; response schemas are captured but not enforced.
