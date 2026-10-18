// Curated product vocabulary and common Latin spellings; not a general phonetic transliterator.
const groups = [
  ["phone", "mobile", "smartphone", "ဖုန်း", "လက်ကိုင်ဖုန်း"],
  ["chair", "ကုလားထိုင်", "kalarhtine"],
  ["table", "desk", "စားပွဲ"],
  ["bike", "bicycle", "စက်ဘီး"],
  ["laptop", "notebook", "လက်ပ်တော့"],
  ["computer", "ကွန်ပျူတာ", "ကွန်ပြူတာ", "konepyutar"],
  ["fridge", "refrigerator", "ရေခဲသေတ္တာ"],
  ["wardrobe", "ဗီရို"],
  ["bed", "အိပ်ရာ", "ကုတင်"],
  ["mattress", "မွေ့ရာ"],
  ["sofa", "couch", "ဆိုဖာ"],
  ["television", "tv", "တီဗီ", "ရုပ်မြင်သံကြား"],
  ["fan", "ပန်ကာ"],
  ["aircon", "အဲကွန်း"],
  ["washing", "washer", "အဝတ်လျှော်စက်"],
  ["book", "books", "စာအုပ်"],
  ["bag", "အိတ်"],
  ["shoes", "ဖိနပ်"],
  ["clothes", "အဝတ်အစား"],
  ["camera", "ကင်မရာ"],
  ["speaker", "စပီကာ"],
  ["headphones", "earphones", "နားကြပ်"],
  ["watch", "နာရီ"],
  ["stroller", "ကလေးတွန်းလှည်း"],
  ["ricecooker", "ထမင်းပေါင်းအိုး"],
  ["microwave", "မိုက်ခရိုဝေ့"],
  ["printer", "ပရင်တာ"],
  ["guitar", "ဂစ်တာ"],
  ["battery", "ဘက်ထရီ"],
  ["charger", "အားသွင်းကြိုး", "အားသွင်းစက်"],
  ["free", "အခမဲ့"],
];
export function searchAlternatives(term: string) {
  return groups.find((g) => g.includes(term)) ?? [term];
}
export function fuzzyEnglish(term: string) {
  return /^[a-z]{4,40}$/.test(term);
}

export const vocabularyTokens = groups
  .flat()
  .filter((t) => /[\u1000-\u109f]/u.test(t))
  .sort((a, b) => b.length - a.length);
