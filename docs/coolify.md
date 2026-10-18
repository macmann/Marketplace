# Deploy Marketplace on Coolify with shared services

Production Compose runs **only `migrate`, `web`, and `worker`**. PostgreSQL and Redis are existing Coolify resources. The only application volume is `uploads`; S3 remains optional. No production build runs on the VPS: Compose pulls prebuilt web/tools images.

## Build away from the 2 GB VPS

The `Publish images` GitHub workflow builds on a GitHub-hosted runner after a merge to `main` or a manual workflow dispatch. It uses one Buildx builder, builds tools first, and reuses the dependency stage for web. Dependencies install once and Next.js compiles once. Both images receive a matching immutable `sha-<full-commit>` tag, plus `main`. No database/Redis/build-time service or application secret is needed to build. The default image platform is `linux/amd64`: check `uname -m` on the VPS. For ARM set the GitHub Actions repository variable `MARKETPLACE_PLATFORMS=linux/arm64` (or both platforms) before building; QEMU is enabled only when requested. Each requested platform builds its own necessary artifacts.

Wait for **both** image publications to finish. In Coolify, set `MARKETPLACE_WEB_IMAGE` and `MARKETPLACE_TOOLS_IMAGE` to matching SHA tags from that successful run. Defaults reference `ghcr.io/macmann/marketplace-web:main` and `ghcr.io/macmann/marketplace-tools:main`, but immutable tags prevent mixed releases. Do not deploy between the two image pushes. Disable Git-push auto-deployment for this Compose app and redeploy after image publication, unless you separately wire an image-build-completion deployment trigger.

New GHCR packages are normally private. Either grant Coolify registry access using a securely stored token with read-packages permission, or deliberately make the packages public. The GitHub application used for source access does not automatically supply registry access. The build workflow uses its scoped `GITHUB_TOKEN`, not a committed registry credential. Forks must set their own image references.

Do not enable a Dockerfile/Nixpacks build in Coolify or run `docker compose build` on the small VPS. Adding swap or a small Node heap limit does not make this build safe alongside the other applications. If GitHub-hosted image publishing is unavailable, build the same two Docker targets on a separate machine and publish them to your registry before deploying.

## Create or reuse the shared PostgreSQL database

Use the existing PostgreSQL resource's terminal/admin connection. Create a dedicated database and role; do not point Marketplace at another application's database or reuse its tables. For a **new, empty** Marketplace database:

```sql
CREATE ROLE marketplace_user LOGIN;
\password marketplace_user
CREATE DATABASE marketplace OWNER marketplace_user;
```

`\password` prompts for the password without placing it in this document. Use your established secret-management process and URL-encode reserved characters in connection-string credentials. The database owner must be able to create its tables and the trusted `pg_trgm` extension. If your shared service restricts extensions, its administrator should install `pg_trgm` in the `marketplace` database first. No superuser role is required by the application.

If the database or role already exists, reuse it and verify ownership/permissions instead of recreating or dropping it. For data currently in the old bundled database, stop Marketplace writers, take a coordinated database/uploads backup, and restore into a separately created empty shared database with ownership mapped to `marketplace_user` (`pg_restore --no-owner --no-privileges`). Verify data and media before changing traffic. Keep the old database and volumes intact until the cutover is verified. This code does not move, reset or delete any database automatically.

## Connect the three application services

1. Keep the existing shared PostgreSQL and Redis resources running in Coolify. Do not add copies for Marketplace.
2. Create/update a **Docker Compose** application using this repository and `/compose.yaml`. Reuse the existing application resource when possible so its uploads volume/project identity stays the same.
3. Keep the shared resources on the existing internal Docker network `coolify`, or set `COOLIFY_NETWORK` to their network name if it differs. Compose explicitly attaches **migrate, web and worker** to the external `shared` network as well as the default application network. Coolify can replace the default network with its resource-specific network; shared-service access must not depend on that default. Marketplace does not create the shared network or database services. No additional Coolify network toggle is required.
4. Configure `DATABASE_URL` and `REDIS_URL` with the shared services' internal DNS hostnames, not `localhost`. Use the hostnames Coolify actually assigns; no UUID hostname is hardcoded here.
5. Select matching prebuilt image references. Configure registry access if needed. Add a public HTTPS domain to **web**, internal port **3000**. Give migrate/worker no public domains or host ports.
6. Set bootstrap variables only if an initial admin is needed, then deploy after the image workflow succeeds. For an existing Coolify application, use **Reload Compose** to load the updated repository configuration, then **Show Deployable Compose** to confirm all three services include the external shared network before deploying. Migration/seed must exit successfully before web/worker start. Remove the bootstrap password after success.

Example connection strings only:

```dotenv
DATABASE_URL=postgresql://marketplace_user:PASSWORD@shared-postgres:5432/marketplace
REDIS_URL=redis://shared-redis:6379/0
APP_URL=https://market.example.com
COOKIE_SECURE=true
REDIS_KEY_PREFIX=marketplace
```

Supply real values securely in Coolify, never in Git or chat. Marketplace no longer requires `POSTGRES_PASSWORD`.

## Required and optional variables

Required: `APP_URL`, `DATABASE_URL`, `REDIS_URL`. Keep `COOKIE_SECURE=true` behind production HTTPS. `ADMIN_EMAIL` and `ADMIN_PASSWORD` are required only for first-admin bootstrap; the seed never promotes/resets an existing account with that email.

Optional deployment settings: `MARKETPLACE_WEB_IMAGE`, `MARKETPLACE_TOOLS_IMAGE` (pin matching SHA tags), `COOLIFY_NETWORK` (default `coolify`), `REDIS_KEY_PREFIX` (default `marketplace`). Distinct applications/environments sharing Redis must use distinct prefixes. Local media always uses `UPLOAD_DIR=/app/uploads` with the persistent uploads volume.

Optional integrations:

- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` — web only; see email configuration below.
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`.
- Web Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- Image classification: worker-only `OPENAI_API_KEY`, then select OPENAI in Admin → Safety. Default MANUAL sends nothing externally; LOCAL uses deterministic checks only.
- S3: `S3_ENDPOINT`, `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Keep the existing storage backend until you explicitly migrate objects. No S3 move is part of this change.

Configure and validate SMTP or Twilio for new users to verify a contact before posting. A verified email permits posting without SMS. Live provider delivery, public TLS/proxy behavior and the actual shared-service network require deployment-side verification.

## Redis isolation and service readiness

BullMQ's `maintenance` queue, scheduler, jobs, events and locks all use the configured BullMQ `prefix` option. Do not use ioredis's `keyPrefix` option with BullMQ. The health probe reads only `${REDIS_KEY_PREFIX}:service-health`; it does not read a global or another application’s key. Sessions, rate limits, notifications/push delivery, media jobs and moderation jobs live in the dedicated PostgreSQL database rather than Redis.

Prefix isolation works on Redis DB 0. A logical DB in `REDIS_URL` is honored if your service supports it, but is not required for isolation. Use Redis persistence and `maxmemory-policy=noeviction` for BullMQ reliability; coordinate this with the shared Redis operator because that setting affects other applications. A prefix prevents accidental key collisions, not access by another client holding unrestricted credentials. Use Redis ACLs/network controls appropriate to your shared service.

Changing the prefix starts a new namespace. Stop the old Marketplace worker first, then deploy web/worker with the same new prefix. The old queue contains periodic maintenance rather than user-message/media jobs; the new worker re-registers its scheduler and performs initial maintenance. Do not flush shared Redis or delete another application's keys. Leave old namespace cleanup to a separately reviewed operation.

Missing URLs fail Compose interpolation. Migrate has a bounded PostgreSQL connection timeout and an explicit missing-URL error; it does not wait for a bundled healthcheck. Worker startup fails clearly after a bounded Redis initialization attempt, and Docker restarts it; established connections retry Redis outages. `/api/health` checks database/schema, `/api/ready` requires a recent worker heartbeat, and the worker container has its own heartbeat check. Migrate exits zero; web/worker should be healthy. Investigate network DNS, credentials, TLS and resource access instead of disabling verification.

## Persistence and safe updates

Never run `docker compose down -v` on production. Keep uploads attached across redeploys, and back up database/uploads consistently. A new Coolify application/project may allocate a different uploads volume: explicitly retain the old volume or restore its backup before switching traffic. Keep one web replica with local uploads. Do not change media storage or add replicas without a separate migration/review.

Migrations are append-only, checksum-verified and transactional under an advisory lock. Every deployment runs `npm run db:migrate && npm run db:seed` using the external URL. Do not edit applied files or reset production. The seed preserves administrator edits and never creates demo inventory. The one-shot job must complete before both long-running services start.

Coolify must replace untrusted `X-Forwarded-For`, preserve the public host for Server Actions, and avoid buffering `/api/events` (allow connections over 60 seconds). Keep request limits consistent with the 25 MB action limit and 8 MB per image. Do not weaken same-origin checks or TLS to work around networking problems.

Use shared-database backups plus coordinated uploads snapshots. The repository backup/restore helpers accept `DATABASE_URL` and can use host PostgreSQL clients or the **existing** shared database container via `POSTGRES_CLIENT_CONTAINER`; they do not start a database service. Restore helpers require an explicitly empty target. Test restoration to a separate database and configure encrypted off-host retention and alerts. See [operations.md](operations.md).

Validate sign-in, email/phone verification, a free giveaway, moderation, image retrieval, messages and notifications over the real public domain before broad launch. Historical Myanmar reference names and Burmese wording still require local review. Sharing infrastructure reduces duplicate services; it does not establish a RAM, latency or uptime guarantee for the 2 GB VPS.

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
