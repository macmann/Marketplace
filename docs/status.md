# Implementation status

The supplied specification is the target product. This initial build implements a working vertical slice and deployment foundation, with the following boundaries.

## Implemented

- Responsive server-rendered marketplace, real empty states, categories, city/township location filters, condition and MMK price filters, price/date sorting, explicit SALE/FREE types, favorites, public seller profiles.
- Phone-first OTP sign-in/registration plus email/password sign-in, provider-backed phone linking, SMS password recovery for accounts with verified phones, logout from other devices, private account export, and confirmed account deletion. OTP challenges are single-use, purpose-bound, expire after 10 minutes, and allow five checks. Existing sessions are revoked on password reset/deletion. No production verification bypass exists.
- Publish 1–10 photos; MIME/decoded-image limits, 40 megapixel input cap, WebP conversion, orientation correction, metadata removal, persistent disk or private S3 storage. Maximum combined server-action request body: 25 MB, so ten images may need compression before upload.
- Seller listing editing (text/price/category/location/condition), reserve, mark sold, archive, renew expired listings. Uploaded photos currently cannot be replaced through the edit form.
- PostgreSQL Unicode/English case-insensitive substring search over title, description, category. Trigram index available for lookup performance. Location filtering includes descendants.
- Listing-linked private conversations, text messages, unread counters, read timestamps, block/unblock. Message display refreshes every eight seconds while the tab is visible; there is no WebSocket transport yet.
- Listing reports, basic admin metrics, user suspension/restoration, listing removal/restoration, report resolution, category hierarchy editing, location hierarchy editing, immutable-to-ordinary-users audit records for admin actions. Admin pages currently use English labels.
- SEO metadata, canonical listing URLs, structured listing data, sitemap, robots, web app manifest and icon.
- PostgreSQL-backed rate limits for auth, OTP, publishing, reports and messages; Next Server Action same-origin protection; server-side ownership/membership checks; opaque HttpOnly sessions; input validation and parameterized SQL.
- Docker/Coolify service configuration, transactional checksum-verified versioned migrations, reference-data seeding, BullMQ/Redis maintenance worker, health checks, example configuration and deployment notes.

## Required before a public launch

- Configure and validate real Twilio SMS delivery for Myanmar numbers. Phone-first sign-in and SMS recovery are implemented but live delivery remains unverified. Email verification, email-based password recovery and OAuth are not implemented. Accounts without verified phones cannot use SMS recovery.
- Complete and review Burmese translations. Core pages are translated, but some helper copy, server validation errors, admin labels and reporting reasons still use English. Have native speakers review wording and search behavior.
- Extend location reference data beyond the initial Yangon townships and Mandalay city. The schema supports the hierarchy, but the seed is not a complete Myanmar gazetteer.
- Add automated text/image moderation, spam/fraud rules and pre-publication review policy. Verified sellers' listings currently become ACTIVE immediately. Manual reporting/removal is available; this does not meet the specification's automated safety requirements.
- Implement dynamic category attributes, notification delivery, temporary account deactivation, and the remaining admin modules and moderator/support roles. Only USER and ADMIN roles exist initially.
- Add proper Myanmar tokenization, synonyms, typo tolerance, transliteration and relevance ranking. Substring search is functional but is not semantic search. There is no distance/nearest ranking.
- Add asynchronous image processing with thumbnail variants, retry/orphan cleanup, image moderation and a CDN policy; current image conversion occurs during publish.
- Add push notifications and WebSockets if live delivery is a launch requirement. Current unread inbox and polling do not fulfill the full push/in-app notification specification.
- Finish PWA offline/service-worker behavior and validate installability on target browsers. The manifest is a foundation only; authenticated content is not cached offline.
- Configure production backups, restore tests, error tracking, alerting, security headers/CSP tuned to deployment, performance budgets and a security/accessibility review. No claim of WCAG conformance, uptime, throughput or latency targets is made.
- Continue adding new versioned migrations for schema changes, and extend CI security/migration coverage. The migration runner checks applied-file SHA-256 checksums and is tested for repeatability. Existing tests cover representative workflows, not the complete specification.

## Deliberately later

Offers, ratings, AI listing assistance, boosts, maps, integrated payments, escrow, delivery, business shops, subscriptions and native apps remain excluded from the first implementation. No user-facing fake implementations are provided.

## Validation boundaries

Browser tests use a temporary seller marked verified directly in the **test database**, not a production verification bypass. Live Twilio and optional S3 require credentials and are untested until configured. Coolify deployment/public HTTPS and restoration into a fresh cloud task must be validated independently after publication/deployment.

## Account lifecycle privacy

Deletion clears name/contact details/password, archives and scrubs listing text, removes authored message contents, revokes sessions/challenges, and removes favorites/blocks. Anonymous user/listing/conversation references, report reasons and audit events remain for transaction/moderation integrity. Physical image deletion is durable and retried by maintenance; it is not synchronous. Historical backups are governed by the operator’s retention policy. The UI explains these boundaries before confirmation. Deleted accounts cannot be restored through the admin suspension controls.
