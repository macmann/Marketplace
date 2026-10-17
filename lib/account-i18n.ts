import { locale } from "./i18n";
const en = {
  phoneLogin: "Continue with your phone",
  phoneLoginHelp:
    "Sign in or create an account with your Myanmar mobile number.",
  phone: "Phone number",
  phoneHint: "Use 09… or +959…",
  displayName: "Display name (for a new account)",
  sendCode: "Send verification code",
  code: "Verification code",
  confirmLogin: "Verify and continue",
  emailLogin: "Or use email and password",
  recover: "Forgot your password?",
  recoveryTitle: "Recover your account",
  recoveryHelp:
    "Enter your email or phone number. If an eligible account has a verified phone, we’ll send an SMS code to that phone. Accounts without a verified phone cannot use SMS recovery.",
  identifier: "Email or phone number",
  recoverySent:
    "If an eligible account exists, a code has been sent to its verified phone. Enter it below.",
  newPassword: "New password",
  confirmPassword: "Confirm new password",
  passwordHelp: "Use at least 12 characters, up to 72 UTF-8 bytes.",
  resetPassword: "Reset password",
  resetDone: "Your password was reset and previous sessions were signed out.",
  settings: "Account and security",
  sessions: "Sign out other devices",
  sessionsHelp: "Keep this device signed in and revoke every other session.",
  sessionsDone: "Other devices have been signed out.",
  export: "Download my account data",
  exportHelp:
    "Download your profile, listings, favorites, and conversations as a private JSON file.",
  deleteTitle: "Delete my account",
  deleteHelp:
    "This permanently removes your contact details, hides your listings, removes your message contents, and signs out all devices. Anonymous transaction and moderation references remain. Images are queued for deletion. This cannot be undone.",
  deleteConfirmation: "Type DELETE to confirm",
  password: "Current password (if you signed in over 15 minutes ago)",
  deleteButton: "Permanently delete account",
  deleted: "Your account has been deleted.",
  backLogin: "Return to sign in",
  verifyTitle: "Verify your phone",
  verifyHelp: "Verify a phone to publish listings and recover your account.",
  verifySent: "A verification code has been sent. It expires in 10 minutes.",
  confirmVerify: "Verify phone",
  smsUnavailable:
    "SMS verification is not configured. The operator must connect Twilio Verify before phone sign-in, verification, or recovery can work.",
  invalid:
    "The code is incorrect, expired, or already used. Request a new code after five attempts.",
  unavailable:
    "The verification provider is unavailable. Please try again later.",
  phoneUsed:
    "That phone cannot be linked to this account. Use phone sign-in if it belongs to you.",
  notAllowed:
    "We could not complete this request. Sign in again or contact support.",
  passwordError:
    "Sign in again, or enter your current password to confirm deletion.",
  lastAdmin:
    "The last active administrator cannot delete their account. Assign another administrator first.",
  phoneInvalid: "Enter a valid Myanmar mobile number beginning 09 or +959.",
  nameInvalid: "Use a display name between 2 and 80 characters.",
  passwordInvalid:
    "Use matching passwords of at least 12 characters and at most 72 UTF-8 bytes.",
  confirmationInvalid: "Type DELETE exactly to confirm account deletion.",
  tooMany: "Too many attempts. Please try again later.",
  resend: "Request a new code",
  verifyFirst:
    "Connect and verify your phone while you still have access to your account. SMS recovery requires a verified phone.",
  privacy:
    "Your phone number is private and never displayed on your public profile.",
};
const my: typeof en = {
  phoneLogin: "ဖုန်းနံပါတ်ဖြင့် ဆက်လုပ်မယ်",
  phoneLoginHelp:
    "မြန်မာမိုဘိုင်းဖုန်းနံပါတ်ဖြင့် ဝင်မယ် သို့မဟုတ် အကောင့်ဖွင့်မယ်။",
  phone: "ဖုန်းနံပါတ်",
  phoneHint: "09… သို့မဟုတ် +959… အသုံးပြုပါ",
  displayName: "အမည် (အကောင့်အသစ်အတွက်)",
  sendCode: "အတည်ပြုကုဒ် ပို့မယ်",
  code: "အတည်ပြုကုဒ်",
  confirmLogin: "အတည်ပြုပြီး ဆက်လုပ်မယ်",
  emailLogin: "သို့မဟုတ် အီးမေးလ်နှင့် စကားဝှက်ဖြင့် ဝင်မယ်",
  recover: "စကားဝှက် မေ့နေပါသလား။",
  recoveryTitle: "အကောင့် ပြန်ရယူမယ်",
  recoveryHelp:
    "အီးမေးလ် သို့မဟုတ် ဖုန်းနံပါတ် ထည့်ပါ။ အကောင့်တွင် အတည်ပြုပြီးသောဖုန်း ရှိပါက ထိုဖုန်းသို့ SMS ကုဒ် ပို့ပါမည်။ ဖုန်းအတည်မပြုထားသော အကောင့်များအတွက် SMS ဖြင့် ပြန်မရယူနိုင်ပါ။",
  identifier: "အီးမေးလ် သို့မဟုတ် ဖုန်းနံပါတ်",
  recoverySent:
    "အတည်ပြုပြီးသောဖုန်းရှိသည့် အကောင့်ဖြစ်ပါက ကုဒ်ပို့ပြီးပါပြီ။ အောက်တွင် ထည့်ပါ။",
  newPassword: "စကားဝှက်အသစ်",
  confirmPassword: "စကားဝှက်အသစ် ထပ်ထည့်ပါ",
  passwordHelp:
    "အနည်းဆုံး စာလုံး ၁၂ လုံး၊ အများဆုံး UTF-8 ၇၂ ဘိုက် အသုံးပြုပါ။",
  resetPassword: "စကားဝှက် ပြန်သတ်မှတ်မယ်",
  resetDone: "စကားဝှက် ပြန်သတ်မှတ်ပြီး အခြားဝင်ရောက်မှုများမှ ထွက်ပြီးပါပြီ။",
  settings: "အကောင့်နှင့် လုံခြုံရေး",
  sessions: "အခြားစက်များမှ ထွက်မယ်",
  sessionsHelp: "ဤစက်ကို ဆက်ဝင်ထားပြီး အခြားဝင်ရောက်မှုအားလုံးမှ ထွက်မယ်။",
  sessionsDone: "အခြားစက်များမှ ထွက်ပြီးပါပြီ။",
  export: "ကျွန်ုပ်၏အကောင့်ဒေတာ ဒေါင်းလုဒ်ယူမယ်",
  exportHelp:
    "ပရိုဖိုင်၊ ပစ္စည်းများ၊ သိမ်းထားမှုနှင့် စကားပြောဆိုမှုများကို သီးသန့် JSON ဖိုင်အဖြစ် ယူပါ။",
  deleteTitle: "ကျွန်ုပ်အကောင့် ဖျက်မယ်",
  deleteHelp:
    "ဆက်သွယ်ရန်အချက်အလက်များကို အပြီးဖျက်ပြီး ပစ္စည်းတင်ထားမှုများကို ဖျောက်ပါမည်။ သင်ပို့ထားသော စာများကို ဖယ်ရှားပြီး စက်အားလုံးမှ ထွက်ပါမည်။ အမည်မပါသော အရောင်းအဝယ်နှင့် စိစစ်ရေးမှတ်တမ်းများ ကျန်ရှိပါမည်။ ဓာတ်ပုံများကို ဖျက်ရန် စီစဉ်ပါမည်။ ပြန်ယူ၍ မရပါ။",
  deleteConfirmation: "အတည်ပြုရန် DELETE ဟု ရိုက်ပါ",
  password: "လက်ရှိစကားဝှက် (ဝင်ထားသည်မှာ ၁၅ မိနစ်ကျော်ပါက)",
  deleteButton: "အကောင့်ကို အပြီးဖျက်မယ်",
  deleted: "သင့်အကောင့်ကို ဖျက်ပြီးပါပြီ။",
  backLogin: "ဝင်ရောက်ရန် ပြန်သွားမယ်",
  verifyTitle: "ဖုန်း အတည်ပြုမယ်",
  verifyHelp: "ပစ္စည်းတင်ရန်နှင့် အကောင့်ပြန်ရယူရန် ဖုန်းအတည်ပြုပါ။",
  verifySent: "ကုဒ်ပို့ပြီးပါပြီ။ ၁၀ မိနစ်အတွင်း အသုံးပြုပါ။",
  confirmVerify: "ဖုန်းအတည်ပြုမယ်",
  smsUnavailable:
    "SMS အတည်ပြုခြင်း မပြင်ဆင်ရသေးပါ။ တာဝန်ရှိသူက Twilio Verify ကို ချိတ်ဆက်ရပါမည်။",
  invalid:
    "ကုဒ်မှားနေသည်၊ သက်တမ်းကုန်နေသည် သို့မဟုတ် အသုံးပြုပြီးဖြစ်သည်။ ငါးကြိမ်ကြိုးစားပြီးပါက ကုဒ်အသစ်တောင်းပါ။",
  unavailable: "အတည်ပြုဝန်ဆောင်မှု ယာယီမရနိုင်ပါ။ နောက်မှ ထပ်ကြိုးစားပါ။",
  phoneUsed:
    "ဤဖုန်းကို အကောင့်နှင့် ချိတ်၍မရပါ။ သင့်ဖုန်းဖြစ်ပါက ဖုန်းဖြင့် ဝင်ပါ။",
  notAllowed:
    "ဤတောင်းဆိုမှုကို မလုပ်နိုင်ပါ။ ပြန်ဝင်ပါ သို့မဟုတ် အကူအညီတောင်းပါ။",
  passwordError: "ပြန်ဝင်ပါ သို့မဟုတ် ဖျက်ရန် လက်ရှိစကားဝှက်ဖြင့် အတည်ပြုပါ။",
  lastAdmin:
    "နောက်ဆုံးစီမံခန့်ခွဲသူသည် မိမိအကောင့်ကို မဖျက်နိုင်ပါ။ အခြားစီမံခန့်ခွဲသူ အရင်သတ်မှတ်ပါ။",
  phoneInvalid: "09 သို့မဟုတ် +959 ဖြင့် စသော မြန်မာဖုန်းနံပါတ် ထည့်ပါ။",
  nameInvalid: "အမည်ကို စာလုံး ၂ လုံးမှ ၈၀ လုံးအတွင်း အသုံးပြုပါ။",
  passwordInvalid:
    "တူညီသော စကားဝှက်နှစ်ခုကို အနည်းဆုံး စာလုံး ၁၂ လုံး၊ အများဆုံး UTF-8 ၇၂ ဘိုက်အတွင်း ထည့်ပါ။",
  confirmationInvalid: "အကောင့်ဖျက်ရန် DELETE ဟု အတိအကျ ရိုက်ပါ။",
  tooMany: "ကြိုးစားမှုများလွန်းပါသည်။ နောက်မှ ထပ်ကြိုးစားပါ။",
  resend: "ကုဒ်အသစ် တောင်းမယ်",
  verifyFirst:
    "အကောင့်ကို ဝင်နိုင်စဉ် ဖုန်းချိတ်ဆက်ပြီး အတည်ပြုပါ။ SMS ဖြင့် ပြန်ရယူရန် အတည်ပြုပြီးသောဖုန်း လိုအပ်ပါသည်။",
  privacy: "သင့်ဖုန်းနံပါတ်သည် သီးသန့်ဖြစ်ပြီး အများမြင်ပရိုဖိုင်တွင် မပြပါ။",
};
export async function accountCopy() {
  return (await locale()) === "my" ? my : en;
}
