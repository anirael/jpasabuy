"""Load settings from .env.local so the scraper uses the same SCRAPER_SECRET as the web app
without having to `set` it in the shell first.

Looked up, in order: scraper/.env.local, scraper/.env, then the project root's .env.local.
Real environment variables always win, and a missing file is fine.
"""

from __future__ import annotations

import os
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]  # project root (contains .env.local)
_SCRAPER = Path(__file__).resolve().parents[1]

CANDIDATES = (_SCRAPER / ".env.local", _SCRAPER / ".env", _ROOT / ".env.local")


def parse_env_line(line: str) -> tuple[str, str] | None:
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        return None
    if line.startswith("export "):
        line = line[len("export ") :]
    key, value = line.split("=", 1)
    key, value = key.strip(), value.strip()
    if value[:1] in "\"'" and value[-1:] == value[:1] and len(value) >= 2:
        value = value[1:-1]  # quoted value: keep everything inside the quotes
    else:
        value = value.split(" #", 1)[0].strip()  # unquoted: drop a trailing comment
    return (key, value) if key else None


def load_env(files: tuple[Path, ...] = CANDIDATES) -> list[Path]:
    """Copy KEY=VALUE pairs into os.environ (never overriding what is already set). Returns the files used."""
    used: list[Path] = []
    for f in files:
        try:
            text = f.read_text(encoding="utf-8-sig")
        except OSError:
            continue
        used.append(f)
        for line in text.splitlines():
            kv = parse_env_line(line)
            if kv and kv[0] not in os.environ:
                os.environ[kv[0]] = kv[1]
    return used
