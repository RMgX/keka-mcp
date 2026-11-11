# Repository maintenance

Use the [contribution guide](../../CONTRIBUTING.md) for pull requests. Ship `dist`, `specs`, `package.json`, and production dependencies together for deployments.

To refresh the REST inventory, run `python scripts/verify_docs.py`, then `npm run coverage:catalog`. Review the source URLs and generated operation changes, then run `npm run check` and `npm test`. Runtime uses the checked-in operation snapshots.
