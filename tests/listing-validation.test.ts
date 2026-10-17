import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  emptyPayload,
  validatePayload,
  validateAttributes,
  validatePhotoOrder,
  ListingError,
  type Attribute,
} from "../lib/listing-validation";
const attribute = (type: Attribute["type"], required = false): Attribute => ({
  id: randomUUID(),
  category_id: "home",
  key: "field",
  name_en: "Field",
  name_my: "Field",
  type,
  choices: ["Wood", "Metal"],
  required,
  enabled: true,
  position: 0,
});
test("drafts allow incomplete content but publishing validates required fields and positive sale price", () => {
  assert.equal(validatePayload(emptyPayload, false).title, "");
  assert.throws(() => validatePayload(emptyPayload, true), ListingError);
  const p = {
    ...emptyPayload,
    title: "Good chair",
    description: "Solid chair in good condition",
    category: "home",
    location: "sanchaung",
    price: "12000",
  };
  assert.equal(validatePayload(p, true).price, "12000");
  assert.equal(
    validatePayload({ ...p, type: "FREE", price: "12000" }, true).price,
    "0",
  );
  assert.equal(
    validatePayload({ ...p, type: "FREE", price: "-1" }, true).price,
    "0",
  );
  assert.throws(
    () => validatePayload({ ...p, price: "-1" }, false),
    ListingError,
  );
});
test("typed category fields validate false, zero, enums and real calendar dates", () => {
  for (const [type, good, bad] of [
    ["BOOLEAN", "false", "yes"],
    ["NUMBER", "0", "NaN"],
    ["ENUM", "Wood", "Plastic"],
    ["DATE", "2024-02-29", "2025-02-29"],
  ] as const) {
    const d = attribute(type);
    assert.equal(
      Object.keys(validateAttributes({ [d.id]: good }, [d], true)).length,
      1,
    );
    assert.throws(
      () => validateAttributes({ [d.id]: bad }, [d], true),
      ListingError,
    );
  }
  const d = attribute("TEXT", true);
  assert.deepEqual(validateAttributes({}, [d], false), {});
  assert.throws(() => validateAttributes({}, [d], true), ListingError);
  assert.throws(
    () => validateAttributes({ [randomUUID()]: "Foreign" }, [d], true),
    ListingError,
  );
});
test("photo ordering rejects foreign IDs, duplicates, missing uploads and count violations", () => {
  const ids = [randomUUID(), randomUUID()];
  assert.deepEqual(
    validatePhotoOrder([ids[1], "new:0", ids[0]], ids, 1, true),
    [ids[1], "new:0", ids[0]],
  );
  for (const order of [
    [randomUUID()],
    [ids[0], ids[0]],
    [],
    Array.from({ length: 11 }, (_, i) => "new:" + i),
  ])
    assert.throws(() => validatePhotoOrder(order, ids, 0, true), ListingError);
  assert.throws(() => validatePhotoOrder(ids, ids, 1, true), ListingError);
  assert.deepEqual(validatePhotoOrder([], ids, 0, false), []);
});
