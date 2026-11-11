# Upgrade the MCP

## Version 2.2.0

Existing tool names and the default `full` discovery mode remain. Report calls now show up to 100 detail rows by default; follow `resultPage.nextOffset` or request a larger `limit` (max 1,000). Totals still cover the complete calculation. `reports` mode disables direct REST calls; `compact` mode uses search and dispatch instead of direct names. Restart your client and resync Composio after switching modes. See the [efficiency guide](../usage/efficient-mcp.md).
