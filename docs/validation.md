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

## Listing workflow phase

- Fourteen unit tests passed, including incomplete drafts, FREE price canonicalization, typed attributes (including false/zero and leap dates), foreign/duplicate photo IDs and photo limits.
- Twenty PostgreSQL integration tests passed. New cases cover draft ownership, unverified draft saving, verified publication, inherited required fields, atomic photo transfer/order/replacement, stale revision rejection, failed-upload compensation, durable cleanup retries, discard ownership, and validated renewal. Account deletion tests now include private drafts and their photos. Migration tests include all three migrations on an isolated original schema.
- All seven browser journeys passed against the production Docker container (37.9 seconds). They cover the previous account/marketplace/admin journeys and new draft resume/discard, actual private-photo authorization (including non-owner admins), two-tab conflicts, typed fields, phone gating, publication, photo cover/order/replacement, and category-field administration.
- Build, TypeScript and formatting checks passed; production dependency audit reported zero vulnerabilities. Final web/tools images built with TLS verification enabled, and a fresh Compose database applied migrations 000/001/002 before successful reference-data seeding and healthy web/worker startup.
- The temporary production test stack was removed afterward. Development services and repository data were preserved. No live SMS, optional S3 or public Coolify deployment was tested.

## Combined marketplace, messaging, safety and operations release

New coverage exercises NFC-normalized mixed-language searches, descendant categories and disabled ancestors, typed false/zero filters, English typo matching, common bilingual synonyms, private review routing, duplicate publication, rejected-listing resubmission, stale staff revisions, status-preserving restoration, message-report membership, duplicate report consolidation, scoped staff permissions, session revocation, report outcomes and transactional notification/outbox writes. Push tests inject delivery success/failure/410 responses; they do not contact browser push providers.

Browser coverage adds real cross-context inbox updates through authenticated SSE, scoped report forms, support/admin boundaries, staff role changes and last-admin protection, category filters and static-only PWA offline behavior. Operator scripts refuse active writers, a nonempty restore database or a nonempty uploads target. Final validation results and restore evidence are recorded after the isolated container drill below.

Final release checks passed:

- 17 unit + 26 PostgreSQL integration + 12 Playwright browser tests (**55 tests**). The browser suite passed against the final production Docker runner in 47.9 seconds. Its override shares a temporary uploads directory with fixture writers; the separate restore drill uses the actual named-volume topology.
- Production runner/tools image builds, TypeScript, formatting, migration repeatability/original-schema adoption, shell syntax checks and production dependency audit (zero vulnerabilities).
- Fresh Compose PostgreSQL/Redis/migrations/seed/web/worker startup and successful `/api/health` + `/api/ready`. Worker deletion was observed from web on both the shared fixture mount and the restored deployment's named uploads volume.
- Backup rejected active writers. With writers stopped, the scripts produced a checksummed PostgreSQL custom dump and uploads archive, restored them into a separate empty project, preserved a fixture account/listing and the exact SHA-256 of a real WebP, and served the restored listing/media successfully over HTTP. Restore refused a second run against the nonempty target.
- A stopped worker with an expired heartbeat made `/api/ready` return 503 while `/api/health` stayed 200. Both isolated smoke projects and their test volumes were removed after verification; development PostgreSQL/Redis were preserved.
- A small 40-request/four-concurrent local search HTTP smoke had zero failures, p50 58 ms and p95 332 ms on this sparse test database. This is not a production-sized search or capacity benchmark.

Real VAPID provider delivery, Myanmar SMS delivery, S3 snapshots, Coolify/public HTTPS, browser installation on physical phones, production alert routing/encrypted backup scheduling and formal security/accessibility review remain deployment validation work. No live production service was contacted or deployed.

## Media automation and Myanmar discovery phase

- 22 unit and 32 PostgreSQL integration tests passed. New checks exercise actual Sharp variants/orientation/metadata stripping (including transparent images), strict provider requests and failures, queue leases/retries, fail-closed publication, late results, policy changes during checks, private staging cleanup and paginated orphan cleanup. Account deletion also scrubs the new normalized search columns.
- All 15 browser journeys passed against a production server and an isolated fresh Docker Compose stack. New journeys cover manual moderation with real processed photos, authorization and revocation for every image size, support-role restrictions, unspaced Burmese queries, legacy-location ancestry, nearest ranking and Burmese locale persistence.
- Production runner/tools images built, fresh migrations 008/009 and idempotent reference seeding succeeded, and web readiness/worker health passed. Existing development data was kept separate from disposable QA volumes.
- TypeScript, formatting, production build and production dependency audit passed (zero reported vulnerabilities).

External OpenAI calls are tested with injected HTTP transport, not a live API key. Default policy is MANUAL; LOCAL has no semantic image classifier. Private S3 integration and public Coolify deployment remain unverified. Reference data is a licensed historical 330-township snapshot with approximate centers, not a current boundary registry; native review of names/translations and real-query search evaluation remain required. No CDN or precise geolocation tracking was added.
