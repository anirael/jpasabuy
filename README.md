# Calico Cove — Japan Pasabuy Inventory System

Multi-user web app for a Japan pasabuy (buy-for-others) business. The **Owner** logs Mercari Japan items, moves them through
`JP Address → Onhand → Delivered`, manages customers and sees sales stats. **Pasabuyers** get a read-only list of Onhand items.

| Layer | Tech |
|---|---|
| Web app + API | Next.js 15 (App Router, Server Actions), TypeScript, Tailwind CSS |
| Database + auth + storage | Supabase (Postgres with Row Level Security, Supabase Auth, Storage) |
| Mercari fetcher + seed | Python 3.11+ (FastAPI microservice, `httpx`) |

## Quick start

### 1. Supabase project
Either create a project at [supabase.com](https://supabase.com) or run one locally with the [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase start`, needs Docker).

Apply **all** migrations in `supabase/migrations/`, in order: `…_init.sql`, `…_mercari_formats_and_charts.sql`, `…_company_logo.sql`, `…_any_item_link.sql`. Updating an existing install? Just run the ones you haven't applied yet (`20260102…` adds the dashboard charts; `20260103…` adds the company logo; `20260104…` lets items use any http(s) link, including Mercari shop products).

- **CLI:** `supabase link --project-ref <ref>` then `supabase db push` (local: `supabase db reset`)
- **Or:** paste each file, in order, into the Supabase dashboard → SQL Editor → Run.

### 2. Environment
```bash
cp .env.example .env.local
```
Fill in from Supabase → Project Settings → API: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
(server-only, never expose it). Set `SCRAPER_SECRET` to a long random string.

### 3. Run the web app
```bash
npm install
npm run dev          # http://localhost:3000
```

### 4. Run the Mercari scraper service (Python)
```bash
cd scraper
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8001
```
The scraper reads `SCRAPER_SECRET` from the project's `.env.local` by itself, so it always matches the web app (a variable set in the shell takes priority). If it is missing, the scraper logs a clear error and answers `503`.
If the scraper is down or Mercari can't be read, **Add Item still works**: the Owner sees a friendly message and enters the photo and price manually.

**Price not filling in?** The scraper must be running (the form says so when it can't reach it) and `SCRAPER_URL` / `SCRAPER_SECRET` must match `.env.local`; the `npm run dev` terminal prints the exact reason. The price is read from the page's price meta tags, then from the rendered price markup (`<span class="currency">¥</span> <span>770</span>`). For pages that only draw the price in the browser, install the optional headless-browser fallback, which is then used automatically: `pip install playwright && playwright install chromium` (set `USE_PLAYWRIGHT=0` to turn it off).

### 5. Seed demo data (optional)
```bash
pip install httpx
py scripts/seed.py            # add --reset to wipe and re-create the demo company
```
Creates 1 company, 1 Owner, 1 Pasabuyer, 4 customers and 8 items:

| Role | Email | Password |
|---|---|---|
| Owner | `owner@example.com` | `Owner1234!` |
| Pasabuyer | `pasabuyer@example.com` | `Pasabuyer1234!` |

Seed item photos are placeholders. **Change or delete these accounts before going live.**

Or skip the seed and go to `/signup` to create your own business (disable with `ALLOW_SIGNUP=false`).

## Tests
```bash
npm test                 # money math + Mercari URL validation
npm run test:rls         # runs the migration on an in-process Postgres (PGlite) and checks 52 tenancy/role/chart/company rules
cd scraper && pip install -r requirements-dev.txt && pytest
```

## How it works

### Roles and data isolation (enforced in the database)
- Every user has one row in `profiles` (`company_id`, `role`). All data tables carry `company_id`.
- **RLS policies** on `customers` and `items` allow only an `OWNER` of the *same* company. A company can never read or write another's rows.
- **Pasabuyers have no access to the `items`/`customers` tables at all.** They read the `pasabuyer_items` view, which returns only `ONHAND`
  rows of their own company and only non-financial columns (photo, item link/ID, customer name, notes, packed). No JP price, rates, totals, profit or addresses.
- Triggers reject an item whose customer belongs to a different company, and block changing `company_id`.
- `total_price`, `pasabuyer_cost` and `profit` are **generated columns** (`numeric`), so clients can never send their own totals.
- The app additionally checks the role in every Server Action and page (`requireOwner` / `assertOwner`), but the database is the source of truth.

### Add Items flow (several items per order)
The Add Items page has two separate buttons. **Add Item** validates the item on the form and puts it in the *Items to submit* list, then clears the link/price/notes so you can enter the next one (customer, rates and status stay filled in, since most orders share them). **Submit** saves everything in the list at once, in a single all-or-nothing database insert, and also includes the item still on the form. Queued items can be edited or removed before submitting. Several items for the same *new* customer share one customer record. Up to 50 items per submit.

Each item goes through these steps:
1. **Any http(s) link is accepted** as the item link. These Mercari shapes (with or without `/en/`) also get the photo and price fetched automatically: `https://jp.mercari.com/item/m123…` and `https://jp.mercari.com/shops/product/abc123`. The exact patterns are `^https://jp\.mercari\.com/(en/)?item/m\d+$` and `^https://jp\.mercari\.com/(en/)?shops/product/[A-Za-z0-9_-]+$`. Any other link is saved as-is and never fetched; the Owner adds the photo and price by hand.
2. For normal listings the photo URL is built from the item ID (`static.mercdn.net/item/detail/orig/photos/<id>_1.jpg`), so it always works. Shop products use the photo the scraper finds. The JPY price comes from the Python service (price meta tags, then the rendered price markup).
3. The photo can always be added or replaced by hand: **paste an image from the clipboard (Ctrl+V anywhere on the form)**, paste an image link, or upload a JPG/PNG/WebP up to 5 MB. Prices can be typed in. A scraping failure never blocks saving.
4. Rate / Pasabuyer rate dropdowns go from `0.40` to `0.50`. **Total = ¥ × rate**, **Cost = ¥ × pasabuyer rate**, **Profit = Total − Cost**, shown live in PHP with 2 decimals.
   JPY is stored as whole yen, so the math is exact in integer centavos (no floating point).

### Security notes
- Passwords are hashed by Supabase Auth; sessions live in HTTP-only cookies and are validated with `auth.getUser()` in the middleware.
- CSRF: all mutations are Server Actions (Next.js verifies `Origin`/`Host`). XSS: React escaping, image URLs limited to `http(s)`, strict CSP and security headers in `next.config.mjs`.
- SSRF: although any link can be *saved*, the app and the Python service only ever *request* the exact Mercari URL shapes above (other links are never fetched); the Python service uses a fixed host, disables auto-redirects (re-validating each hop), refuses non-public IPs,
  caps the response size, and requires the `X-Scraper-Secret` header. Keep it bound to `127.0.0.1` or a private network.
- The service-role key is used only server-side for sign-up and for creating/removing Pasabuyer accounts, always scoped to the Owner's own company.

## Pages
- **Dashboard**: Total Delivered, Total Sales and New Clients, an *Order status* donut (Secured / Japan Address / Onhand / Delivered) and a *Profit* line chart that can be grouped Daily, Monthly or Yearly. Both charts sit under the same date filter.
- **Client Information**: customer name and address only. Addresses are masked; click the eye to reveal one. A customer's own page (`/customers/<id>`) keeps the full details and their item list.
- **Inventory**: click a photo to enlarge it in a modal (click it again, click outside, or press Esc to close). No new page opens.
- **Settings** (above Logout): every role can pick one of 5 color themes (saved in a cookie, so per browser). The **Owner** can also rename the company and choose its sidebar icon from 8 designs (clover, sakura, daisy, leaf, heart, gift, paper plane, shopping bag). The company name and icon replace the "Calico Cove" heading in the sidebar for the whole team. The sign-in page has no company yet, so it keeps the default Calico Cove branding.
- **Loading**: every module shows a skeleton placeholder (`loading.tsx`) while its data loads.

## Assumptions (change if you disagree)
- Pasabuyers see: photo, Mercari link, item ID, customer **name**, notes, packed — not prices, rates or addresses (edit the `pasabuyer_items` view to change this).
- Themes map each palette to roles: darkest colors for the sidebar, mid colors for buttons, highlights and the chart line, lightest for the page background. A few text shades are darkened versions of the palette so text stays readable.
- The Profit chart counts delivered items only (by `delivered_at`); Order status counts all items right now.
- Deleting a customer with items is blocked (delete or reassign their items first).
- Dashboard range applies to all three stats (default: last 30 days, Asia/Manila time): Delivered/Sales use `delivered_at`, New Clients uses the customer `created_at`.
- A **Team** page (Owner only) creates/removes Pasabuyer accounts with a temporary password. Email invites would need SMTP configured in Supabase.
- Inventory search and lists load up to 1,000 rows and filter in memory — fine for a small business; add server-side pagination if you outgrow it.

## Project layout
```
src/app/(auth)        login, signup
src/app/(app)         dashboard, inventory, customers, team (behind auth)
src/app/actions       Server Actions (auth, items, customers, team)
src/lib               money math, Mercari regex, Supabase clients, auth helpers
supabase/migrations   schema + RLS + view + storage policies
supabase/tests        RLS test suite (PGlite)
scraper/              FastAPI Mercari service + pytest
scripts/seed.py       demo data
```
