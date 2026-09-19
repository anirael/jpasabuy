"""Extract the main photo and JPY price from a Mercari item page's HTML.

Order of preference (Mercari pages can be JS-rendered, but the server-rendered <head>
normally carries what we need):
  image: og:image  ->  JSON-LD Product.image  ->  twitter:image
  price: JSON-LD Product.offers.price  ->  product:price:amount / og:price:amount meta
"""

from __future__ import annotations

import json
import re
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse

# Hosts an image URL may point to. We never fetch these; we only hand the URL back.
IMAGE_HOST_SUFFIXES = ("mercdn.net", "mercari.com", "mercari-shops-static.com")


class _Collector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: dict[str, str] = {}
        self.json_ld: list[str] = []
        self._in_ld = False
        self._buf: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "meta":
            key = (a.get("property") or a.get("name") or "").lower()
            content = a.get("content", "")
            if key and content and key not in self.meta:
                self.meta[key] = content
        elif tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self._in_ld = True
            self._buf = []

    def handle_data(self, data: str) -> None:
        if self._in_ld:
            self._buf.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._in_ld:
            self._in_ld = False
            self.json_ld.append("".join(self._buf))


def _walk(node: Any):
    """Yield every dict inside a JSON-LD document (handles @graph, lists, nesting)."""
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from _walk(v)


def _is_type(node: dict, name: str) -> bool:
    t = node.get("@type")
    return t == name or (isinstance(t, list) and name in t)


# The price as Mercari renders it:  <span class="currency">¥</span> <span>770</span>
# (present in the rendered page; the server-sent <head> usually carries the meta tags instead).
_YEN = r"(?:¥|￥|&yen;|&#165;|&#xa5;)"
_PRICE_MARKUP = re.compile(
    r'<span[^>]*class="[^"]*currency[^"]*"[^>]*>\s*' + _YEN + r"\s*</span>\s*<span[^>]*>\s*([0-9][0-9,]*)\s*</span>",
    re.IGNORECASE,
)


# Other renderings seen on the live page: a bare yen sign in one element, the number in the next one,
# e.g. <p class="merText">¥</p><p class="merText">1,355</p>. The class names are hashed and change,
# so only the yen-then-number shape is matched.
_YEN_PAIR = re.compile(
    r"<(span|p|div|strong|b)[^>]*>\s*" + _YEN + r"\s*</\1>\s*<(span|p|div|strong|b)[^>]*>\s*([0-9][0-9,]*)\s*</\2>",
    re.IGNORECASE,
)


def price_from_markup(html: str) -> int | None:
    """Price from the rendered page. The main price comes before the related items, so the first match wins."""
    m = _PRICE_MARKUP.search(html)
    if m:
        return parse_price(m.group(1))
    m = _YEN_PAIR.search(html)
    return parse_price(m.group(3)) if m else None


def parse_price(value: Any) -> int | None:
    """'3,500' / 3500 / '3500.00' -> 3500 (whole yen). Rejects <=0 and absurd values."""
    if value is None or isinstance(value, bool):
        return None
    if str(value).strip().startswith("-"):
        return None
    try:
        d = Decimal(re.sub(r"[^\d.]", "", str(value)) or "x")
    except InvalidOperation:
        return None
    n = int(d)
    return n if 0 < n < 100_000_000 else None


def safe_image_url(url: Any) -> str | None:
    if not isinstance(url, str):
        return None
    url = url.strip()
    if len(url) > 2048:
        return None
    try:
        u = urlparse(url)
    except ValueError:
        return None
    host = (u.hostname or "").lower()
    if u.scheme != "https" or not host:
        return None
    if not any(host == s or host.endswith("." + s) for s in IMAGE_HOST_SUFFIXES):
        return None
    return url


def _first_image(value: Any) -> Any:
    if isinstance(value, list):
        return value[0] if value else None
    if isinstance(value, dict):
        return value.get("url")
    return value


def parse_item_html(html: str) -> dict[str, Any]:
    c = _Collector()
    try:
        c.feed(html)
    except Exception:  # malformed HTML must never crash the service
        pass

    image: str | None = safe_image_url(c.meta.get("og:image"))
    price: int | None = None

    for raw in c.json_ld:
        try:
            doc = json.loads(raw)
        except ValueError:
            continue
        for node in _walk(doc):
            if not _is_type(node, "Product"):
                continue
            if image is None:
                image = safe_image_url(_first_image(node.get("image")))
            if price is None:
                offers = node.get("offers")
                for offer in offers if isinstance(offers, list) else [offers]:
                    if isinstance(offer, dict):
                        cur = offer.get("priceCurrency")
                        if cur in (None, "JPY"):
                            price = parse_price(offer.get("price"))
                            if price:
                                break

    if price is None:
        for key in ("product:price:amount", "og:price:amount"):
            cur = c.meta.get(key.replace("amount", "currency"))
            if cur in (None, "JPY"):
                price = parse_price(c.meta.get(key))
                if price:
                    break

    if price is None:
        price = price_from_markup(html)

    if image is None:
        image = safe_image_url(c.meta.get("twitter:image"))

    return {"image_url": image, "jp_price": price}
