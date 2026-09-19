"""Mercari scraper microservice. Called only by the Next.js server (never by browsers).

    uvicorn app.main:app --host 127.0.0.1 --port 8001
"""

from __future__ import annotations

import hmac
import logging
import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from .config import load_env
from .fetcher import FetchError, derived_image_url, fetch_item_html, is_valid_item_url, render_with_playwright
from .parser import parse_item_html

log = logging.getLogger("uvicorn.error")  # shows up in the same console as the request log
_env_files = load_env()  # read .env.local so the secret matches the web app without `set SCRAPER_SECRET=...`
if not os.getenv("SCRAPER_SECRET"):
    log.error(
        "SCRAPER_SECRET is not set, so every /scrape request will get 503. Put SCRAPER_SECRET=... in .env.local "
        "(project root) or set it in this shell, then restart. Looked in: %s",
        ", ".join(str(f) for f in _env_files) or "(no .env files found)",
    )
app = FastAPI(title="Mercari scraper", docs_url=None, redoc_url=None, openapi_url=None)


class ScrapeRequest(BaseModel):
    url: str


class ScrapeResponse(BaseModel):
    image_url: str | None
    jp_price: int | None


def _check_secret(provided: str | None) -> None:
    expected = os.getenv("SCRAPER_SECRET", "")
    if not expected:
        log.error("503: SCRAPER_SECRET is not set on the scraper (add it to .env.local and restart the scraper)")
        raise HTTPException(503, "service not configured: SCRAPER_SECRET is not set on the scraper")
    if not provided or not hmac.compare_digest(provided.encode(), expected.encode()):
        raise HTTPException(401, "unauthorized")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(body: ScrapeRequest, x_scraper_secret: str | None = Header(default=None)) -> ScrapeResponse:
    _check_secret(x_scraper_secret)

    # SSRF guard: nothing but the exact Mercari item URL shape is ever requested.
    if not is_valid_item_url(body.url):
        raise HTTPException(422, "url must be a Mercari item (/item/m<digits>) or shop product (/shops/product/<id>) link")

    result = {"image_url": None, "jp_price": None}
    try:
        result = parse_item_html(await fetch_item_html(body.url))
    except FetchError as e:
        log.info("static fetch failed: %s", e)

    if result["image_url"] is None or result["jp_price"] is None:
        try:  # optional headless-browser fallback for JS-rendered pages
            rendered = parse_item_html(await render_with_playwright(body.url))
            result = {k: result[k] or rendered[k] for k in result}
        except FetchError as e:
            log.info("render fallback skipped: %s", e)
        except Exception:  # noqa: BLE001 - never leak browser errors to callers
            log.exception("render fallback crashed")

    if result["image_url"] is None:
        result["image_url"] = derived_image_url(body.url)

    if result["image_url"] is None and result["jp_price"] is None:
        raise HTTPException(502, "could not extract item details")
    return ScrapeResponse(**result)
