#!/usr/bin/env python3
"""Print a lesson plan as flat text for item writing: python3 -I tools/dump_lesson.py U1-D2 [max_chars]"""
import csv, sys
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import extract_lessons as e
from pathlib import Path
lid = sys.argv[1]; mx = int(sys.argv[2]) if len(sys.argv) > 2 else 6000
row = next(r for r in csv.DictReader(open("data/manifest.csv")) if r["lesson_id"] == lid)
lines = e.read_lines(Path("lessons") / row["filename"])
text = "\n".join(l.replace(e.SEP, " | ") for l in lines)
cut = text.find("Materials/Text")
print(text[: cut if cut > 0 else mx][:mx])
