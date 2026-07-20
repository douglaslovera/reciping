# Reciping API (local scaffold)

This service is the milestone 4 boundary for future authentication, recipe extraction/AI, and
Cloud Backup. It does not connect to Railway or any external provider by default.

## Start locally

1. Copy `.env.example` to `.env` if you want to enable the local Postgres/Better Auth wiring.
2. Start a local PostgreSQL database using your preferred local tool.
3. Generate/apply the schema from `packages/server-db` only against that local database.
4. Run `pnpm dev:api` from the repository root.

Without `DATABASE_URL` and `BETTER_AUTH_SECRET`, `/health` still works and reports auth disabled.
Private routes return `401`; authenticated provider-dependent routes return a clear
`PROVIDER_NOT_CONFIGURED` response until milestone 5.

## Routes

- `GET /health`
- `GET|POST /api/auth/*` when Better Auth is configured
- `POST /v1/import/extract`
- `POST /v1/backups/manifests`
- `POST /v1/backups/presign`

The shared schemas are in `packages/contracts`. Import extraction and object storage are interfaces,
so provider code can be added later without changing the routes.

## Safety boundary

URL imports accept only public HTTP(S) URLs. The current validator rejects loopback, link-local,
private IPv4 ranges, local/internal hostnames, and local IPv6 ranges. Production ingestion must also
validate DNS resolution and every redirect target before fetching.
