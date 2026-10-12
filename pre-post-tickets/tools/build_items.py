#!/usr/bin/env python3
"""Build the item bank from tools/items_src/*.py and data/lessons.json.

Usage:  python3 -I tools/build_items.py        (run from pre-post-tickets/)
Writes: data/items.json, data/items_review.html, data/items_import.csv, data/items_report.md

What it does
  1. Loads the hand-written items (correct answer written first) and shuffles option order (seeded by item_id,
     so the bank is identical every run). Students still get a fresh shuffle each time on the front end.
  2. Validates the Phase 2 rules and fails loudly if one is broken.
  3. Builds unit-review tickets for the Day 6 review lessons from that unit's earlier items.
  4. Writes the bank, a printable proofing page, a Sheet import CSV, and a report.

Edit items in tools/items_src/uN.py, criteria in data/criteria_overrides.json, settings in data/config.json.
"""
import csv, html, importlib, json, random, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DATA = ROOT / "data"
sys.path.insert(0, str(HERE))

# Criteria deliberately without an auto-graded item, with the reason (shown in the report and review page).
EXCLUDED = {
    "U1-D3-C5": "Personal preference ('choose a wellness area that is meaningful to me'); not auto-gradable. Lesson has 6 criteria and 5 items.",
    "U2-D4-C3": "'Ask appropriate questions' is folded into the Listen-Validate-Ask-Connect items. Lesson has 6 criteria and 5 items.",
    "U3-D5-C2": "'Use at least two credible sources' is tested in U1-D4 and U3-D2 (STOP). Lesson has 7 criteria and 5 items.",
    "U3-D5-C3": "'Population affected and contributing influences' is tested in U3-D1. Lesson has 7 criteria and 5 items.",
    "U4-D4-C6": "'Use credible sources, not social-media claims' is tested in U1-D4 and U4-D1-C5. Lesson has 6 criteria and 5 items.",
    "U5-D3-C4": "Group PSA draft; a product, not auto-gradable.",
}
BANNED = re.compile(r"\b(all|none) of the above\b", re.I)


def load_config():
    cfg = {"ITEMS_PER_TICKET": 5, "PARALLEL_FORMS": False, "REVIEW_ROTATION_OFFSET": 0, "MASTERY_THRESHOLD": 80}
    p = DATA / "config.json"
    if p.exists():
        cfg.update(json.loads(p.read_text()))
    else:
        p.write_text(json.dumps(cfg, indent=2) + "\n")
    return cfg


def words(s):
    return len(re.findall(r"\S+", s))


def main():
    cfg = load_config()
    lessons = json.loads((DATA / "lessons.json").read_text())
    by_id = {l["lesson_id"]: l for l in lessons}

    # --- load authored items ---
    from items_src._h import ITEMS, CR, ITEMS_B
    for name in sorted(p.stem for p in (HERE / "items_src").glob("u*.py")):
        importlib.import_module(f"items_src.{name}")

    errors, bank, counters = [], [], {}

    def make(raw, item_id, crit_id, form):
        """Shuffle options (seeded) and work out the key; returns the item dict."""
        rng = random.Random(item_id)
        it = dict(item_id=item_id, lesson_id=raw["lesson_id"], criterion_id=crit_id, type=raw["type"], form=form,
                  ticket_type="daily", stem=raw["stem"], rationale=raw["why"])
        if raw["type"] in ("mc", "ms"):
            order = list(range(len(raw["options"])))
            rng.shuffle(order)
            it["options"] = [raw["options"][i] for i in order]
            it["correct"] = sorted(order.index(i) for i in range(raw["n_correct"]))
        else:  # match: categories keep their order; the statements are shuffled
            order = list(range(len(raw["rows"])))
            rng.shuffle(order)
            it["options"] = raw["options"]
            it["rows"] = [raw["rows"][i] for i in order]
            it["correct"] = [raw["key"][i] for i in order]
        check(it)
        return it

    def check(it):
        item_id = it["item_id"]
        if words(it["stem"]) > 40:
            errors.append(f"{item_id}: stem is {words(it['stem'])} words (max 40)")
        texts = it["options"] + it.get("rows", []) + [it["stem"]]
        if any(BANNED.search(t) for t in texts):
            errors.append(f"{item_id}: contains 'all/none of the above'")
        if it["type"] == "mc":
            if len(it["options"]) != 4 or len(it["correct"]) != 1:
                errors.append(f"{item_id}: multiple choice needs 4 options and 1 correct")
            else:
                # Test-wiseness guard: the right answer must not stand out by length.
                L = [len(o) for o in it["options"]]
                c = it["correct"][0]
                ratio = L[c] / (sum(L[k] for k in range(4) if k != c) / 3)
                if not (0.7 <= ratio <= 1.35):
                    errors.append(f"{item_id}: correct option length is {ratio:.2f}x the distractors (allowed 0.70-1.35)")
        if it["type"] == "ms" and not (4 <= len(it["options"]) <= 6 and 2 <= len(it["correct"]) < len(it["options"])):
            errors.append(f"{item_id}: multiple select needs 4-6 options and 2+ correct (not all)")
        if it["type"] == "match" and (len(it["options"]) < 2 or len(it["rows"]) < 3 or
                                      len(set(it["correct"])) < 2 or max(it["correct"]) >= len(it["options"])):
            errors.append(f"{item_id}: matching needs 2+ categories, 3+ rows, and at least 2 categories used")
        if len({o.lower() for o in it["options"]}) != len(it["options"]):
            errors.append(f"{item_id}: duplicate options")

    for raw in ITEMS:
        lid = raw["lesson_id"]
        lesson = by_id.get(lid)
        if not lesson:
            errors.append(f"{lid}: unknown lesson"); continue
        counters[lid] = counters.get(lid, 0) + 1
        crit_id = f"{lid}-{raw['crit']}"
        if not any(c["criterion_id"] == crit_id for c in lesson["criteria"]):
            errors.append(f"{lid}-I{counters[lid]}: criterion {crit_id} does not exist"); continue
        bank.append(make(raw, f"{lid}-I{counters[lid]}", crit_id, "A"))

    # --- form B (parallel) items: one per form-A item, same criterion and type ---
    bank_b, a_by_id = [], {i["item_id"]: i for i in bank}
    for raw in ITEMS_B:
        a_id = f"{raw['lesson_id']}-I{raw['n']}"
        a = a_by_id.get(a_id)
        if not a:
            errors.append(f"form B for {a_id}: no such form-A item"); continue
        if a["type"] != raw["type"]:
            errors.append(f"{a_id}B: type {raw['type']} differs from form A ({a['type']})"); continue
        it = make(raw, a_id + "B", a["criterion_id"], "B")
        it["pair_of"] = a_id
        if set(it["options"]) | set(it.get("rows", [])) == set(a["options"]) | set(a.get("rows", [])):
            errors.append(f"{a_id}B: same options/rows as form A (parallel items must use different content)")
        bank_b.append(it)
    dup = {i["pair_of"] for i in bank_b}
    if bank_b:
        for a in bank:
            if a["item_id"] not in dup:
                errors.append(f"{a['item_id']}: no form-B partner")

    # global guard against 'pick the longest' (mc only, per form)
    for form, items in (("A", bank), ("B", bank_b)):
        mcs = [i for i in items if i["type"] == "mc"]
        if mcs:
            longest = sum(1 for i in mcs if len(i["options"][i["correct"][0]]) == max(len(o) for o in i["options"]))
            if longest / len(mcs) > 0.45:
                errors.append(f"form {form}: correct answer is the longest option in {longest}/{len(mcs)} multiple-choice items (max 45%)")

    # --- per-lesson checks ---
    n = cfg["ITEMS_PER_TICKET"]
    coverage = {}
    for l in lessons:
        if l["status"] != "ok" or l["ticket_type"] != "daily":
            continue
        its = [i for i in bank if i["lesson_id"] == l["lesson_id"]]
        if len(its) != n:
            errors.append(f"{l['lesson_id']}: has {len(its)} items, ITEMS_PER_TICKET is {n}")
        used = {i["criterion_id"] for i in its}
        missing = [c for c in l["criteria"] if c["criterion_id"] not in used]
        coverage[l["lesson_id"]] = missing
        for c in missing:
            if c["criterion_id"] not in EXCLUDED:
                errors.append(f"{c['criterion_id']}: not covered by any item and not in EXCLUDED")
        if l["lesson_id"] not in CR:
            errors.append(f"{l['lesson_id']}: no constructed-response prompt")
    for cid in EXCLUDED:
        lid = cid.rsplit("-C", 1)[0]
        if any(i["criterion_id"] == cid for i in bank):
            errors.append(f"{cid}: listed in EXCLUDED but has items")
    if errors:
        print("BUILD FAILED:\n  " + "\n  ".join(errors)); sys.exit(1)

    # --- unit-review tickets ---
    # One item per earlier lesson in the unit (Days 1-5). Which item is picked rotates with the unit, the day, and
    # REVIEW_ROTATION_OFFSET: bump the offset each semester so different criteria get a turn.
    review = []
    for l in lessons:
        if l["ticket_type"] != "unit_review":
            continue
        pool = [p for p in lessons if p["unit"] == l["unit"] and p["day"] < l["day"] and p["ticket_type"] == "daily"
                and p["status"] == "ok"]
        for k, src in enumerate(pool, 1):
            cand = [i for i in bank if i["lesson_id"] == src["lesson_id"]]
            pick = cand[(l["unit"] + src["day"] + cfg["REVIEW_ROTATION_OFFSET"]) % len(cand)]
            r = {**pick, "item_id": f"{l['lesson_id']}-R{k}", "lesson_id": l["lesson_id"], "ticket_type": "unit_review",
                 "source_item_id": pick["item_id"], "source_lesson_id": src["lesson_id"]}
            review.append(r)

    # Form-B twin of every review item (used when PARALLEL_FORMS is true), linked to the form-B twin of the source item.
    b_by_pair = {i["pair_of"]: i for i in bank_b}
    review_b = []
    for r in review:
        twin = b_by_pair.get(r["source_item_id"])
        if twin:
            review_b.append({**twin, "item_id": r["item_id"] + "B", "lesson_id": r["lesson_id"], "ticket_type": "unit_review",
                             "source_item_id": twin["item_id"], "source_lesson_id": r["source_lesson_id"]})

    if cfg["PARALLEL_FORMS"] and not bank_b:
        print("NOTE: PARALLEL_FORMS is true but no form-B items exist.")

    out = {"meta": {"items_per_ticket": n, "parallel_forms": cfg["PARALLEL_FORMS"], "review_rotation_offset": cfg["REVIEW_ROTATION_OFFSET"],
                    "n_items": len(bank), "n_items_b": len(bank_b), "n_review_items": len(review)},
           "items": bank, "items_b": bank_b, "review_items": review, "review_items_b": review_b, "constructed_response": CR,
           "excluded_criteria": EXCLUDED}
    (DATA / "items.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))

    write_csv(bank + bank_b, review + review_b)
    write_report(lessons, bank, bank_b, review, coverage, cfg)
    write_html(lessons, bank, bank_b, review, coverage, CR)
    print(f"OK: {len(bank)} form-A items, {len(bank_b)} form-B items, {len(review)}+{len(review_b)} unit-review items, {len(CR)} constructed-response prompts")


def write_csv(bank, review):
    cols = ["item_id", "lesson_id", "criterion_id", "ticket_type", "form", "type", "stem", "options", "rows", "correct",
            "rationale", "source_item_id", "active"]
    with open(DATA / "items_import.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for i in bank + review:
            w.writerow([i["item_id"], i["lesson_id"], i["criterion_id"], i["ticket_type"], i["form"], i["type"], i["stem"],
                        json.dumps(i["options"], ensure_ascii=False), json.dumps(i.get("rows", []), ensure_ascii=False),
                        json.dumps(i["correct"]), i["rationale"], i.get("source_item_id", ""), "Y"])


def write_report(lessons, bank, bank_b, review, coverage, cfg):
    types = {}
    for i in bank:
        types[i["type"]] = types.get(i["type"], 0) + 1
    pos = {}
    for i in bank:
        if i["type"] == "mc":
            pos[i["correct"][0]] = pos.get(i["correct"][0], 0) + 1
    per_crit = {}
    for i in bank:
        per_crit[i["criterion_id"]] = per_crit.get(i["criterion_id"], 0) + 1
    r = ["# Item bank report", "",
         f"- Daily items: {len(bank)} form A ({types}) and {len(bank_b)} form B; unit-review items: {len(review)} per form",
         f"- ITEMS_PER_TICKET = {cfg['ITEMS_PER_TICKET']}; PARALLEL_FORMS = {cfg['PARALLEL_FORMS']} (form B is only served when true)",
         "- Longest-option check (multiple choice, share where the correct option is the longest): "
         + ", ".join(f"form {f} {sum(1 for i in its if i['type']=='mc' and len(i['options'][i['correct'][0]])==max(len(o) for o in i['options']))}/{sum(1 for i in its if i['type']=='mc')}" for f, its in (("A", bank), ("B", bank_b))),
         f"- Correct-answer position for multiple choice (0=first shown): {dict(sorted(pos.items()))}", "",
         "## Criteria with no auto-graded item", ""]
    r += [f"- **{k}** - {v}" for k, v in EXCLUDED.items()]
    r += ["", "## Criteria that are observed in class", "",
          "These have knowledge-level items that test what sits behind the skill:", ""]
    for l in lessons:
        for c in l["criteria"]:
            if c.get("observed") and per_crit.get(c["criterion_id"]):
                r.append(f"- {c['criterion_id']} ({per_crit[c['criterion_id']]} item(s)): {c['text']}")
    r += ["", "## Unit-review tickets", ""]
    for l in lessons:
        if l["ticket_type"] == "unit_review":
            its = [i for i in review if i["lesson_id"] == l["lesson_id"]]
            r.append(f"- {l['lesson_id']}: {len(its)} items from " + ", ".join(i["source_item_id"] for i in its))
    r += ["", "## Criteria with 3+ items (weighted toward the lesson objective)", ""]
    r += [f"- {k}: {v}" for k, v in sorted(per_crit.items()) if v >= 3] or ["None."]
    (DATA / "items_report.md").write_text("\n".join(r) + "\n")


def write_html(lessons, bank, bank_b, review, coverage, CR):
    e = html.escape
    def render(i):
        cls = i["type"]
        body = [f'<div class="stem">{e(i["stem"])}</div>']
        if i["type"] == "match":
            cats = i["options"]
            body.append("<div class='cats'>Categories: " + " &middot; ".join(f"<b>{e(c)}</b>" for c in cats) + "</div><ul>")
            for r, k in zip(i["rows"], i["correct"]):
                body.append(f'<li>{e(r)} <span class="ans">&rarr; {e(cats[k])}</span></li>')
            body.append("</ul>")
        else:
            body.append("<ul>")
            for n, o in enumerate(i["options"]):
                mark = " class='key'" if n in i["correct"] else ""
                body.append(f"<li{mark}>{e(o)}</li>")
            body.append("</ul>")
        body.append(f'<div class="why">Why: {e(i["rationale"])}</div>')
        label = i["item_id"] + (f' <span class="src">(from {i["source_item_id"]})</span>' if i.get("source_item_id") else "")
        if i["form"] == "B":
            cls += " formb"
            label += " &middot; <b>Form B (parallel)</b>"
        return (f'<div class="item {cls}"><label class="flag"><input type="checkbox" data-id="{i["item_id"]}"> flag</label>'
                f'<div class="meta">{label} &middot; {i["type"]}</div>' + "".join(body) + "</div>")

    parts = []
    for l in lessons:
        head = f'<section><h2 id="{l["lesson_id"]}">{l["lesson_id"]} &middot; {e(l["title"])} <small>Unit {l["unit"]} Day {l["day"]}</small></h2>'
        if l["status"] == "gap":
            parts.append(head + "<p class='gap'>No lesson plan yet. Add the file and criteria, then items can be written. "
                         "This lesson will join the Unit 6 review pool automatically.</p></section>")
            continue
        if l["ticket_type"] == "unit_review":
            its = [i for i in review if i["lesson_id"] == l["lesson_id"]]
            parts.append(head + "<p class='badge'>Unit Review</p><p>Warm-up and exit ticket draw one item from each earlier lesson in the unit. "
                         "Each keeps its original criterion.</p>")
            for i in its:
                parts.append(f"<p class='srcline'>Source lesson: <b>{i['source_lesson_id']}</b> &middot; criterion {i['criterion_id']}</p>" + render(i))
            parts.append("</section>")
            continue
        parts.append(head + f"<p class='obj'><b>Objective:</b> {e(l['objective'])}</p>")
        for c in l["criteria"]:
            its = [i for i in bank if i["criterion_id"] == c["criterion_id"]]
            tag = " <span class='obs'>observed in class</span>" if c.get("observed") else ""
            parts.append(f'<h3>{c["criterion_id"]}{tag}: {e(c["text"])}</h3>')
            if c.get("note"):
                parts.append(f"<p class='note'>Note: {e(c['note'])}</p>")
            if not its:
                parts.append(f"<p class='gap'>No item. {e(EXCLUDED.get(c['criterion_id'], ''))}</p>")
            for i in its:
                parts.append(render(i))
                parts += [render(b) for b in bank_b if b["pair_of"] == i["item_id"]]
        parts.append(f"<div class='cr'><b>Optional constructed response (not auto-graded):</b> {e(CR.get(l['lesson_id'], ''))}</div></section>")

    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Item Bank Review</title><style>
:root{{--bg:#fff;--fg:#1b1f24;--mut:#59636e;--line:#d0d7de;--key:#d9f2e0;--keyfg:#0b4f1f;--card:#f6f8fa;--accent:#0b5cad}}
@media (prefers-color-scheme:dark){{:root{{--bg:#0d1117;--fg:#e6edf3;--mut:#9da7b3;--line:#30363d;--key:#12361d;--keyfg:#a7f0b8;--card:#161b22;--accent:#58a6ff}}}}
body{{font:15px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg);margin:0;padding:16px;max-width:900px;margin-inline:auto}}
h1{{margin:0 0 4px}}h2{{margin:32px 0 4px;border-bottom:2px solid var(--line);padding-bottom:4px}}h2 small{{color:var(--mut);font-weight:400;font-size:.6em}}
h3{{font-size:1em;margin:18px 0 6px;color:var(--accent)}}.item{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin:8px 0;position:relative;break-inside:avoid}}
.meta{{color:var(--mut);font-size:.8em}}.stem{{font-weight:600;margin:4px 0}}ul{{margin:4px 0 4px 18px;padding:0}}li.key{{background:var(--key);color:var(--keyfg);border-radius:4px;padding:1px 6px;margin-left:-6px;list-style-position:inside;font-weight:600}}
.ans{{background:var(--key);color:var(--keyfg);border-radius:4px;padding:0 6px;font-weight:600}}.why{{color:var(--mut);font-size:.9em}}.flag{{position:absolute;right:10px;top:8px;font-size:.85em}}
.formb{{margin-left:24px;border-style:dashed}}.gap,.note{{color:#9a6700;font-size:.9em}}.badge{{display:inline-block;background:var(--accent);color:#fff;border-radius:4px;padding:1px 8px;font-size:.8em}}.obs{{font-size:.75em;color:var(--mut)}}
.cr{{border:1px dashed var(--line);border-radius:8px;padding:8px;margin:10px 0;font-size:.9em}}.srcline{{margin:12px 0 0;color:var(--mut)}}
#bar{{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:8px 0;z-index:5}}button{{font:inherit;padding:4px 10px}}textarea{{width:100%;height:60px}}
@media print{{#bar{{display:none}}.flag{{display:none}}body{{padding:0;font-size:12px}}h2{{break-before:page}}}}
</style></head><body><h1>Item Bank Review</h1>
<p>{len(bank)} form-A items, each followed by its form-B twin ({len(bank_b)}), plus {len(review)} unit-review items (form B twins are indented). Correct answers are highlighted. Tick "flag" on anything to change, then copy the list and send it back.</p>
<div id="bar"><button id="copy">Copy flagged IDs</button> <button id="dl">Download flagged.txt</button> <span id="n">0 flagged</span><textarea id="out" readonly placeholder="Flagged item IDs appear here"></textarea></div>
{''.join(parts)}
<script>
const boxes=[...document.querySelectorAll('input[data-id]')],out=document.getElementById('out'),n=document.getElementById('n');
let saved=[];try{{saved=JSON.parse(localStorage.getItem('flagged')||'[]')}}catch(e){{}}
function sync(){{const ids=boxes.filter(b=>b.checked).map(b=>b.dataset.id);out.value=ids.join('\\n');n.textContent=ids.length+' flagged';try{{localStorage.setItem('flagged',JSON.stringify(ids))}}catch(e){{}}}}
boxes.forEach(b=>{{b.checked=saved.includes(b.dataset.id);b.addEventListener('change',sync)}});sync();
document.getElementById('copy').onclick=()=>{{out.select();document.execCommand('copy')}};
document.getElementById('dl').onclick=()=>{{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([out.value]));a.download='flagged.txt';a.click()}};
</script></body></html>"""
    (DATA / "items_review.html").write_text(page)


if __name__ == "__main__":
    main()
