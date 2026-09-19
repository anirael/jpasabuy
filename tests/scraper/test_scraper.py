import json

import pytest
from fastapi.testclient import TestClient

from _mercari import main
from _mercari.fetcher import derived_image_url, is_valid_item_url
from _mercari.parser import parse_item_html, parse_price, safe_image_url

GOOD = "https://jp.mercari.com/en/item/m12345678901"


@pytest.mark.parametrize("url", [GOOD, "https://jp.mercari.com/en/item/m1", "https://jp.mercari.com/item/m12345678"])
def test_accepts_exact_shape(url):
    assert is_valid_item_url(url)


@pytest.mark.parametrize(
    "url",
    [
        GOOD + "\n",  # `$` in Python would let this through
        GOOD + "/",
        GOOD + "?foo=1",
        GOOD + "#x",
        "http://jp.mercari.com/en/item/m123",
        "https://jp.mercari.com/ja/item/m123",
        "https://jp.mercari.com/en/en/item/m123",
        "https://jp.mercari.com/en//item/m123",
        "https://jp.mercari.com/en/item/123",
        "https://jp.mercari.com/en/item/mabc",
        "https://jp.mercari.com.evil.com/en/item/m123",
        "https://evil.com/https://jp.mercari.com/en/item/m123",
        "https://user@jp.mercari.com/en/item/m123",
        "https://jp.mercari.com:8080/en/item/m123",
        "https://127.0.0.1/en/item/m123",
        "",
        None,
        123,
    ],
)
def test_rejects_everything_else(url):
    assert not is_valid_item_url(url)


def test_parse_og_and_jsonld():
    html = f"""<html><head>
      <meta property="og:image" content="https://static.mercdn.net/item/detail/orig/photos/m1_1.jpg">
      <script type="application/ld+json">{json.dumps({
          "@context": "https://schema.org", "@type": "Product", "name": "x",
          "offers": {"@type": "Offer", "price": "3,500", "priceCurrency": "JPY"}})}</script>
    </head></html>"""
    assert parse_item_html(html) == {
        "image_url": "https://static.mercdn.net/item/detail/orig/photos/m1_1.jpg",
        "jp_price": 3500,
    }


def test_parse_graph_list_image_and_offer_list():
    ld = {"@graph": [{"@type": "Product", "image": ["https://static.mercdn.net/a.jpg", "https://static.mercdn.net/b.jpg"],
                      "offers": [{"price": 1200, "priceCurrency": "JPY"}]}]}
    html = f'<script type="application/ld+json">{json.dumps(ld)}</script>'
    assert parse_item_html(html) == {"image_url": "https://static.mercdn.net/a.jpg", "jp_price": 1200}


def test_meta_price_fallback():
    html = '<meta property="product:price:amount" content="980"><meta property="product:price:currency" content="JPY">'
    assert parse_item_html(html)["jp_price"] == 980


def test_ignores_non_jpy_and_bad_json_and_garbage():
    html = '<script type="application/ld+json">{oops</script><meta property="product:price:amount" content="10"><meta property="product:price:currency" content="USD">'
    assert parse_item_html(html) == {"image_url": None, "jp_price": None}
    assert parse_item_html("<<<<not html") == {"image_url": None, "jp_price": None}


@pytest.mark.parametrize(
    "url",
    ["http://static.mercdn.net/a.jpg", "https://evil.com/a.jpg", "https://mercdn.net.evil.com/a.jpg", "javascript:alert(1)", None],
)
def test_unsafe_image_urls_dropped(url):
    assert safe_image_url(url) is None


@pytest.mark.parametrize("v,expected", [("3,500", 3500), (3500, 3500), ("0", None), (-5, None), ("abc", None), (None, None), (True, None)])
def test_parse_price(v, expected):
    assert parse_price(v) == expected


# ---- API ----------------------------------------------------------------
client = TestClient(main.app)


def test_api_requires_secret(monkeypatch):
    monkeypatch.setenv("SCRAPER_SECRET", "s3cret")
    assert client.post("/scrape", json={"url": GOOD}).status_code == 401
    assert client.post("/scrape", json={"url": GOOD}, headers={"X-Scraper-Secret": "nope"}).status_code == 401


def test_api_unconfigured_is_closed(monkeypatch):
    monkeypatch.delenv("SCRAPER_SECRET", raising=False)
    assert client.post("/scrape", json={"url": GOOD}, headers={"X-Scraper-Secret": ""}).status_code == 503


def test_api_rejects_bad_url_without_fetching(monkeypatch):
    monkeypatch.setenv("SCRAPER_SECRET", "s3cret")

    async def boom(_):  # would fail the test if the fetcher were reached
        raise AssertionError("fetched a URL that failed validation")

    monkeypatch.setattr(main, "fetch_item_html", boom)
    r = client.post("/scrape", json={"url": "https://evil.com/x"}, headers={"X-Scraper-Secret": "s3cret"})
    assert r.status_code == 422


def test_api_happy_path(monkeypatch):
    monkeypatch.setenv("SCRAPER_SECRET", "s3cret")

    async def fake(_):
        return '<meta property="og:image" content="https://static.mercdn.net/a.jpg"><meta property="product:price:amount" content="4200">'

    monkeypatch.setattr(main, "fetch_item_html", fake)
    r = client.post("/scrape", json={"url": GOOD}, headers={"X-Scraper-Secret": "s3cret"})
    assert r.status_code == 200
    assert r.json() == {"image_url": "https://static.mercdn.net/a.jpg", "jp_price": 4200}


def test_api_photo_only_when_page_has_nothing(monkeypatch):
    monkeypatch.setenv("SCRAPER_SECRET", "s3cret")

    async def fake(_):
        return "<html></html>"

    monkeypatch.setattr(main, "fetch_item_html", fake)
    r = client.post("/scrape", json={"url": GOOD}, headers={"X-Scraper-Secret": "s3cret"})
    assert r.status_code == 200
    assert r.json() == {"image_url": "https://static.mercdn.net/item/detail/orig/photos/m12345678901_1.jpg", "jp_price": None}


def test_derived_image_url_both_formats():
    assert derived_image_url("https://jp.mercari.com/item/m5") == "https://static.mercdn.net/item/detail/orig/photos/m5_1.jpg"


def test_derived_image_url():
    assert derived_image_url("https://jp.mercari.com/en/item/m56561393231") == "https://static.mercdn.net/item/detail/orig/photos/m56561393231_1.jpg"
    assert derived_image_url("https://evil.com/en/item/m1") is None


def test_api_falls_back_to_derived_image(monkeypatch):
    monkeypatch.setenv("SCRAPER_SECRET", "s3cret")

    async def fake(_):
        return "<meta property=\"product:price:amount\" content=\"1355\">"

    monkeypatch.setattr(main, "fetch_item_html", fake)
    r = client.post("/scrape", json={"url": GOOD}, headers={"X-Scraper-Secret": "s3cret"})
    assert r.json() == {"image_url": "https://static.mercdn.net/item/detail/orig/photos/m12345678901_1.jpg", "jp_price": 1355}


# ---- shop products + visible price markup ----------------------------------------------------------------------
@pytest.mark.parametrize(
    "url",
    [
        "https://jp.mercari.com/shops/product/123qwerty345",
        "https://jp.mercari.com/en/shops/product/AbC_9-x",
    ],
)
def test_accepts_shop_product_links(url):
    assert is_valid_item_url(url)
    assert derived_image_url(url) is None  # no predictable photo path for shop products


@pytest.mark.parametrize(
    "url",
    [
        "https://jp.mercari.com/shops/product/",
        "https://jp.mercari.com/shops/product/abc/",
        "https://jp.mercari.com/shops/product/abc?x=1",
        "https://jp.mercari.com/shops/product/a b",
        "https://jp.mercari.com/shops/product/abc\n",
        "https://jp.mercari.com/shops/products/abc",
        "https://evil.com/shops/product/abc",
        "https://jp.mercari.com.evil.com/shops/product/abc",
    ],
)
def test_rejects_malformed_shop_links(url):
    assert not is_valid_item_url(url)


def test_price_from_currency_span_markup():
    html = 'x <div><span class="currency">¥</span> <span>770</span></div>'
    assert parse_item_html(html)["jp_price"] == 770


@pytest.mark.parametrize(
    "markup,expected",
    [
        ('<span class="currency">¥</span><span>1,355</span>', 1355),
        ('<span class="currency__a1b2">￥</span>\n  <span data-x="1">2,980</span>', 2980),
        ('<span class="price currency">&yen;</span> <span>50</span>', 50),
        ('<span class="currency">$</span> <span>770</span>', None),  # not yen
        ('<span class="currency">¥</span> <span>free</span>', None),
    ],
)
def test_currency_markup_variants(markup, expected):
    assert parse_item_html(markup)["jp_price"] == expected


def test_meta_price_wins_over_related_item_markup():
    html = (
        '<meta property="product:price:amount" content="1355">'
        '<meta property="product:price:currency" content="JPY">'
        '<span class="currency">¥</span> <span>99999</span>'
    )
    assert parse_item_html(html)["jp_price"] == 1355


def test_first_currency_span_is_the_main_price():
    html = '<span class="currency">¥</span> <span>770</span> ... related: <span class="currency">¥</span> <span>5,000</span>'
    assert parse_item_html(html)["jp_price"] == 770


def test_api_accepts_shop_link_and_reads_price(monkeypatch):
    monkeypatch.setenv("SCRAPER_SECRET", "s3cret")

    async def fake(_):
        return '<meta property="og:image" content="https://assets.mercari-shops-static.com/-/large/plain/abc.jpg"><span class="currency">¥</span> <span>4,200</span>'

    monkeypatch.setattr(main, "fetch_item_html", fake)
    r = client.post("/scrape", json={"url": "https://jp.mercari.com/shops/product/123qwerty345"}, headers={"X-Scraper-Secret": "s3cret"})
    assert r.status_code == 200
    assert r.json() == {"image_url": "https://assets.mercari-shops-static.com/-/large/plain/abc.jpg", "jp_price": 4200}


def test_yen_pair_in_other_elements_and_real_page_shape():
    html = 'PHP <p class="merText">565.99</p> (<p class="merText caption__5616e150">¥</p><p class="merText caption__5616e150">1,355</p>) related <span class="a">¥</span><span class="b">1,350</span>'
    assert parse_item_html(html)["jp_price"] == 1355


def test_php_prices_are_never_mistaken_for_yen():
    html = '<span class="currency__6b270ca7">PHP</span><span class="number__6b270ca7">565.99</span>'
    assert parse_item_html(html)["jp_price"] is None


# ---- .env.local loading --------------------------------------------------------------------------------------------
from _mercari.config import CANDIDATES, load_env, parse_env_line  # noqa: E402


@pytest.mark.parametrize(
    "line,expected",
    [
        ("SCRAPER_SECRET=abc123", ("SCRAPER_SECRET", "abc123")),
        ('SCRAPER_SECRET="abc 123"', ("SCRAPER_SECRET", "abc 123")),
        ("SCRAPER_SECRET='abc'", ("SCRAPER_SECRET", "abc")),
        ("export SCRAPER_SECRET=abc", ("SCRAPER_SECRET", "abc")),
        ("  SCRAPER_SECRET = abc  # note", ("SCRAPER_SECRET", "abc")),
        ("SCRAPER_SECRET=a=b==", ("SCRAPER_SECRET", "a=b==")),
        ("SCRAPER_SECRET=", ("SCRAPER_SECRET", "")),
        ("# comment", None),
        ("", None),
        ("no equals sign", None),
    ],
)
def test_parse_env_line(line, expected):
    assert parse_env_line(line) == expected


def test_load_env_reads_file_but_never_overrides(tmp_path, monkeypatch):
    import os

    f = tmp_path / ".env.local"
    f.write_text("﻿SCRAPER_SECRET=from-file\r\nOTHER_KEY=x\r\n", encoding="utf-8")  # BOM + CRLF, as Windows editors write it
    monkeypatch.delenv("SCRAPER_SECRET", raising=False)
    monkeypatch.setenv("OTHER_KEY", "already-set")
    used = load_env((tmp_path / "missing.env", f))
    assert used == [f]
    assert os.environ["SCRAPER_SECRET"] == "from-file"
    assert os.environ["OTHER_KEY"] == "already-set"
    monkeypatch.delenv("SCRAPER_SECRET", raising=False)


def test_scraper_looks_at_the_project_env_file():
    assert any(str(p).endswith(".env.local") for p in CANDIDATES)


def test_vercel_entrypoint_serves_both_prefixes(monkeypatch):
    import importlib

    monkeypatch.setenv("SCRAPER_SECRET", "s3cret")
    entry = importlib.import_module("index")  # api/index.py, the Vercel Function entrypoint
    c = TestClient(entry.app)
    assert c.get("/api/health").status_code == 200
    assert c.get("/health").status_code == 200
    assert c.post("/api/scrape", json={"url": GOOD}).status_code == 401
