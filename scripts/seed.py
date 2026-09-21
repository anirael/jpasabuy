"""Seed demo data: 1 company, 1 Owner, 1 Pasabuyer, a few customers and items.

    py scripts/seed.py            # create demo data (skips if it already exists)
    py scripts/seed.py --reset    # delete the demo company/users first, then re-create

Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment or .env.local.
Only needs `httpx` (pip install httpx). Uses the service role, so run it on your own machine only.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
COMPANY = "CC"
OWNER = {"email": "owner@example.com", "password": "Owner1234!", "name": "Claudia Reyes"}
PASABUYER = {"email": "pasabuyer@example.com", "password": "Pasabuyer1234!", "name": "Haruka Tanaka"}


def load_env() -> tuple[str, str]:
    env = dict(os.environ)
    f = ROOT / ".env.local"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    url, key = env.get("NEXT_PUBLIC_SUPABASE_URL"), env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env or .env.local).")
    return url.rstrip("/"), key


def main() -> None:
    url, key = load_env()
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    c = httpx.Client(base_url=url, headers=h, timeout=30)

    def find_user(email: str) -> dict | None:
        page = 1
        while True:
            r = c.get("/auth/v1/admin/users", params={"page": page, "per_page": 200})
            r.raise_for_status()
            users = r.json().get("users", [])
            for u in users:
                if (u.get("email") or "").lower() == email:
                    return u
            if len(users) < 200:
                return None
            page += 1

    existing_owner = find_user(OWNER["email"])

    if "--reset" in sys.argv:
        prof = (c.get("/rest/v1/profiles", params={"email": f"eq.{OWNER['email']}", "select": "company_id"}).json() or [None])[0]
        for acct in (OWNER, PASABUYER):
            u = find_user(acct["email"])
            if u:
                c.delete(f"/auth/v1/admin/users/{u['id']}").raise_for_status()
        if prof:
            # items/customers/profiles cascade from the company
            c.delete("/rest/v1/companies", params={"id": f"eq.{prof['company_id']}"}).raise_for_status()
        print("Reset demo data.")
        existing_owner = None

    if existing_owner:
        print("Demo data already exists. Use --reset to rebuild it.")
        return

    def rest(table: str, rows: list[dict] | dict) -> list[dict]:
        r = c.post(f"/rest/v1/{table}", json=rows, headers={**h, "Prefer": "return=representation"})
        if r.status_code >= 300:
            sys.exit(f"Insert into {table} failed: {r.status_code} {r.text}")
        return r.json()

    company = rest("companies", {"name": COMPANY})[0]

    def make_user(acct: dict, role: str) -> None:
        r = c.post(
            "/auth/v1/admin/users",
            json={"email": acct["email"], "password": acct["password"], "email_confirm": True, "user_metadata": {"name": acct["name"]}},
        )
        if r.status_code >= 300:
            sys.exit(f"Creating {acct['email']} failed: {r.status_code} {r.text}")
        rest("profiles", {"id": r.json()["id"], "company_id": company["id"], "name": acct["name"], "email": acct["email"], "role": role})

    make_user(OWNER, "OWNER")
    make_user(PASABUYER, "PASABUYER")

    now = datetime.now(timezone.utc)
    ago = lambda days: (now - timedelta(days=days)).isoformat()  # noqa: E731

    customers = rest(
        "customers",
        [
            {"company_id": company["id"], "name": "Maria Santos", "shipping_address": "12 Mabini St, Brgy. San Antonio, Quezon City 1105", "created_at": ago(45)},
            {"company_id": company["id"], "name": "Jenny Dela Cruz", "shipping_address": "Blk 4 Lot 9 Sampaguita Ave, Cebu City 6000", "created_at": ago(12)},
            {"company_id": company["id"], "name": "Kiko Ramirez", "shipping_address": "88 Rizal Ext., Davao City 8000", "created_at": ago(5)},
            {"company_id": company["id"], "name": "Ana Villanueva", "shipping_address": "5F Emerald Tower, Ortigas Center, Pasig 1600", "created_at": ago(2)},
        ],
    )
    cid = {x["name"]: x["id"] for x in customers}

    def img(n: int) -> str:
        return f"https://placehold.co/300x300/e8718d/ffffff/png?text=Item+{n}"

    # (customer, mercari id, jp_price, rate, pasabuyer_rate, status, secured, notes, delivered days ago)
    rows = [
        ("Maria Santos", "m10000000001", 3500, "0.45", "0.42", "DELIVERED", True, "Pokemon plush - delivered via LBC", 20),
        ("Maria Santos", "m10000000002", 12800, "0.46", "0.43", "DELIVERED", True, "Vintage camera", 8),
        ("Jenny Dela Cruz", "m10000000003", 5400, "0.45", "0.42", "ONHAND", True, "Sanrio bundle, fragile", None),
        ("Jenny Dela Cruz", "m10000000004", 980, "0.48", "0.44", "ONHAND", False, "", None),
        ("Kiko Ramirez", "m10000000005", 22000, "0.44", "0.42", "JP_ADDRESS", True, "Retro console, wait for shipping", None),
        ("Kiko Ramirez", "m10000000006", 7600, "0.45", "0.42", "JP_ADDRESS", False, "Ask about sizing", None),
        ("Ana Villanueva", "m10000000007", 4300, "0.47", "0.43", "ONHAND", True, "Limited edition figure", None),
        ("Ana Villanueva", "m10000000008", 15500, "0.45", "0.41", "DELIVERED", True, "Handbag", 3),
    ]
    items = []
    for n, (cust, mid, jp, rate, prate, status, secured, notes, dago) in enumerate(rows, 1):
        item = {
            "company_id": company["id"],
            "customer_id": cid[cust],
            "mercari_url": f"https://jp.mercari.com/en/item/{mid}",
            "image_url": img(n),
            "jp_price": jp,
            "rate": rate,
            "pasabuyer_rate": prate,
            "status": status,
            "secured": secured,
            "notes": notes,
            "created_at": ago((dago or 0) + 6),
        }
        if dago is not None:
            item["delivered_at"] = ago(dago)
        items.append(item)
    rest("items", items)

    print("Seeded demo data.\n")
    print(f"  Owner      {OWNER['email']} / {OWNER['password']}")
    print(f"  Pasabuyer  {PASABUYER['email']} / {PASABUYER['password']}")


if __name__ == "__main__":
    main()
