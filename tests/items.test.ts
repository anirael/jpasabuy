import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldErrorsOf, isSecured, itemSchema, MAX_ITEMS_PER_SUBMIT } from "@/lib/item-schema";

const CUSTOMER = "11111111-2222-4333-8444-555555555555";
const base = {
  mercariUrl: "https://jp.mercari.com/item/m12345678",
  imageUrl: "",
  jpPrice: "3500",
  rate: "0.45",
  pasabuyerRate: "0.42",
  customerId: CUSTOMER,
  newCustomerName: "",
  newCustomerAddress: "",
  notes: "",
  status: "JP_ADDRESS",
  secured: false,
};

test("a complete draft is accepted (both Mercari formats)", () => {
  assert.ok(itemSchema.safeParse(base).success);
  assert.ok(itemSchema.safeParse({ ...base, mercariUrl: "https://jp.mercari.com/en/item/m1" }).success);
});

test("jpPrice is coerced from the string typed in the form", () => {
  const r = itemSchema.safeParse(base);
  assert.ok(r.success && r.data.jpPrice === 3500);
});

test("invalid drafts report per-field errors", () => {
  const r = itemSchema.safeParse({ ...base, mercariUrl: "not a link", jpPrice: "abc", rate: "0.99", pasabuyerRate: "0.99", customerId: "" });
  assert.ok(!r.success);
  const fe = fieldErrorsOf(r.error);
  for (const k of ["mercariUrl", "jpPrice", "rate", "pasabuyerRate", "customerId"]) assert.ok(fe[k], `expected an error for ${k}`);
});

test("price, rate and Pasabuyer rate are optional and blank becomes null", () => {
  for (const blank of ["", "  ", undefined, null]) {
    const r = itemSchema.safeParse({ ...base, jpPrice: blank, rate: blank, pasabuyerRate: blank });
    assert.ok(r.success, String(blank));
    assert.deepEqual([r.data.jpPrice, r.data.rate, r.data.pasabuyerRate], [null, null, null]);
  }
  const r = itemSchema.safeParse({ ...base, jpPrice: "", rate: "0.45", pasabuyerRate: "" });
  assert.ok(r.success && r.data.jpPrice === null && r.data.rate === "0.45" && r.data.pasabuyerRate === null);
});

test("new customer needs a name; existing customer id must be a uuid", () => {
  assert.ok(!itemSchema.safeParse({ ...base, customerId: "new" }).success);
  assert.ok(itemSchema.safeParse({ ...base, customerId: "new", newCustomerName: "  Ana  " }).success);
  assert.ok(!itemSchema.safeParse({ ...base, customerId: "not-a-uuid" }).success);
});

test("price must be a positive whole number of yen", () => {
  for (const bad of ["0", "-5", "12.5", "abc", "100000000"]) assert.ok(!itemSchema.safeParse({ ...base, jpPrice: bad }).success, bad);
});

test("secured accepts the checkbox string or a boolean", () => {
  assert.equal(isSecured("on"), true);
  assert.equal(isSecured(true), true);
  assert.equal(isSecured(false), false);
  assert.equal(isSecured(undefined), false);
  assert.ok(itemSchema.safeParse({ ...base, secured: "on" }).success);
});

test("status must be a known status", () => {
  assert.ok(!itemSchema.safeParse({ ...base, status: "LOST" }).success);
  assert.ok(MAX_ITEMS_PER_SUBMIT >= 10);
});

test("non-Mercari links and shop products are accepted", () => {
  for (const u of ["https://example.com/thing/1", "https://jp.mercari.com/shops/product/123qwerty345", "http://shop.example.jp/x?y=1"]) {
    assert.ok(itemSchema.safeParse({ ...base, mercariUrl: u }).success, u);
  }
  assert.ok(!itemSchema.safeParse({ ...base, mercariUrl: "javascript:alert(1)" }).success);
});
