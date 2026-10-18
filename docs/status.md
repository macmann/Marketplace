# Implementation status

The supplied specification is the target product. The current build implements the core marketplace workflows and deployment foundation, with the following boundaries.

## Implemented

- SMTP email ownership verification, recovery using verified email, and email-only publishing when SMS is absent. Existing email addresses remain unverified until a real code is confirmed.

- Queued private image processing and automated review; regional/township selection with 15 states/regions, 74 districts and 330 historical townships; expanded Myanmar search and Burmese UI coverage. See `data/NOTICE.md` for reference licensing and dates.

- Responsive server-rendered marketplace, real empty states, categories, city/township location filters, condition and MMK price filters, price/date sorting, explicit SALE/FREE types, favorites, public seller profiles.
- Phone-first OTP sign-in/registration plus email/password sign-in, provider-backed phone linking, SMS password recovery for accounts with verified phones, logout from other devices, private account export, and confirmed account deletion. OTP challenges are single-use, purpose-bound, expire after 10 minutes, and allow five checks. Existing sessions are revoked on password reset/deletion. No production verification bypass exists.
- Publish 1–10 photos; MIME/decoded-image limits, 40 megapixel input cap, WebP conversion, orientation correction, metadata removal, persistent disk or private S3 storage. Maximum combined server-action request body: 25 MB, so ten images may need compression before upload.
- Private, manually saved drafts with incomplete forms and 0–10 photos; resume/discard through the account area. Verified phone or email is required when publishing. The shared editor adds/replaces/removes/reorders photos and chooses a cover image. Published edits require 1–10 photos. Optimistic revisions reject stale-tab overwrites. Reserve, mark sold, archive and validated renewal remain supported.
- Administrator-configured category fields (text, number, boolean, enum and date), inherited by subcategories, with required-field validation on publish/edit and display on listing details. Default optional fields are seeded idempotently after categories. Field category/key/type are immutable once created; labels, choices, required/enabled state and order can be updated.
- PostgreSQL Unicode/English case-insensitive substring search over title, description, category. Trigram index available for lookup performance. Location filtering includes descendants.
- Listing-linked private conversations, text messages, unread counters, read timestamps, block/unblock. Authenticated server-sent events update open inboxes/threads and unread notification counts. Older messages use cursor pagination. There is no WebSocket transport.
- Listing reports, basic admin metrics, user suspension/restoration, listing removal/restoration, report resolution, category hierarchy editing, location hierarchy editing, immutable-to-ordinary-users audit records for admin actions. Admin, reporting, status and notification controls have Burmese labels.
- SEO metadata, canonical listing URLs, structured listing data, sitemap, robots, web app manifest and icon.
- PostgreSQL-backed rate limits for auth, OTP, publishing, reports and messages; Next Server Action same-origin protection; server-side ownership/membership checks; opaque HttpOnly sessions; input validation and parameterized SQL.
- Docker/Coolify service configuration, transactional checksum-verified versioned migrations, reference-data seeding, BullMQ/Redis maintenance worker, health checks, example configuration and deployment notes.

## Required before a public launch

- Configure and validate at least one verification channel: SMTP email or Twilio SMS for Myanmar numbers. Phone-first sign-in and SMS recovery are implemented but live delivery remains unverified. SMTP email verification and email-based recovery are implemented; OAuth is not. A verified email can qualify posting without SMS. Live SMTP delivery still needs operator configuration and validation. Accounts without verified phones cannot use SMS recovery.
- Complete and review Burmese translations. Core, admin, reporting, notification and location controls have Burmese translations; some technical errors/provider codes still use English. Have native speakers review wording and search behavior.
- Review the licensed historical 330-township reference snapshot and local names; reconcile later administrative changes as a separate data update.
- Validate automated moderation against real abuse. Queued local text/fraud checks, exact/perceptual image duplicate signals, policy controls and audited human fallback are implemented. Optional OpenAI image classification needs an operator key/mode selection and live validation; default MANUAL never sends images externally.
- Temporary account deactivation and the remaining advanced admin modules are not implemented. Category-field filters, notifications, scoped SUPPORT/MODERATOR roles and administrator role management are implemented.
- Search includes ICU Myanmar word segmentation, high-confidence Zawgyi conversion, Myanmar digit normalization, curated bilingual synonyms/transliterations, title ranking, English trigram matching and approximate nearest-area ranking. Expand vocabulary from real queries; generic transliteration and precise routing/maps are not implemented.
- Asynchronous image variants, bounded retries and orphan cleanup are implemented. No CDN is configured; media stays behind authorization.
- Configure VAPID and validate background Web Push on target browsers. Transactional notifications, authenticated live SSE counters and opt-in browser alerts are implemented. Push retries/expiry handling are covered with an injected transport; real provider delivery is unverified.
- Validate PWA installation on target mobile browsers. A service worker, PNG icons, install control and static bilingual offline fallback are implemented. Offline submission/autosave recovery is not implemented; private content is never cached by the service worker.
- Configure production backup scheduling/encryption/off-site retention and external alert routing. Local-media backup/empty-target restore scripts, operational readiness/worker health, structured request-error logs, aggregate analytics, CSP/HSTS and an operations runbook are included. No claim of WCAG conformance, uptime, throughput or production latency targets is made; complete security/accessibility review and production-sized performance testing remain necessary.
- Continue adding new versioned migrations for schema changes, and extend CI security/migration coverage. The migration runner checks applied-file SHA-256 checksums and is tested for repeatability. Existing tests cover representative workflows, not the complete specification.

## Deliberately later

Offers, ratings, AI listing assistance, boosts, maps, integrated payments, escrow, delivery, business shops, subscriptions and native apps remain excluded from the first implementation. No user-facing fake implementations are provided.

## Validation boundaries

Browser tests use a temporary seller marked verified directly in the **test database**, not a production verification bypass. Live Twilio and optional S3 require credentials and are untested until configured. Coolify deployment/public HTTPS and restoration into a fresh cloud task must be validated independently after publication/deployment.

## Account lifecycle privacy

Deletion clears name/contact details/password, archives and scrubs listing text, removes authored message contents, revokes sessions/challenges, and removes favorites/blocks. Anonymous user/listing/conversation references, report reasons and audit events remain for transaction/moderation integrity. Physical image deletion is durable and retried by maintenance; it is not synchronous. Historical backups are governed by the operator’s retention policy. The UI explains these boundaries before confirmation. Deleted accounts cannot be restored through the admin suspension controls.

## Listing workflow boundaries

Drafts are stored separately from public listings, excluded from search/sitemaps/seller profiles, and their media is available only to the owner (including exclusion of other administrators). Saves are explicit; offline/autosave recovery is not implemented. Saving drafts does not require contact verification; publishing and editing live listings require verified phone or email. Category fields are exact typed values; exact typed filters are supported; attribute ranges and semantic filtering remain future search improvements. Small safe previews are generated at save time; larger variants and moderation run in the worker. Failed uploads are compensated, failed cleanup is queued, and maintenance sweeps old unattached objects. Account deletion scrubs drafts and category values and queues draft photos for deletion.

## Sprints 3–6 release

Category selection includes enabled descendants, and disabling an ancestor hides its descendants from public discovery, details, media and sitemap. Category-field filters preserve typed false and zero. Public feeds also check expiry even if a maintenance run is delayed.

Private notifications are created transactionally with messages and listing status updates, retained for 90 days, included in account export and removed on account deletion. Background push stores browser subscriptions only after opt-in; deletion removes subscriptions/outbox. Push messages contain generic English text, never message contents. Delivery is at-least-once and can duplicate after a worker crash.

Reports can target a listing, user or an incoming message; message reporting requires conversation membership. Duplicate open reports from one reporter are consolidated. Support resolves/dismisses reports; moderators also review listings/suspend ordinary users; administrators alone configure roles/reference data/policy/operations. Staff actions record reasons, and suspension/role changes revoke sessions. Last-administrator protection applies to role changes and deletion. Listings flagged or resubmitted after rejection stay private until reviewed; stale moderation revisions fail. Restoration preserves the pre-removal status, including SOLD, and legacy removals return to review.

See [operations.md](operations.md) for operational boundaries, push setup and a consistent database/media backup-and-restore workflow. Live Coolify deployment and external providers are not configured by these changes.
