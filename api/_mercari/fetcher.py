"""SSRF-hardened fetching of a single Mercari item page."""

from __future__ import annotations

import ipaddress
import os
import re
import socket
from urllib.parse import urljoin, urlparse

import httpx

# The ONLY URL shape we will ever request. fullmatch + \d avoids the `$`-before-newline trap.
MERCARI_ITEM_RE = re.compile(
    r"https://jp\.mercari\.com/(?:en/)?(?:item/m[0-9]+|shops/product/[A-Za-z0-9_-]+)", re.ASCII
)
ALLOWED_HOST = "jp.mercari.com"

MAX_BYTES = 2 * 1024 * 1024
MAX_REDIRECTS = 3
TIMEOUT = httpx.Timeout(10.0, connect=5.0)
# A browser-like UA; Mercari serves a different (empty) shell to unknown clients.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0 Safari/537.36"
)


class FetchError(Exception):
    pass


def is_valid_item_url(url: object) -> bool:
    return isinstance(url, str) and MERCARI_ITEM_RE.fullmatch(url) is not None


def derived_image_url(url: str) -> str | None:
    """The main photo sits at a predictable CDN path, so it never depends on parsing the page."""
    m = re.fullmatch(r"https://jp\.mercari\.com/(?:en/)?item/(m[0-9]+)", url, re.ASCII)
    return f"https://static.mercdn.net/item/detail/orig/photos/{m.group(1)}_1.jpg" if m else None


def _assert_public_host(host: str) -> None:
    """Defence in depth: refuse hosts that resolve to private/loopback/link-local ranges."""
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise FetchError("dns failure") from e
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global:
            raise FetchError("host resolves to a non-public address")


def _redirect_target_ok(url: str) -> bool:
    u = urlparse(url)
    return u.scheme == "https" and u.hostname == ALLOWED_HOST and u.port in (None, 443)


async def fetch_item_html(url: str) -> str:
    if not is_valid_item_url(url):
        raise FetchError("url not allowed")
    _assert_public_host(ALLOWED_HOST)

    headers = {"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9", "Accept": "text/html,application/xhtml+xml"}
    async with httpx.AsyncClient(follow_redirects=False, timeout=TIMEOUT, headers=headers, trust_env=False) as client:
        current = url
        for _ in range(MAX_REDIRECTS + 1):
            async with client.stream("GET", current) as resp:
                if resp.status_code in (301, 302, 303, 307, 308):
                    nxt = urljoin(current, resp.headers.get("location", ""))
                    if not _redirect_target_ok(nxt):
                        raise FetchError("redirect to a disallowed location")
                    current = nxt
                    continue
                if resp.status_code != 200:
                    raise FetchError(f"upstream status {resp.status_code}")
                chunks: list[bytes] = []
                size = 0
                async for chunk in resp.aiter_bytes():
                    size += len(chunk)
                    if size > MAX_BYTES:
                        break  # the <head> we need is at the start; a truncated body is fine
                    chunks.append(chunk)
                return b"".join(chunks).decode(resp.encoding or "utf-8", errors="replace")
    raise FetchError("too many redirects")


async def render_with_playwright(url: str) -> str:
    """Fallback for JS-rendered pages. Used automatically when Playwright is installed
    (pip install playwright && playwright install chromium); set USE_PLAYWRIGHT=0 to turn it off."""
    if os.getenv("USE_PLAYWRIGHT") == "0":
        raise FetchError("playwright disabled")
    if not is_valid_item_url(url):
        raise FetchError("url not allowed")
    try:
        from playwright.async_api import async_playwright
    except ImportError as e:
        raise FetchError("playwright not installed") from e

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            page = await browser.new_page(user_agent=USER_AGENT)

            async def guard(route):  # only Mercari / its CDN may be contacted
                host = urlparse(route.request.url).hostname or ""
                if host == "mercari.com" or host.endswith(".mercari.com") or host.endswith(".mercdn.net"):
                    await route.continue_()
                else:
                    await route.abort()

            await page.route("**/*", guard)
            await page.goto(url, wait_until="domcontentloaded", timeout=20_000)
            try:  # the price is drawn client-side: <span class="currency">¥</span> <span>770</span>
                await page.wait_for_selector("span[class*=currency]", timeout=8_000)
            except Exception:  # noqa: BLE001 - page may simply have no price (sold out / removed)
                pass
            return await page.content()
        finally:
            await browser.close()
