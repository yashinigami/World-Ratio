#!/usr/bin/env python3
"""Validate World Ratio JSON datasets before publishing."""
import json
from pathlib import Path
from datetime import date
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
ERRORS = []

def load(name):
    path = DATA / name
    if not path.exists():
        ERRORS.append(f"Missing file: {path}")
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        ERRORS.append(f"{name}: invalid JSON: {exc}")
        return []

def check_url(url, context):
    parsed = urlparse(url or "")
    if parsed.scheme != "https" or not parsed.netloc:
        ERRORS.append(f"{context}: source URL must be a valid HTTPS URL: {url}")

events = load("events.json")
institutions = load("institutions.json")
turning_points = load("turning-points.json")

seen = set()
for item in events:
    context = f"event {item.get('id', '<no id>')}"
    if not item.get("id") or item["id"] in seen:
        ERRORS.append(f"{context}: missing or duplicate id")
    seen.add(item.get("id"))
    required = ["date","year","title","category","city","country","lat","lng","summary","why","impact","sources"]
    for field in required:
        if field not in item or item[field] in (None, "", []):
            ERRORS.append(f"{context}: missing {field}")
    try:
        parsed = date.fromisoformat(item["date"])
        if parsed.year != int(item["year"]):
            ERRORS.append(f"{context}: year does not match date")
    except Exception:
        ERRORS.append(f"{context}: invalid ISO date")
    if len(item.get("summary","")) + len(item.get("why","")) + len(item.get("impact","")) > 5000:
        ERRORS.append(f"{context}: unusually long text; keep event copy concise (under 500 words)")
    if not item.get("sources"):
        ERRORS.append(f"{context}: at least one source is required")
    for source in item.get("sources", []):
        check_url(source.get("url"), context)

seen = set()
for item in institutions:
    context = f"institution {item.get('id', '<no id>')}"
    if not item.get("id") or item["id"] in seen:
        ERRORS.append(f"{context}: missing or duplicate id")
    seen.add(item.get("id"))
    for field in ["name","type","founded","city","country","lat","lng","description","url","source"]:
        if field not in item or item[field] in (None, ""):
            ERRORS.append(f"{context}: missing {field}")
    check_url(item.get("url"), context)
    check_url(item.get("source"), context)

for item in turning_points:
    context = f"turning point {item.get('id', '<no id>')}"
    for field in ["id","year","title","lede","overview","humanImpact","timeline","sources"]:
        if field not in item or item[field] in (None, "", []):
            ERRORS.append(f"{context}: missing {field}")
    for source in item.get("sources", []):
        check_url(source.get("url"), context)

event_ids = {e.get("id") for e in events}
turning_ids = {t.get("id") for t in turning_points}
for e in events:
    tp = e.get("turningPoint")
    if tp and tp not in turning_ids:
        ERRORS.append(f"event {e.get('id')}: unknown turningPoint id {tp}")

if ERRORS:
    print("VALIDATION FAILED")
    for error in ERRORS:
        print(" -", error)
    raise SystemExit(1)

print(f"Validation passed: {len(events)} events, {len(institutions)} institutions, {len(turning_points)} turning points.")
print("Reminder: this script checks structure and URL format, not the truth or continued availability of source content.")
