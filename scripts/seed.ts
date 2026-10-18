import { pool, query } from "../lib/db";
import { hash } from "bcryptjs";
const categories = [
  ["electronics", "Electronics", "အီလက်ထရွန်နစ်"],
  ["home", "Home & Furniture", "အိမ်နှင့်ပရိဘောဂ"],
  ["appliances", "Appliances", "အိမ်သုံးပစ္စည်း"],
  ["fashion", "Fashion", "ဖက်ရှင်"],
  ["kids", "Baby & Kids", "ကလေးအသုံးအဆောင်"],
  ["sports", "Sports & Outdoors", "အားကစား"],
  ["books", "Books & Education", "စာအုပ်နှင့်ပညာရေး"],
  ["hobbies", "Hobbies & Collectibles", "ဝါသနာနှင့်စုဆောင်းစရာ"],
  ["bicycles", "Bicycles", "စက်ဘီး"],
  ["beauty", "Beauty & Personal Care", "အလှအပ"],
  ["tools", "Tools & DIY", "ကိရိယာများ"],
  ["office", "Office Equipment", "ရုံးသုံးပစ္စည်း"],
  ["pets", "Pet Supplies", "အိမ်မွေးတိရစ္ဆာန်အသုံးအဆောင်"],
  ["other", "Other", "အခြား"],
];
try {
  for (const [i, c] of categories.entries())
    await query(
      "INSERT INTO categories(id,name_en,name_my,position) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [...c, i],
    );
  for (const c of [
    ["mm", "Myanmar", "မြန်မာ", null, "COUNTRY"],
    ["yangon-region", "Yangon Region", "ရန်ကုန်တိုင်း", "mm", "REGION"],
    ["yangon", "Yangon", "ရန်ကုန်", "yangon-region", "CITY"],
    [
      "sanchaung",
      "Sanchaung, Yangon",
      "စမ်းချောင်း၊ ရန်ကုန်",
      "yangon",
      "TOWNSHIP",
    ],
    ["kamayut", "Kamayut, Yangon", "ကမာရွတ်၊ ရန်ကုန်", "yangon", "TOWNSHIP"],
    ["bahan", "Bahan, Yangon", "ဗဟန်း၊ ရန်ကုန်", "yangon", "TOWNSHIP"],
    ["tamwe", "Tamwe, Yangon", "တာမွေ၊ ရန်ကုန်", "yangon", "TOWNSHIP"],
    ["yankin", "Yankin, Yangon", "ရန်ကင်း၊ ရန်ကုန်", "yangon", "TOWNSHIP"],
    ["hlaing", "Hlaing, Yangon", "လှိုင်၊ ရန်ကုန်", "yangon", "TOWNSHIP"],
    ["mandalay-region", "Mandalay Region", "မန္တလေးတိုင်း", "mm", "REGION"],
    ["mandalay", "Mandalay", "မန္တလေး", "mandalay-region", "CITY"],
  ])
    await query(
      "INSERT INTO locations(id,name_en,name_my,parent_id,kind) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
      c,
    );
  await query(`INSERT INTO category_attributes(category_id,key,name_en,name_my,type,choices,position) VALUES
 ('electronics','brand','Brand','အမှတ်တံဆိပ်','TEXT','[]',0),
 ('electronics','model','Model','မော်ဒယ်','TEXT','[]',1),
 ('electronics','storage','Storage','သိုလှောင်မှုပမာဏ','ENUM','["32 GB","64 GB","128 GB","256 GB","512 GB","1 TB","Other"]',2),
 ('home','material','Material','ပစ္စည်းအမျိုးအစား','TEXT','[]',0),
 ('home','dimensions','Dimensions','အတိုင်းအတာ','TEXT','[]',1),
 ('home','assembly_required','Assembly required','တပ်ဆင်ရန်လိုအပ်သည်','BOOLEAN','[]',2),
 ('fashion','size','Size','အရွယ်အစား','TEXT','[]',0),
 ('bicycles','wheel_size','Wheel size (inches)','ဘီးအရွယ်အစား (လက်မ)','NUMBER','[]',0)
ON CONFLICT(category_id,key) DO NOTHING;
`);
  for (const phrase of [
    "heroin",
    "cocaine",
    "methamphetamine",
    "firearm",
    "မူးယစ်ဆေး",
    "သေနတ်",
  ])
    await query(
      "INSERT INTO moderation_rules(phrase) VALUES($1) ON CONFLICT(phrase) DO NOTHING",
      [phrase],
    );
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    if (process.env.ADMIN_PASSWORD.length < 14)
      throw new Error("ADMIN_PASSWORD must contain at least 14 characters");
    await query(
      "INSERT INTO users(email,password_hash,name,role) VALUES($1,$2,'Administrator','ADMIN') ON CONFLICT(email) DO NOTHING",
      [
        process.env.ADMIN_EMAIL.toLowerCase(),
        await hash(process.env.ADMIN_PASSWORD, 12),
      ],
    );
  }
  console.log("Categories and locations ready. No demo inventory created.");
} finally {
  await pool.end();
}
