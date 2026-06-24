from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import random
import string
import sys
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError


ROOT = Path(__file__).resolve().parents[1]
ENTRIES_PATH = ROOT / "dictionary_entries.json"
STATE_PATH = ROOT / "post_state.json"
POST_URL = "https://api.x.com/2/tweets"
MAX_POST_CHARS = 280


def pct(value: str) -> str:
    return quote(str(value), safe="")


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def shorten(text: str, limit: int) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "…"


def build_post(entry: dict) -> str:
    term = entry["term"]["en"]
    misread = entry["misreading"]["en"]
    source = entry.get("sources", [{}])[0]
    title = source.get("title", "Article")
    url = source.get("url", "https://hiroshisatoku9-michikusa.github.io/dictionary/")

    prefix = f"Misreading Dictionary #{entry['rank']:03d}\n\n{term}\n\n"
    article = f"\n\nArticle: {title}\n{url}"
    misread_label = "Misread: "

    remaining = MAX_POST_CHARS - len(prefix) - len(article) - len(misread_label)

    text = prefix + misread_label + shorten(misread, remaining) + article

    if len(text) > MAX_POST_CHARS:
        article = f"\n\n{url}"
        remaining = MAX_POST_CHARS - len(prefix) - len(article) - len(misread_label)
        text = prefix + misread_label + shorten(misread, remaining) + article

    if len(text) > MAX_POST_CHARS:
        text = shorten(text, MAX_POST_CHARS)
    return text


def oauth1_header(method: str, url: str, body_params: dict, credentials: dict) -> str:
    oauth_params = {
        "oauth_consumer_key": credentials["api_key"],
        "oauth_nonce": "".join(random.choice(string.ascii_letters + string.digits) for _ in range(32)),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": credentials["access_token"],
        "oauth_version": "1.0",
    }
    signing_params = {**oauth_params, **body_params}
    param_string = "&".join(f"{pct(k)}={pct(v)}" for k, v in sorted(signing_params.items()))
    base_string = "&".join([method.upper(), pct(url), pct(param_string)])
    signing_key = f"{pct(credentials['api_secret'])}&{pct(credentials['access_token_secret'])}"
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
    ).decode()
    oauth_params["oauth_signature"] = signature
    return "OAuth " + ", ".join(f'{pct(k)}="{pct(v)}"' for k, v in sorted(oauth_params.items()))


def post_to_x(text: str, credentials: dict) -> dict:
    body = json.dumps({"text": text}).encode("utf-8")
    headers = {
        "Authorization": oauth1_header("POST", POST_URL, {}, credentials),
        "Content-Type": "application/json",
        "User-Agent": "misreading-dictionary-bot",
    }
    request = Request(POST_URL, data=body, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"X API returned HTTP {error.code}: {detail}") from error


def require_credentials() -> dict:
    mapping = {
        "api_key": "X_API_KEY",
        "api_secret": "X_API_SECRET",
        "access_token": "X_ACCESS_TOKEN",
        "access_token_secret": "X_ACCESS_TOKEN_SECRET",
    }
    credentials = {key: os.environ.get(env_name) for key, env_name in mapping.items()}
    missing = [env_name for key, env_name in mapping.items() if not credentials[key]]
    if missing:
        raise RuntimeError("Missing required environment variables: " + ", ".join(missing))
    return credentials


def main() -> int:
    entries = load_json(ENTRIES_PATH, [])
    if not entries:
        raise RuntimeError("No dictionary entries found")

    state = load_json(STATE_PATH, {"next_index": 0, "posted": []})
    next_index = int(state.get("next_index", 0)) % len(entries)
    entry = entries[next_index]
    text = build_post(entry)

    if "--dry-run" in sys.argv:
        print(text)
        print(f"\ncharacters={len(text)}")
        return 0

    credentials = require_credentials()
    response = post_to_x(text, credentials)
    post_id = response.get("data", {}).get("id")

    state["next_index"] = (next_index + 1) % len(entries)
    state.setdefault("posted", []).append(
        {
            "entry_id": entry["id"],
            "rank": entry["rank"],
            "term": entry["term"]["en"],
            "post_id": post_id,
            "posted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    )
    save_json(STATE_PATH, state)
    print(json.dumps({"posted": entry["term"]["en"], "post_id": post_id}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
