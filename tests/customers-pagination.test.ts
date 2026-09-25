import { test } from "node:test";
import assert from "node:assert/strict";
import { findSimilarCustomers, normalizeText } from "@/lib/customer-match";
import { getPaging, keepPerPage, loadPage, pageRange, pageWindow } from "@/lib/pagination";

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

// ---- server-side paging helpers (loadPage / pageRange / keepPerPage)

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
/**
 * A fake database with `total` rows that answers .range(from, to) with the slice and the exact count. Like PostgREST it
 * answers a range that starts past the end with a 416 error and no count (`pastEnd: "empty"` answers an empty 200 instead).
 */
const fakeDb = (total: number, pastEnd: "416" | "empty" = "416") => {
  const calls: { from: number; to: number }[] = [];
  const fetchPage = async (r: { from: number; to: number }) => {
    calls.push(r);
    if (r.from > 0 && r.from >= total && pastEnd === "416") return { data: null, count: null, error: { code: "PGRST103", message: "Requested range not satisfiable" } };
    return { data: rows(total).slice(r.from, r.to + 1), count: total, error: null };
  };
  return { calls, fetchPage };
};

test("pageRange is the inclusive range for .range()", () => {
  assert.deepEqual(pageRange(getPaging({ page: "2", perPage: "10" }, 100)), { from: 10, to: 19 });
  assert.deepEqual(pageRange(getPaging({}, 100)), { from: 0, to: 24 });
});

test("keepPerPage carries only a valid, non-default page size", () => {
  assert.deepEqual(keepPerPage(undefined), {});
  assert.deepEqual(keepPerPage("25"), {});
  assert.deepEqual(keepPerPage("7"), {});
  assert.deepEqual(keepPerPage("50"), { perPage: "50" });
});

test("loadPage asks for the page in the URL and needs one query when it exists", async () => {
  const db = fakeDb(60);
  const res = await loadPage({ page: "2", perPage: "25" }, db.fetchPage);
  assert.deepEqual(db.calls, [{ from: 25, to: 49 }]);
  assert.equal(res.rows.length, 25);
  assert.equal(res.rows[0].id, "25");
  assert.equal(res.paging.page, 2);
  assert.equal(res.paging.total, 60);
  assert.equal(res.failed, false);
});

test("a page past the end (416) is clamped and re-queried, so rows are still shown", async () => {
  const db = fakeDb(30);
  const res = await loadPage({ page: "9", perPage: "10" }, db.fetchPage);
  // asked page 9 -> 416; page 1 for the count; then the real last page (3)
  assert.deepEqual(db.calls, [{ from: 80, to: 89 }, { from: 0, to: 9 }, { from: 20, to: 29 }]);
  assert.equal(res.paging.page, 3);
  assert.equal(res.rows.length, 10);
  assert.equal(res.rows[0].id, "20");
  assert.equal(res.failed, false);
});

test("a page past the end of a single page of rows needs no third query", async () => {
  const db = fakeDb(4);
  const res = await loadPage({ page: "9" }, db.fetchPage);
  assert.equal(db.calls.length, 2);
  assert.equal(res.paging.page, 1);
  assert.equal(res.rows.length, 4);
});

test("a server that answers past-the-end with an empty page is handled too", async () => {
  const db = fakeDb(30, "empty");
  const res = await loadPage({ page: "9", perPage: "10" }, db.fetchPage);
  assert.deepEqual(db.calls, [{ from: 80, to: 89 }, { from: 20, to: 29 }]);
  assert.equal(res.paging.page, 3);
  assert.equal(res.rows.length, 10);
});

test("no rows at all is an empty page, not an error", async () => {
  const db = fakeDb(0);
  const res = await loadPage({}, db.fetchPage);
  assert.equal(db.calls.length, 1);
  assert.equal(res.rows.length, 0);
  assert.equal(res.paging.total, 0);
  assert.equal(res.failed, false);
  const past = await loadPage({ page: "5" }, fakeDb(0).fetchPage);
  assert.equal(past.failed, false);
  assert.equal(past.rows.length, 0);
});

test("loadPage reports any other failure and never throws", async () => {
  const boom = { data: null, count: null, error: { code: "42501", message: "nope" } };
  assert.equal((await loadPage({}, async () => boom)).failed, true);
  let n = 0;
  const secondFails = async () => (n++ === 0 ? { data: null, count: null, error: { code: "PGRST103" } } : boom);
  const res = await loadPage({ page: "9", perPage: "10" }, secondFails);
  assert.equal(res.failed, true);
  assert.deepEqual(res.rows, []);
});
