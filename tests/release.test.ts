import { test } from "node:test";
import assert from "node:assert/strict";
import { permits } from "../lib/permissions";
import { validateSubscription } from "../lib/push";
test("staff permissions deny unknown roles and keep support/moderation/configuration separate", () => {
  for (const role of ["USER", "SUPPORT", "MODERATOR", "ADMIN", "OWNER", ""]) {
    assert.equal(
      permits(role, "support"),
      ["SUPPORT", "MODERATOR", "ADMIN"].includes(role),
    );
    assert.equal(
      permits(role, "moderate"),
      ["MODERATOR", "ADMIN"].includes(role),
    );
    assert.equal(permits(role, "configure"), role === "ADMIN");
  }
});
test("push subscriptions reject private destinations, provider lookalikes, credentials and malformed keys", () => {
  const keys = { p256dh: "A".repeat(87), auth: "B".repeat(22) };
  for (const endpoint of [
    "https://fcm.googleapis.com/send/test",
    "https://updates.push.services.mozilla.com/wpush/v2/test",
    "https://web.push.apple.com/test",
  ])
    assert.equal(validateSubscription({ endpoint, keys }).endpoint, endpoint);
  for (const endpoint of [
    "http://fcm.googleapis.com/x",
    "https://127.0.0.1/x",
    "https://localhost/x",
    "https://fcm.googleapis.com.evil.test/x",
    "https://evil.test/?url=https://fcm.googleapis.com",
    "https://user:password@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
  ])
    assert.throws(() => validateSubscription({ endpoint, keys }));
  assert.throws(() =>
    validateSubscription({
      endpoint: "https://fcm.googleapis.com/send/test",
      keys: { auth: "x", p256dh: "x" },
    }),
  );
});

import { searchAlternatives, fuzzyEnglish } from "../lib/search";
test("query expansion is bounded and typo matching applies only to English words", () => {
  assert.ok(searchAlternatives("chair").includes("ကုလားထိုင်"));
  assert.deepEqual(searchAlternatives("unknown"), ["unknown"]);
  assert.equal(fuzzyEnglish("iphne"), true);
  for (const word of ["12", "က", "%___", "abc"])
    assert.equal(fuzzyEnglish(word), false);
});
