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

Configure SMTP email (below) or Twilio Verify before admitting new posters. A verified phone **or** verified email permits publishing, so SMTP supports an SMS-free launch. Twilio's `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` are optional unless phone sign-in/verification or SMS recovery is required. SMS recovery uses only a previously verified phone; email recovery uses only a previously verified email. Validate actual provider delivery and billing/geographic permissions. Never enter secrets in chat or commit `.env`.

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

## Marketplace release (sprints 3–6)

Deploy the web and worker from the same release. Migrations 003–007 add scoped staff roles, moderation rules/policy, reports for users/messages, transactional notifications, Web Push subscriptions/outbox, category visibility, status-preserving restoration and report outcome notifications. They preserve existing listings/accounts; repeated open reports from a reporter are consolidated with a migration resolution note. Seeding adds starter review phrases without re-enabling rules an administrator disabled.

Configure optional `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` on web and worker for background push. Generate keys once; keep the private key in Coolify secrets. Without these settings, in-app notifications and live updates still work and background push controls stay hidden.

Ensure the reverse proxy does not buffer `/api/events` and permits connections over 60 seconds. Add external alerts for `/api/health` and `/api/ready`; inspect `/admin/operations` after deployment. Set `COOKIE_SECURE=true` for HTTPS/HSTS. Review `/admin/safety`, especially the review-all option, before admitting public sellers. Phone verification does not imply a listing passed human review unless policy requires it.

Follow [operations.md](operations.md) for consistent database/uploads snapshots, encrypted off-host copies, empty-target restoration, worker incidents, push constraints and performance validation. Backup scheduling and real provider tests require your deployment accounts; no live deployment is performed by the build.

## Media automation and Myanmar discovery rollout

Back up database and uploads together before this release. The existing migration/seed job applies `008_media_automation.sql` and `009_myanmar_discovery.sql`; deploy web and worker together with their shared uploads volume (or the same private S3 bucket). Seed reruns preserve administrator edits and old location identifiers. Existing public images stay visible while worker jobs backfill variants and hashes.

Moderation defaults to **MANUAL**. New publications and edits remain private until image processing finishes and a moderator approves them. In Admin → Safety, choose **LOCAL** to allow clean listings automatically after deterministic text/fraud/duplicate checks; LOCAL does not classify image content. Choose **OPENAI** only after setting `OPENAI_API_KEY` securely on the worker and accepting external processing of submitted listing text and sanitized images. The optional provider is `omni-moderation-latest`; provider outages retry and then require human review. Drafts are never sent. Live provider delivery has not been validated with a real key.

Admin → Media shows failed image work, pending automation and review history, with audited retries. Worker readiness remains required. Do not expose uploads or the S3 bucket publicly: authorization is enforced by `/media`, including thumbnail/card requests. No CDN is enabled; a future CDN must preserve private access and revocation.

Reference locations represent a licensed 2019 snapshot of 330 townships, not current administrative boundaries. Review names/hierarchy locally before launch; attribution and source scope are in `data/NOTICE.md`. Nearest results use approximate area centers, never household GPS. Burmese wording and search vocabulary also need native review.

## Email verification and SMS-independent access

Configure `SMTP_HOST`, `SMTP_PORT` (587 by default), and `EMAIL_FROM` (a bare sender address). Set `SMTP_USER` and `SMTP_PASSWORD` together when the SMTP server requires authentication. `SMTP_SECURE=true` uses implicit TLS (normally port 465); blank auto-selects implicit TLS for 465 and mandatory STARTTLS for other ports. Certificate verification stays enabled. Use a sender permitted by your mail service and configure its SPF/DKIM/DMARC records.

Migration 010 adds email ownership proofs without trusting existing email addresses automatically. Accounts can verify their current email at `/verify`; phone-only accounts can add a first recovery email after recent authentication (or current-password confirmation). Replacing an existing login address is a separate, unsupported workflow. A verified phone **or** verified email qualifies an account to publish, including when Twilio/SMS is absent. Public badges distinguish the two and do not expose either contact address.

Recovery offers whichever channels are configured, uses only previously verified contacts, and gives a generic response for unknown accounts. Codes expire after ten minutes, allow five checks and are single-use; resending invalidates old codes. Password recovery revokes all sessions and challenges across both channels. A phone-only member can verify email and use email recovery to establish an email/password login.

SMTP is needed on web only. No real mailbox credentials are bundled and live delivery must be checked after deployment. If neither SMTP nor Twilio is configured, verification cannot be skipped. There is no fixed code or production delivery bypass.
