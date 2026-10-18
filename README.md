# Neighbour · Myanmar Marketplace

A Next.js/TypeScript modular monolith for a Myanmar local marketplace, prepared for Docker Compose deployment on Coolify. **This is an initial implementation, not the complete production-grade specification.** See [implementation status](docs/status.md) for boundaries.

## Local development

Requires Node 24, Docker with Compose, and Chromium for browser tests.

```sh
npm ci --cache /workspace/.npm-cache
cp .env.example .env # only for a new checkout; preserve existing configuration
# Set UPLOAD_DIR to an absolute writable directory on your machine.
docker compose -f compose.dev.yaml up -d --wait
npm run db:migrate
npm run db:seed
npm run dev
# In a second terminal:
npm run worker
```

The development Compose file binds PostgreSQL and Redis only to loopback. It uses local-only database credentials. No admin or sample users/listings are created unless explicitly configured. `db:seed` is repeatable and does not overwrite existing records. Both scripts automatically load `.env` if it exists; injected environment variables take precedence.

## Checks

```sh
npm test
npm run test:integration # dedicated test database, after migrations and seeding
npm run typecheck
npm run build
npm run test:e2e # with web, PostgreSQL, and Redis running; use a dedicated test database
```

Playwright uses `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to a different installed Chromium executable. Browser tests create uniquely named temporary users, including a database-verified seller fixture, and remove their data. They do **not** verify live SMS delivery. They exercise publishing with a real image, Burmese search, favorites, conversation privacy, reports, status transitions, and mobile localization.

## Deployment

See [Coolify deployment](docs/coolify.md). The production Compose file includes web, worker, migration/seed job, PostgreSQL, Redis, and persistent local image storage. Configure S3 if preferred. Only the web service needs a public domain.

## Project structure

- `app/`: server-rendered pages, server actions, health/media handlers.
- `lib/`: authentication, database, marketplace queries, validation, storage, translations.
- `scripts/`: idempotent initial schema, reference-data seed, background maintenance.
- `tests/`: domain tests and Playwright journeys.

Authentication supports phone OTP sign-in and email/password with opaque, hashed-at-rest sessions. Recovery requires an already verified phone and revokes all sessions. Account settings support exporting data, revoking other sessions, and confirmed deletion. Publishing requires phone verification through Twilio Verify; there is no production bypass. Conversation membership, listing ownership, and administrator permissions are checked on the server. Image uploads are decoded, bounded, resized, stripped of metadata and converted to WebP. Private bucket objects are served through the application.

Account service tests inject a verification provider into the service constructor and test actual PostgreSQL transactions; there is no production test-provider flag or fixed-code bypass. Adapter tests validate Twilio request/response handling without sending SMS. Live delivery must still be tested with your configured provider.

The listing editor supports private manual drafts, ordered/replaceable photos and inherited category-specific fields. Use `/account/drafts` to resume or discard a draft, and `/admin/attributes` to configure fields. Verification is checked on the server when publishing; a draft may be saved first. Concurrent edits use a revision token and return an error instead of overwriting a newer save. See the listing rollout section in `docs/coolify.md`.

## Marketplace operations

The current release includes inherited category filters, normalized bilingual query expansion and English typo matching, live in-app notifications, optional Web Push, scoped support/moderator roles, a private moderation queue and reporting outcomes. See [implementation status](docs/status.md) for remaining specification gaps and the [operations runbook](docs/operations.md) for push, monitoring, backup and restore setup. `npm run benchmark -- https://your-staging-host` runs a small explicit HTTP smoke test; use representative staging data before setting production budgets.
