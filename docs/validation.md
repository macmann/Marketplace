# Validation performed in the cloud workspace

- Node 24 dependency installation completed with the lockfile.
- PostgreSQL 17 and Redis 7 started successfully through the development Compose file.
- Initial migration and reference-data seed commands succeeded repeatedly.
- Production Next.js build and TypeScript checks passed.
- Six domain tests passed (sale/giveaway validation, listing input rules, lifecycle restrictions, account validation, Myanmar search normalization).
- Three Playwright browser tests passed against both the development server and the production Docker container. The final production run completed in 18.8 seconds:
  1. Publish a real image, read the WebP result, edit a listing, search Burmese text, save a favorite, exchange buyer/seller messages, reject outsider conversation/edit access, submit a report, reserve and mark sold.
  2. Mobile viewport without horizontal overflow, language switching, and private-route redirects.
  3. Admin remove/restore, public visibility after removal, category creation, and audit records.
- A real BullMQ maintenance job consumed by the running worker expired an overdue PostgreSQL listing; its test records were removed.
- Production web and tools Docker images built successfully. The Compose stack's migration job exited zero, PostgreSQL/Redis/web became healthy, and worker startup completed.
- Runtime `/robots.txt` returned the smoke-test domain, not the build-time default.
- Prettier check passed and npm production dependency audit reported zero vulnerabilities. Sharp was updated to the patched 0.35.5 release.

Cloud image builds required forwarding the environment's existing HTTPS proxy and temporarily mounting its trusted CA through BuildKit's optional `proxy-ca` secret. No TLS or checksum verification was disabled and the certificate was not copied into the image. Coolify on an ordinary network uses the normal Compose build.

The production smoke test used isolated database/Redis/uploads volumes and local-only port overrides. It did not contact or deploy to Coolify. All browser accounts were temporary fixtures. Live Twilio delivery, S3, public HTTPS, load/performance budgets, complete Burmese localization, backups, accessibility conformance and fresh-task snapshot restoration are unverified. See status.md for product gaps.

## Account lifecycle phase

- Eleven unit tests passed, including Myanmar phone normalization, UTF-8 password limits, OTP formats, Twilio Verify request construction, missing configuration, provider failures and expired/pending verification responses.
- Eleven PostgreSQL integration tests passed. Coverage includes phone-first account creation/sign-in, phone linking, purpose/actor binding, single use, expiry, five-attempt limits, concurrent completion, suspended/unverified-account restrictions, password reset with session/challenge revocation, recent-auth deletion requirements, last-admin protection, anonymization and retryable image deletion.
- Migration tests used an isolated schema to verify adoption of the original schema without losing an existing account, repeated application, and rejection of an altered applied checksum. No applied source migration was changed for this test.
- Five Playwright journeys passed against the production Docker container (22.6 seconds), including account export, cross-device sign-out, stale-session deletion confirmation, deleted-account image access, and all existing marketplace/admin journeys.
- Production build, TypeScript, formatting and production dependency audit passed. Production web/tools images built, fresh-schema Compose migration and worker startup succeeded, and services became healthy.
- Twilio service tests use an injected provider/HTTP transport in tests only. There is no production bypass or fixed verification code. Live Myanmar SMS delivery remains unverified because no credentials were configured.

The account code adds no new third-party dependency or new secret requirement. Deploy web and worker with the migration job using the existing Coolify Compose configuration; back up the database first. Temporary production smoke-test resources are separate from development services.
