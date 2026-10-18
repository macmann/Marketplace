# Coolify operations runbook

Deploy the three prebuilt application services with `compose.yaml`, using existing shared PostgreSQL/Redis resources and the persistent uploads volume; only web receives a public HTTPS domain. Migrations and seeding must finish before web/worker start. Keep the previous image tag and a verified backup before deploying. Roll back the application only after checking schema compatibility; do not reverse applied migration files.

## Availability and incidents

Monitor `GET /api/health` (web + database) every minute from outside the host and alert after two consecutive failures. Monitor `GET /api/ready` for the maintenance worker's database heartbeat and Redis connection, with a two-minute grace after deployment. Web's container health check deliberately uses `/api/health` so a worker failure does not continuously restart a healthy web service. Worker has its own Compose health check. Coolify must preserve streaming responses for `/api/events`; disable response buffering and use a read timeout above 60 seconds. Event streams reauthenticate every three seconds, close after 55 seconds and reconnect. They carry counters/timestamps, not message bodies. Inactive tabs disconnect.

Check `/admin/operations` for repeated image deletion failures, exhausted push deliveries and moderation/report backlogs. Structured `request_failed` logs contain route templates and an error digest rather than request bodies, query strings, session tokens or contacts. Configure your log destination and alerts in Coolify; no external monitoring account is provisioned by this repository. Retain restricted logs for a defined period. Next itself may emit additional error logs; review/redact those at the log collector.

On incident: restrict traffic if writes are unsafe, inspect web/worker/PostgreSQL/Redis container health and recent deployment logs, preserve evidence without exporting private message contents, then restore the last known compatible image. Test recovery on a separate stack before switching DNS or proxy traffic.

## Consistent local-storage backup

Run commands from the checked-out release on the Docker host, with the same Compose project, files and secret environment used by Coolify. On Coolify use its generated Compose files/project name; do not accidentally create a second project. Set `COMPOSE_FILE`, `COMPOSE_PROJECT_NAME` and `COMPOSE_ENV_FILES` as appropriate. The scripts use `docker compose`, `bash`, `grep`, `sha256sum` and `tar`. Export `DATABASE_URL` securely to the backup/restore process as well as Coolify. Use host PostgreSQL clients matching the shared server major version, or set `POSTGRES_CLIENT_CONTAINER` to the **existing** shared database container; `scripts/ops/postgres-client.sh` executes its clients without starting a database service. The connection URL chooses the dedicated Marketplace database and role. No bundled service name or role is assumed.

1. Put the site into an upstream maintenance page. Stop **web and worker**, leaving PostgreSQL running: `docker compose stop web worker`.
2. Run `bash scripts/ops/backup.sh /absolute/private/backups/unique-timestamp`. It refuses running writers, uses `pg_dump --format=custom`, archives the uploads volume and records SHA-256 checksums. A failed run leaves a `.partial` directory for diagnosis; do not treat it as a valid backup.
3. Restart `docker compose start web worker` even if backup fails. Check health before removing the maintenance page.
4. Encrypt the directory using your managed backup encryption/key service and copy it off-host. Restrict access: dumps contain contacts, sessions and private messages. Never commit backups to Git or place them in the uploads volume.

Schedule this workflow daily in your operator-controlled scheduler, monitor failures and disk capacity, and start with seven daily plus four weekly copies. Adjust retention to your privacy commitments. This workflow requires a maintenance window; use managed PostgreSQL point-in-time recovery and coordinated object storage snapshots when downtime is unacceptable. RPO is the last successful snapshot, not a claimed zero-data-loss guarantee. Redis stores reconstructible jobs, not the canonical marketplace data, so it is not part of this snapshot.

S3 deployments must coordinate a database snapshot with a versioned bucket snapshot/inventory while writers are stopped. The local backup script refuses S3 configurations. Configure bucket versioning, retention, encryption and off-site replication with your storage provider. Test its restoration separately; the repository cannot configure a provider without an account.

## Restore drill into a fresh stack

Use only a trusted, decrypted backup on an isolated host/project. Create a fresh, separate empty target database on the shared PostgreSQL service and select it in `DATABASE_URL`; never reuse a live application's database. Use a separate Compose project/uploads volume and an isolated Redis prefix on the existing shared resources. Keep matching PostgreSQL client/server major versions and do not expose the restore domain to users.

```sh
bash scripts/ops/restore.sh /absolute/private/backups/unique-timestamp --confirm-empty-target
docker compose run --rm migrate
docker compose up -d # migrate must complete before web/worker start
```

The restore verifies checksums and refuses an existing non-system table in any schema or nonempty uploads directory. Database restore is a single transaction. If upload extraction fails, use a new empty isolated target for another attempt; never reset a live database. It never drops an existing database. A backup from an older release is upgraded by the normal migration job.

Verify `/api/health`, `/api/ready`, an authenticated session, representative public and private photos, category fields, unread messages, admin permissions and row counts. Record elapsed restore time and data timestamp. Run a monthly drill and after migration/storage changes. Switch traffic only after verification; retain the original stack until the recovery window closes.

## Web Push

Generate a stable VAPID key pair once using `npx web-push generate-vapid-keys`. Save the private key in Coolify secrets and set **both web and worker** to `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (`mailto:` operator address). Keep keys stable across deploys. No key is committed or baked into the client build. Push controls appear only when fully configured and the browser supports service workers/Push API. Users explicitly subscribe from Notifications. iOS requires a compatible installed home-screen app.

Subscription endpoints are limited to known HTTPS browser push providers to prevent arbitrary server-side fetches. The worker processes up to 20 deliveries every 30 seconds, retries up to five times with exponential delays, and removes 404/410 subscriptions. Delivery is at-least-once: a worker crash after sending can cause a duplicate. Read notifications are skipped; generic, English notification text contains no message contents or seller details. In-app content uses the selected locale. Notifications expire after 90 days. No production push provider has been validated until VAPID is configured and a real browser receives a message through Coolify HTTPS.

## Performance and privacy

Daily counters cover search page renders, listing views and contact actions. They are request counters, not unique people or sales conversions; prefetches/bots can affect counts. Counters contain no visitor IDs, search phrases or message text and expire after 400 days. Staff see the last 30 days. Search uses PostgreSQL normalized substring matching, a small common English/Myanmar synonym vocabulary, title ranking and English trigram typo matching. ICU segmentation and high-confidence Zawgyi conversion support Myanmar text; generic transliteration and precise-distance routing remain unimplemented. Assess query plans and latency on representative production-sized data before claiming throughput or p95 targets.

The service worker caches only the static offline document and icons. Authenticated pages, drafts, messages, media and HTML/RSC are never persisted by it. Offline writes are not queued; users must reconnect before submitting. Browser alerts require permission. CSP permits Next's inline bootstrap scripts and styles; it blocks external scripts, framing, plugins and foreign form targets. A stricter nonce-based policy and a full accessibility/security audit remain separate validation work. HSTS is enabled when `COOKIE_SECURE` is not false; serve HTTPS before exposing production.

## Image processing and automated review

Uploads stage a private source plus a sanitized preview. The media worker generates 1600px, 640px and 320px WebP variants, strips metadata, computes SHA-256 and a perceptual difference hash, then removes staging objects. Existing images are backfilled without hiding public legacy listings. Processing retries five times with backoff; Admin → Media exposes failures and retries. Listing automation waits for all photos; three provider failures route to human review. Revisions and leases prevent late checks from publishing edited/removed content. Manual approval cannot bypass unfinished photos.

Exact image duplicates are checked across sellers; perceptual candidates are bounded to 300 recent same-seller images. These signals and posting-velocity/text rules route to review rather than declaring fraud. Uniform images omit the perceptual hash to avoid spurious matches. Moderation history and retries are audited. Policy choices are MANUAL (default), LOCAL (deterministic checks), OPENAI (optional external classification). Configure the worker-only `OPENAI_API_KEY` securely for OPENAI mode; absent keys/errors never publish unchecked content.

Keep the entire uploads volume in consistent backups, including temporary `.source` and `.preview.webp` objects. Sources are private and normally short-lived. Deletion removes every family variant and retries failures. Maintenance scans at most 250 objects per pass, persists its cursor and removes unreferenced objects older than 24 hours. Bucket lifecycle rules must not delete linked sources before processing finishes. Monitor the failed-image/moderation-retry counters and worker readiness; a growing queue needs investigation.

## Shared services and low-memory deployment

Production starts no PostgreSQL or Redis service and does no local image build. See [coolify.md](coolify.md) for internal-network URLs, dedicated database/user creation, GHCR access and matching prebuilt SHA tags. On the 2 GB VPS, wait for image publishing to finish before redeploying; keep other applications running and do not compile Next.js there. Check the VPS CPU architecture against the image platform before deployment.

BullMQ uses `REDIS_KEY_PREFIX` (default `marketplace`) on its queue, scheduler and locks. Choose a distinct prefix for staging/other applications; a separate logical Redis DB is optional. Rate limits, sessions, notifications and durable media/moderation/push jobs remain in Marketplace's own PostgreSQL database. Never flush shared Redis. Ensure the shared Redis operator provides persistence and `noeviction`; prefixes prevent key collisions but are not authorization boundaries.
