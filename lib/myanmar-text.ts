import { vocabularyTokens } from "./search";
import tools from "myanmar-tools";
const detector = new tools.ZawgyiDetector(),
  converter = new tools.ZawgyiConverter();
export function unicodeMyanmar(input: string) {
  const text = input.normalize("NFC");
  return (
    /[\u1000-\u109f]/u.test(text) && detector.getZawgyiProbability(text) > 0.95
      ? converter.zawgyiToUnicode(text)
      : text
  ).normalize("NFC");
}
export function normalizeIndex(input: string) {
  return unicodeMyanmar(input)
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[၀-၉]/g, (c) => String(c.charCodeAt(0) - 0x1040))
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
const stop = new Set([
  "a",
  "the",
  "and",
  "for",
  "sale",
  "buy",
  "sell",
  "near",
  "me",
  "with",
  "ရောင်း",
  "မယ်",
  "ဝယ်",
  "ချင်",
  "ပါ",
  "ပါတယ်",
  "ရန်",
  "နှင့်",
  "တယ်",
  "ပေး",
  "ကောင်း",
]);
export function searchTerms(input: string) {
  const normalized = normalizeIndex(input).slice(0, 100);
  let prepared = normalized;
  const substitutions = new Map<string, string>();
  for (const [i, term] of vocabularyTokens.entries())
    if (prepared.includes(term)) {
      const marker = "vocab" + i;
      substitutions.set(marker, term);
      prepared = prepared.split(term).join(" " + marker + " ");
    }
  const tokens = Array.from(
    new Intl.Segmenter("my", { granularity: "word" }).segment(prepared),
  )
    .filter((s) => s.isWordLike)
    .map((s) => substitutions.get(s.segment) ?? s.segment);
  const meaningful = tokens.filter((t) => !stop.has(t));
  return [...new Set(meaningful.length ? meaningful : [normalized])]
    .filter(Boolean)
    .slice(0, 8);
}
