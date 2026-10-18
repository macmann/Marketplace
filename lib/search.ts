// A small reviewed vocabulary; this is query expansion, not Myanmar tokenization or transliteration.
const groups = [
  ["phone", "ဖုန်း"],
  ["chair", "ကုလားထိုင်"],
  ["table", "စားပွဲ"],
  ["bike", "bicycle", "စက်ဘီး"],
  ["laptop", "လက်ပ်တော့"],
];
export function searchAlternatives(term: string) {
  return groups.find((g) => g.includes(term)) ?? [term];
}
export function fuzzyEnglish(term: string) {
  return /^[a-z]{4,40}$/.test(term);
}
