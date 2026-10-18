import { test } from "node:test";
import assert from "node:assert/strict";
import {
  listingSchema,
  accountSchema,
  canTransition,
  normalizeSearch,
} from "../lib/validation";
const valid = {
  title: "Wooden chair",
  description: "Solid wood chair in good condition.",
  category: "home",
  location: "sanchaung",
  type: "SALE",
  price: 25000,
  condition: "GOOD",
};
test("sale price must be a positive integer and MMK is bounded", () => {
  assert.equal(listingSchema.safeParse(valid).success, true);
  for (const price of [0, -1, 2.5, Infinity, 1e15])
    assert.equal(listingSchema.safeParse({ ...valid, price }).success, false);
});
test("giveaways have explicit type and accept zero price", () => {
  assert.equal(
    listingSchema.safeParse({ ...valid, type: "FREE", price: 0 }).success,
    true,
  );
  assert.equal(
    listingSchema.safeParse({ ...valid, type: "SWAP" }).success,
    false,
  );
});
test("listing content and conditions are validated", () => {
  assert.equal(
    listingSchema.safeParse({ ...valid, title: "a" }).success,
    false,
  );
  assert.equal(
    listingSchema.safeParse({ ...valid, condition: "PERFECT" }).success,
    false,
  );
  assert.equal(
    listingSchema.safeParse({ ...valid, description: "short" }).success,
    false,
  );
});
test("removed and sold listings cannot be republished by seller", () => {
  assert.equal(canTransition("ACTIVE", "RESERVED"), true);
  assert.equal(canTransition("RESERVED", "ACTIVE"), true);
  assert.equal(canTransition("ACTIVE", "SOLD"), true);
  assert.equal(canTransition("REMOVED", "ACTIVE"), false);
  assert.equal(canTransition("SOLD", "ACTIVE"), false);
  assert.equal(canTransition("ACTIVE", "REJECTED"), false);
});
test("accounts normalize email and require a strong length", () => {
  const a = accountSchema.parse({
    name: "ZaySine",
    email: "TEST@example.com",
    password: "long-enough-password",
  });
  assert.equal(a.email, "test@example.com");
  assert.equal(
    accountSchema.safeParse({ ...a, password: "short" }).success,
    false,
  );
});
test("Burmese and mixed English search preserve Unicode", () => {
  assert.equal(normalizeSearch("  Samsung   ဖုန်း  "), "Samsung ဖုန်း");
  assert.equal(normalizeSearch("က".repeat(200)).length, 100);
});
