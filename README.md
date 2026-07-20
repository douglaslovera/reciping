# Reciping

A private-first recipe journal built with Expo SDK 54. The mobile app is local-first: it works
without an account, keeps journal data in on-device SQLite, and stores selected photos inside the
app's document directory.

The complete product and architecture record is in [PLAN.html](./PLAN.html).

## What works now

- Manual recipes and editable pasted-text drafts
- Structured ingredients, categories, favorites, drafts, grid/list library, and search
- Recipe details, constrained Markdown preparation, serving quantities, timing, and sources
- Multiple active cooking sessions with independent recipe snapshots
- Ingredient checkmarks, serving scaling, structured changes, final notes, ratings, and make-again
- Quick-total or itemized costs, cost per serving, and locally persisted cooking photos
- Completed history, past cooking, standalone logs, cook-again, saved variations, and log attachment
- Chronological Journal, Saved videos/articles/tips, recipe links, and Recently Deleted restore
- English/Spanish interface setting, global currency, reading size, light/dark mode
- Local Hono API, Zod contracts, PostgreSQL/Drizzle migrations, and Better Auth wiring

AI imports, real authentication providers, Cloud Backup, Railway deployment, and release hardening
are deliberately deferred to milestones 5 and 6.

## Workspace

```text
apps/client              Expo Router app (iOS first; Android supported; web shell exportable)
apps/api                 Hono + Better Auth local API scaffold
packages/contracts       Shared Zod request/response contracts
packages/domain          Shared domain rules
packages/server-db       PostgreSQL Drizzle schema and generated migration
```

This is a plain pnpm workspace—there is no Turborepo.

## Run the app

Requirements: Node.js 20.19 or newer, pnpm 10, Xcode/iOS Simulator for iOS.

```sh
pnpm install
pnpm ios
```

Other client commands:

```sh
pnpm android
pnpm web
pnpm --filter @reciping/client typecheck
pnpm --filter @reciping/client lint
```

## Run the local API scaffold

The API starts without credentials. In that state, health works, auth is reported as disabled,
private routes reject unauthenticated requests, and provider-dependent operations return explicit
setup-required errors.

```sh
pnpm dev:api
curl http://localhost:8787/health
```

To exercise Better Auth against a local PostgreSQL instance, copy `apps/api/.env.example` to
`apps/api/.env` and fill only local values. The generated database migration is under
`packages/server-db/drizzle`.

No command in this repository deploys to or modifies Railway.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test:api
```

Manual iOS QA screenshots are under `screenshots/implementation`.
