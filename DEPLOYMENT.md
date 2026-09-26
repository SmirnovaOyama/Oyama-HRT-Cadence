# Cloudflare deployment

Cadence is deployed independently at https://oyama-cadence.oyamasmirnona.workers.dev.

- Worker: `oyama-cadence`
- D1: `oyama-cadence-db`
- R2 avatar bucket: `oyama-cadence-avatars` (accessed through the Worker)
- Authentication: `JWT_SECRET` is stored as a Cloudflare secret, not in this repository.

`wrangler.toml` points only to these resources. The original `hrt-tracker` Worker, database and avatar bucket are separate.

To publish changes:

```sh
bun run typecheck
bun run i18n:check
bun test
bun run deploy
```

When adding database migrations, inspect pending migrations before applying them:

```sh
bunx wrangler d1 migrations list oyama-cadence-db --remote
bun run wrangler:migrate:remote
```

All six initial migrations have been applied. Do not run the legacy migration-reconciliation helper against this new database.

The app supports ordinary account registration. The built-in administrator is configured through the `ADMIN_USERNAME` and `ADMIN_PASSWORD` Cloudflare secrets. Never copy the old site's signing secret into this deployment.
