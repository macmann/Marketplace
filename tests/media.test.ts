import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { imageVariants, hashDistance } from "../lib/image-analysis";
import { OpenAiModerator, textRiskReasons } from "../lib/automated-moderation";
import {
  normalizeIndex,
  unicodeMyanmar,
  searchTerms,
} from "../lib/myanmar-text";
import tools from "myanmar-tools";
import { uiFor, uiMessages } from "../lib/ui-copy";
import { readFile } from "node:fs/promises";
test("worker variants strip metadata, rotate photos, cap dimensions and ignore low-information perceptual hashes", async () => {
  const input = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "#123456" },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const v = await imageVariants(input);
  assert.equal(v.width, 800);
  assert.equal(v.height, 1600);
  assert.equal(v.perceptualHash, null);
  for (const [buffer, max] of [
    [v.original, 1600],
    [v.card, 640],
    [v.thumb, 320],
  ] as const) {
    const m = await sharp(buffer).metadata();
    assert.equal(m.format, "webp");
    assert.ok(Math.max(m.width!, m.height!) <= max);
    assert.equal(m.exif, undefined);
  }
  const transparent = await sharp({
    create: {
      width: 30,
      height: 20,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
  assert.equal((await imageVariants(transparent)).perceptualHash, null);
  assert.equal(v.sha256.length, 64);
  assert.equal(hashDistance("0".repeat(16), "0".repeat(15) + "f"), 4);
  assert.equal(hashDistance("invalid", "also invalid"), 64);
  await assert.rejects(imageVariants(Buffer.from("not an image")));
});
test("OpenAI adapter sends only processed photos and fails closed on malformed responses, outages and missing keys", async () => {
  const photo = await sharp({
    create: { width: 50, height: 40, channels: 3, background: "#777" },
  })
    .webp()
    .toBuffer();
  let calls = 0;
  const provider = new OpenAiModerator("fixture-key", async (url, init) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/moderations");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "omni-moderation-latest");
    assert.ok(
      body.input[1].image_url.url.startsWith("data:image/jpeg;base64,"),
    );
    return Response.json({
      results: [
        { flagged: true, categories: { violence: true, sexual: false } },
      ],
    });
  });
  assert.deepEqual(
    await provider.review({ text: "Fixture title", images: [photo] }),
    ["provider:violence"],
  );
  assert.equal(calls, 1);
  await assert.rejects(
    new OpenAiModerator("", async () => {
      throw Error("must not call");
    }).review({ text: "x", images: [] }),
  );
  for (const response of [
    Response.json({ results: [{ flagged: false }] }),
    Response.json({ results: [] }),
    new Response("", { status: 503 }),
  ])
    await assert.rejects(
      new OpenAiModerator("fixture-key", async () => response).review({
        text: "x",
        images: [],
      }),
    );
});
test("local fraud signals flag credential requests, repeated spam and advance-payment demands without blocking ordinary prose", () => {
  assert.ok(
    textRiskReasons("Phone", "Please send your OTP code").includes(
      "risk:credentials",
    ),
  );
  assert.ok(
    textRiskReasons(
      "Chair",
      "Advance payment required before viewing",
    ).includes("risk:advance_payment"),
  );
  assert.ok(
    textRiskReasons("Sale", "a".repeat(20)).includes(
      "risk:repeated_characters",
    ),
  );
  assert.deepEqual(
    textRiskReasons(
      "Wooden chair",
      "Inspect the item before paying in person.",
    ),
    [],
  );
});
test("Myanmar search normalizes high-confidence Zawgyi, zero-width characters, digits and unspaced product queries", () => {
  const unicode = "မြန်မာဘာသာဖြင့် ရေးသားထားသော စာအုပ်များ";
  const zawgyi = new tools.ZawgyiConverter().unicodeToZawgyi(unicode);
  assert.equal(unicodeMyanmar(zawgyi), unicode);
  assert.equal(normalizeIndex("ဖု\u200bန်း ၁၂၈ GB"), "ဖုန်း 128 gb");
  assert.deepEqual(searchTerms("ဖုန်းကောင်းရောင်းမယ်"), ["ဖုန်း"]);
  assert.ok(searchTerms("အဝတ်လျှော်စက် ရောင်းမယ်").includes("အဝတ်လျှော်စက်"));
  assert.equal(unicodeMyanmar("ကုလားထိုင်"), "ကုလားထိုင်");
  assert.equal(uiFor("my")("Approve"), "အတည်ပြုရန်");
  assert.equal(uiFor("en")("Approve"), "Approve");
});
test("vendored national reference has 330 unique townships and a complete acyclic bilingual hierarchy", async () => {
  const data = JSON.parse(
    await readFile("data/myanmar-locations.json", "utf8"),
  );
  const rows = data.locations as {
    id: string;
    parent_id: string;
    kind: string;
    name_en: string;
    name_my: string;
  }[];
  const ids = new Set(rows.map((l) => l.id));
  assert.equal(ids.size, rows.length);
  assert.equal(rows.filter((l) => l.kind === "TOWNSHIP").length, 330);
  assert.equal(rows.filter((l) => l.kind === "REGION").length, 15);
  for (const row of rows) {
    assert.ok(row.name_en && row.name_my);
    assert.ok(/[\u1000-\u109f]/.test(row.name_my));
    assert.ok(row.parent_id === "mm" || ids.has(row.parent_id));
    let current = row;
    const seen = new Set<string>();
    while (current.parent_id !== "mm") {
      assert.ok(!seen.has(current.id));
      seen.add(current.id);
      current = rows.find((r) => r.id === current.parent_id)!;
    }
  }
  assert.equal(data.legacy_aliases.length, 8);
  for (const alias of data.legacy_aliases)
    assert.ok(ids.has(alias.canonical_id));
  assert.ok(Object.keys(uiMessages).length > 100);
});
