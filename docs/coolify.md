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

**Publishing requires** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` for an SMS-enabled Twilio Verify service that supports your destination numbers. Set them securely in Coolify. Without these, users can register, browse, save and exchange a limited number of messages, but cannot publish. The current sign-in method is email/password; phone OTP verifies publishing eligibility. Twilio billing, deliverability, geographic permissions, and live delivery must be checked before launch. Never enter secrets in chat or commit `.env`.

Optional private S3-compatible storage:

- `S3_ENDPOINT` — HTTPS endpoint (omit for AWS's default endpoint)
- `S3_REGION` — provider region, defaults to `auto`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — scoped object get/put/delete access

Do not switch storage backends without migrating existing image objects. Otherwise their stored keys will no longer resolve. Without S3, the `uploads` named volume is required and must be backed up. Uploads are private at the origin and served by the app; no public bucket policy is needed. Use one web replica with local uploads. For multiple replicas use S3 and a shared stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` at build time; multi-replica deployment is not validated in this initial configuration.

## Readiness and migrations

The web health check requests `/api/health`, which checks PostgreSQL and the schema. Redis has a separate health check. The worker logs `worker_ready` after initial maintenance and Redis queue initialization. Coolify should show `migrate` exited successfully, PostgreSQL/Redis/web healthy, and worker running. Test registration, phone verification with a real device, publishing, image retrieval, and messaging on the public domain after deployment.

The current migration command creates the initial schema transactionally under a PostgreSQL advisory lock. It can be rerun safely. **Future schema changes need new, versioned SQL migrations.** Editing `CREATE TABLE IF NOT EXISTS` does not modify existing columns. Never run destructive resets against production.

For local production-stack verification you may use a git-ignored temporary Compose override that publishes web to `127.0.0.1`; the default production file exposes no host ports. Set `COOKIE_SECURE=false` only for that local HTTP smoke test.

## Operations

- Keep database, Redis and uploads volumes across redeploys. Never use `docker compose down -v` on production.
- Schedule an encrypted PostgreSQL backup at least daily using Coolify's database backup facility or a `pg_dump` job with private off-host storage. Use 7 daily, 4 weekly and 3 monthly retention. Test restores into a separate database. This repository does not automatically provision backup jobs or PITR.
- Back up uploads or use durable S3 storage with versioning/lifecycle policies. Coordinate image and database retention.
- Preserve the database password after volume initialization. Changing the environment variable alone does not rotate a PostgreSQL role's password.
- Use Coolify logs for initial diagnostics. Never log passwords, OTP codes, session cookies or private messages. Centralized error tracking/alerts remain deployment work.
- The worker expires active listings after 60 days and removes expired sessions/rate-limit records hourly. It does not yet process images or deliver push notifications.
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
