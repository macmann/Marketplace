import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePhone,
  passwordSchema,
  otpCodeSchema,
  challengeCookie,
} from "../lib/account-validation";
test("Myanmar phone normalization accepts local and E.164 mobile formats", () => {
  assert.equal(normalizePhone("09 123 456 789"), "+959123456789");
  assert.equal(normalizePhone("+95 (9) 123-456-789"), "+959123456789");
  for (const v of [
    "0912",
    "+15551234567",
    "abc",
    "+9591234567899999999",
    "9123456789",
  ])
    assert.equal(normalizePhone(v), null);
});
test("password validation enforces bcrypt byte limit for Burmese passwords", () => {
  assert.equal(passwordSchema.safeParse("က".repeat(24)).success, true);
  assert.equal(passwordSchema.safeParse("က".repeat(25)).success, false);
  assert.equal(passwordSchema.safeParse("a".repeat(72)).success, true);
  assert.equal(passwordSchema.safeParse("a".repeat(73)).success, false);
  assert.equal(passwordSchema.safeParse("short").success, false);
});
test("OTP formats and purpose cookies are distinct", () => {
  assert.equal(otpCodeSchema.safeParse("123456").success, true);
  for (const v of ["123", "12345678901", "<script>", "abcd"])
    assert.equal(otpCodeSchema.safeParse(v).success, false);
  assert.equal(new Set(Object.values(challengeCookie)).size, 3);
});
