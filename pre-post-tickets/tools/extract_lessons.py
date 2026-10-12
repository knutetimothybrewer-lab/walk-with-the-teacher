#!/usr/bin/env python3
"""Extract learning targets from the lesson plans in lessons/, driven by data/manifest.csv.

Usage:  python3 tools/extract_lessons.py [--lessons lessons] [--data data]
Writes: data/lessons.json, data/extraction_report.md

Lesson plans come in several layouts (checklist tables, bullets, one sentence,
numbered). Every document is flattened to text lines first; table rows become
"Label :: value :: value". Sections are then found by label, so layout
differences mostly disappear. Nothing is silently fixed: mismatches and
doubtful criteria go to the report.
"""
import argparse, csv, json, re, sys
from pathlib import Path

# Units whose Day 6 is a project/summative day -> no criterion items of their own.
UNIT_REVIEW_UNITS = {1, 2, 3, 4, 6, 7, 8}

# Approved criterion splits live in data/criteria_overrides.json (edit that file, not this one).
# Each entry replaces the criteria parsed from that lesson plan. U1-D4 and Units 5-8 are in there.

# Section label patterns, matched at the start of a table cell / line.
LABELS = {
    "knowledge": r"(what\s+should\s+students\s+know|knowledge(\s+standards?)?)",
    "skills": r"(what\s+should\s+students\s+be\s+able\s+to\s+do|skills?(\s+standards?)?)",
    "objective": r"(lesson\s+)?objectives?",
    "criteria": r"criteri(a|on)\s+for\s+success|success\s+criteri(a|on)",
    "check": r"(check\s+for\s+understanding|exit\s+ticket)",
}
# Cells/lines that end a section (the template's procedure table and its rows).
STOP = (r"standard\(s\)|minutes|procedure\s+followed|statement\s+of\s+objectives|"
        r"review\s+previously|class\s+starter|learning\s+activity|class\s+closure|"
        r"is\s+content\s+in|\d+[- ]?min(ute)?s?\s+procedure|materials|vocabulary|homework|differentiation|teacher\s*:|date\s*:|subject\s*:|unit\s*:|period")
SEP = " :: "
PAREN = r"(?:\s*\([^)]*\))?"


# ---------- reading files ----------
def docx_lines(path):
    import docx
    from docx.table import Table
    from docx.text.paragraph import Paragraph
    d = docx.Document(str(path))
    out = []
    for el in d.element.body.iterchildren():
        if el.tag.endswith("}p"):
            t = Paragraph(el, d).text.strip()
            if t:
                out.append(t)
        elif el.tag.endswith("}tbl"):
            for row in Table(el, d).rows:
                cells, seen = [], set()
                for c in row.cells:            # merged cells repeat; dedupe by id
                    if id(c._tc) in seen:
                        continue
                    seen.add(id(c._tc))
                    txt = "\n".join(p.text.strip() for p in c.paragraphs if p.text.strip())
                    if txt:
                        cells.append(txt)
                if cells:
                    out.append(SEP.join(cells))
    return expand(out)


def pdf_lines(path):
    try:
        import pdfplumber
        with pdfplumber.open(str(path)) as pdf:
            text = "\n".join((p.extract_text() or "") for p in pdf.pages)
    except Exception:
        import subprocess
        text = subprocess.run(["pdftotext", "-layout", str(path), "-"],
                              capture_output=True, text=True, check=True).stdout
    return [l.strip() for l in text.splitlines() if l.strip()]


def pandoc_lines(path):
    import subprocess
    text = subprocess.run(["pandoc", str(path), "-t", "plain", "--wrap=none"],
                          capture_output=True, text=True, check=True).stdout
    return [l.strip() for l in text.splitlines() if l.strip()]


def expand(lines):
    """A table cell may hold several lines; keep each as its own line. A multi-line cell
    only keeps the ' :: ' separator on its first/last line, which is what we want:
    the label cell comes first and the following cells carry on after it."""
    out = []
    for l in lines:
        out.extend(x for x in l.split("\n") if x.strip())
    return out


def read_lines(path):
    if path.suffix.lower() == ".pdf":
        return pdf_lines(path)
    try:
        return docx_lines(path)
    except Exception:
        return pandoc_lines(path)


# ---------- section parsing ----------
def match_label(cell):
    """(key, remainder) if the cell starts a known section label, else (None, None)."""
    for key, pat in LABELS.items():
        m = re.match(rf"^\W*(?:{pat}){PAREN}\s*(?:[:\-–—]\s*(.*)|)$", cell, re.I | re.S)
        if m:
            return key, (m.groups()[-1] or "").strip()
    return None, None


def is_stop(cell):
    return bool(re.match(rf"^\W*(?:{STOP})", cell, re.I)) and len(cell) < 90


def sections(lines):
    """Walk cells in order; a label cell switches section, a stop cell ends it."""
    found, cur = {}, None
    for line in lines:
        for cell in (c.strip() for c in line.split(SEP)):
            if not cell:
                continue
            key, rest = match_label(cell)
            if key:
                cur = key
                found.setdefault(cur, [])
                if rest:
                    found[cur].append(rest)
            elif is_stop(cell):
                cur = None
            elif cur:
                found[cur].append(cell)
    return found


NUM = re.compile(r"^\s*\(?\d+[\.\)]\s*")
BULLET = re.compile(r"^\s*(?:[•●▪◦\-\*–—☐□✓✔]|\(?[a-zA-Z][\.\)])\s+")
LEAD = r"(?:by\s+the\s+end\s+of\s+(?:class|the\s+lesson|today)[,:]?\s*)?"
STEM = re.compile(rf"^{LEAD}(?:students?\s+(?:will|can)(?:\s+be\s+able\s+to)?|i\s+can|swbat)?\s*[:,…\.]*\s*", re.I)


def split_criteria(parts):
    marked = [bool(NUM.match(p) or BULLET.match(p)) for p in parts]
    items = []
    for p, mk in zip(parts, marked):
        p = BULLET.sub("", NUM.sub("", p)).replace("**", "").strip()
        if not p:
            continue
        # PDF text wraps mid-sentence: when the list is numbered, unmarked lines continue the last item.
        if sum(marked) >= 2 and not mk and items:
            items[-1] += " " + p
        else:
            items.append(p)
    out = []
    for i in items:
        t = STEM.sub("", i, count=1).strip().rstrip(";")
        if len(t) > 2:                       # drops pure lead-ins like "I can…"
            out.append(t[0].upper() + t[1:])
    return out


VERBS = r"identify|explain|describe|distinguish|evaluate|analy[sz]e|compare|define|list|apply|demonstrate|create|design|justify|interpret|calculate|predict|recognize|summari[sz]e|use|verify|assess|select|differentiate|classify|develop|choose|locate|practice|complete|review|revise|generate|challenge|correct|understand"


def criterion_flags(text):
    flags = []
    verbs = re.findall(rf"\b(?:{VERBS})\b", text, re.I)
    if len(verbs) >= 3 or (len(verbs) >= 2 and re.search(r",|;|\band\b", text)):
        flags.append("bundled (multiple skills in one criterion)")
    if len(text.split()) < 4:
        flags.append("very short / vague")
    if not verbs:
        flags.append("no measurable verb")
    return flags


def head_text(lines, n=15):
    return "\n".join(lines[:n])


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lessons", default="lessons")
    ap.add_argument("--data", default="data")
    a = ap.parse_args()
    lessons_dir, data_dir = Path(a.lessons), Path(a.data)

    # Match files by trimmed, whitespace-collapsed, case-insensitive name.
    norm = lambda s: re.sub(r"\s+", " ", s.strip()).lower()
    # "Day 3  (1).docx" -> trailing/double spaces; also drop space before extension.
    norm = (lambda f: (lambda s: re.sub(r"\s+(\.\w+)$", r"\1", s))(re.sub(r"\s+", " ", f.strip()).lower()))
    on_disk = {norm(p.name): p for p in lessons_dir.glob("*") if p.is_file()} if lessons_dir.exists() else {}

    overrides = json.loads((data_dir / "criteria_overrides.json").read_text()) if (data_dir / "criteria_overrides.json").exists() else {}
    scope = {}
    if (data_dir / "scope_sequence.csv").exists():
        with open(data_dir / "scope_sequence.csv", newline="") as f:
            scope = {r["lesson_id"]: r for r in csv.DictReader(f)}

    with open(data_dir / "manifest.csv", newline="") as f:
        manifest = list(csv.DictReader(f))
    manifest.sort(key=lambda r: (int(r["unit"]), int(r["day"])))

    out, issues = [], {"mastery": [], "dupobj": [], "missing": [], "unparsed": [], "mismatch": [], "gap": [], "criteria": [], "empty": []}
    for seq, row in enumerate(manifest, 1):
        lid, unit, day = row["lesson_id"], int(row["unit"]), int(row["day"])
        rec = {
            "sequence": seq, "lesson_id": lid, "unit": unit, "unit_title": row["unit_title"],
            "day": day, "title": row["topic"], "filename": row["filename"],
            "ticket_type": "unit_review" if (day == 6 and unit in UNIT_REVIEW_UNITS) else "daily",
            "status": "ok", "knowledge": [], "skills": [], "objective": "",
            "criteria": [], "existing_check": [],
            "scope_focus": scope.get(lid, {}).get("scope_focus", ""),
            "skill_emphasis": scope.get(lid, {}).get("skill_emphasis", ""),
        }
        if not row["filename"]:
            rec["status"] = "gap"
            issues["gap"].append(f"{lid}: no file yet - placeholder row kept (sequence {seq}).")
            out.append(rec); continue
        path = on_disk.get(norm(row["filename"]))
        if not path:
            rec["status"] = "missing"
            issues["missing"].append(f"{lid}: `{row['filename']}` not found in {lessons_dir}/")
            out.append(rec); continue
        try:
            lines = read_lines(path)
            if not lines:
                raise ValueError("no text extracted (scanned image PDF?)")
        except Exception as e:
            rec["status"] = "unparsed"
            issues["unparsed"].append(f"{lid}: `{path.name}` - {e}")
            out.append(rec); continue

        # Cross-check the document's own Unit/Day against the manifest; never override either.
        head = head_text(lines)
        mu = re.search(r"\bunit\s*[:#]?\s*(\d+)", head, re.I)
        md = re.search(r"\bday\s*[:#]?\s*(\d+)", head, re.I)
        if (mu and int(mu.group(1)) != unit) or (md and int(md.group(1)) != day):
            issues["mismatch"].append(
                f"{lid}: manifest says Unit {unit} Day {day}; document says "
                f"Unit {mu.group(1) if mu else '?'} Day {md.group(1) if md else '?'} (`{path.name}`)")

        sec = sections(lines)
        rec["knowledge"] = sec.get("knowledge", [])
        rec["skills"] = sec.get("skills", [])
        rec["objective"] = " ".join(sec.get("objective", [])).strip()
        rec["existing_check"] = sec.get("check", [])
        if lid in overrides:
            rec["criteria"] = [{"criterion_id": f"{lid}-C{i}", **o} for i, o in enumerate(overrides[lid], 1)]
            rec["criteria_original"] = split_criteria(sec.get("criteria", []))
        else:
            rec["criteria"] = [{"criterion_id": f"{lid}-C{i}", "text": t, "source": "statement"}
                               for i, t in enumerate(split_criteria(sec.get("criteria", [])), 1)]

        for k, label in (("objective", "Lesson Objective"), ("criteria", "Criteria for Success")):
            if not (rec["objective"] if k == "objective" else rec["criteria"]):
                issues["empty"].append(f"{lid}: no **{label}** found in `{path.name}` - check layout")
        if rec["ticket_type"] == "daily" and lid not in overrides:
            for c in rec["criteria"]:
                fl = criterion_flags(c["text"])
                if re.search(r"meets the objective if", c["text"], re.I):
                    issues["mastery"].append(f"{c['criterion_id']}: \"{c['text']}\"")
                    continue
                elif fl:
                    issues["criteria"].append(f"{c['criterion_id']}: \"{c['text']}\" - {'; '.join(fl)}")
        out.append(rec)

    # A document whose Lesson Objective is word-for-word the previous lesson's is probably a copy-paste.
    prev = None
    for r in out:
        if r["status"] == "ok" and prev and r["objective"] and r["objective"] == prev["objective"]:
            issues["dupobj"].append(f"{r['lesson_id']} has the same Lesson Objective as {prev['lesson_id']}")
        if r["status"] == "ok":
            prev = r

    (data_dir / "lessons.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))

    n_ok = sum(r["status"] == "ok" for r in out)
    rep = ["# Extraction report", "",
           f"- Manifest slots: {len(out)} (sequence 1-{len(out)}); parsed OK: {n_ok}",
           f"- Daily tickets: {sum(r['ticket_type']=='daily' for r in out)}; "
           f"unit-review tickets: {sum(r['ticket_type']=='unit_review' for r in out)}", ""]
    def block(title, items, empty="None."):
        rep.extend([f"## {title}", ""] + ([f"- {i}" for i in items] if items else [empty]) + [""])
    block("Missing files", issues["missing"])
    block("Files that could not be parsed", issues["unparsed"])
    block("Unit/Day mismatches (manifest vs. document)", issues["mismatch"])
    block("Gaps", issues["gap"])
    block("Lessons where Objective or Criteria were not found", issues["empty"])
    block("Lesson Objective copied from the previous lesson", issues["dupobj"])
    block("Criteria written as ONE mastery statement (no criteria list) - need your decision", issues["mastery"])
    block("Vague or bundled criteria (proposed splits NOT applied)", issues["criteria"])
    split = [r for r in out if r["lesson_id"] in overrides and r["status"] == "ok"]
    rep += ["## Approved criterion splits (from data/criteria_overrides.json)", "",
            "`obs` = performed/observed in class, so the ticket tests the knowledge behind it. "
            "`src`: statement = your criteria text, objective = Lesson Objective, plan_knowledge = the plan's Knowledge standards.", ""]
    for r in split:
        rep.append(f"**{r['lesson_id']} {r['title']}** ({len(r['criteria'])} criteria)")
        for c in r["criteria"]:
            rep.append(f"- {c['criterion_id']} [{c['source']}{', obs' if c.get('observed') else ''}] {c['text']}")
            if c.get("note"):
                rep.append(f"  - NOTE: {c['note']}")
        rep.append("")
    rep += ["## Decisions applied", "",
            "- U1-D4 stored as four criteria (C1-C4): " + ("yes" if any(r["lesson_id"] == "U1-D4" and len(r["criteria"]) == 4 for r in out)
                                                           else "no"),
            "- `ticket_type: unit_review` set on: " + ", ".join(r["lesson_id"] for r in out if r["ticket_type"] == "unit_review"),
            "- U6-D4 topic filled from the Scope & Sequence: Home & School Safety (fire safety, basic first aid). Still no lesson plan, so no criteria yet.",
            "- Scope & Sequence (Howard_Health_Course_.docx) adds `scope_focus` and `skill_emphasis` to every lesson.",
            "- OPEN QUESTION: the U5-D4 plan says it administers the Unit 5 summative exam that day, so the exit ticket would share a day with the exam. Unit 5 currently has no unit-review ticket; confirm.",
            "- Unit 5 has no unit-review ticket; U6-D4 is a placeholder and will join Unit 6's review pool once it has criteria.", ""]
    (data_dir / "extraction_report.md").write_text("\n".join(rep))
    print("\n".join(rep))


if __name__ == "__main__":
    main()
