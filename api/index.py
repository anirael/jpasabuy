"""Vercel Python Function entrypoint: every /api/* request is rewritten here (see vercel.json).

The scraper itself lives in api/_mercari (the underscore keeps Vercel from treating it as an endpoint).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _mercari.main import app  # noqa: E402,F401
