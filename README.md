<p align="center"><img src="public/icon-512.png" width="112" height="112" alt="ZaySine shopfront logo"></p>
<h1 align="center">ZaySine · ဈေးဆိုင်</h1>
<p align="center">Buy. Sell. Give away. · ဝယ်မယ်။ ရောင်းမယ်။ အခမဲ့ပေးမယ်။</p>
<p align="center">by <img src="public/flash-tech-wordmark.svg" width="144" height="18" alt="Flash Tech"></p>

ZaySine is a local marketplace for Myanmar: discover useful things nearby, sell secondhand items and give items a new home. It supports English/Myanmar interfaces, MMK prices, regional/township discovery, private messaging and contact verification. The responsive web app can be installed on supported phones and computers.

**မြန်မာမိတ်ဆက်။** ZaySine (ဈေးဆိုင်) သည် အနီးအနားရှိ ပစ္စည်းများကို ရှာဖွေဝယ်ယူ၊ ရောင်းချ၊ အခမဲ့ပေးနိုင်သော မြန်မာနိုင်ငံအတွက် ဈေးကွက်ပလက်ဖောင်းဖြစ်သည်။ မြန်မာ/အင်္ဂလိပ် ဘာသာစကား၊ ကျပ်ငွေဈေးနှုန်း၊ တိုင်း/ပြည်နယ်နှင့် မြို့နယ်အလိုက် ရှာဖွေခြင်း၊ သီးသန့်စာပို့ခြင်းနှင့် ဖုန်း သို့မဟုတ် အီးမေးလ် အတည်ပြုခြင်းတို့ ပါဝင်သည်။

Core workflows are implemented and tested. Live providers, production infrastructure, backups and device installation still require operator validation. ZaySine does not process payments, escrow or delivery.

## Documentation

| Document                                                                                              | Contents                                                               |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [Features — English](FEATURES.md#english) · [လုပ်ဆောင်ချက်များ — မြန်မာ](FEATURES.md#myanmar)         | Implemented features, integrations and limits                          |
| [User guide — English](USER_GUIDE.md#english) · [အသုံးပြုသူလမ်းညွှန် — မြန်မာ](USER_GUIDE.md#myanmar) | Accounts, posting, search, messaging, installation and troubleshooting |
| [Coolify deployment](docs/coolify.md)                                                                 | Shared services, prebuilt images, networking, SMTP and rollout         |
| [Operations runbook](docs/operations.md)                                                              | Health, alerts, push, backups, restore and incident handling           |
| [Implementation status](docs/status.md)                                                               | Detailed scope and launch requirements                                 |
| [Validation](docs/validation.md)                                                                      | Testing evidence and boundaries                                        |
| [Branding](docs/branding.md)                                                                          | Logo source, exports, colours and Flash Tech attribution               |
| [Product specification](docs/product-spec.md)                                                         | Target specification; not all items are implemented                    |
| [Location data notice](data/NOTICE.md)                                                                | Sources, licensing and historical coverage                             |

## Main capabilities

- Public sale/free listings, category hierarchies, seller profiles, favourites and location/price/condition filters.
- English/Myanmar search, Myanmar digit normalization, curated bilingual vocabulary, English typo matching and approximate nearest-area ranking.
- Email/password and optional phone OTP sign-in; SMTP email verification works independently of SMS. Verified phone **or** email is required to publish.
- Private manual drafts, 1–10 photos for published listings, typed category fields, edits, reservation, sold/archive states and eligible renewal.
- Private listing conversations, live inbox updates, optional Web Push, blocking and reports.
- Queued image processing/review, scoped support/moderator/admin roles, operational health and audit records.
- Responsive layouts, install button, app icons and a static bilingual offline fallback.

**MANUAL moderation is the default.** Publication depends on processing and the selected review policy; a submitted item is not necessarily public immediately. See [FEATURES.md](FEATURES.md).

## Technology and architecture

| Layer           | Implementation                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Web             | Next.js App Router, React, TypeScript; Node.js 24                                                  |
| Database        | PostgreSQL; checksum-verified versioned transactional migrations                                   |
| Background work | Separate worker; Redis/BullMQ maintenance scheduling; database-backed media/review and push work   |
| Media           | Sharp, sanitized WebP variants; persistent local uploads or optional private S3-compatible storage |
| Live updates    | Authenticated Server-Sent Events (SSE); optional background Web Push                               |
| Delivery        | Optional SMTP and Twilio Verify                                                                    |
| Deployment      | GitHub Actions → GHCR prebuilt images → Docker Compose on Coolify                                  |

Production runs **migrate**, **web** and **worker**. Migration/seed must succeed before web/worker start. PostgreSQL/Redis are existing external resources. Web and worker share persistent media storage. Only web needs a public domain. The service worker caches a static shell, not account pages, conversations or private media; offline posting/autosave recovery is not implemented.

## Local development

Requires Node.js **24**, npm, Docker with Compose and an absolute writable upload directory. Chromium is needed for browser tests. Live provider credentials are needed only for real delivery testing.

```sh
npm ci
# New checkout only: preserve existing configuration.
test -f .env || cp .env.example .env
docker compose -f compose.dev.yaml up -d --wait
```

Edit `.env` for local development:

```dotenv
DATABASE_URL=postgresql://marketplace:marketplace@localhost:5432/marketplace
REDIS_URL=redis://localhost:6379/0
APP_URL=http://localhost:3000
COOKIE_SECURE=false
UPLOAD_DIR=/absolute/path/to/zaysine-uploads
```

These credentials belong only to the loopback-bound development services. Use separate production credentials. Never commit `.env` or paste secrets into issues/chat.

```sh
npm run db:migrate
npm run db:seed
npm run dev
# In a second terminal, from the same directory:
npm run worker
```

Open `http://localhost:3000`. Scripts load `.env` when present; injected variables take precedence. Reference seeds are repeatable and preserve existing records. No sample users/listings are automatically created. Set `ADMIN_EMAIL`/`ADMIN_PASSWORD` before seeding only to bootstrap an initial administrator; existing accounts are not promoted/reset. Stop local services with `docker compose -f compose.dev.yaml down`; preserve the named database volume to keep data.

## Configuration

See [.env.example](.env.example) and [Coolify configuration](docs/coolify.md) for complete details.

| Purpose         | Variables / notes                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------- |
| Core            | `DATABASE_URL`, `REDIS_URL`, `APP_URL`; production `COOKIE_SECURE=true` behind HTTPS                |
| Shared services | `COOLIFY_NETWORK` defaults to `coolify`; distinct `REDIS_KEY_PREFIX` for separate apps/environments |
| Images          | `MARKETPLACE_WEB_IMAGE`, `MARKETPLACE_TOOLS_IMAGE`; pin matching published `sha-<full-commit>` tags |
| Initial admin   | `ADMIN_EMAIL`, `ADMIN_PASSWORD`; remove bootstrap password after success                            |
| Email           | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`                 |
| SMS             | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`                              |
| Web Push        | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`                                            |
| External review | Worker-only `OPENAI_API_KEY`, plus administrator-selected OPENAI mode                               |
| Optional S3     | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`                 |
| Media           | `UPLOAD_DIR`; production fixes this to the persistent `/app/uploads` mount                          |

SMTP 587 uses required STARTTLS; 465 normally uses implicit TLS. `EMAIL_FROM` must be a permitted bare sender address. Supply SMTP username/password together when required. Email verification can replace SMS for publishing. If neither delivery channel is configured, verification cannot be bypassed.

## Coolify deployment

1. Prepare the existing PostgreSQL database/application role and shared Redis resource. Follow [permissions and cutover guidance](docs/coolify.md).
2. Keep shared resources on the existing Docker network. Compose explicitly attaches **all three** app services to the external shared network and the application network.
3. Wait for GitHub **Publish images** to succeed, configure GHCR pull access if needed and pin matching web/tools image tags.
4. Create/update a repository-based Compose application using `/compose.yaml`. Supply runtime variables and desired integrations.
5. Route HTTPS to **web:3000**, set `APP_URL` accordingly and preserve the uploads volume.
6. For an existing application, click **Reload Compose**, review **Show Deployable Compose**, then deploy. Migration must exit successfully.
7. Check `/api/health` and `/api/ready`; test real contact verification, posting, moderation, recovery and media.

Production pulls images rather than building on the VPS; “No services to build” is expected. It does not create PostgreSQL/Redis copies. Deploy after both image publications complete. Back up database and uploads together before deleting/recreating resources. Do not delete shared-service or media volumes during upgrades.

## Tests and validation

Use a **dedicated test database**, migrated and seeded. Integration/browser tests write records, create privileged fixtures, change moderation settings and delete accounts. Never point them at production. Follow [validation notes](docs/validation.md).

```sh
npm run format:check
bash -n scripts/ops/*.sh
npm test
npm run test:integration
npm run build
npm run typecheck
```

Run web, worker, PostgreSQL and Redis against that test environment, then `npm run test:e2e`. Playwright defaults to `/usr/bin/chromium`; `CHROMIUM_PATH` selects another executable and `TEST_BASE_URL` selects the running server. To use Playwright's downloaded browser:

```sh
npx playwright install --with-deps chromium
export CHROMIUM_PATH="$(node --input-type=module -e "import {chromium} from '@playwright/test';console.log(chromium.executablePath())")"
npm run test:e2e
```

Tests cover representative marketplace, verification/recovery, privacy, moderation, search, responsive and PWA flows. Injected provider transports do not establish real SMTP/SMS/push delivery or production capacity. GitHub Actions runs the configured CI checks for each change.

## Operations and limits

- `/api/health`: web/database/schema availability. `/api/ready`: also requires a recent worker heartbeat. Admin → Operations shows backlog and worker indicators.
- Schedule database/media backups, protect off-site retention and rehearse an empty-target restore using the [operations runbook](docs/operations.md).
- Validate public HTTPS, provider delivery, mail sender authentication, moderation staffing, target devices and production-sized performance/accessibility before broad launch.
- Verification proves control of a contact channel, not legal identity, item quality or transaction safety. Meet publicly and inspect items before payment.
- Integrated payments, escrow, delivery, offers, ratings, paid boosts, subscriptions, AI listing-writing assistance, business storefront management, precise maps/routing and native apps are not implemented.
- Location data is a licensed historical snapshot; nearest-area results are approximate, not GPS directions. See [attribution](data/NOTICE.md).

## Repository map

| Path       | Purpose                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| `app/`     | Pages, server actions, media/health/export handlers, responsive UI         |
| `lib/`     | Auth, permissions, marketplace services, validation, storage, translations |
| `scripts/` | Migration, seeds, worker, benchmarking, backup/restore helpers             |
| `tests/`   | Unit, PostgreSQL integration and browser checks                            |
| `public/`  | Logos, app icons, service worker and offline page                          |
| `design/`  | Original ZaySine logo source                                               |
| `data/`    | Location reference data and notices                                        |
| `docs/`    | Deployment, operations, scope, validation and branding                     |

Follow [AGENTS.md](AGENTS.md) and the installed Next.js documentation when changing code. Preserve applied migrations; add a new versioned migration for schema changes. Keep secrets and personal data out of commits/diagnostics. Brand assets and palette are documented in [branding.md](docs/branding.md).

## မြန်မာဘာသာဖြင့် စတင်အသုံးပြုရန်

1. အကောင့်မဝင်ဘဲ ပစ္စည်းများကို ကြည့်ရှု၊ တိုင်း/ပြည်နယ်၊ မြို့နယ်၊ အမျိုးအစားနှင့် ဈေးနှုန်းတို့ဖြင့် ရှာဖွေနိုင်ပါသည်။
2. ကြော်ငြာတင်၊ စာပို့၊ အကြိုက်ဆုံးသိမ်းရန် အကောင့်ဝင်ပါ။ ကြော်ငြာထုတ်ဝေရန် ဖုန်း **သို့မဟုတ်** အီးမေးလ် အတည်ပြုရပါမည်။
3. SMS မရှိလျှင် SMTP အီးမေးလ်အတည်ပြုမှုကို သီးခြားသုံးနိုင်ပါသည်။ နှစ်ခုစလုံးမရှိလျှင် အတည်ပြုမှုကျော်၍ မထုတ်ဝေနိုင်ပါ။
4. ပုံ ၁–၁၀ ပုံဖြင့် ရောင်းရန်/အခမဲ့ပေးရန် တင်နိုင်ပါသည်။ စိစစ်မှုမပြီးသော ကြော်ငြာများသည် အများမမြင်နိုင်ပါ။
5. **Install app** ခလုတ်ကို သုံးပါ။ iPhone/iPad တွင် Safari → Share → Add to Home Screen ဖြင့် ထည့်သွင်းနိုင်ပါသည်။

အသေးစိတ်အတွက် [လုပ်ဆောင်ချက်များ](FEATURES.md#myanmar) နှင့် [အသုံးပြုသူလမ်းညွှန်](USER_GUIDE.md#myanmar) ကို ဖတ်ပါ။ ပလက်ဖောင်းအတွင်း ငွေပေးချေမှု၊ escrow နှင့် ပို့ဆောင်ရေး မပါဝင်ပါ။
