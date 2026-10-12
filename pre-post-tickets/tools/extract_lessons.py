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

# Decision already made: U1-D4's single-sentence criterion is stored as four.
CRITERIA_OVERRIDES = {
    "U1-D4": [
        "Identify warning signs of misleading health information.",
        "Evaluate the credibility of a source.",
        "Verify claims using reliable evidence.",
        "Justify whether a health claim should or should not be trusted.",
    ]
}

# Section label patterns (matched at the start of a line / first table cell).
LABELS = {
    "knowledge": r"knowledge(\s+standards?)?",
    "skills": r"skills?(\s+standards?)?",
    "objective": r"(lesson\s+)?objectives?",
    "criteria": r"criteri(a|on)\s+for\s+success|success\s+criteri(a|on)",
    "check": r"(check\s+for\s+understanding|exit\s+ticket)",
}
# Headings that end a section even if we don't extract them.
STOP = (r"materials|vocabulary|warm[- ]?up|do now|agenda|procedure|activity|activities|"
        r"direct instruction|guided practice|independent practice|closure|assessment|"
        r"differentiation|homework|resources|standards|lesson plan checklist|notes?")
SEP = " :: "


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
    """A table cell may hold several lines; keep them as separate lines after the label."""
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
def match_label(line):
    """Return (key, remainder) if the line starts a known section, else (None, None)."""
    for key, pat in LABELS.items():
        m = re.match(rf"^\W*(?:{pat})\s*(?:\(s\))?\s*(?:{re.escape(SEP.strip())}|[:\-–—]|\s)\s*(.*)$",
                     line, re.I)
        if m and len(line.split(SEP)[0]) < 60:       # a label, not a sentence that starts with "Skills"
            return key, m.groups()[-1].strip()
    return None, None


def is_stop(line):
    head = line.split(SEP)[0]
    return bool(re.match(rf"^\W*(?:{STOP})\b", head, re.I)) and len(head) < 50


def sections(lines):
    found, cur = {}, None
    for line in lines:
        key, rest = match_label(line)
        if key:
            cur = key
            found.setdefault(cur, [])
            for part in rest.split(SEP):
                if part.strip():
                    found[cur].append(part.strip())
            continue
        if is_stop(line):
            cur = None
            continue
        if cur:
            found[cur].extend(p.strip() for p in line.split(SEP) if p.strip())
    return found


BULLET = re.compile(r"^\s*(?:[•●▪◦\-\*–—☐□✓✔]|\(?\d+[\.\)]|\(?[a-zA-Z][\.\)])\s+")
STEM = re.compile(r"^(students?\s+(will|can)(\s+be\s+able\s+to)?|i\s+can|swbat)\s*[:,]?\s*", re.I)


def split_criteria(parts):
    items = []
    for p in parts:
        p = BULLET.sub("", p).strip()
        if p:
            items.append(p)
    # a lead-in line such as "Students will be able to:" is not itself a criterion
    items = [i for i in items if not re.fullmatch(STEM.pattern + r"[:\s]*", i, re.I)]
    return [STEM.sub("", i).strip().rstrip(";") for i in items]


VERBS = r"identify|explain|describe|distinguish|evaluate|analy[sz]e|compare|define|list|apply|demonstrate|create|design|justify|interpret|calculate|predict|recognize|summari[sz]e|use|verify|assess|select|differentiate|classify|develop|choose|locate|practice"


def criterion_flags(text):
    flags = []
    verbs = re.findall(rf"\b(?:{VERBS})\b", text, re.I)
    if len(verbs) >= 3 or (len(verbs) >= 2 and re.search(r",|;|\band\b", text)):
        flags.append("bundled (multiple skills in one criterion)")
    if len(text.split()) < 5:
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

    with open(data_dir / "manifest.csv", newline="") as f:
        manifest = list(csv.DictReader(f))
    manifest.sort(key=lambda r: (int(r["unit"]), int(r["day"])))

    out, issues = [], {"missing": [], "unparsed": [], "mismatch": [], "gap": [], "criteria": [], "empty": []}
    for seq, row in enumerate(manifest, 1):
        lid, unit, day = row["lesson_id"], int(row["unit"]), int(row["day"])
        rec = {
            "sequence": seq, "lesson_id": lid, "unit": unit, "unit_title": row["unit_title"],
            "day": day, "title": row["topic"], "filename": row["filename"],
            "ticket_type": "unit_review" if (day == 6 and unit in UNIT_REVIEW_UNITS) else "daily",
            "status": "ok", "knowledge": [], "skills": [], "objective": "",
            "criteria": [], "existing_check": [],
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
        crit = CRITERIA_OVERRIDES.get(lid) or split_criteria(sec.get("criteria", []))
        rec["criteria"] = [{"criterion_id": f"{lid}-C{i}", "text": t} for i, t in enumerate(crit, 1)]

        for k, label in (("objective", "Lesson Objective"), ("criteria", "Criteria for Success")):
            if not (rec["objective"] if k == "objective" else rec["criteria"]):
                issues["empty"].append(f"{lid}: no **{label}** found in `{path.name}` - check layout")
        if rec["ticket_type"] == "daily" or lid in CRITERIA_OVERRIDES:
            for c in rec["criteria"]:
                fl = criterion_flags(c["text"])
                if fl and lid not in CRITERIA_OVERRIDES:
                    issues["criteria"].append(f"{c['criterion_id']}: \"{c['text']}\" - {'; '.join(fl)}")
        out.append(rec)

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
    block("Vague or bundled criteria (proposed splits NOT applied)", issues["criteria"])
    rep += ["## Decisions applied", "",
            "- U1-D4 stored as four criteria (C1-C4): " + ("yes" if any(r["lesson_id"] == "U1-D4" and len(r["criteria"]) == 4 for r in out)
                                                           else "no"),
            "- `ticket_type: unit_review` set on: " + ", ".join(r["lesson_id"] for r in out if r["ticket_type"] == "unit_review"),
            "- Unit 5 has no unit-review ticket; U6-D4 is a placeholder and will join Unit 6's review pool once it has criteria.", ""]
    (data_dir / "extraction_report.md").write_text("\n".join(rep))
    print("\n".join(rep))


if __name__ == "__main__":
    main()
