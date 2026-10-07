# Source status (read this)

## What was and was not reviewed

The assignment listed 14 classroom files (4 .pptx, 10 .docx). **None of them were present in the build environment** (searched the repository, `/mnt/user-data/uploads`, `/mnt/attach`, home and the whole filesystem for `*.docx`/`*.pptx`). They were **not read, and nothing here claims they were**.

| Source file | Reviewed? | How it was used |
|---|---|---|
| Marketing_Media_Literacy_Guided_Notes (3).docx | No (missing) | Topic list from the assignment (E, F) |
| marketing_influences_lesson (1).pptx | No (missing) | Topic list (E) |
| Prevention_Challenge_Risk_Reduction_Plan_Worksheet (1).docx | No (missing) | Four scenario cards as named in the assignment (soccer/AQI 135–155, lifeguard/high UV, repeated loud concerts, football/extreme heat) |
| Environmental_Health_Risk (1).pptx | No (missing) | Topic list (C) |
| Community_Health_Investigation_Student_Worksheet_Blank_Spaces (1).docx | No (missing) | Topic list (A) |
| Health_Disparities_Credible_Source_Challenge_Expanded (1).docx | No (missing) | **Exact table values copied from the assignment text** (Riverview, East Junction, Pine Hills, Lakeview) |
| PublicHealth_vs_Healthcare (1).pptx | No (missing) | Topic list (B) |
| Determinants_of_Health (1).pptx | No (missing) | Topic list (A); $1 million challenge as described |
| Day_1_Environment_and_Health (1).docx | No (missing) | Topic list (C) |
| Community_Health_Investigation (1).docx | No (missing) | Case-file communities named in the assignment (Riverbend, Eastgate, Pine Ridge County) with **paraphrased** descriptions |
| Unit3_Community_Environmental_Health_Exam (1).docx | No (missing) | Only the facts given in the assignment (84-point total) |
| Community_Health_Advocacy_Guided_Notes (1).docx | No (missing) | Topic list (G) |
| Community_Health_Advocacy_Planning (1).pptx | No (missing) | Topic list (G) |
| Counter_Message_Challenge_Student_Outline_Redesigned (1).docx | No (missing) | Counter-message components named in the assignment |

No diagrams or images were inspected. **To close this gap:** place the files in `/mnt/user-data/uploads` (or the repo), and rerun the alignment pass; every locator in `docs/ALIGNMENT.md` marked "(topic-level)" should then be replaced with the real slide/page/section.

## Items to confirm against your originals
1. **Riverbend profile and map values** (bus hourly, 5 miles to grocery, ≈10/55 min grocery trip, ≈12/65 min clinic trip, clinic hours 9–4, “few weeks” scheduling wait, strengths: garden/hall/park). These are illustrative values written to match the assignment's description (car dependence, food and clinic access). Replace with case-file facts if they differ (`private/content-src/m1.js`).
2. **Eastgate and Pine Ridge County** descriptions are brief comparative profiles from the assignment summary.
3. **$1M challenge** option list and costs are authored here (the assignment gave only the rule "fund exactly two interventions within a $1 million budget"). Confirm they fit your lesson's list.
4. **Community-name inconsistency (resolved).** The worksheet lists *Riverbend, Ironwood, East Harbor*; the case files list *Riverbend, Eastgate, Pine Ridge County*. This assessment uses the **case-file names** for the investigation. *Ironwood* and *East Harbor* appear nowhere. The disparities dataset's communities (*Riverview, East Junction, Pine Hills, Lakeview*) are kept entirely separate and are never merged with the case-file communities (note the similarity of "Riverbend" and "Riverview": module 4 labels its data "fictional classroom data" and tasks never mix them).
5. **Exam total (resolved).** The existing exam totals **84** points; this assessment is built on a new 100-point blueprint (see crosswalk in `docs/BLUEPRINT.md`). 84 is never treated as 100.
