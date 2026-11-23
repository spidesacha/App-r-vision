#!/usr/bin/env python3
"""Regroupe les JSON de data/ dans data.js (chargé par index.html, même en ouvrant le fichier directement)."""
import json, glob, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
chap = json.load(open("data/chapitres.json", encoding="utf-8"))
qs = []
for f in sorted(glob.glob("data/questions/*.json")):
    if os.path.basename(f).startswith(("exemple", "test")):
        continue
    qs += json.load(open(f, encoding="utf-8"))
open("data.js", "w", encoding="utf-8").write("window.BIOCELL_DATA=" + json.dumps({"chapitres": chap, "questions": qs}, ensure_ascii=False) + ";")
print(len(qs), "questions dans data.js")
