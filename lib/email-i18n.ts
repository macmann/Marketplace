import { locale } from "./i18n";
export const emailCopyFor = (lang: string) => (lang === "my" ? my : en);
const en = {
  recent:
    "Sign in again, or enter your current password, before adding your first recovery email.",
  password: "Current password (if you signed in over 15 minutes ago)",
  title: "Verify your email",
  email: "Email address",
  help: "Verify your existing email, or add one if you signed up by phone. A verified email lets you publish when SMS is not configured and recover your account.",
  verified: "Email verified",
  send: "Send email code",
  confirm: "Verify email",
  unavailable:
    "Email delivery is not configured. The operator must configure SMTP and a sender address.",
  sent: "If delivery succeeds, your six-digit code expires in 10 minutes. Check your inbox and spam folder.",
  contactTitle: "Verify a contact method",
  contactHelp:
    "Verify your phone or email before publishing. You can save a draft while you wait.",
  recoveryChannel: "Recovery channel",
  sms: "SMS",
  emailChannel: "Email",
  recoveryHelp:
    "Choose a channel and enter your email or phone. Recovery uses only a previously verified contact. Email works independently of SMS configuration.",
  recoverySent:
    "If an eligible account exists and delivery succeeds, a code has been sent to its verified contact. Codes expire in 10 minutes.",
  none: "No recovery channel is configured. Contact the operator; verification cannot be skipped.",
  privacy:
    "Your email address is private and is never shown on your public profile.",
  accountHelp:
    "Keep a verified email as a recovery channel. Adding email does not automatically verify it.",
  invalidEmail:
    "Enter a valid email address. To replace an existing address, contact support.",
  code: "Email verification code",
  changeHelp:
    "Use the email already on your account. Changing an existing login address is not supported here.",
};
const my: typeof en = {
  recent:
    "ပထမဆုံး ပြန်လည်ရယူရန် အီးမေးလ်မထည့်မီ ပြန်ဝင်ပါ သို့မဟုတ် လက်ရှိစကားဝှက် ထည့်ပါ။",
  password: "လက်ရှိစကားဝှက် (ဝင်ထားသည်မှာ ၁၅ မိနစ်ကျော်ပါက)",
  title: "အီးမေးလ် အတည်ပြုမယ်",
  email: "အီးမေးလ်လိပ်စာ",
  help: "လက်ရှိအီးမေးလ်ကို အတည်ပြုပါ။ ဖုန်းဖြင့် အကောင့်ဖွင့်ထားပါက အီးမေးလ် ထည့်နိုင်ပါသည်။ SMS မချိတ်ဆက်ထားလျှင်လည်း အတည်ပြုပြီးသော အီးမေးလ်ဖြင့် ပစ္စည်းတင်ခြင်းနှင့် အကောင့်ပြန်ရယူခြင်း ပြုလုပ်နိုင်ပါသည်။",
  verified: "အီးမေးလ် အတည်ပြုပြီး",
  send: "အီးမေးလ်ကုဒ် ပို့မယ်",
  confirm: "အီးမေးလ် အတည်ပြုမယ်",
  unavailable:
    "အီးမေးလ် ပို့ခြင်း မပြင်ဆင်ရသေးပါ။ တာဝန်ရှိသူက SMTP နှင့် ပို့သူလိပ်စာကို ပြင်ဆင်ရပါမည်။",
  sent: "ပို့ခြင်း အောင်မြင်ပါက ကုဒ်သည် ၁၀ မိနစ်အတွင်း သက်တမ်းကုန်ပါမည်။ ဝင်စာနှင့် spam ကို စစ်ဆေးပါ။",
  contactTitle: "ဆက်သွယ်ရန်နည်းလမ်း အတည်ပြုမယ်",
  contactHelp:
    "ပစ္စည်းမတင်မီ ဖုန်း သို့မဟုတ် အီးမေးလ် အတည်ပြုပါ။ စောင့်နေစဉ် မူကြမ်း သိမ်းနိုင်ပါသည်။",
  recoveryChannel: "အကောင့် ပြန်ရယူမည့်နည်းလမ်း",
  sms: "SMS",
  emailChannel: "အီးမေးလ်",
  recoveryHelp:
    "နည်းလမ်းရွေးပြီး အီးမေးလ် သို့မဟုတ် ဖုန်း ထည့်ပါ။ ယခင် အတည်ပြုထားသည့် ဆက်သွယ်ရန်လိပ်စာကိုသာ အသုံးပြုပါမည်။ SMS မပြင်ဆင်ထားလည်း အီးမေးလ်ကို အသုံးပြုနိုင်ပါသည်။",
  recoverySent:
    "သင့်လျော်သော အကောင့်ရှိပြီး ပို့ခြင်း အောင်မြင်ပါက အတည်ပြုပြီးသော လိပ်စာသို့ ကုဒ်ပို့ပြီးပါပြီ။ ၁၀ မိနစ်အတွင်း အသုံးပြုပါ။",
  none: "ပြန်လည်ရယူရန် နည်းလမ်း မပြင်ဆင်ရသေးပါ။ တာဝန်ရှိသူကို ဆက်သွယ်ပါ။ အတည်ပြုခြင်းကို ကျော်၍မရပါ။",
  privacy: "သင့်အီးမေးလ်ကို သီးသန့်ထားပြီး အများမြင် ပရိုဖိုင်တွင် မဖော်ပြပါ။",
  accountHelp:
    "အကောင့်ပြန်ရယူရန် အီးမေးလ်ကို အတည်ပြုထားပါ။ ထည့်ထားရုံဖြင့် အတည်မပြုပါ။",
  invalidEmail:
    "မှန်ကန်သော အီးမေးလ်ထည့်ပါ။ လက်ရှိလိပ်စာကို ပြောင်းရန် တာဝန်ရှိသူကို ဆက်သွယ်ပါ။",
  code: "အီးမေးလ် အတည်ပြုကုဒ်",
  changeHelp:
    "အကောင့်ရှိ လက်ရှိအီးမေးလ်ကို အသုံးပြုပါ။ ဤနေရာတွင် ဝင်ရောက်ရန်လိပ်စာကို ပြောင်း၍မရပါ။",
};
export async function emailCopy() {
  return emailCopyFor(await locale());
}
