import { normalizeIndex } from "./myanmar-text";
import { hashDistance } from "./image-analysis";
export type ModerationInput = { text: string; images: Buffer[] };
export interface ContentModerator {
  review(input: ModerationInput): Promise<string[]>;
}
export class OpenAiModerator implements ContentModerator {
  constructor(
    private key = process.env.OPENAI_API_KEY,
    private fetcher: typeof fetch = fetch,
  ) {}
  async review(input: ModerationInput) {
    if (!this.key) throw Error("provider_unconfigured");
    const images = await Promise.all(
      input.images.map(async (b) => {
        const sharp = (await import("sharp")).default;
        return (
          await sharp(b)
            .resize(512, 512, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toBuffer()
        ).toString("base64");
      }),
    );
    const response = await this.fetcher(
      "https://api.openai.com/v1/moderations",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + this.key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "omni-moderation-latest",
          input: [
            { type: "text", text: input.text },
            ...images.map((data) => ({
              type: "image_url",
              image_url: { url: "data:image/jpeg;base64," + data },
            })),
          ],
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) throw Error("provider_unavailable");
    const payload = (await response.json()) as {
      results?: { flagged?: unknown; categories?: Record<string, unknown> }[];
    };
    if (
      !Array.isArray(payload.results) ||
      payload.results.length !== 1 ||
      typeof payload.results[0]?.flagged !== "boolean"
    )
      throw Error("provider_invalid");
    const result = payload.results[0];
    if (
      !result.categories ||
      typeof result.categories !== "object" ||
      Object.values(result.categories).some((v) => typeof v !== "boolean")
    )
      throw Error("provider_invalid");
    if (!result.flagged) return [];
    const categories = Object.entries(result.categories ?? {})
      .filter(([, value]) => value === true)
      .map(([category]) => category);
    return categories.length
      ? categories.map((c) => "provider:" + c)
      : ["provider:flagged"];
  }
}
export function textRiskReasons(title: string, description: string) {
  const text = normalizeIndex(title + " " + description);
  const reasons: string[] = [];
  if (
    /(?:send|share|give).{0,30}(?:otp|verification code|password)/i.test(
      text,
    ) ||
    /(?:otp|စကားဝှက်).{0,30}(?:ပေး|ပို့)/u.test(text)
  )
    reasons.push("risk:credentials");
  if (
    /(?:deposit|advance payment).{0,30}(?:only|required|before viewing)/i.test(
      text,
    )
  )
    reasons.push("risk:advance_payment");
  if (
    /(?:https?:\/\/|www\.)/g.test(text) &&
    (text.match(/(?:https?:\/\/|www\.)/g)?.length ?? 0) > 3
  )
    reasons.push("risk:link_spam");
  if (/(.)\1{14,}/u.test(text)) reasons.push("risk:repeated_characters");
  return reasons;
}
export function similarImages(
  a: { sha256: string | null; perceptual_hash: string | null },
  b: { sha256: string | null; perceptual_hash: string | null },
) {
  return (
    Boolean(a.sha256 && a.sha256 === b.sha256) ||
    Boolean(
      a.perceptual_hash &&
      b.perceptual_hash &&
      hashDistance(a.perceptual_hash, b.perceptual_hash) <= 5,
    )
  );
}
