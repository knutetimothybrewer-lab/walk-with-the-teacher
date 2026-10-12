"""Helpers for writing items. Write the CORRECT answer(s) first; build_items.py shuffles option order
(seeded, so the bank is stable between runs) and works out the answer key.

    mc("U1-D1", "C2", stem, correct, [wrong, wrong, wrong], why)
    ms("U1-D1", "C1", stem, [right, right, ...], [wrong, wrong, ...], why)      # select all that apply
    match("U1-D1", "C3", stem, ["Category A", "Category B"], [("example text", 0), ("example text", 1)], why)
    cr("U1-D1", "prompt")     # optional constructed response (not auto-graded)
"""
ITEMS, CR = [], {}


def _add(d):
    ITEMS.append(d)


def mc(lesson, crit, stem, correct, wrong, why):
    _add(dict(lesson_id=lesson, crit=crit, type="mc", stem=stem, options=[correct] + list(wrong), n_correct=1, why=why))


def ms(lesson, crit, stem, right, wrong, why):
    _add(dict(lesson_id=lesson, crit=crit, type="ms", stem=stem, options=list(right) + list(wrong), n_correct=len(right), why=why))


def match(lesson, crit, stem, categories, rows, why):
    _add(dict(lesson_id=lesson, crit=crit, type="match", stem=stem, options=list(categories),
              rows=[r[0] for r in rows], key=[r[1] for r in rows], why=why))


def cr(lesson, prompt):
    CR[lesson] = prompt
