#!/usr/bin/env python3
"""Read-only verified export of KinoLab PUBLIC catalog data and Storage objects.

This is NOT a complete PostgreSQL/Supabase backup: RLS-protected user, auth
and private tables are intentionally excluded. Never export privileged keys.
"""
from __future__ import annotations

import hashlib
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "kinolab-backup"
URL = "https://ysecowknittmmmbixgtu.supabase.co"
EXPECTED_PROJECT = "ysecowknittmmmbixgtu"
config = (ROOT / "kinolab-next" / "config.js").read_text(encoding="utf-8")
key_match = re.search(r'key:\s*"(sb_publishable_[A-Za-z0-9_-]+)"', config)
if not key_match:
    raise SystemExit("No browser-safe publishable key found in production config")
API_KEY = key_match.group(1)

source = ROOT / "backup_tools" / "storage_manifest_2026-11-10.json"
storage = json.loads(source.read_text(encoding="utf-8"))
assert storage["project"] == EXPECTED_PROJECT
assert storage["bucket"] == "cinewave-assets"
assert len(storage["objects"]) == 64, "Storage manifest unexpectedly incomplete"

def get_bytes(url, headers=None):
    req_headers = {"User-Agent": "KinoLabBackup/1.0", **(headers or {})}
    last_error = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=req_headers), timeout=45) as r:
                return r.read()
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            last_error = e
            if isinstance(e, urllib.error.HTTPError) and e.code not in (429, 500, 502, 503, 504):
                raise
            if attempt < 3:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Failed after retries: {url}") from last_error

def fetch_table(table):
    result = []
    headers = {"apikey": API_KEY, "Accept": "application/json"}
    for page in range(200):
        a = page * 1000
        url = f"{URL}/rest/v1/{table}?select=*&order=id.asc"
        batch = json.loads(get_bytes(url, {**headers, "Range": f"{a}-{a+999}"}))
        if not isinstance(batch, list):
            raise RuntimeError("REST response is not a list")
        result.extend(batch)
        if len(batch) < 1000:
            return result
    raise RuntimeError("Unexpectedly huge catalog; check pagination")

def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")

OUT.mkdir(parents=True, exist_ok=True)
table_counts = {}
for table in ("kinolab_external_catalog", "movies"):
    rows = fetch_table(table)
    save_json(OUT / "catalog" / f"{table}.json", rows)
    table_counts[table] = len(rows)
    print(f"Catalog {table}: {len(rows)} public rows")

# The original films were intentionally removed by their owner; the live
# external catalog held 48 published rows at the time the manifest was made.
if table_counts["kinolab_external_catalog"] < 48:
    raise RuntimeError("Fewer than 48 published external films visible; refusing incomplete backup")

media = []
for i, obj in enumerate(storage["objects"], start=1):
    name = obj["name"]
    if name.startswith("/") or ".." in Path(name).parts or not re.fullmatch(r"[A-Za-z0-9_./-]+", name):
        raise ValueError("Unsafe Storage filename")
    public_url = f"{URL}/storage/v1/object/public/{storage['bucket']}/{urllib.parse.quote(name, safe='/')}"
    data = get_bytes(public_url)
    expected_size = int(obj["size_bytes"])
    if len(data) != expected_size:
        raise RuntimeError(f"Storage size mismatch for {name}: expected {expected_size}, got {len(data)}")
    destination = OUT / "media" / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    media.append({
        "storage_path": name,
        "relative_path": str(Path("media") / name).replace("\\", "/"),
        "size_bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
    })
    print(f"Downloaded public Storage object {i}/{len(storage['objects'])}: {len(data)} bytes")

save_json(OUT / "storage-files.json", media)
report = {
    "generated_utc": datetime.now(timezone.utc).isoformat(),
    "supabase_project_ref": EXPECTED_PROJECT,
    "source": URL,
    "scope": "public_catalog_and_public_storage_files_only",
    "catalog_public_rows": table_counts,
    "public_storage_file_count": len(media),
    "public_storage_total_bytes": sum(f["size_bytes"] for f in media),
    "important_exclusions": [
        "auth.users and session/credential data",
        "private admin and AI usage tables",
        "profiles and signed-in watchlists",
        "database schema, RLS and policies, Edge Function secrets",
        "other buckets or objects not included in this Storage manifest"
    ]
}
save_json(OUT / "backup-report.json", report)
(OUT / "README_FIRST.txt").write_text(
    "KINOLAB - PUBLIC CONTENT BACKUP - 2026-11-10\n\n"
    "This export includes the PUBLIC film catalog JSON records and 64 actual\n"
    "Supabase Storage pictures from the cinewave-assets bucket. The files\n"
    "retain their original Storage paths. Check backup-report.json and\n"
    "storage-files.json to verify counts and SHA-256 checksums.\n\n"
    "IMPORTANT: This is NOT a full PostgreSQL, Auth, profiles, admin, RLS,\n"
    "Edge Functions, or secrets backup. No private account information is\n"
    "included. The Free plan lacks automatic daily DB backups. For a full\n"
    "logical database backup use the official Supabase CLI db dump with\n"
    "database credentials kept locally (never share passwords in chat or\n"
    "commit them to GitHub). Storage needs separate file backups like this.\n"
    "Keep this archive in two independent private places, offline if possible.\n",
    encoding="utf-8",
)
print("BACKUP_SUCCESS", json.dumps(report, ensure_ascii=False))
