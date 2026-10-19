# ZaySine user guide · အသုံးပြုသူလမ်းညွှန်

[English](#english) · [မြန်မာ](#myanmar) · [README](README.md) · [Features / လုပ်ဆောင်ချက်များ](FEATURES.md)

The paths below are relative to your operator's ZaySine website. Menu labels change with the selected language. Some functions require operator configuration or a staff role.

အောက်ပါလမ်းကြောင်းများသည် သင်သုံးနေသော ZaySine website အောက်ရှိ လမ်းကြောင်းများဖြစ်သည်။ ရွေးထားသောဘာသာအလိုက် မီနူးစာသားကွာနိုင်ပါသည်။ အချို့လုပ်ဆောင်ချက်များတွင် အော်ပရေတာပြင်ဆင်မှု သို့မဟုတ် ဝန်ထမ်းခွင့် လိုအပ်ပါသည်။

<a id="english"></a>

## English

### 1. Start browsing and choose a language

Open the homepage `/`. You can browse without an account. Use the header language button to switch between English and Myanmar. On phones, the bottom navigation offers Discover, Saved, Sell and Messages. The header includes ZaySine by Flash Tech and an install action.

Useful pages:

| Page                                 | Path                                                                |
| ------------------------------------ | ------------------------------------------------------------------- |
| Discover / free items                | `/` / `/free`                                                       |
| Sign in / create account / recover   | `/login` / `/register` / `/recover`                                 |
| Verify a contact                     | `/verify`                                                           |
| Create a listing                     | `/sell`                                                             |
| Account / settings                   | `/account` / `/account/settings`                                    |
| Your listings / drafts / saved items | `/account/listings` / `/account/drafts` / `/account/favorites`      |
| Messages / notifications / reports   | `/account/messages` / `/account/notifications` / `/account/reports` |
| Marketplace safety                   | `/safety`                                                           |

### 2. Create an account or sign in

**Email/password:** choose Create account, enter a display name, email and password, then submit. Passwords require at least 12 characters and must fit the stated maximum, including the 72-byte UTF-8 limit. Use the email/password form to sign in later.

**Phone OTP:** if available, choose phone sign-in, enter your Myanmar mobile number (`09…` or `+959…`), request a code and enter the code received. Follow the page prompts to finish sign-in/registration. SMS availability depends on the configured provider and delivery to your number.

Registration/sign-in alone does not guarantee publishing permission. Verify a phone or email before publishing. Public badges distinguish the two; they do not establish a seller's identity or trustworthiness.

### 3. Verify email or phone

1. Sign in and open `/verify`, or follow the verification link in account settings.
2. Choose an available contact channel. To verify email, request the code sent to your account email. A phone-only account can add its first recovery email; recent sign-in or current-password confirmation may be required.
3. Check your inbox/spam folder or SMS messages. Enter the newest code and confirm.
4. Check that the account shows the appropriate verified indicator.

Codes expire after 10 minutes, allow a limited number of checks and work once. Resending invalidates older codes. Email codes are six digits. Never share codes or passwords.

**SMS is not required if email is verified.** SMTP must be configured for real email delivery. If neither channel is available, ask the operator to configure one; save a draft meanwhile. Replacing an existing login email is not currently a self-service workflow.

### 4. Search for an item

1. Enter a word or phrase on Discover. Select a category if needed.
2. Choose State/region, type into Search townships to narrow the location choices, then select a location. A township search narrows the selector; select a result to apply that specific place.
3. Expand Sort & Price to set minimum/maximum MMK price, sort order, condition and sale/free type where available. Category-specific filters appear when relevant.
4. Press the search button to apply the form. Use `/free` for giveaway listings.
5. Open a result to inspect photos, description, condition, typed details, seller and area. Use the save/favourite control to keep it in Saved after signing in.

Nearest-area results use approximate township/area centres, not household GPS or navigation directions. Region/category filters can include descendants. The reference map hierarchy is historical; select the closest appropriate area if names differ locally.

### 5. Save a draft or publish a listing

1. Sign in and choose Sell an item (`/sell`).
2. Select SALE or FREE, add the title/description, category, condition and location. Enter the MMK price for a sale and complete required category-specific fields.
3. Add photos. Supported formats: JPEG, PNG, WebP, AVIF; maximum 8 MB each and 25 MB combined per save. Published listings need 1–10 photos. Large images may need compression even when there are fewer than ten.
4. Remove/replace images or use the reorder controls to choose the cover image and sequence.
5. Choose **Save draft** to keep incomplete work privately; drafts allow 0–10 photos and do not require contact verification. Continue/discard them at `/account/drafts`.
6. When ready, verify a phone/email and choose **Publish listing**. Read the resulting status or error; submission is not immediate approval.

Draft saving is explicit: there is no autosave or offline submission. Keep the page open until a save completes. Never include banking credentials, verification codes, exact private home addresses or other unnecessary personal data in public text/photos.

### 6. Understand review and listing status

| What you see                | Meaning / next step                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Draft                       | Private saved work. Resume, complete and publish when ready.                                                           |
| Processing / pending review | Image work or review is incomplete. Keep checking Your listings; do not assume it is publicly visible.                 |
| Active                      | Publicly available, subject to category, expiry and moderation rules.                                                  |
| Reserved                    | Temporarily set aside for someone; manage it from Your listings.                                                       |
| Sold                        | No longer available for a new purchase. For giveaways, use the appropriate available completion action after handover. |
| Archived / expired          | Not available in the active feed; edit/renew only where the page permits.                                              |
| Rejected / removed          | Read any available reason and follow the offered correction/resubmission or operator-support path.                     |

Under default MANUAL moderation, processing must finish and a moderator must approve. LOCAL can automatically clear clean rule checks; OPENAI is an optional operator-configured service. Flagged content or provider failures may require human review. Edits can trigger fresh review.

Open `/account/listings` to edit, reserve, mark sold, archive or renew when eligible. If an editor reports that another tab changed the item, reload and reconcile changes rather than repeatedly submitting the stale form.

### 7. Contact a seller and exchange an item

1. Open an available listing and choose Message seller. Sign in if prompted.
2. Send a text question and continue the listing-linked conversation in Messages. Unread indicators and open conversations update while connected.
3. Load older messages when needed. If live updates stop, check your connection and refresh.
4. Use Block for unwanted contact; unblock in the conversation or account controls. Use report controls for a listing, user or incoming message when appropriate.

ZaySine does not collect payment, hold money, arrange delivery or provide escrow. Agree collection/payment directly, meet in a safe public place, inspect the item and avoid advance-payment pressure. Read `/safety`. Free-item listings should not be treated as a platform-backed delivery/payment service.

### 8. Notifications and reports

Open `/account/notifications` to read account notifications and mark them read. Enable browser alerts there only if you want them; the operator must configure Web Push and the browser must support it. Browser/OS permission can also be managed in device settings. Background push is generic and does not contain private message text.

Report content using the relevant listing/profile/message control, select a reason and provide useful details. Check `/account/reports` for status/resolution. Reporting does not guarantee immediate removal. Staff can only act within their roles.

### 9. Install on a phone or computer

Use **Install app** at the top right. If the browser offers native installation, follow its prompt. If not, the button displays instructions.

- **Android:** open in Chrome; use Install app or the menu → Install app / Add to Home screen.
- **iPhone/iPad:** open in Safari → Share → Add to Home Screen → Add. If already installed, open from its home-screen icon.
- **Computer:** Chrome/Edge may offer an address-bar install icon or menu option. Supported Safari versions offer File → Add to Dock.
- **Inside another app:** choose Open in browser first. Available labels/options depend on browser and OS.

The install action hides in installed standalone mode. Installation creates a web app shortcut/app experience, not a separate native app. Online access is needed for listings, account data, messages and saves. Offline mode displays a static explanatory page; unsaved changes are not submitted or recovered automatically.

### 10. Recover and manage your account

**Forgot password:** open `/recover`, select an available channel and enter the contact verified previously. Request the code, enter the latest code and choose a new password. Responses intentionally do not reveal whether an account exists. Successful recovery revokes old sessions; sign in again. Unverified/new contacts cannot be used to recover an existing account. A phone-only account with verified email can use email recovery to establish a password login.

**Settings:** update your display name/account controls at `/account`; use `/account/settings` to verify email, revoke other sessions, export your data or delete the account.

**Deletion:** read the on-screen explanation, provide any required password and type `DELETE` to confirm. It is not an administrator suspension and cannot be undone through the suspension controls. Account details/content are removed or scrubbed, media cleanup is queued, and some anonymous references, report/audit records and backups remain under retention rules. See [privacy boundaries](docs/status.md#account-lifecycle-privacy).

### 11. Staff quick guide

Staff must sign in with an assigned role. Open `/admin` and use only the controls visible/permitted for your role.

- Support: inspect and resolve reports with useful reasons.
- Moderators: review pending listings, inspect permitted media/history, approve/reject/remove content and suspend ordinary users within policy.
- Administrators: manage categories/locations, `/admin/attributes`, `/admin/safety`, staff roles, `/admin/media` retries and `/admin/operations` health/backlogs.
- Keep default MANUAL mode until you have selected and validated a moderation policy. OPENAI sends submitted text/sanitized images externally; enable it deliberately after configuring the worker.
- Use operator runbooks for provider failures, backups and restore; do not request passwords/OTP codes from members. Staff changes are audited; the last administrator is protected.

See [Coolify](docs/coolify.md) and [operations](docs/operations.md) for technical procedures.

### 12. Troubleshooting

| Problem                       | What to do                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| No verification code          | Check channel availability, address/number and spam; request the newest code after any wait/rate limit. Operator checks SMTP/Twilio delivery. |
| Cannot publish                | Verify phone/email, complete required details and add 1–10 valid photos. Save a draft while resolving errors.                                 |
| Listing not visible           | Check its status, review/image work, expiry and selected filters. Ask staff about a review delay.                                             |
| Upload fails                  | Use a supported format, compress below per-file/total limits, check connection and retry after reading the error.                             |
| Stale editor / changed fields | Reload, review the current version/field definitions and reapply changes.                                                                     |
| No location results           | Clear township text or region, then select again; historical names may differ.                                                                |
| Cannot send a message         | Check sign-in, listing availability, suspension/block status and rate limits.                                                                 |
| Install prompt absent         | Use the button's instructions, open a full browser and check device support/HTTPS.                                                            |
| Push absent                   | Check operator setup, browser/device support and notification permission; in-app notifications remain available.                              |
| Offline / save interrupted    | Reconnect and verify whether the save succeeded. There is no offline save queue or autosave recovery.                                         |

<a id="myanmar"></a>

## မြန်မာ

### ၁။ စတင်ကြည့်ရှုခြင်းနှင့် ဘာသာရွေးခြင်း

ပင်မစာမျက်နှာ `/` ကို ဖွင့်ပါ။ အကောင့်မဝင်ဘဲ ပစ္စည်းများကို ကြည့်နိုင်ပါသည်။ အပေါ်ဘက်ဘာသာခလုတ်ဖြင့် မြန်မာ/အင်္ဂလိပ် ပြောင်းနိုင်ပါသည်။ ဖုန်းအောက်ဘက်မီနူးတွင် ရှာဖွေ၊ သိမ်းထားသည်၊ ပစ္စည်းရောင်းမယ်နှင့် စာများ ပါဝင်ပါသည်။ အပေါ်တွင် ZaySine by Flash Tech နှင့် install ခလုတ်ရှိပါသည်။

| စာမျက်နှာ                            | လမ်းကြောင်း                                                         |
| ------------------------------------ | ------------------------------------------------------------------- |
| ရှာဖွေ / အခမဲ့ပစ္စည်း                | `/` / `/free`                                                       |
| အကောင့်ဝင် / ဖွင့် / ပြန်လည်ရယူ      | `/login` / `/register` / `/recover`                                 |
| ဆက်သွယ်ရန်အတည်ပြု                    | `/verify`                                                           |
| ကြော်ငြာတင်                          | `/sell`                                                             |
| အကောင့် / ဆက်တင်                     | `/account` / `/account/settings`                                    |
| မိမိကြော်ငြာ / မူကြမ်း / သိမ်းထားသည် | `/account/listings` / `/account/drafts` / `/account/favorites`      |
| စာ / အသိပေးချက် / တိုင်ကြားမှု       | `/account/messages` / `/account/notifications` / `/account/reports` |
| ဈေးကွက်လုံခြုံရေး                    | `/safety`                                                           |

### ၂။ အကောင့်ဖွင့်ခြင်းနှင့် ဝင်ခြင်း

**အီးမေးလ်/စကားဝှက်။** အကောင့်ဖွင့်ရန်ကို ရွေး၊ ဖော်ပြမည့်နာမည်၊ အီးမေးလ်နှင့် စကားဝှက်ထည့်ပြီး ပို့ပါ။ စကားဝှက် အနည်းဆုံး ၁၂ လုံးလိုအပ်ပြီး ဖော်ပြထားသော အများဆုံးအရွယ်နှင့် UTF-8 72-byte ကန့်သတ်ချက်အတွင်း ဖြစ်ရပါမည်။ နောက်တစ်ကြိမ် အီးမေးလ်/စကားဝှက်ဖြင့် ဝင်နိုင်ပါသည်။

**ဖုန်း OTP။** ဝန်ဆောင်မှုရရှိလျှင် ဖုန်းဖြင့်ဝင်ရန် ရွေး၊ မြန်မာမိုဘိုင်းနံပါတ် (`09…` သို့မဟုတ် `+959…`) ထည့်၊ ကုဒ်တောင်းပြီး ရလာသောကုဒ်ထည့်ပါ။ စာမျက်နှာလမ်းညွှန်အတိုင်း ဝင်ခြင်း/ဖွင့်ခြင်းကို အပြီးလုပ်ပါ။ SMS ရရှိမှုသည် provider နှင့် သင့်နံပါတ်သို့ ပို့နိုင်မှုအပေါ် မူတည်ပါသည်။

အကောင့်ဖွင့်/ဝင်ပြီးရုံဖြင့် ထုတ်ဝေခွင့်အလိုအလျောက် မရပါ။ ဖုန်း သို့မဟုတ် အီးမေးလ် အတည်ပြုပါ။ Badge နှစ်မျိုးကို သီးခြားပြပြီး ရောင်းသူ၏ တရားဝင်အထောက်အထား သို့မဟုတ် ယုံကြည်ရမှုကို အာမခံခြင်းမဟုတ်ပါ။

### ၃။ အီးမေးလ် သို့မဟုတ် ဖုန်း အတည်ပြုခြင်း

1. အကောင့်ဝင်ပြီး `/verify` သို့ သွားပါ၊ သို့မဟုတ် ဆက်တင်မှ verification လင့်ခ်ကို သုံးပါ။
2. ရရှိနိုင်သောလမ်းကြောင်းကို ရွေးပါ။ အီးမေးလ်ဖြစ်လျှင် အကောင့်အီးမေးလ်သို့ ကုဒ်တောင်းပါ။ ဖုန်းဖြင့်သာဖွင့်ထားသူသည် ပထမဆုံး recovery email ထည့်နိုင်ပြီး မကြာသေးမီဝင်ရောက်မှု သို့မဟုတ် စကားဝှက်အတည်ပြုမှု လိုနိုင်ပါသည်။
3. Inbox/spam သို့မဟုတ် SMS ကို စစ်၍ နောက်ဆုံးကုဒ်ကို ထည့်အတည်ပြုပါ။
4. အကောင့်တွင် သက်ဆိုင်ရာ verified အမှတ်ပေါ်လာကြောင်း စစ်ပါ။

ကုဒ်သည် ၁၀ မိနစ်အတွင်းသာ သက်တမ်းရှိပြီး စမ်းသပ်အကြိမ်ရေကန့်သတ်ထားကာ တစ်ကြိမ်သာသုံးနိုင်ပါသည်။ ပြန်တောင်းလျှင် ကုဒ်ဟောင်းပျက်ပါသည်။ အီးမေးလ်ကုဒ်သည် ဂဏန်း ၆ လုံးဖြစ်သည်။ ကုဒ်/စကားဝှက်ကို မျှဝေပါနှင့်။

**အီးမေးလ်အတည်ပြုပြီးလျှင် SMS မလိုပါ။** အီးမေးလ်ပို့ရန် SMTP လိုပါသည်။ နှစ်ခုစလုံးမရလျှင် အော်ပရေတာကို ပြင်ဆင်ခိုင်းပြီး မူကြမ်းသိမ်းထားပါ။ ရှိပြီးသား login email ကို မိမိဘာသာ အစားထိုးပြောင်းသည့်လုပ်ဆောင်ချက် မပါဝင်သေးပါ။

### ၄။ ပစ္စည်းရှာဖွေခြင်း

1. ရှာဖွေရန်နေရာတွင် စကားလုံးထည့်၍ လိုအပ်လျှင် အမျိုးအစားရွေးပါ။
2. တိုင်း/ပြည်နယ်ရွေး၊ မြို့နယ်ရှာရန်တွင် စာရိုက်ပြီး နေရာစာရင်းကျဉ်းစေပါ။ ထို့နောက် လိုချင်သောနေရာကို အမှန်တကယ်ရွေးပါ။ မြို့နယ်ရှာစာသားသည် selector ကိုသာ ကျဉ်းစေပါသည်။
3. စီမယ်/ဈေးနှုန်းကို ဖွင့်၍ အနည်းဆုံး/အများဆုံးကျပ်ငွေ၊ စီစဉ်ပုံ၊ အခြေအနေ၊ ရောင်းရန်/အခမဲ့တို့ကို ရွေးပါ။ သက်ဆိုင်ရာအမျိုးအစားအချက်များ ရှိလျှင် ထပ်စစ်ထုတ်နိုင်ပါသည်။
4. ရှာမယ်ခလုတ်ကို နှိပ်ပါ။ အခမဲ့ပစ္စည်းအတွက် `/free` ကို သုံးပါ။
5. ကြော်ငြာကိုဖွင့်၍ ပုံ၊ ဖော်ပြချက်၊ အခြေအနေ၊ အချက်များ၊ ရောင်းသူနှင့် နေရာကို စစ်ပါ။ အကောင့်ဝင်ပြီး အကြိုက်ဆုံးသိမ်းနိုင်ပါသည်။

အနီးဆုံးရလဒ်သည် ဒေသ/မြို့နယ်ဗဟို အနီးစပ်ဆုံးသာဖြစ်၍ အိမ်တည်နေရာ GPS သို့မဟုတ် လမ်းညွှန်မဟုတ်ပါ။ အမျိုးအစား/ဒေသရွေးချယ်မှုတွင် လက်အောက်ခံများ ပါဝင်နိုင်ပါသည်။ ဒေတာသည် သမိုင်းဆိုင်ရာဖြစ်၍ အမည်ကွာလျှင် သင့်လျော်သောအနီးဆုံးဒေသကို ရွေးပါ။

### ၅။ မူကြမ်းသိမ်းခြင်းနှင့် ကြော်ငြာထုတ်ဝေခြင်း

1. အကောင့်ဝင်ပြီး ပစ္စည်းရောင်းမယ် (`/sell`) ကို ရွေးပါ။
2. ရောင်းရန် သို့မဟုတ် အခမဲ့ပေးရန်၊ ခေါင်းစဉ်၊ အကြောင်းအရာ၊ အမျိုးအစား၊ အခြေအနေနှင့် နေရာကို ဖြည့်ပါ။ ရောင်းရန်ဖြစ်လျှင် ကျပ်ငွေဈေးနှုန်းနှင့် လိုအပ်သောအမျိုးအစားဆိုင်ရာအချက်များ ဖြည့်ပါ။
3. JPEG၊ PNG၊ WebP၊ AVIF ပုံများ ထည့်ပါ။ တစ်ပုံ 8 MB၊ တစ်ကြိမ်သိမ်းရာတွင် စုစုပေါင်း 25 MB အထိသာဖြစ်ပြီး ထုတ်ဝေရန် ပုံ ၁–၁၀ ပုံ လိုပါသည်။ ဆယ်ပုံမပြည့်သော်လည်း အရွယ်ကြီးလျှင် ချုံ့ရနိုင်ပါသည်။
4. ပုံဖယ်၊ အစားထိုး၊ အစီအစဉ်ပြောင်း၍ မျက်နှာဖုံးပုံရွေးပါ။
5. မပြည့်စုံသေးလျှင် **မူကြမ်းသိမ်းမယ်** ကို ရွေးပါ။ မူကြမ်းတွင် ပုံ ၀–၁၀ ပုံရပြီး verification မလိုပါ။ `/account/drafts` မှ ဆက်ပြင်/ဖျက်နိုင်ပါသည်။
6. ပြည့်စုံလျှင် ဖုန်း/အီးမေးလ်အတည်ပြုပြီး **ကြော်ငြာထုတ်ဝေမယ်** ကို ရွေးပါ။ ရလဒ်/အမှားကို ဖတ်ပါ။ တင်သွင်းခြင်းသည် ချက်ချင်းခွင့်ပြုခြင်း မဟုတ်ပါ။

မူကြမ်းကို ကိုယ်တိုင်သိမ်းရပါသည်။ Autosave နှင့် offline ပို့ခြင်း မရှိပါ။ သိမ်းပြီးကြောင်းပြမချင်း စာမျက်နှာမပိတ်ပါနှင့်။ ဘဏ်အချက်အလက်၊ ကုဒ်၊ အိမ်လိပ်စာအတိအကျနှင့် မလိုအပ်သောကိုယ်ရေးအချက်အလက်ကို အများမြင်စာသား/ပုံထဲ မထည့်ပါနှင့်။

### ၆။ စိစစ်မှုနှင့် ကြော်ငြာအခြေအနေ

| အခြေအနေ                        | အဓိပ္ပာယ် / ဆက်လုပ်ရန်                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| မူကြမ်း                        | ကိုယ်ပိုင်သိမ်းထားသောအလုပ်။ ဆက်ဖြည့်ပြီး ထုတ်ဝေနိုင်သည်။                                            |
| ပုံပြုပြင်ဆဲ / စိစစ်ဆဲ         | နောက်ခံလုပ်ငန်း/စိစစ်မှု မပြီးသေး။ မိမိကြော်ငြာများတွင် ပြန်စစ်ပါ။ အများမြင်ပြီဟု မယူဆပါနှင့်။      |
| အသုံးပြုနေ / Active            | အမျိုးအစား၊ သက်တမ်းနှင့် စိစစ်မူဝါဒအတွင်း အများမြင်နိုင်သည်။                                        |
| ခေတ္တယူထား / Reserved          | တစ်ဦးအတွက် ခေတ္တထားသည်။ မိမိကြော်ငြာမှ စီမံပါ။                                                      |
| ရောင်းပြီး / Sold              | အသစ်ဝယ်ယူရန် မရတော့ပါ။ အခမဲ့ပစ္စည်းလွှဲပြီးလျှင် ရရှိနိုင်သော သင့်လျော်သည့်အပြီးသတ်ခလုတ်ကို သုံးပါ။ |
| သိမ်းဆည်းပိတ်ထား / သက်တမ်းကုန် | Active feed တွင် မပေါ်ပါ။ စာမျက်နှာခွင့်ပြုသည့် ပြင်ဆင်/သက်တမ်းတိုးကိုသာ သုံးပါ။                    |
| ငြင်းပယ် / ဖယ်ရှား             | ရရှိနိုင်သောအကြောင်းပြချက်ကိုဖတ်၍ ပြင်ဆင်/ပြန်တင် သို့မဟုတ် အော်ပရေတာအကူအညီ လမ်းကြောင်းကို သုံးပါ။  |

မူလ MANUAL mode တွင် ပုံပြုပြင်ပြီး moderator အတည်ပြုရပါသည်။ LOCAL က သန့်ရှင်းသောစည်းမျဉ်းစစ်ဆေးမှုကို အလိုအလျောက်ခွင့်ပြုနိုင်ပြီး OPENAI သည် အော်ပရေတာပြင်ဆင်ထားရသော ရွေးချယ်စရာဖြစ်သည်။ Flag သို့မဟုတ် provider အမှားများတွင် လူကစိစစ်ရနိုင်ပါသည်။ ပြင်ဆင်မှုကိုလည်း ပြန်စိစစ်နိုင်ပါသည်။

`/account/listings` မှ ပြင်ဆင်၊ ခေတ္တယူထား၊ ရောင်းပြီး၊ သိမ်းဆည်းပိတ်ထား၊ ခွင့်ရှိလျှင် သက်တမ်းတိုးနိုင်ပါသည်။ အခြား tab မှ ပြောင်းထားကြောင်းပြလျှင် reload လုပ်၊ လက်ရှိဒေတာကိုစစ်ပြီး ပြန်ပြင်ပါ။ Form ဟောင်းကို ထပ်ခါတလဲလဲ မပို့ပါနှင့်။

### ၇။ ရောင်းသူနှင့် ဆက်သွယ်ခြင်း၊ ပစ္စည်းလွှဲခြင်း

1. ရရှိနိုင်သောကြော်ငြာကို ဖွင့်၍ ရောင်းသူကိုစာပို့ရန် ရွေးပါ။ လိုအပ်လျှင် အကောင့်ဝင်ပါ။
2. စာသားမေးခွန်းပို့၍ စာများထဲမှ သက်ဆိုင်ရာစကားဝိုင်းတွင် ဆက်ပြောပါ။ ချိတ်ဆက်ထားစဉ် မဖတ်ရသေးအမှတ်နှင့် စကားဝိုင်း ပြောင်းလဲပေးပါသည်။
3. လိုအပ်လျှင် စာဟောင်းများကို ထပ်ကြည့်ပါ။ Live update မရလျှင် အင်တာနက်စစ်ပြီး refresh လုပ်ပါ။
4. မလိုလားသောဆက်သွယ်မှုကို Block လုပ်ပြီး စကားဝိုင်း သို့မဟုတ် အကောင့်မှ ပြန်ဖွင့်နိုင်ပါသည်။ သင့်လျော်လျှင် ကြော်ငြာ၊ profile သို့မဟုတ် ဝင်လာသောစာကို တိုင်ကြားပါ။

ZaySine က ငွေလက်ခံခြင်း၊ ငွေထိန်းခြင်း၊ ပို့ဆောင်မှုစီစဉ်ခြင်းနှင့် escrow မလုပ်ပါ။ လက်ခံယူ/ငွေပေးပုံကို တိုက်ရိုက်ညှိ၊ အများရှိရာလုံခြုံသောနေရာတွင်တွေ့၊ ပစ္စည်းစစ်ပြီးမှပေးချေ၍ ကြိုတင်ငွေပေးရန် ဖိအားကို ရှောင်ပါ။ `/safety` ကို ဖတ်ပါ။ အခမဲ့ကြော်ငြာသည် ပလက်ဖောင်းက အာမခံသည့် ပို့ဆောင်/ငွေပေးဝန်ဆောင်မှု မဟုတ်ပါ။

### ၈။ အသိပေးချက်နှင့် တိုင်ကြားမှု

`/account/notifications` တွင် အသိပေးချက်ဖတ်ပြီး ဖတ်ပြီးအမှတ်လုပ်နိုင်ပါသည်။ လိုလျှင် browser alerts ကို ဖွင့်ပါ။ အော်ပရေတာ Web Push ပြင်ဆင်ထားမှုနှင့် browser ပံ့ပိုးမှု လိုအပ်သည်။ စက်/browser ဆက်တင်မှလည်း ခွင့်ပြုချက်ကို စီမံနိုင်ပါသည်။ နောက်ခံ push တွင် ကိုယ်ရေးစာသား မပါဝင်ပါ။

သက်ဆိုင်ရာကြော်ငြာ/profile/စာ၏ report ခလုတ်မှ အကြောင်းပြချက်ရွေးပြီး အသုံးဝင်သောအသေးစိတ် ဖြည့်ပါ။ `/account/reports` တွင် အခြေအနေ/ရလဒ်ကို ကြည့်ပါ။ တိုင်ကြားခြင်းက ချက်ချင်းဖယ်ရှားမည်ဟု အာမခံမထားပါ။ ဝန်ထမ်းများသည် မိမိခွင့်အတွင်းသာ ဆောင်ရွက်နိုင်ပါသည်။

### ၉။ ဖုန်း သို့မဟုတ် ကွန်ပျူတာတွင် ထည့်သွင်းခြင်း

ညာဘက်အပေါ် **Install app** ကို နှိပ်ပါ။ Native install prompt ရလျှင် ၎င်းအတိုင်းဆက်လုပ်ပြီး မရလျှင် ပြထားသောလမ်းညွှန်ကို သုံးပါ။

- **Android:** Chrome တွင်ဖွင့်၍ Install app သို့မဟုတ် မီနူး → Install app / Add to Home screen ကို သုံးပါ။
- **iPhone/iPad:** Safari → Share → Add to Home Screen → Add ကို သုံးပါ။ ထည့်သွင်းပြီးလျှင် home-screen icon မှ ဖွင့်ပါ။
- **ကွန်ပျူတာ:** Chrome/Edge တွင် address-bar install icon သို့မဟုတ် မီနူးရွေးချယ်စရာ ရနိုင်ပါသည်။ ပံ့ပိုးသော Safari version များတွင် File → Add to Dock ရပါသည်။
- **အခြားအက်ပ်အတွင်း:** Open in browser ကို အရင်ရွေးပါ။ စာသား/ရွေးချယ်စရာသည် browser/OS အလိုက် ကွာနိုင်ပါသည်။

ထည့်သွင်းပြီး standalone အဖြစ်ဖွင့်လျှင် install ခလုတ်မပြပါ။ ၎င်းသည် web app ဖြစ်ပြီး သီးခြား native app မဟုတ်ပါ။ ကြော်ငြာ၊ အကောင့်၊ စာနှင့် သိမ်းဆည်းမှုအတွက် အင်တာနက်လိုပါသည်။ Offline တွင် ရှင်းပြစာမျက်နှာသာပြပြီး မသိမ်းရသေးသောပြောင်းလဲမှုကို အလိုအလျောက်ပို့/ပြန်ယူမပေးပါ။

### ၁၀။ အကောင့်ပြန်လည်ရယူခြင်းနှင့် စီမံခြင်း

**စကားဝှက်မေ့လျှင်။** `/recover` တွင် ရရှိနိုင်သောလမ်းကြောင်းနှင့် ယခင်အတည်ပြုထားသော ဆက်သွယ်ရန်ကို ထည့်ပါ။ ကုဒ်တောင်း၊ နောက်ဆုံးကုဒ်ထည့်၍ စကားဝှက်အသစ်ရွေးပါ။ အကောင့်ရှိ/မရှိ မဖော်ပြရန် တုံ့ပြန်စာသည် ယေဘုယျဖြစ်ပါသည်။ အောင်မြင်လျှင် ဝင်ရောက်မှုဟောင်းပယ်ဖျက်သဖြင့် ပြန်ဝင်ပါ။ အတည်မပြုရသေးသော/အသစ်သော contact ဖြင့် ရှိပြီးသားအကောင့် ပြန်ယူမရပါ။ အီးမေးလ်အတည်ပြုထားသော ဖုန်းအကောင့်သည် email recovery ဖြင့် စကားဝှက် login သတ်မှတ်နိုင်ပါသည်။

**ဆက်တင်။** `/account` တွင် ဖော်ပြမည့်နာမည်နှင့် အကောင့်ထိန်းချုပ်မှုကို ပြင်နိုင်ပါသည်။ `/account/settings` တွင် အီးမေးလ်အတည်ပြု၊ အခြားစက်များမှထွက်၊ ဒေတာထုတ်ယူ၊ အကောင့်ဖျက်နိုင်ပါသည်။

**ဖျက်ခြင်း။** ဖော်ပြချက်ဖတ်၊ လိုအပ်သောစကားဝှက်ဖြည့်၍ `DELETE` ဟု ရိုက်အတည်ပြုပါ။ ၎င်းသည် admin ယာယီပိတ်ခြင်းမဟုတ်ဘဲ suspension control ဖြင့် ပြန်မဖွင့်နိုင်ပါ။ အကောင့်အချက်/စာများ ဖယ်ရှား သို့မဟုတ် ရှင်းလင်းပြီး ပုံဖယ်ရှားမှုကို နောက်ခံလုပ်ငန်းတွင် စီထားသည်။ အမည်မပါရည်ညွှန်းချက်၊ report/audit နှင့် backup အချို့သည် သတ်မှတ်သိမ်းဆည်းမှုအတွင်း ကျန်နိုင်ပါသည်။ [ကန့်သတ်ချက်](docs/status.md#account-lifecycle-privacy) ကို ဖတ်ပါ။

### ၁၁။ ဝန်ထမ်းအကျဉ်းလမ်းညွှန်

သတ်မှတ်ရာထူးရှိအကောင့်ဖြင့် ဝင်၊ `/admin` ကိုဖွင့်၍ မိမိခွင့်ရှိသည့် control ကိုသာ သုံးပါ။

- Support: တိုင်ကြားမှုစစ်ပြီး အသုံးဝင်သောအကြောင်းပြချက်ဖြင့် ဖြေရှင်းပါ။
- Moderator: စောင့်ဆိုင်းကြော်ငြာနှင့် ခွင့်ပြုထားသောပုံ/မှတ်တမ်းကို စစ်၊ ခွင့်ပြု/ငြင်းပယ်/ဖယ်ရှား၊ မူဝါဒအတွင်း သာမန်အသုံးပြုသူကို ယာယီပိတ်နိုင်ပါသည်။
- Administrator: category/location၊ `/admin/attributes`၊ `/admin/safety`၊ ရာထူးများ၊ `/admin/media` retry နှင့် `/admin/operations` အခြေအနေကို စီမံပါ။
- မူဝါဒရွေးပြီး စမ်းသပ်မပြီးမချင်း မူလ MANUAL ကို ထိန်းထားပါ။ OPENAI က တင်သွင်းစာသား/ပြုပြင်ပြီးပုံကို ပြင်ပသို့ပို့သဖြင့် worker ပြင်ဆင်ပြီး ရည်ရွယ်ချက်ရှိရှိသာ ဖွင့်ပါ။
- Provider အမှား၊ backup/restore အတွက် runbook ကို သုံးပါ။ အသုံးပြုသူထံမှ စကားဝှက်/OTP မတောင်းပါနှင့်။ ဝန်ထမ်းပြောင်းလဲမှုမှတ်တမ်းထားပြီး နောက်ဆုံး admin ကို ကာကွယ်ထားပါသည်။

နည်းပညာအတွက် [Coolify](docs/coolify.md) နှင့် [operations](docs/operations.md) ကို ဖတ်ပါ။

### ၁၂။ ပြဿနာဖြေရှင်းရန်

| ပြဿနာ                       | ဆောင်ရွက်ရန်                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| ကုဒ်မရ                      | လမ်းကြောင်း၊ email/နံပါတ်၊ spam စစ်၊ စောင့်ချိန်/rate limit ပြီးမှ နောက်ဆုံးကုဒ်တောင်းပါ။ Operator က SMTP/Twilio စစ်ရပါမည်။ |
| ထုတ်ဝေမရ                    | ဖုန်း/email အတည်ပြု၊ လိုအပ်သောအချက်နှင့် ပုံ ၁–၁၀ ပုံဖြည့်ပါ။ ဖြေရှင်းနေစဉ် မူကြမ်းသိမ်းပါ။                                 |
| ကြော်ငြာမပေါ်               | Status၊ review/image work၊ သက်တမ်းနှင့် filters စစ်ပါ။ ကြန့်ကြာလျှင် ဝန်ထမ်းကို မေးပါ။                                      |
| ပုံတင်မရ                    | ပံ့ပိုး format/အရွယ်နှင့် စုစုပေါင်းကန့်သတ်ချက်အောက် ချုံ့၊ အင်တာနက်စစ်ပြီး အမှားစာဖတ်၍ ပြန်လုပ်ပါ။                         |
| Form ဟောင်း / field ပြောင်း | Reload လုပ်၊ လက်ရှိဒေတာ/field ကိုစစ်ပြီး ပြန်ပြင်ပါ။                                                                        |
| နေရာမတွေ့                   | မြို့နယ်စာသား သို့မဟုတ် region ကို ရှင်းပြီး ပြန်ရွေးပါ။ သမိုင်းဆိုင်ရာအမည် ကွာနိုင်ပါသည်။                                  |
| စာပို့မရ                    | Login၊ ကြော်ငြာရရှိမှု၊ suspension/block နှင့် rate limit စစ်ပါ။                                                            |
| Install prompt မရ           | ခလုတ်လမ်းညွှန်ကိုသုံး၊ full browser တွင်ဖွင့်၊ စက်ပံ့ပိုးမှု/HTTPS စစ်ပါ။                                                   |
| Push မရ                     | Operator setup၊ browser/စက်နှင့် notification permission စစ်ပါ။ In-app အသိပေးချက်ကို ဆက်သုံးနိုင်ပါသည်။                     |
| Offline / သိမ်းဆည်းမှုပြတ်  | ပြန်ချိတ်၍ အမှန်တကယ်သိမ်းပြီး/မပြီး စစ်ပါ။ Offline queue/autosave recovery မရှိပါ။                                          |
