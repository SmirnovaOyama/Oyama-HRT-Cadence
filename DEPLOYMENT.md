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

## Original-site production upgrade (September 26, 2026)

`hrt.mahiro.uk` uses the explicit `wrangler.production.toml` configuration:

- Worker: `hrt-tracker`, existing route `hrt.mahiro.uk/*`.
- D1: `hrt-tracker-prod` (`916011c6-3b95-4116-a10e-76af94496170`).
- R2: existing `mahiro-contents` bucket; avatar objects remain under `hrt-tracker-user-avatar/`.
- Existing Worker secrets are retained in place. Do not rotate or copy the signing secret as part of this upgrade.
- The separate `oyama-cadence` deployment and its data remain separate.

Publish the original site with:

```sh
bun run typecheck
bun run i18n:check
bun test
bun run deploy:production
```

This is an in-place application upgrade, not a database copy. Existing user IDs,
password hashes, sessions, passkeys, two-factor settings, share links, avatars and
encrypted backup rows remain in their original stores. Browser records keep the
same origin and `hrt-*` / `hrt-u<account-id>-*` keys, including both hormone modes.
The cloud encryption derivation remains PBKDF2/SHA-256 with 600,000 iterations,
`hrt-cloud-v1:<user-id>` salt and AES-GCM; neither ciphertext nor encryption keys
are rewritten. English and Simplified Chinese share the existing `hrt-lang`
preference. Unsupported saved languages fall back to English; older Chinese
locale variants map to Simplified Chinese.

Pre-upgrade read-only inspection found 2,308 users, 6,517 backup rows and 381
sessions. These are live counts and may change through normal use. The required
schema already exists, including `site_notice` and both TOTP columns. Do not run
pending legacy ALTER migrations blindly: the migration ledger does not list
0000, 0004 or 0005 even though their schema is present. No database migration is
needed for this release.

Rollback reference: prior Worker version
`53c2c000-23a0-4432-b5b4-2c7751b5f5ad`. D1 Time Travel bookmark captured before
release: `0000a9e5-00000002-000050f2-9b53a0e2b06bd416b4b78b32609212ab`.
Prefer rolling back the Worker if application behavior needs reverting. A database
restore is a separate destructive recovery action that would discard newer writes;
it is not part of the normal application rollback.

Validation uses synthetic records and an isolated browser on localhost port 5198.
It covers Chinese/English switching and persistence, both hormone-mode histories,
UUID-account storage, and continued isolation from signed-out records. No real
health records or account credentials are used for browser checks.

Published Worker version: `6a5715ca-b94e-4e8c-9f6a-022ef63c34e7`.
Post-deployment checks confirmed HTTP 200 for the original domain and public
notice API, the matching frontend asset, the bilingual selector in that asset,
and unchanged production D1/R2/secret bindings. All 150 tests, type checking,
translation completeness/placeholder checks and the production build passed.

## Original-site release (September 28, 2026)

The September 26 redesign release was reverted at the owner's request the same
day (back to `53c2c000-23a0-4432-b5b4-2c7751b5f5ad`). On September 28 the owner
asked for the polished redesign (icons, Today, You, the level chart, the desktop
Timeline and the onboarding language choice) to be published to `hrt.mahiro.uk`.

- `worker.ts`, `migrations/` and the Wrangler configs are unchanged since the
  September 26 release, so no database migration was run.
- Rollback reference: prior Worker version `53c2c000-23a0-4432-b5b4-2c7751b5f5ad`.
  D1 Time Travel bookmark captured before release:
  `0000ab88-00000016-000050f4-97b1ee1502e9a97171bfbb79009f6c9d`. As before, prefer
  rolling back the Worker; a database restore would discard newer writes.
- Published Worker version: `70f96190-44d5-4efa-98c3-10ca0a552296`, bound to the
  same `hrt-tracker-prod` D1 database and `mahiro-contents` R2 bucket, with the
  existing `JWT_SECRET`, `ADMIN_USERNAME` and `ADMIN_PASSWORD` secrets in place.
- Before release: type checking, translation checks, all 154 tests and the
  production build passed. After release: the original domain and the public
  notice API returned HTTP 200, and the served frontend asset matched the build.
- Right after publishing, the first request briefly returned the previous
  `index.html` while the new version propagated; later requests served the new one.

Reverted the same day at the owner's request with
`wrangler rollback 53c2c000-23a0-4432-b5b4-2c7751b5f5ad --config wrangler.production.toml`.
`hrt.mahiro.uk` is back on the pre-redesign version `53c2c000`; no database
change was involved. The redesign stays published separately on `oyama-cadence`
(version `f19ede6c-b844-4ead-b760-d60fcaf56fcd`).
