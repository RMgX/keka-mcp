# Use less model context and fewer Keka reads

Choose a discovery mode per deployment. Every mode enforces the same tenant, module and exact-tool permissions.

| `MCP_TOOL_MODE` | Discovery | Use when |
|---|---|---|
| `reports` | Only permitted reports; direct REST calls are disabled | Users mainly need standard reports. Recommended starting point for reporting clients. |
| `compact` | Two tools: `keka_search_tools` and `keka_call_tool` | A model needs access to many tools and can consume structured MCP results. |
| `full` (default) | Direct tools and reports; up to 194 before permissions filtering | Existing integrations rely on exact tool names or need broad direct discovery. |

Even in `full` mode, REST tools advertise only input schemas they actually reference. Write-enabled deployments retain their exact write allowlist. Compact dispatch cannot bypass it, and its generic call tool may be annotated as destructive even when all writes are disabled.

In compact mode, find a tool, fetch its argument schema if needed, then invoke it:

```json
{"name":"keka_search_tools","arguments":{"query":"project health","kind":"report","limit":3}}
```

```json
{"name":"keka_search_tools","arguments":{"query":"keka_report_project_health","includeSchema":true}}
```

```json
{"name":"keka_call_tool","arguments":{"name":"keka_report_project_health","arguments":{"detail":"summary"}}}
```

Search uses words or an exact name. Filter by `kind` (`report`, `read`, `write`) or `module` (such as `psa` or `reports`). It returns up to five matches by default and at most 20 per call. Use `nextOffset` to see more. A schema is returned only for one exact permitted name. Clients that drop `structuredContent` should use `reports` or `full` mode.

## Return only what the model needs

- `detail: "summary"` returns totals and warnings with no detail rows.
- `fields: ["project", "signals"]` selects report row columns. It cannot request fields the report does not return.
- `limit` and `offset` page the output rows; default 100 rows, maximum 1,000. `resultPage.nextOffset` is null at the end. Totals are computed before projection or pagination. `complete` means required reads completed, even when row output is intentionally reduced or metrics disclose excluded invalid records.
- `format: "compact"` returns a short text message and the selected result in `structuredContent`. This is the default through compact dispatch. Set `format: "markdown"` for human-readable tables or `format: "json"` for JSON text in addition to structured content.
- Use `includeDaily: false` for monthly availability unless you need every calendar cell. Summary mode skips generating the daily calendar by default.

## Reuse recent calculations

`MCP_REPORT_CACHE_SECONDS=60` enables an optional 60-second in-memory cache; the default is off. The cache is bounded to 16 results and 8 MiB per REST client. Cached data is scoped to the client, tenant, permissions and calculation inputs. Different views or output pages of the same calculation can reuse it. Data is never saved to disk. Writes through the same server invalidate the cache; edits in Keka or another instance can remain unseen until expiry. Set `refresh: true` to bypass it.

Read `freshness.cacheHit`, `freshness.ageSeconds` and `generatedAt` to assess freshness. `readRequests` describes the reads that produced the snapshot, including on a cache hit. Without a cache, each output page recalculates against current records and is not a stable snapshot across requests. Use the same explicit `asOf` and filters for successive pages.

Compact discovery reduces the initial schema payload, while summaries and projection reduce tool-result size. Actual model token savings depend on the client, tokenizer and follow-up calls. Caching primarily reduces network calls and latency.
