# ZaySine features · လုပ်ဆောင်ချက်များ

[English](#english) · [မြန်မာ](#myanmar) · [README](README.md) · [User guide / အသုံးပြုသူလမ်းညွှန်](USER_GUIDE.md)

<a id="english"></a>

## English

ZaySine (ဈေးဆိုင်, “shop”), by Flash Tech, is a local sale/free-giveaway marketplace. This document describes implemented behaviour. The [specification](docs/product-spec.md) is a broader target; [implementation status](docs/status.md) records detailed boundaries.

### Discovery and localization

- Public listings, category hierarchies, seller profiles and a dedicated free-items feed.
- English/Myanmar UI, MMK prices and English/Myanmar search with Myanmar digit normalization, curated bilingual vocabulary and English typo matching.
- Category, sale/free type, price, condition, region/location and supported typed category-field filters. Category/location descendants are included.
- Relevance/date/price sorting and approximate nearest-area ranking after selecting an area; signed-in favourites.
- Aligned desktop search rows and stacked phone controls. Historical reference coverage: 15 states/regions, 74 districts and 330 townships. This licensed 2019 snapshot is not a current-boundary or live-map guarantee; see [data notice](data/NOTICE.md).

### Accounts and verification

- Email/password registration/login; phone OTP registration/login when Twilio Verify is configured.
- SMTP email verification independently of SMS. Verified email **or** phone is required to publish.
- Recovery using a previously verified contact, through configured channels; password resets revoke existing sessions.
- Single-use, purpose-bound challenges with expiry, attempt limits and rate limiting. No fixed production code or verification bypass.
- Account data export, logout of other sessions and confirmed deletion. Separate phone/email badges do not expose contact addresses.
- Deletion removes/scrubs account content and queues media cleanup; limited references, reports/audit records and historical backups have retention boundaries described in [status](docs/status.md#account-lifecycle-privacy).

### Listings and images

- SALE/FREE listings with title, description, condition, category, location and MMK price where applicable.
- Private manual drafts with incomplete details and 0–10 photos, excluded from public search/profiles; draft content/media is owner-only.
- Published listings require 1–10 photos. Add, replace, remove, reorder and choose a cover photo.
- JPEG, PNG, WebP and AVIF uploads: up to 8 MB per image and 25 MB combined per save; decoded pixel limits also apply.
- Queued WebP variants, orientation correction, metadata removal, hashes, bounded retries and cleanup. Persistent local uploads or optional private S3-compatible storage.
- Inherited category-specific text, number, boolean, enum and date fields, including required-field checks on publication.
- Edit, reserve, mark sold, archive and renew eligible listings. Revision checks reject stale-tab overwrites.

### Messaging, notifications and safety

- Private listing-linked text conversations, unread indicators, read timestamps and paginated message history.
- Authenticated SSE updates for open inboxes/threads and notification counts; transactional account notifications.
- Optional opt-in background Web Push with generic content rather than private message text.
- Block/unblock; report listings, users or incoming messages; view report progress/resolutions.
- Server-side ownership/membership checks, rate limits and staff audit records. Processing/review gates keep unchecked submissions private.

### Moderation and staff

| Mode / role   | Behaviour                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MANUAL        | Default. Publications/edits remain private until image processing and moderator approval.                                                                                      |
| LOCAL         | Automatically clears clean submissions using deterministic text/fraud/duplicate rules; does not classify image meaning. Flags need review.                                     |
| OPENAI        | Optional external review of submitted text/sanitized images; requires a worker API key and admin-selected mode. Failures retry then require human review. Drafts are not sent. |
| Support       | Reviews/resolves reports within its permissions.                                                                                                                               |
| Moderator     | Also reviews listings and can suspend ordinary users within its permissions.                                                                                                   |
| Administrator | Manages staff roles, reference data, category fields, safety policy and operational views.                                                                                     |

Authorized staff can inspect media jobs/review history and retry failed work. Role changes/suspension revoke sessions; last-administrator protection applies. See [status](docs/status.md) for exact policy boundaries.

### Installation and offline behaviour

- Shopfront logo, warm cream/teal/terracotta/amber theme and original Flash Tech attribution.
- Top-right **Install app** button: native prompt when available, device instructions otherwise; hidden in installed standalone mode.
- PWA manifest, home-screen icons, Apple touch icon and bilingual static offline fallback.
- No service-worker caching of private pages/media. Offline private browsing, posting and autosave recovery are not supported.
- Install/Web Push depend on browser, OS, HTTPS and permissions. In-app browsers may require opening Safari/Chrome first.

### Integrations and operations

| Capability                  | Required configuration                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------- |
| Core app                    | PostgreSQL, Redis, web, worker, migrations/seeds, persistent media, correct public URL |
| Email verification/recovery | SMTP and permitted sender; real delivery validation                                    |
| Phone OTP/recovery          | Twilio Verify and delivery to intended numbers                                         |
| Browser push                | VAPID keys, worker, browser subscription/permission and supported device               |
| External review             | Worker `OPENAI_API_KEY` plus admin-selected OPENAI mode                                |
| Object storage              | Optional private S3 settings; persistent local uploads otherwise                       |

GitHub Actions publishes GHCR images; Coolify runs migrate/web/worker on application/shared networks, with external PostgreSQL/Redis. Included: health/readiness checks, worker/backlog indicators, versioned migrations, backup/empty-target restore scripts and runbooks. Operators must configure backup scheduling, protected off-site retention, external alerts and real-provider/device checks. See [deployment](docs/coolify.md) and [operations](docs/operations.md).

### Not implemented

Integrated payments, escrow, delivery, offers/negotiation workflows, ratings, paid boosts, subscriptions, AI listing-writing assistance, business storefront management, precise maps/routing and native mobile apps. “Shop” in the name does not imply multi-store management.

Verification proves control of a contact channel, not identity, item quality or transaction safety. Accessibility conformance and production capacity are not independently guaranteed.

<a id="myanmar"></a>

## မြန်မာ

Flash Tech မှ ဖန်တီးထားသော ZaySine (ဈေးဆိုင်) သည် ပစ္စည်းရောင်းချရန်နှင့် အခမဲ့ပေးရန် ဒေသတွင်းဈေးကွက်ဖြစ်သည်။ ဤစာမျက်နှာတွင် လက်ရှိအလုပ်လုပ်နေသော အချက်များကိုသာ ဖော်ပြထားပါသည်။ [မူလသတ်မှတ်ချက်](docs/product-spec.md) ပါ အချက်အားလုံး ပြီးစီးပြီဟု မဆိုလိုပါ။ [လက်ရှိအခြေအနေ](docs/status.md) တွင် ကန့်သတ်ချက်များကို ဖတ်နိုင်ပါသည်။

### ရှာဖွေခြင်းနှင့် ဘာသာစကား

- အကောင့်မဝင်ဘဲ ကြော်ငြာများ၊ အမျိုးအစားများ၊ ရောင်းသူစာမျက်နှာများနှင့် အခမဲ့ပစ္စည်းများကို ကြည့်နိုင်ပါသည်။
- မြန်မာ/အင်္ဂလိပ် UI၊ ကျပ်ငွေဈေးနှုန်း၊ မြန်မာဂဏန်းပါ ရှာဖွေမှု၊ ရွေးချယ်ထားသော ဘာသာနှစ်မျိုးဝေါဟာရများနှင့် အင်္ဂလိပ်စာလုံးပေါင်း အနည်းငယ်မှားမှုကို ကိုင်တွယ်နိုင်ပါသည်။
- အမျိုးအစား၊ ရောင်းရန်/အခမဲ့၊ ဈေးနှုန်း၊ အခြေအနေ၊ တိုင်း/ပြည်နယ်၊ နေရာနှင့် သတ်မှတ်ထားသော အမျိုးအစားဆိုင်ရာအချက်များဖြင့် စစ်ထုတ်နိုင်ပါသည်။ လက်အောက်ခံအမျိုးအစားနှင့် နေရာများပါ ထည့်သွင်းရှာဖွေပါသည်။
- ဆက်စပ်မှု၊ ရက်စွဲ၊ ဈေးနှုန်းနှင့် ရွေးထားသောဒေသအနီးစပ်ဆုံးအလိုက် စီနိုင်ပါသည်။ အကောင့်ဝင်ထားသူက အကြိုက်ဆုံးသိမ်းနိုင်ပါသည်။
- ကွန်ပျူတာတွင် အတန်းလိုက်၊ ဖုန်းတွင် တစ်ခုစီ အောက်သို့စီထားသော ရှာဖွေမှုကို သုံးထားပါသည်။ တိုင်း/ပြည်နယ် ၁၅ ခု၊ ခရိုင် ၇၄ ခု၊ သမိုင်းဆိုင်ရာမြို့နယ် ၃၃၀ ပါဝင်သည်။ ၂၀၁၉ ရည်ညွှန်းဒေတာဖြစ်၍ ယနေ့နယ်နိမိတ် သို့မဟုတ် လက်ရှိမြေပုံကို အာမခံမထားပါ။ [ဒေတာရင်းမြစ်](data/NOTICE.md) ကို ကြည့်ပါ။

### အကောင့်နှင့် အတည်ပြုခြင်း

- အီးမေးလ်/စကားဝှက်ဖြင့် အကောင့်ဖွင့်၊ ဝင်နိုင်ပါသည်။ Twilio Verify ရှိလျှင် ဖုန်း OTP ဖြင့်လည်း ဖွင့်/ဝင်နိုင်ပါသည်။
- SMS နှင့်သီးခြား SMTP အီးမေးလ်အတည်ပြုမှုကို သုံးနိုင်ပါသည်။ ကြော်ငြာထုတ်ဝေရန် ဖုန်း **သို့မဟုတ်** အီးမေးလ် အတည်ပြုရပါမည်။
- ယခင်က အတည်ပြုထားသော ဆက်သွယ်ရေးလမ်းကြောင်းဖြင့် စကားဝှက်ပြန်သတ်မှတ်နိုင်ပါသည်။ စနစ်တွင် ပြင်ဆင်ထားသောလမ်းကြောင်းသာ ရပါမည်။ ပြန်သတ်မှတ်ပြီးလျှင် ရှိပြီးသားဝင်ရောက်မှုများ ပယ်ဖျက်ပါသည်။
- ကုဒ်များတွင် သက်တမ်း၊ အကြိမ်ရေ၊ ရည်ရွယ်ချက်နှင့် တစ်ကြိမ်သာသုံးနိုင်မှု ကန့်သတ်ချက်များ ရှိပါသည်။ ပုံသေကုဒ်နှင့် အတည်ပြုမှုကျော်လွှားနည်း မရှိပါ။
- ဒေတာထုတ်ယူခြင်း၊ အခြားစက်များမှထွက်ခြင်း၊ အတည်ပြုချက်ဖြင့် အကောင့်ဖျက်ခြင်း ပါဝင်ပါသည်။ ဖုန်း/အီးမေးလ် badge က ဆက်သွယ်ရန်အချက်အလက်ကို အများသို့ မဖော်ပြပါ။
- အကောင့်ဖျက်ရာတွင် ဒေတာကို ဖယ်ရှား/ရှင်းလင်းပြီး ပုံဖယ်ရှားမှုကို နောက်ခံလုပ်ငန်းတွင် စီထားပါသည်။ အချို့ရည်ညွှန်းချက်၊ တိုင်ကြား/စစ်ဆေးမှတ်တမ်းနှင့် backup များတွင် သိမ်းဆည်းမှုကန့်သတ်ချက် ရှိပါသည်။ [အသေးစိတ်](docs/status.md#account-lifecycle-privacy) ကို ဖတ်ပါ။

### ကြော်ငြာနှင့် ဓာတ်ပုံ

- ရောင်းရန်/အခမဲ့၊ ခေါင်းစဉ်၊ အကြောင်းအရာ၊ အခြေအနေ၊ အမျိုးအစား၊ နေရာနှင့် လိုအပ်လျှင် ကျပ်ငွေဈေးနှုန်း ပါဝင်ပါသည်။
- မပြည့်စုံသေးသောအချက်နှင့် ပုံ ၀–၁၀ ပုံကို ကိုယ်တိုင် မူကြမ်းသိမ်းနိုင်ပါသည်။ မူကြမ်းသည် အများမြင်ရှာဖွေမှုတွင် မပါဝင်ဘဲ ပိုင်ရှင်သာ မူကြမ်း/ပုံများကို ကြည့်နိုင်ပါသည်။
- ထုတ်ဝေရာတွင် ပုံ ၁–၁၀ ပုံ လိုအပ်ပါသည်။ ပုံထည့်၊ အစားထိုး၊ ဖယ်ရှား၊ အစီအစဉ်ပြောင်းနှင့် မျက်နှာဖုံးပုံရွေးနိုင်ပါသည်။
- JPEG၊ PNG၊ WebP၊ AVIF ကို လက်ခံပါသည်။ တစ်ပုံ 8 MB အထိ၊ တစ်ကြိမ်သိမ်းရာတွင် စုစုပေါင်း 25 MB အထိဖြစ်ပြီး pixel ကန့်သတ်ချက်လည်း ရှိပါသည်။
- နောက်ခံလုပ်ငန်းက WebP အရွယ်အစားများပြုလုပ်၊ ပုံလှည့်မှန်စေ၊ metadata ဖယ်ရှား၊ hash ပြုလုပ်၊ မအောင်မြင်မှု ပြန်ကြိုးစား၊ မလိုအပ်သောဖိုင်များ ရှင်းလင်းပေးပါသည်။ Persistent local storage သို့မဟုတ် private S3 ကို သုံးနိုင်ပါသည်။
- အမျိုးအစားအလိုက် စာသား၊ နံပါတ်၊ ဟုတ်/မဟုတ်၊ ရွေးချယ်စရာနှင့် ရက်စွဲအချက်များကို လက်အောက်အမျိုးအစားများသို့ ဆက်ခံသတ်မှတ်နိုင်ပြီး ထုတ်ဝေရာတွင် မဖြစ်မနေဖြည့်ရမည့်အချက်ကို စစ်ဆေးပါသည်။
- ပြင်ဆင်၊ ခေတ္တယူထား၊ ရောင်းပြီး၊ သိမ်းဆည်းပိတ်ထားနှင့် ခွင့်ပြုထားသောကြော်ငြာ သက်တမ်းတိုးနိုင်ပါသည်။ Tab ဟောင်းမှ ပြင်ဆင်ချက်ဖြင့် အသစ်ကို တိတ်တဆိတ် မရေးထပ်ပါ။

### စာပို့ခြင်း၊ အသိပေးချက်နှင့် လုံခြုံရေး

- ကြော်ငြာနှင့်ချိတ်ထားသော သီးသန့်စာသားစကားဝိုင်း၊ မဖတ်ရသေးအမှတ်၊ ဖတ်ပြီးချိန်နှင့် စာဟောင်းများ အဆင့်ဆင့်ကြည့်ခြင်း ပါဝင်ပါသည်။
- ဖွင့်ထားသော inbox/စကားဝိုင်းနှင့် အသိပေးချက်အရေအတွက်ကို အကောင့်အတည်ပြုထားသော SSE ဖြင့် အချိန်နှင့်တစ်ပြေးညီ ပြောင်းလဲပေးပါသည်။
- ခွင့်ပြုထားသူများအတွက် နောက်ခံ Web Push ကို ရွေးချယ်ပြင်ဆင်နိုင်ပါသည်။ Push တွင် ကိုယ်ရေးစာသားအကြောင်းအရာကို မထည့်ပါ။
- အသုံးပြုသူပိတ်/ပြန်ဖွင့်၊ ကြော်ငြာ/အသုံးပြုသူ/ဝင်လာသောစာ တိုင်ကြား၊ တိုင်ကြားမှုအခြေအနေနှင့် ရလဒ်ကြည့်နိုင်ပါသည်။
- ပိုင်ဆိုင်မှု၊ စကားဝိုင်းအဖွဲ့ဝင်ဖြစ်မှု၊ အကြိမ်ရေနှင့် ဝန်ထမ်းမှတ်တမ်းတို့ကို ဆာဗာတွင် စစ်ဆေးပါသည်။ ပုံပြုပြင်/စိစစ်မှု မပြီးသောတင်သွင်းမှုကို အများမမြင်နိုင်ပါ။

### စိစစ်မှုနှင့် ဝန်ထမ်းများ

| ပုံစံ / အခန်းကဏ္ဍ | လုပ်ဆောင်ပုံ                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MANUAL            | မူလသတ်မှတ်ချက်။ ပုံပြုပြင်ပြီး စိစစ်သူအတည်ပြုမချင်း အသစ်/ပြင်ဆင်မှုကို အများမမြင်နိုင်ပါ။                                                                                               |
| LOCAL             | စာသား၊ မသမာမှု၊ ထပ်တူဆိုင်ရာ စည်းမျဉ်းများဖြင့် သန့်ရှင်းသောတင်သွင်းမှုကို အလိုအလျောက်ခွင့်ပြုနိုင်သည်။ ပုံ၏အဓိပ္ပာယ်ကို AI ဖြင့် နားလည်ခွဲခြားခြင်းမဟုတ်ပါ။ သံသယရှိလျှင် လူကစိစစ်ရသည်။ |
| OPENAI            | Worker API key နှင့် admin ရွေးချယ်မှုလိုအပ်သည်။ တင်သွင်းစာသား/ပြုပြင်ပြီးပုံကို ပြင်ပသို့ပို့စိစစ်သည်။ မအောင်မြင်လျှင် ပြန်ကြိုးစားပြီး လူကစိစစ်ရသည်။ မူကြမ်းကို မပို့ပါ။              |
| Support           | ခွင့်ပြုထားသော တိုင်ကြားမှုကို စိစစ်/ဖြေရှင်းနိုင်သည်။                                                                                                                                  |
| Moderator         | ထို့အပြင် ကြော်ငြာစိစစ်၊ သာမန်အသုံးပြုသူ ယာယီပိတ်ခြင်းကို ခွင့်ပြုချက်အတွင်း ဆောင်ရွက်နိုင်သည်။                                                                                         |
| Administrator     | ဝန်ထမ်းခွင့်၊ ရည်ညွှန်းဒေတာ၊ အမျိုးအစားအချက်၊ စိစစ်မူဝါဒနှင့် လုပ်ငန်းအခြေအနေကို စီမံသည်။                                                                                               |

ခွင့်ရှိဝန်ထမ်းက ပုံလုပ်ငန်း/စိစစ်မှတ်တမ်း ကြည့်ပြီး မအောင်မြင်မှုကို ပြန်ကြိုးစားနိုင်ပါသည်။ ရာထူးပြောင်းခြင်း/ယာယီပိတ်ခြင်းက ဝင်ရောက်မှုများကို ပယ်ဖျက်ပါသည်။ နောက်ဆုံး administrator ကို မတော်တဆဖယ်ရှားခြင်းမှ ကာကွယ်ထားပါသည်။

### ထည့်သွင်းခြင်းနှင့် offline

- ဆိုင်မျက်နှာစာ logo၊ cream/teal/terracotta/amber အရောင်များနှင့် မူရင်း Flash Tech logo ပါဝင်ပါသည်။
- ညာဘက်အပေါ် **Install app** က ရရှိလျှင် native prompt ကို ဖွင့်ပြီး မရလျှင် စက်အလိုက်လမ်းညွှန်ပြသည်။ ထည့်သွင်းပြီး standalone အဖြစ်ဖွင့်ထားလျှင် မပြပါ။
- PWA manifest၊ home-screen/Apple icon နှင့် ဘာသာနှစ်မျိုး static offline စာမျက်နှာ ပါဝင်ပါသည်။
- ကိုယ်ပိုင်စာမျက်နှာ/ပုံများကို service worker က cache မလုပ်ပါ။ Offline ကိုယ်ပိုင်ဒေတာကြည့်ခြင်း၊ ကြော်ငြာပို့ခြင်း၊ autosave ပြန်ယူခြင်း မရှိပါ။
- Install/Push ရရှိမှုသည် browser၊ OS၊ HTTPS နှင့် ခွင့်ပြုချက်အပေါ် မူတည်သည်။ အခြားအက်ပ်အတွင်းမှ ဖွင့်ထားလျှင် Safari/Chrome ကို အရင်ပြောင်းဖွင့်ရနိုင်ပါသည်။

### ပြင်ဆင်ရမည့် ဝန်ဆောင်မှုနှင့် လုပ်ငန်းလည်ပတ်မှု

| လုပ်ဆောင်ချက်                 | လိုအပ်ချက်                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------- |
| အခြေခံစနစ်                    | PostgreSQL၊ Redis၊ web၊ worker၊ migration/seed၊ persistent media၊ public URL |
| အီးမေးလ်အတည်ပြု/ပြန်လည်ရယူမှု | SMTP၊ ပို့ခွင့်ရှိ sender နှင့် အမှန်တကယ်ပို့စမ်းသပ်မှု                      |
| ဖုန်း OTP/ပြန်လည်ရယူမှု       | Twilio Verify နှင့် ရည်ရွယ်ထားသောနံပါတ်သို့ ပို့နိုင်မှု                     |
| Browser Push                  | VAPID key၊ worker၊ browser subscription/permission နှင့် ပံ့ပိုးသောစက်       |
| ပြင်ပစိစစ်မှု                 | Worker `OPENAI_API_KEY` နှင့် admin ရွေးထားသော OPENAI mode                   |
| Object storage                | ရွေးချယ်နိုင်သော private S3၊ မသုံးလျှင် persistent local uploads             |

GitHub Actions က GHCR image များထုတ်ပေးပြီး Coolify တွင် migrate/web/worker ကို application/shared network များဖြင့် လည်ပတ်စေပါသည်။ PostgreSQL/Redis သည် ပြင်ပ shared resource များဖြစ်သည်။ Health/readiness၊ worker/backlog အခြေအနေ၊ versioned migration၊ backup/empty-target restore script နှင့် runbook ပါဝင်ပါသည်။ Backup အချိန်ဇယား၊ လုံခြုံသော off-site သိမ်းဆည်းမှု၊ ပြင်ပ alert နှင့် provider/စက်အမှန်စမ်းသပ်မှုတို့ကို အော်ပရေတာက ဆောင်ရွက်ရပါမည်။ [Deploy](docs/coolify.md) နှင့် [operations](docs/operations.md) ကို ဖတ်ပါ။

### မပါဝင်သေးသောအချက်များ

ပလက်ဖောင်းအတွင်း ငွေပေးချေမှု၊ escrow၊ ပို့ဆောင်မှု၊ ဈေးညှိကမ်းလှမ်းမှု workflow၊ rating၊ အခပေး boost၊ subscription၊ AI ကြော်ငြာစာရေးခြင်း၊ လုပ်ငန်းဆိုင်မျက်နှာစာစီမံမှု၊ တိကျမြေပုံ/လမ်းညွှန်နှင့် native mobile app မပါဝင်သေးပါ။ “ဈေးဆိုင်” အမည်က ဆိုင်များစွာစီမံနိုင်ကြောင်း မဆိုလိုပါ။

အတည်ပြုအမှတ်သည် ဆက်သွယ်ရေးလမ်းကြောင်းကို အသုံးပြုနိုင်ကြောင်းသာ ဖော်ပြပြီး တရားဝင်အထောက်အထား၊ ပစ္စည်းအရည်အသွေးနှင့် အရောင်းအဝယ်လုံခြုံမှုကို အာမခံခြင်းမဟုတ်ပါ။ Accessibility စံနှုန်းပြည့်မီမှုနှင့် ထုတ်လုပ်ရေးစွမ်းဆောင်ရည်ကို သီးခြားအာမခံမထားပါ။
