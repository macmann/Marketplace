# Deploy on Coolify

## Create the resource

1. Review the code, commit it, and push it to the GitHub repository connected to Coolify.
2. Create a **Docker Compose** application using this repository and `/compose.yaml`.
3. Add a domain to **web**, routing to internal port **3000**. Use your HTTPS domain, for example `https://market.example.com`. Coolify's proxy terminates TLS.
4. Leave PostgreSQL, Redis, worker and migrate without public domains or host ports.
5. Set the variables below in Coolify, then deploy. The migration job must succeed before web and worker start.

## Required configuration

| Variable | Value |
| --- | --- |
| `APP_URL` | Public HTTPS origin, with no trailing slash |
| `POSTGRES_PASSWORD` | Random URL-safe password (letters/digits; at least 32 characters) |
| `COOKIE_SECURE` | `true` in production; default is true |
| `ADMIN_EMAIL` | Initial administrator email, for bootstrap |
| `ADMIN_PASSWORD` | Unique password of 14–72 characters, for bootstrap |

The bootstrap inserts an admin only if that email does not exist. It never promotes or resets an existing user. Set these before the first deploy; remove `ADMIN_PASSWORD` from the environment after bootstrap. To intentionally create another admin, use a new email and rerun the seed job through your operational process. Ordinary users cannot promote themselves.

**Phone sign-in, phone verification, SMS recovery and publishing require** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` for an SMS-enabled Twilio Verify service that supports your destination numbers. Set them securely in Coolify. Without these, users can register, browse, save and exchange a limited number of messages, but cannot publish. Phone OTP is the primary sign-in/registration path; email/password remains available. SMS recovery works only for accounts that linked and verified a phone before losing access. No email reset sender is configured. Twilio billing, deliverability, geographic permissions, and live delivery must be checked before launch. Never enter secrets in chat or commit `.env`.

Optional private S3-compatible storage:

- `S3_ENDPOINT` — HTTPS endpoint (omit for AWS's default endpoint)
- `S3_REGION` — provider region, defaults to `auto`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — scoped object get/put/delete access

Do not switch storage backends without migrating existing image objects. Otherwise their stored keys will no longer resolve. Without S3, the `uploads` named volume is required and must be backed up. Uploads are private at the origin and served by the app; no public bucket policy is needed. Use one web replica with local uploads. For multiple replicas use S3 and a shared stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` at build time; multi-replica deployment is not validated in this initial configuration.

## Readiness and migrations

The web health check requests `/api/health`, which checks PostgreSQL and the schema. Redis has a separate health check. The worker logs `worker_ready` after initial maintenance and Redis queue initialization. Coolify should show `migrate` exited successfully, PostgreSQL/Redis/web healthy, and worker running. Test registration, phone verification with a real device, publishing, image retrieval, and messaging on the public domain after deployment.

The migration command applies sorted SQL files from `scripts/migrations/` transactionally under a PostgreSQL advisory lock. `000_initial.sql` safely adopts the original schema, including existing deployments; `001_account_lifecycle.sql` adds nullable phone-only credentials, authentication challenges, recent-session timestamps, deletion state and image cleanup jobs. Applied migration SHA-256 checksums are stored in `schema_migrations`; changed applied files are rejected. Back up the database before deploying, allow the migrate job to finish, and start the new web and worker together. Repeated runs skip unchanged migrations. **Add a new numbered file for future schema changes; do not edit applied files or reset production.** Older sessions remain valid for browsing but require password confirmation or a new sign-in for deletion because they have no recent-auth timestamp.

For local production-stack verification you may use a git-ignored temporary Compose override that publishes web to `127.0.0.1`; the default production file exposes no host ports. Set `COOKIE_SECURE=false` only for that local HTTP smoke test.

## Operations

- Keep database, Redis and uploads volumes across redeploys. Never use `docker compose down -v` on production.
- Schedule an encrypted PostgreSQL backup at least daily using Coolify's database backup facility or a `pg_dump` job with private off-host storage. Use 7 daily, 4 weekly and 3 monthly retention. Test restores into a separate database. This repository does not automatically provision backup jobs or PITR.
- Back up uploads or use durable S3 storage with versioning/lifecycle policies. Coordinate image and database retention.
- Preserve the database password after volume initialization. Changing the environment variable alone does not rotate a PostgreSQL role's password.
- Use Coolify logs for initial diagnostics. Never log passwords, OTP codes, session cookies or private messages. Centralized error tracking/alerts remain deployment work.
- The worker expires active listings after 60 days and removes expired sessions/rate-limit records and authentication challenges hourly. It also processes up to 100 queued image deletions per maintenance run, retaining failures for retry. It does not yet resize images asynchronously or deliver push notifications.
- Configure your proxy to replace untrusted `X-Forwarded-For` and preserve the public host for Server Actions' same-origin checks. Set upload/request limits consistent with the application's 25 MB total request limit and 8 MB per-image limit. Do not disable origin checks to work around a proxy configuration problem.
- Pin and review container image digests in your release process; base images currently follow supported major tags.

## Local equivalent

```sh
# Supply variables securely using .env; do not put secrets into shell history.
docker compose up -d --build
# Inspect only service status and non-secret application logs.
docker compose ps
```

Deployment from this workspace to your Coolify instance has not been performed. No Coolify connection or domain was supplied.

## Account rollout checks

After applying the migration, check phone sign-in for both a new and existing user, incorrect/expired code handling, phone linking from an email account, password recovery with session revocation, data export, and account deletion. Twilio Verify must support Myanmar destinations and have appropriate geographic permissions and spending limits. OTP request limits use the trusted proxy client IP and destination; keep forwarded-header sanitization enabled. Code checks are also capped per server-side challenge. Never use integration-test providers or test codes in production.

Deletion requires a sign-in within the preceding 15 minutes or the current password. Phone-only members with older sessions should sign in again by OTP. The last active administrator cannot self-delete. Deletion anonymizes transaction/moderation references rather than deleting referential history; images are hidden immediately and queued for physical removal. Monitor `image_deletion_failed` events and the `image_deletions` queue. Do not describe this as immediate erasure of historical backups.

## Listing workflow rollout

Deploy the listing phase after the account lifecycle phase. `002_listing_workflow.sql` adds private drafts, optimistic revisions, draft image ownership, unique storage keys, and category field/value tables. The migrate job runs before `db:seed`; the seed then installs optional default fields without overwriting administrator changes. Both old data and fresh installations are covered by tests. Do not reorder these commands. Back up first and keep all applied migrations unchanged.

Verify saving an incomplete draft, owner-only access to its photos, resuming the draft, phone verification before publishing, category-field validation, cover-photo ordering, and removal of replaced photos from origin URLs. Removed objects are queued for worker cleanup. The 25 MB server-action request limit remains in force; the editor caps newly uploaded files at 24 MB combined to leave room for form data. Drafts are not automatically saved or available offline. New required category fields apply the next time a listing is published or edited; existing live listings are not silently removed. Disabling a field removes it from the editor, and its historical value is removed on the next successful edit.
