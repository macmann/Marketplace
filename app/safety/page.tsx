import { locale } from "@/lib/i18n";
export default async function Safety() {
  const my = (await locale()) === "my";
  return (
    <section className="wrap page narrow">
      <h1>{my ? "ဈေးကွက် လုံခြုံရေး" : "Marketplace safety"}</h1>
      <div className="panel stack">
        {my ? (
          <>
            <h2>လုံခြုံစွာ ရောင်းဝယ်ပါ</h2>
            <p>
              အများပြည်သူရှိသော နေရာတွင် တွေ့ဆုံပါ။ ပစ္စည်းကို စစ်ဆေးပြီးမှ
              ငွေပေးချေပါ။ စကားဝှက်၊ OTP ကုဒ်နှင့် ဘဏ်အချက်အလက်များကို
              မမျှဝေပါနှင့်။
            </p>
            <h2>တားမြစ်ထားသော ပစ္စည်းများ</h2>
            <p>
              မူးယစ်ဆေးဝါး၊ လက်နက်၊ ခိုးရာပါပစ္စည်း၊ အတုပစ္စည်းနှင့်
              ဥပဒေနှင့်မညီသော ပစ္စည်းများကို မတင်ပါနှင့်။
            </p>
            <h2>ပြဿနာ တိုင်ကြားရန်</h2>
            <p>
              ကြော်ငြာ၊ အသုံးပြုသူ သို့မဟုတ် စာကို တိုင်ကြားနိုင်ပါသည်။
              မလိုလားအပ်သော အဆက်အသွယ်ကို ပိတ်နိုင်ပါသည်။
            </p>
          </>
        ) : (
          <>
            <h2>Trade safely</h2>
            <p>
              Meet in a public place and inspect the item before paying. Never
              share passwords, OTP codes or banking credentials. Neighbour does
              not provide escrow, payment protection or delivery.
            </p>
            <h2>Prohibited goods</h2>
            <p>
              Do not list illegal drugs, weapons, stolen goods, counterfeit
              products, illegal wildlife products, adult services or anything
              unlawful in your location. Misleading listings, harassment and
              spam are prohibited.
            </p>
            <h2>Report a problem</h2>
            <p>
              Use Report listing on an item, Report user on a seller profile or
              thread, or Report message on an incoming message. Block unwanted
              contacts. Our team can review reports, remove content and suspend
              accounts. A phone badge confirms phone verification; inspect each
              offer carefully.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
