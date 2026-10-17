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
