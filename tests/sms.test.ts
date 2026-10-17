import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TwilioVerificationProvider,
  VerificationUnavailable,
} from "../lib/sms";
const sid = "VE" + "a".repeat(32);
test("Twilio adapter sends SMS then checks the verification SID", async () => {
  const names = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_VERIFY_SERVICE_SID",
  ] as const;
  const saved = names.map((n) => process.env[n]);
  try {
    for (const n of names) process.env[n] = "test-fixture";
    let calls = 0;
    const transport: typeof fetch = async (url, init) => {
      assert.equal(
        String(url).startsWith("https://verify.twilio.com/v2/Services/"),
        true,
      );
      assert.equal(init?.method, "POST");
      const body = new URLSearchParams(init?.body as URLSearchParams);
      if (++calls === 1) {
        assert.equal(body.get("Channel"), "sms");
        assert.equal(body.get("To"), "+959123456789");
        return Response.json({ sid });
      }
      assert.equal(body.get("VerificationSid"), sid);
      assert.equal(body.get("To"), null);
      assert.equal(body.get("Code"), "123456");
      return Response.json({ status: "approved" });
    };
    const p = new TwilioVerificationProvider(transport);
    assert.equal(await p.start("+959123456789"), sid);
    assert.equal(await p.check(sid, "123456"), true);
    assert.equal(calls, 2);
  } finally {
    names.forEach((n, i) => {
      if (saved[i] === undefined) delete process.env[n];
      else process.env[n] = saved[i];
    });
  }
});
test("Twilio adapter fails closed for missing configuration, provider errors, malformed data, and expiry", async () => {
  const names = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_VERIFY_SERVICE_SID",
  ] as const;
  const saved = names.map((n) => process.env[n]);
  try {
    for (const n of names) delete process.env[n];
    let called = false;
    await assert.rejects(
      new TwilioVerificationProvider(async () => {
        called = true;
        return Response.json({ sid });
      }).start("+959123456789"),
      VerificationUnavailable,
    );
    assert.equal(called, false);
    for (const n of names) process.env[n] = "test-fixture";
    await assert.rejects(
      new TwilioVerificationProvider(
        async () => new Response("private provider error", { status: 500 }),
      ).start("+959123456789"),
      VerificationUnavailable,
    );
    await assert.rejects(
      new TwilioVerificationProvider(async () =>
        Response.json({ sid: "invalid" }),
      ).start("+959123456789"),
      VerificationUnavailable,
    );
    assert.equal(
      await new TwilioVerificationProvider(
        async () => new Response(null, { status: 404 }),
      ).check(sid, "123456"),
      false,
    );
    assert.equal(
      await new TwilioVerificationProvider(async () =>
        Response.json({ status: "pending" }),
      ).check(sid, "123456"),
      false,
    );
  } finally {
    names.forEach((n, i) => {
      if (saved[i] === undefined) delete process.env[n];
      else process.env[n] = saved[i];
    });
  }
});
