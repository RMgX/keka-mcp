# Source repository and mirror

Source: https://gitlab.rmgx.in/rmgx-firm/tools/keka-mcp

Mirror: https://github.com/RMgX/keka-mcp

Both repositories are private. GitLab owns changes and validation. An enabled GitLab push mirror sends updates to GitHub through a repository-scoped SSH deploy key. Divergent refs are preserved; a conflicting GitHub branch must be reviewed rather than overwritten. Do not edit the mirror directly or push rewritten history.

The mirror key is managed in GitLab, with its public half installed as a GitHub deploy key. No key material is committed here. Rotate it through the GitLab/GitHub repository settings if needed. The repository deliberately uses GitLab CI, so routine mirroring does not require a GitHub credential with permission to publish Actions workflows.

To verify a release, compare the `main` commit SHA on both services and check the GitLab pipeline for that exact commit. GitLab mirror updates are asynchronous. Inspect its mirror status and last error before assuming a pending update has completed.

Existing consumers should follow MIGRATION.md because tool names and access defaults changed. Hosted MCP deployment is separate from source mirroring; pushing code does not provision a server.
