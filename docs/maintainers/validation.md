# Release validation

The v2.2.0 build and 61 automated tests passed on Node.js 22.22.0. Run the same checks locally with:

```sh
npm ci --ignore-scripts
npm run check
npm test
```

The suite covers documented request schemas, tool permissions, OAuth encoding, pagination, retry limits, response bounds, stdio, and authenticated HTTP. Report fixtures cover calculations, invalid records, access controls, result projection and pagination, and cache isolation and expiry.

Docker Compose configuration and the NGINX example syntax were checked. Verify the container runtime, TLS endpoint, tenant permissions, and client connection in your own deployment. See the [deployment guide](../setup/deployment.md).
