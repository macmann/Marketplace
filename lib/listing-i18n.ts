import { locale } from "./i18n";
const en = {
  drafts: "Drafts",
  saveDraft: "Save draft",
  saved: "Draft saved. Only you can see it.",
  untitled: "Untitled draft",
  resume: "Continue editing",
  discard: "Discard draft",
  discardConfirm: "Discard this draft and its photos?",
  details: "Item details",
  optional: "Optional",
  required: "Required",
  yes: "Yes",
  no: "No",
  photos: "Photos",
  photoHelp:
    "Add up to 10 photos. Use the arrows to choose the cover photo and order. JPEG, PNG, WebP or AVIF, up to 8 MB each; 25 MB total per save.",
  addPhotos: "Add photos",
  remove: "Remove photo",
  earlier: "Move photo earlier",
  later: "Move photo later",
  cover: "Cover photo",
  draftHelp:
    "Save your progress privately. Verify your phone or email when you are ready to publish.",
  photoCount: "Use 1–10 photos for a published listing, or 0–10 for a draft.",
  photoOwnership: "A photo does not belong to this listing. Reload the editor.",
  conflict:
    "This item changed in another tab. Reload the editor before saving.",
  notFound: "This draft or listing cannot be edited.",
  phoneRequired:
    "Verify your phone or email before publishing. Save a draft to keep your progress.",
  invalid:
    "Check the title, description, price, category and location before publishing.",
  invalidAttribute:
    "Check the category-specific fields and their allowed values.",
  requiredAttribute:
    "Complete the required category-specific fields before publishing.",
  attributeChanged: "The category fields changed. Reload the editor.",
  uploadFailed:
    "A photo could not be processed. Use JPEG, PNG, WebP or AVIF images under 8 MB.",
  discarded: "Draft discarded.",
  attributes: "Category fields",
  manageAttributes: "Manage category fields",
  attributeName: "English label",
  myanmarName: "Myanmar label",
  attributeKey: "Field key",
  attributeType: "Field type",
  choices: "Choices (one per line)",
  enabled: "Enabled",
  position: "Position",
  saveAttribute: "Save field",
  addAttribute: "Add field",
  newAttribute: "New category field",
  attributeSaved: "Category field saved.",
  adminHelp:
    "Fields are inherited by subcategories. New required fields apply when listings are next published or edited. Disabling a field removes it from future edits; existing listing values stay in history.",
  noAttributes: "This category has no additional fields.",
  saving: "Saving…",
  create: "Create listing",
  edit: "Edit listing",
  updated: "Listing updated.",
  discardDescription:
    "This permanently removes this private draft. Its photos are queued for deletion.",
  choose: "Choose",
  invalidConfig:
    "Check the field labels, key and choices. Existing field category, key and type cannot change.",
};
const my: typeof en = {
  drafts: "မူကြမ်းများ",
  saveDraft: "မူကြမ်းသိမ်းမယ်",
  saved: "မူကြမ်းသိမ်းပြီးပါပြီ။ သင်တစ်ဦးတည်းသာ မြင်နိုင်ပါသည်။",
  untitled: "ခေါင်းစဉ်မရှိသော မူကြမ်း",
  resume: "ဆက်ပြင်မယ်",
  discard: "မူကြမ်းဖျက်မယ်",
  discardConfirm: "မူကြမ်းနှင့် ဓာတ်ပုံများကို ဖျက်မလား။",
  details: "ပစ္စည်းအချက်အလက်",
  optional: "မဖြစ်မနေ မဟုတ်ပါ",
  required: "လိုအပ်သည်",
  yes: "ဟုတ်",
  no: "မဟုတ်",
  photos: "ဓာတ်ပုံများ",
  photoHelp:
    "ဓာတ်ပုံ ၁၀ ပုံအထိ ထည့်ပါ။ မြားခလုတ်များဖြင့် မျက်နှာဖုံးနှင့် အစီအစဉ်ရွေးပါ။ တစ်ပုံလျှင် 8 MB၊ စုစုပေါင်း 25 MB အထိ JPEG၊ PNG၊ WebP သို့မဟုတ် AVIF အသုံးပြုပါ။",
  addPhotos: "ဓာတ်ပုံထည့်မယ်",
  remove: "ဓာတ်ပုံဖယ်မယ်",
  earlier: "ဓာတ်ပုံကို ရှေ့ရွှေ့မယ်",
  later: "ဓာတ်ပုံကို နောက်ရွှေ့မယ်",
  cover: "မျက်နှာဖုံးဓာတ်ပုံ",
  draftHelp:
    "လုပ်ထားသည်များကို သီးသန့်သိမ်းပါ။ တင်ရန်အသင့်ဖြစ်မှ ဖုန်း သို့မဟုတ် အီးမေးလ် အတည်ပြုပါ။",
  photoCount:
    "တင်မည့်ပစ္စည်းအတွက် ဓာတ်ပုံ ၁–၁၀ ပုံ၊ မူကြမ်းအတွက် ၀–၁၀ ပုံ အသုံးပြုပါ။",
  photoOwnership:
    "ဓာတ်ပုံသည် ဤပစ္စည်း၏ ဓာတ်ပုံမဟုတ်ပါ။ ပြင်ဆင်စာမျက်နှာကို ပြန်ဖွင့်ပါ။",
  conflict: "အခြားစာမျက်နှာတွင် ပြင်ထားပါသည်။ မသိမ်းမီ ပြန်ဖွင့်ပါ။",
  notFound: "ဤမူကြမ်း သို့မဟုတ် ပစ္စည်းကို ပြင်၍မရပါ။",
  phoneRequired:
    "မတင်မီ ဖုန်း သို့မဟုတ် အီးမေးလ် အတည်ပြုပါ။ လုပ်ထားသည်များကို မူကြမ်းအဖြစ် သိမ်းနိုင်ပါသည်။",
  invalid: "ခေါင်းစဉ်၊ ဖော်ပြချက်၊ စျေး၊ အမျိုးအစားနှင့် နေရာကို စစ်ဆေးပါ။",
  invalidAttribute: "အမျိုးအစားအလိုက် အချက်အလက်များကို စစ်ဆေးပါ။",
  requiredAttribute: "မတင်မီ လိုအပ်သော အချက်အလက်များကို ဖြည့်ပါ။",
  attributeChanged:
    "အမျိုးအစားအချက်အလက်များ ပြောင်းထားပါသည်။ စာမျက်နှာကို ပြန်ဖွင့်ပါ။",
  uploadFailed:
    "ဓာတ်ပုံကို ပြင်ဆင်၍မရပါ။ 8 MB အောက် JPEG၊ PNG၊ WebP သို့မဟုတ် AVIF အသုံးပြုပါ။",
  discarded: "မူကြမ်း ဖျက်ပြီးပါပြီ။",
  attributes: "အမျိုးအစားအလိုက် အချက်အလက်",
  manageAttributes: "အမျိုးအစားအချက်အလက် စီမံမယ်",
  attributeName: "အင်္ဂလိပ်အမည်",
  myanmarName: "မြန်မာအမည်",
  attributeKey: "အချက်အလက်သော့",
  attributeType: "အချက်အလက်အမျိုးအစား",
  choices: "ရွေးချယ်စရာ (တစ်ကြောင်းလျှင် တစ်ခု)",
  enabled: "အသုံးပြုမယ်",
  position: "အစီအစဉ်",
  saveAttribute: "သိမ်းမယ်",
  addAttribute: "အချက်အလက် ထည့်မယ်",
  newAttribute: "အမျိုးအစားအချက်အလက်အသစ်",
  attributeSaved: "သိမ်းပြီးပါပြီ။",
  adminHelp:
    "အမျိုးအစားခွဲများတွင်လည်း သုံးနိုင်ပါသည်။ လိုအပ်သောအချက်အလက်အသစ်များသည် နောက်တစ်ကြိမ် တင်ခြင်း သို့မဟုတ် ပြင်ခြင်းတွင် သက်ရောက်ပါမည်။ ပိတ်ထားသောအချက်အလက်ကို နောက်ပြင်ရာတွင် မသုံးတော့ပါ။",
  noAttributes: "ဤအမျိုးအစားအတွက် အပိုအချက်အလက် မရှိပါ။",
  saving: "သိမ်းနေသည်…",
  create: "ပစ္စည်းတင်မယ်",
  edit: "ပစ္စည်းပြင်မယ်",
  updated: "ပစ္စည်းပြင်ပြီးပါပြီ။",
  discardDescription:
    "ဤသီးသန့်မူကြမ်းကို အပြီးဖျက်ပါမည်။ ဓာတ်ပုံများကိုလည်း ဖျက်ရန် စီစဉ်ပါမည်။",
  choose: "ရွေးပါ",
  invalidConfig:
    "အမည်၊ သော့နှင့် ရွေးချယ်စရာများကို စစ်ဆေးပါ။ ရှိပြီးသားအချက်အလက်၏ အမျိုးအစား၊ သော့နှင့် ပုံစံကို ပြောင်း၍မရပါ။",
};
export async function listingCopy() {
  return (await locale()) === "my" ? my : en;
}
