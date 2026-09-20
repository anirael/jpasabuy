import { test } from "node:test";
import assert from "node:assert/strict";
import { findSimilarCustomers, normalizeText } from "@/lib/customer-match";
import { getPaging, pageWindow } from "@/lib/pagination";

const customers = [
  { id: "1", name: "Maria Santos", shipping_address: "12 Rizal St, Cebu City" },
  { id: "2", name: "Juan Dela Cruz", shipping_address: "" },
  { id: "3", name: "Al", shipping_address: "" },
];

test("normalizeText ignores case, punctuation and extra spaces", () => {
  assert.equal(normalizeText("  Juan  DELA-Cruz. "), "juan dela cruz");
});

test("same name and address is an exact duplicate", () => {
  const m = findSimilarCustomers(customers, " maria  SANTOS", "12 rizal st., cebu city");
  assert.equal(m.length, 1);
  assert.ok(m[0].exact && m[0].sameName && m[0].sameAddress);
});

test("same name with a different address is a warning, not an exact duplicate", () => {
  const [m] = findSimilarCustomers(customers, "Maria Santos", "Manila");
  assert.ok(m.sameName && !m.exact);
});

test("blank addresses on both sides count as the same address", () => {
  assert.ok(findSimilarCustomers(customers, "juan dela cruz", "")[0].exact);
});

test("a similar name and a shared address are flagged; short names never match partially", () => {
  assert.equal(findSimilarCustomers(customers, "Maria Santos Jr.", "Manila")[0].id, "1");
  assert.equal(findSimilarCustomers(customers, "M. Santos", "12 Rizal St, Cebu City")[0].sameAddress, true);
  assert.equal(findSimilarCustomers(customers, "Alan", "").length, 0);
});

test("the customer being edited does not match itself", () => {
  assert.equal(findSimilarCustomers(customers, "Maria Santos", "12 Rizal St, Cebu City", "1").length, 0);
});

test("getPaging clamps the page and rejects unknown page sizes", () => {
  assert.deepEqual(getPaging({}, 60), { page: 1, perPage: 25, totalPages: 3, total: 60, start: 0, end: 25 });
  assert.equal(getPaging({ page: "9" }, 60).page, 3);
  assert.equal(getPaging({ page: "3" }, 60).end, 60);
  assert.equal(getPaging({ perPage: "50" }, 60).totalPages, 2);
  assert.equal(getPaging({ perPage: "7", page: "-1" }, 60).perPage, 25);
  assert.deepEqual(getPaging({}, 0), { page: 1, perPage: 25, totalPages: 1, total: 0, start: 0, end: 0 });
});

test("pageWindow shows the ends and the neighbours of the current page", () => {
  assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
  assert.deepEqual(pageWindow(10, 20), [1, null, 8, 9, 10, 11, 12, null, 20]);
  assert.deepEqual(pageWindow(4, 20), [1, 2, 3, 4, 5, 6, null, 20]);
});
