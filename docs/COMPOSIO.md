# Connect through Composio

Verified against [Composio Custom MCP documentation](https://docs.composio.dev/docs/extending-sessions/custom-mcp) on November 11, 2026. This feature is experimental. This is a verified setup guide, not a completed Composio account integration.

## Register the endpoint

Deploy a read-only instance at a final public HTTPS `/mcp` URL, without redirects. Use an independent MCP access key. Install the current Python Composio SDK in your integration application; it is not a dependency of this server.

Composio Custom MCP cannot connect to local stdio. Its API-key scheme forwards an authorization header to your remote server. The key supplied by a connected user is the **MCP access key**, never Keka credentials.

```python
import os
from composio import Composio

composio = Composio(api_key=os.environ["COMPOSIO_API_KEY"])
toolkit = composio.experimental.custom_toolkits.create(
    name="RMgX Keka",
    mcp_url="https://your-deployment.example.com/mcp",
    auth_schemes=[{
        "mode": "API_KEY",
        "headers": {"Authorization": "Bearer {{generic_api_key}}"},
    }],
    user_id="your-application-user-id",
)
print(toolkit.slug)
if toolkit.connect_link is not None:
    print(toolkit.connect_link.redirect_url)
```

Private per-user toolkits require a Pro plan under the current docs. Open the connection link and enter the MCP access key. Save the returned `CUSTOM_*` slug. Composio syncs tools after account connection.

To share toolkit discovery with your entire Composio project, use `user_id="all"`. Shared registration does not return a per-user connection link; follow Composio's connected-account linking flow. Choose shared discovery only when appropriate, and connect only approved callers. The backend key still grants one common permission profile.

## Brand and use the toolkit

Composio accepts a square PNG/JPEG, 256–1024 pixels, via `logo_file`. Add the repository's 512-pixel icon to `create()` or `update()`:

```python
import base64
from pathlib import Path

logo_file = {
    "content": base64.b64encode(Path("icon.png").read_bytes()).decode(),
    "mime_type": "image/png",
}
```

Pass `logo_file=logo_file` to the request. After account connection:

```python
session = composio.sessions.create(
    user_id="your-application-user-id",
    toolkits=["CUSTOM_SLUG_RETURNED_AT_REGISTRATION"],
)
tools = session.tools()
```

Use your actual returned slug and the same application user ID. For another MCP client using Composio, create the session with `mcp=True` and forward `session.mcp.url` and all returned `session.mcp.headers` unchanged. See [sessions via MCP](https://docs.composio.dev/docs/sessions-via-mcp).

## Constraints

- Maximum 500 tools per custom toolkit. This server has 184 executable tools before permissions filtering.
- Resync after changes to tools/permissions; no automatic resync. Authenticated `custom_toolkits.sync()` needs an active connected account.
- URL, authentication and user ownership are fixed at creation. Use `create()`/`update()`, not deprecated `upsert()` examples.
- This server does not implement OAuth DCR. Do not choose `DCR_OAUTH` without adding a compliant gateway.
- No toolkit, connected account or Composio session has been provisioned. Test the flow in your own Composio project after deployment.
