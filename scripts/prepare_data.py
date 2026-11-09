#!/usr/bin/env python3
"""Small helper to pretty-print and normalise the World Ratio JSON files.

This script does not scrape news sites or invent facts. Add only researched,
source-linked records to the JSON datasets, then run validate_data.py.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

for filename in ("events.json", "institutions.json", "turning-points.json"):
    path = DATA / filename
    records = json.loads(path.read_text(encoding="utf-8"))
    path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Formatted {filename}: {len(records)} records")
