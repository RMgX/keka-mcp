# Contributing

Discuss a bug or proposed change in [GitHub Issues](https://github.com/RMgX/keka-mcp/issues). Include the version, tool name, expected behavior, and a minimal reproduction with synthetic data. Report security vulnerabilities through [GitHub private vulnerability reporting](https://github.com/RMgX/keka-mcp/security/advisories/new).

## Submit a change

1. Fork the repository, then create a branch from `main`.
2. Use Node.js 22.22 or later. Install locked dependencies with `npm ci --ignore-scripts`.
3. Run `npm run check` and `npm test`. Update the relevant fixtures and documentation when behavior changes.
4. Open a pull request against `main` and describe the problem, the change, and how you verified it. Link the relevant issue if one exists.

For API changes, link the official Keka reference. Use synthetic fixtures for employee, project, and tenant examples. Keep credentials, actual records, and private URLs out of commits, issues, and pull requests.

See [catalog maintenance](docs/maintainers/repositories.md) for updates to the captured API definitions.
