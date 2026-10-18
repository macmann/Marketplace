import { test, after } from "node:test";
import assert from "node:assert/strict";
import { SmtpEmailProvider, emailConfigured } from "../lib/email";
const names = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "EMAIL_FROM",
];
const original = Object.fromEntries(names.map((n) => [n, process.env[n]]));
after(() => {
  for (const name of names) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
});
test("SMTP delivery requires configuration, enforces TLS, sends a bounded bilingual code and rejects failed recipients", async () => {
  for (const name of names) delete process.env[name];
  assert.equal(emailConfigured(), false);
  let calls = 0;
  const smtp = new SmtpEmailProvider((options) => {
    calls++;
    assert.equal(options.requireTLS, true);
    assert.equal(options.secure, false);
    assert.deepEqual(options.tls, {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    });
    assert.equal(options.disableFileAccess, true);
    assert.equal(options.disableUrlAccess, true);
    return {
      sendMail: async (message) => {
        assert.equal(message.to, "member@example.test");
        assert.match(message.text, /123456/);
        assert.match(message.text, /10 minutes/);
        assert.match(message.text, /အတည်ပြုကုဒ်/);
        return { accepted: [message.to], rejected: [] };
      },
    };
  });
  await assert.rejects(smtp.send("member@example.test", "123456", "VERIFY"));
  assert.equal(calls, 0);
  process.env.SMTP_HOST = "smtp.example.test";
  process.env.EMAIL_FROM = "no-reply@example.test";
  assert.equal(emailConfigured(), true);
  await smtp.send("member@example.test", "123456", "VERIFY");
  assert.equal(calls, 1);
  await assert.rejects(
    smtp.send(
      "member@example.test\nBcc: victim@example.test",
      "123456",
      "VERIFY",
    ),
  );
  await assert.rejects(
    new SmtpEmailProvider(() => ({
      sendMail: async () => ({
        accepted: [],
        rejected: ["member@example.test"],
      }),
    })).send("member@example.test", "123456", "RECOVER"),
  );
  process.env.SMTP_PORT = "465";
  await new SmtpEmailProvider((options) => {
    assert.equal(options.secure, true);
    assert.equal(options.requireTLS, false);
    return { sendMail: async () => ({ accepted: ["member@example.test"] }) };
  }).send("member@example.test", "123456", "RECOVER");
  process.env.SMTP_USER = "account";
  assert.equal(emailConfigured(), false);
});
