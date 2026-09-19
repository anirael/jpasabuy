import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
const db = new PGlite();
const dir = new URL("../migrations/", import.meta.url);
const migration = fs.readdirSync(dir).filter((n) => n.endsWith(".sql")).sort().map((n) => fs.readFileSync(new URL(n, dir), "utf8")).join("\n");

await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema storage to authenticated; grant select, insert, delete on storage.objects to authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
`);
await db.exec(migration);
console.log("migration applied OK");

const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b";
const ownerA = "aaaaaaaa-0000-0000-0000-000000000001", pasA = "aaaaaaaa-0000-0000-0000-000000000002", ownerB = "bbbbbbbb-0000-0000-0000-000000000001";
const custA = "cccccccc-0000-0000-0000-00000000000a", custB = "cccccccc-0000-0000-0000-00000000000b";
await db.exec(`
insert into companies(id,name) values ('${A}','A'),('${B}','B');
insert into auth.users values ('${ownerA}'),('${pasA}'),('${ownerB}');
insert into profiles(id,company_id,name,email,role) values
 ('${ownerA}','${A}','Owner A','oa@x.com','OWNER'),('${pasA}','${A}','Pas A','pa@x.com','PASABUYER'),('${ownerB}','${B}','Owner B','ob@x.com','OWNER');
insert into customers(id,company_id,name,shipping_address) values ('${custA}','${A}','Cust A','addr A'),('${custB}','${B}','Cust B','addr B');
insert into items(company_id,customer_id,mercari_url,jp_price,rate,pasabuyer_rate,status,notes) values
 ('${A}','${custA}','https://jp.mercari.com/en/item/m1',3500,0.45,0.42,'ONHAND','a-onhand'),
 ('${A}','${custA}','https://jp.mercari.com/en/item/m2',1000,0.45,0.42,'JP_ADDRESS','a-jp'),
 ('${A}','${custA}','https://jp.mercari.com/en/item/m3',2000,0.50,0.40,'DELIVERED','a-delivered'),
 ('${B}','${custB}','https://jp.mercari.com/en/item/m4',9999,0.45,0.42,'ONHAND','b-onhand');
`);

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  " + extra}`); };
const as = async (uid, fn) => {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}; ${uid ? `set request.jwt.claim.sub = '${uid}';` : ""}`);
  try { return await fn(); } finally { await db.exec(`reset role; reset request.jwt.claim.sub;`); }
};
const err = async (sql) => { try { await db.query(sql); return null; } catch (e) { return e.message; } };
const q = async (sql) => (await db.query(sql)).rows;
const newItem = (cust, n) => `insert into items(customer_id,mercari_url,jp_price,rate,pasabuyer_rate) values ('${cust}','https://jp.mercari.com/en/item/m${n}',500,0.41,0.40)`;

// ---- generated columns (as superuser)
const [g] = await q(`select total_price::text t, pasabuyer_cost::text c, profit::text p, mercari_item_id from items where notes='a-onhand'`);
ok("generated total/cost/profit = 1575.00/1470.00/105.00", g.t === "1575.00" && g.c === "1470.00" && g.p === "105.00", JSON.stringify(g));
ok("mercari_item_id derived", g.mercari_item_id === "m1");

// ---- OWNER A
await as(ownerA, async () => {
  const items = await q(`select notes from items order by notes`);
  ok("owner A sees only company A items (3)", items.length === 3 && items.every((r) => r.notes.startsWith("a-")), JSON.stringify(items));
  ok("owner A sees only company A customers", (await q(`select name from customers`)).length === 1);
  ok("owner A sees own team (2 profiles)", (await q(`select id from profiles`)).length === 2);
  ok("owner A does not see company B", (await q(`select id from companies`)).length === 1);
  ok("owner A can rename own company + set logo", (await db.query(`update companies set name = 'A Renamed', logo = 'sakura'`)).affectedRows === 1);
  ok("owner A: invalid logo rejected", (await err(`update companies set logo = 'nope'`)) !== null);
  ok("owner A: cannot rename company B", (await db.query(`update companies set name = 'hax' where id = '${B}'`)).affectedRows === 0);

  ok("owner A can create customer (company_id defaulted)", (await err(`insert into customers(name) values ('New')`)) === null);
  ok("owner A: item with default company_id + own customer OK", (await err(newItem(custA, 10))) === null);
  ok("owner A: cannot insert into company B", (await err(`insert into customers(company_id,name) values ('${B}','x')`)) !== null);
  ok("owner A: cannot attach item to customer of company B", (await err(newItem(custB, 11))) !== null);
  ok("owner A: cannot move item to company B", (await err(`update items set company_id='${B}' where notes='a-jp'`)) !== null);
  ok("owner A: update of B row affects 0 rows", (await db.query(`update items set notes='hack' where notes='b-onhand'`)).affectedRows === 0);
  ok("owner A: delete of B row affects 0 rows", (await db.query(`delete from items where notes='b-onhand'`)).affectedRows === 0);
  ok("owner A: plain text (not a link) rejected by DB", (await err(`insert into items(customer_id,mercari_url,jp_price,rate,pasabuyer_rate) values ('${custA}','not a link',500,0.41,0.40)`)) !== null);
  ok("owner A: /item/ (no /en) URL accepted", (await err(`insert into items(customer_id,mercari_url,jp_price,rate,pasabuyer_rate) values ('${custA}','https://jp.mercari.com/item/m13',500,0.41,0.40)`)) === null);
  const linkOk = async (u, n) => (await err(`insert into items(customer_id,mercari_url,jp_price,rate,pasabuyer_rate) values ('${custA}','${u}',500,0.41,0.40)`)) === null;
  ok("owner A: shops/product link accepted", await linkOk("https://jp.mercari.com/shops/product/123qwerty345"));
  ok("owner A: any other http(s) link accepted", await linkOk("https://example.com/products/some-thing?ref=1"));
  ok("owner A: link with spaces rejected", !(await linkOk("https://example.com/a b")));
  ok("owner A: javascript:/ftp: links rejected", !(await linkOk("javascript:alert(1)")) && !(await linkOk("ftp://example.com/x")));
  const ids = await q(`select mercari_url, mercari_item_id from items where mercari_url in ('https://jp.mercari.com/shops/product/123qwerty345','https://example.com/products/some-thing?ref=1','https://jp.mercari.com/item/m13') order by mercari_url`);
  ok("item id is the last path segment (m13 / 123qwerty345 / some-thing)", ids.map((r) => r.mercari_item_id).sort().join() === "123qwerty345,m13,some-thing", JSON.stringify(ids));
  ok("owner A: rate outside .40-.50 rejected", (await err(`insert into items(customer_id,mercari_url,jp_price,rate,pasabuyer_rate) values ('${custA}','https://jp.mercari.com/en/item/m12',500,0.39,0.40)`)) !== null);
  ok("owner A: cannot delete customer that still has items (RESTRICT)", (await err(`delete from customers where id='${custA}'`)) !== null);

  await db.query(`update items set status='DELIVERED' where notes='a-jp'`);
  const [d] = await q(`select delivered_at from items where notes='a-jp'`);
  ok("delivered_at set when status -> DELIVERED", d.delivered_at !== null);
  const [stats] = await q(`select dashboard_stats(now() - interval '1 day', now() + interval '1 day') s`);
  ok("dashboard_stats: own company only (2 delivered, 1000.00 + 450.00)", stats.s.total_delivered === 2 && stats.s.total_sales === "1450.00", JSON.stringify(stats.s));
  await db.query(`update items set status='JP_ADDRESS' where notes='a-jp'`);
  const [d2] = await q(`select delivered_at from items where notes='a-jp'`);
  const [ch] = await q(`select dashboard_charts(now() - interval '2 days', now() + interval '2 days', 'day') c`);
  const tot = ch.c.series.reduce((a, r) => a + Number(r.sales), 0);
  ok("dashboard_charts: status counts + zero-filled daily series (1 delivered, sales 1000, profit 200)", ch.c.status.DELIVERED === 1 && ch.c.series.length >= 4 && tot === 1000 && ch.c.series.reduce((a, r) => a + Number(r.profit), 0) === 200, JSON.stringify(ch.c));
  const [chm] = await q(`select dashboard_charts(now() - interval '40 days', now(), 'month') c`);
  const [chy] = await q(`select dashboard_charts(now() - interval '800 days', now(), 'year') c`);
  ok("dashboard_charts: month and year buckets work", chm.c.series.length >= 1 && chy.c.series.length >= 2 && /-01-01$/.test(chy.c.series[0].period), JSON.stringify(chy.c.series));
  ok("dashboard_charts: invalid bucket rejected", (await err(`select dashboard_charts(now(), now(), 'week')`)) !== null);
  ok("delivered_at cleared when leaving DELIVERED", d2.delivered_at === null);
  ok("owner cannot write profiles from client", (await err(`insert into profiles(id,company_id,name,email,role) values (gen_random_uuid(),'${A}','x','x@x','OWNER')`)) !== null);
});

// ---- PASABUYER A
await as(pasA, async () => {
  ok("pasabuyer: items table returns 0 rows", (await q(`select id from items`)).length === 0);
  ok("pasabuyer: customers returns 0 rows", (await q(`select id from customers`)).length === 0);
  const v = await q(`select * from pasabuyer_items`);
  ok("pasabuyer view: only ONHAND of own company", v.length >= 1 && v.every((r) => r.status === "ONHAND") && !v.some((r) => r.notes === "b-onhand"), JSON.stringify(v));
  const cols = Object.keys(v[0] ?? {});
  ok("pasabuyer view exposes no financial columns", !cols.some((c) => /price|rate|cost|profit|total|address/.test(c)), cols.join(","));
  ok("pasabuyer view hides customer name and packed", !cols.some((c) => /customer|secured|packed/.test(c)), cols.join(","));
  ok("pasabuyer view still returns the item id", v.every((r) => typeof r.mercari_item_id === "string"));
  ok("pasabuyer view hides JP_ADDRESS items", !v.some((r) => r.notes === "a-jp"));
  ok("pasabuyer cannot insert item", (await err(newItem(custA, 20))) !== null);
  ok("pasabuyer cannot update items", (await db.query(`update items set notes='x'`)).affectedRows === 0);
  ok("pasabuyer cannot delete items", (await db.query(`delete from items`)).affectedRows === 0);
  ok("pasabuyer cannot create customers", (await err(`insert into customers(name) values ('x')`)) !== null);
  ok("pasabuyer dashboard_charts forbidden", (await err(`select dashboard_charts(now() - interval '1 day', now(), 'day')`)) !== null);
  ok("pasabuyer dashboard_stats forbidden", (await err(`select dashboard_stats(now() - interval '1 day', now())`)) !== null);
  ok("pasabuyer can read own company (name/logo)", (await q(`select name, logo from companies`)).length === 1);
  ok("pasabuyer cannot rename company", (await db.query(`update companies set name = 'pwn'`)).affectedRows === 0);
  ok("pasabuyer sees only own profile", (await q(`select id from profiles`)).length === 1);
});

// ---- OWNER B and ANON
await as(ownerB, async () => {
  const v = await q(`select notes from pasabuyer_items`);
  ok("owner B: view only shows B onhand", v.length === 1 && v[0].notes === "b-onhand", JSON.stringify(v));
  ok("owner B sees 1 item", (await q(`select id from items`)).length === 1);
});
await as(null, async () => {
  ok("anon: no access to items", (await err(`select * from items`)) !== null);
  ok("anon: no access to view", (await err(`select * from pasabuyer_items`)) !== null);
  ok("anon: no access to customers", (await err(`select * from customers`)) !== null);
  ok("anon: no dashboard_charts", (await err(`select dashboard_charts(now(), now(), 'day')`)) !== null);
  ok("anon: no dashboard_stats", (await err(`select dashboard_stats(now(), now())`)) !== null);
});

// ---- storage policies
await as(ownerA, async () => {
  ok("storage: owner A can upload to own company folder", (await err(`insert into storage.objects(bucket_id,name) values ('item-images','${A}/x.jpg')`)) === null);
  ok("storage: owner A cannot upload to company B folder", (await err(`insert into storage.objects(bucket_id,name) values ('item-images','${B}/x.jpg')`)) !== null);
});
await as(pasA, async () => {
  ok("storage: pasabuyer cannot upload", (await err(`insert into storage.objects(bucket_id,name) values ('item-images','${A}/y.jpg')`)) !== null);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
