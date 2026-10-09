# Teacher review: read this before students see it

**This assessment is PROVISIONAL.** The Unit 8 slides and notes were not available when it was built (CURRICULUM_AUDIT.md), and the health facts could not be checked against an outside source (`content/sources.json`). It is a careful draft that needs your sign-off. Everything below is ordered by how much it matters.

Nothing in this file is hidden from you or from Teacher Mode: the **Reference** tab in Teacher Mode shows the same provisional warning, the claims list, and the alignment matrix.

## How to review efficiently

1. Open the page, type `WALK-TEACHER` in the class-code box, sign in, and choose **Preview**. Preview never touches student data. You get free navigation through every chapter, and your preview has no timer.
2. Press **Show answer key** inside Preview. It overlays the correct answer, the hints and the explanation on each question as you page through.
3. The same keys, hints and explanations are in `private/ANSWER_KEY.md` (delivered to you separately; it is not in the repository). Read it side by side with your slides.
4. For each question that does not match your slides, either fix the wording (tell me, or edit `authoring/` and rebuild) or switch the question off in **Settings**.

## A. Decide before using it with students

### A1. Check the content against your slides (not done)

No item has been verified against the Unit 8 materials. QA_REPORT.md lists what I did check (internal consistency, the accuracy points in your build brief, the automated rules). That is not the same thing. Hand me the zip and I will run the real audit.

### A2. Approve or replace the anatomy diagrams (required by your build brief)

I drew three SVG figures myself. None comes from a textbook or a licensed source, and none has been reviewed by anyone but me.

| File | Used by | What it shows |
|---|---|---|
| `assets/fig-female-repro.svg` | C1-01 (2 pts) | Simplified front view: uterus, two fallopian tubes, two ovaries, cervix, vagina; five numbered markers |
| `assets/fig-male-repro.svg` | C1-02 (2 pts) | Simplified side-view cross-section: bladder, prostate, urethra, testis, epididymis, vas deferens, an unmarked seminal vesicle; five numbered markers |
| `assets/fig-demo-house.svg` | Practice set only (not in the live 40) | A plain house plan used to show the label widget in demo mode. It is not anatomical |

Please look at the two anatomy drawings at full size and decide:

- Are they accurate enough for your class? They are schematic (no scale, no color coding of function, no genitalia detail beyond what a labeling task needs). The male drawing was redrawn once because the first version had a disconnected penis and vas deferens. The current one has not been reviewed beyond my own checking.
- Is the level of detail appropriate for your students and district? If you would rather use your own slide diagram, replace the SVG and keep the same marker positions, or tell me and I will remap the markers.
- Each figure has alt text and a longer written description (in `content/figures.js`). The description deliberately describes **shapes and positions only** and never names a structure, because the names are the answers. A student using a screen reader can still do the item if they know the anatomy; whether that is enough for any accommodation plan is your call. (An earlier version of the descriptions did name the structures; see QA_REPORT.md finding 8.)

If you reject a diagram, switch off C1-01 and/or C1-02 in **Settings** (4 points in total) until it is replaced.

### A3. The decision model: STOP (provisional)

Chapter 4 and the integrated case use the **STOP** model: **S**tate the decision, **T**hink of options, **O**bserve consequences, **P**ick a responsible, health-enhancing choice and explain why. I took this from your earlier unit materials in this repository (`wildcats-wellness-quest`). I could not confirm it is the model used in Unit 8. If your slides use a different model (for example DECIDE or a differently ordered list), items C4-01 to C4-05 and C6-04 need rewording. They are 14 points.

Decision questions grade the **process** (is the consequence realistic, is the option honest, did the character skip a step). None asks what the student would do.

### A4. Skills that came from the build brief, not from the district overview

By strongest basis, 66 points align to district bullets, 25 to course standards, and 9 to blueprint-only skills. Please confirm each was taught:

| Items | Points | Skill | In the district overview? |
|---|---|---|---|
| C1-05, C1-06 | 5 | Puberty timing, myths vs evidence vs values | No |
| C3-01 | 2 | Classify STIs as bacterial or viral | No |
| C3-07 | 2 | Read a chart (fictional data) | No |
| C2-01, C6-02 | 6 | Healthy vs controlling behavior in text threads | No (consent and boundaries are) |
| C3-02, C3-03 | 5 | Treatment and testing of STIs; symptoms cannot show an infection | Partly (HIV prevention is; STI treatment is not) |
| C5-01, C5-02 | 6 | Judging whether a health source is credible | Standard 3 only |
| C5-03, C5-04, C5-05, C6-05 | 10 | Resources and advocacy | **Standard 8 is a course standard but is not listed for lessons 1 to 3** |
| C6-01 to C6-06 | 17 | Integrated case | Mixes everything above |

If you did not teach one of these, turn the item off in **Settings**. The change applies to students who start afterward. Each student's percent is calculated out of the points of the items that were on when they began. It does not change anyone who has already started.

### A5. Health claims that need a human check

`content/sources.json` lists 13 claims (S1 to S13), all marked **NEEDS VERIFICATION**, each with the kind of page that should confirm it. That public file states the claims only by topic, because spelling them out next to question numbers would give away answers. The exact wording the assessment relies on, and which questions rely on it, is in **`private/REVIEW_DETAIL.md`**, delivered with your answer key.

Check these topics first, because they are the easiest to get wrong or to have changed since I learned them:

- **HIV treatment and sexual transmission** (S6; C3-04, C3-08): current agency wording, and whether your slides say the same.
- **STI causes, treatability, HPV and its vaccine** (S4; C3-01, C3-02).
- **Condom effectiveness wording** (S2). No effectiveness percentages are used anywhere.
- **How HIV is and is not transmitted** (S5; C3-04, C3-08, C6-01).
- **Confidentiality for minors** (S8; C5-03, C6-01). The items say the rules vary and never promise that a service is confidential. Delaware's specific rules are not stated, because I could not verify them. If you want an item to name a local rule, supply it.
- **Consent definition** (S7; C2-04 to C2-08, C6-03).

### A6. Policy and notification

I did not check, and cannot check from here, whether your district or state requires parent or guardian notice, an opt-out, or specific approved curricula for Family Life and Sexuality instruction and assessment. Please confirm before the first class.

## B. Wording and judgment calls to confirm

- **Abstinence framing.** The overview frames HIV prevention around "the benefits of abstinence". The items follow that framing and also state the limits of other methods and the non-sexual routes of some infections. Check you are comfortable with the balance (C3-05, C3-08, C4-03, C4-07, C6-01).
- **C2-08** has one card that mentions alcohol. Confirm you want that example.
- **C4-03** compares three fictional choices for a character. It states facts and does not recommend any of them.
- **Characters** are all fictional and no real person, school, product or organization is named. Names are mostly gender-neutral (Riley, Sam, Jordan, Kai, Taylor) plus a few others; a handful of items use he or she. No item mentions anyone's orientation or gender identity. The district overview does not either, so if your slides cover them, the assessment does not test them.
- **Student-facing safety text.** The sign-in screen says: "Every person and place is fictional. No question asks about you." and "If a topic is hard for you, tell your teacher or a school counselor. That is always okay." Nowhere does the assessment tell a student that a service is confidential.
- **No free text.** Students never type an answer, so nothing a student writes can disclose anything. The only typed fields are name, student ID and class code at sign-in, and one numeric answer (C3-07).
- **Hints.** Every item has exactly two hints, released after the first and second wrong attempt. They are meant to point to a way of thinking without naming an option. I rewrote four that gave too much away (QA_REPORT.md, finding 3), but hints are hard to get perfect. Read them in the overlay.
- **Time.** The estimated working time is about 59 minutes against a 90-minute limit. These estimates come from item type and length, **not from watching students**. The first class's completion times (Teacher Mode, Analytics) are the first real data.
- **Reading level.** Flesch-Kincaid on the item text: mean 6.3, highest 9.2. That formula undercounts the difficulty of anatomical and health vocabulary, so it is a floor, not a promise.
- **Language.** Person-first ("a person living with HIV"), and "STI" throughout. No slang, no stigmatizing terms.

## C. Known weaknesses in the questions

1. **Residual test-wiseness cues.** I removed the biggest one (the correct answer being the longest, in 11 of 12 single-answer questions before; 2 of 12 now). I reduced a second one: wrong options contain limiting words more often than correct ones. With the same word list, that was 61% of wrong options against 22% of correct ones before, and is 40% against 22% now. A test-wise student could still use it. The words involved are in `private/REVIEW_DETAIL.md`. If you want the gap gone, I can rewrite those options.
2. **Single items cover some objectives.** FL1.4 (stages of pregnancy), FL2.1 (key terms), FL2.2 and FL2.3 (family dynamics and communication; both share C2-03) and the chart skill each have exactly one item. Trimesters are not assessed at all (the overview mentions them as a presentation activity).
3. **All-or-nothing scoring on multi-part items.** Labeling, sorting and ordering items give credit only if every part is right on that attempt. That is stricter than a worksheet. It matches "3 attempts, 100/85/75/0" literally, but you may want partial credit for the 12 classification items; that would be a code change.
4. **Difficulty is unmeasured.** The cognitive tags are my judgment. Use Analytics after the first class: items with a first-try rate under about 30% or over about 90% are the ones to revisit.

## D. Things you can change without me

- Class codes, default time, whether students see their score, open/closed: **Teacher Mode, Settings**. Per-student extra time and resets: **Monitor** and **Reset student**.
- Switch individual questions on or off: **Settings**.
- Teacher password: **Unit 8 menu in the Google Sheet, Set teacher password**.
- What requires me (or a code change): question wording, adding or replacing a figure, changing the number of attempts or the 100/85/75/0 credit table.

## E. Where everything is

| What | Where |
|---|---|
| Item list, points, timing | BLUEPRINT.md |
| Objective-to-item map and basis | ALIGNMENT_MATRIX.md |
| What QA did and found, per item | QA_REPORT.md |
| What was tested, what was not | TESTING.md |
| Security model and limits | SECURITY.md |
| Why things are the way they are | DECISIONS.md |
| Click-by-click deployment | SETUP.md |
| Answer keys (private, not in git) | `private/ANSWER_KEY.md`, `private/ItemBankSeed.gs` (delivered separately) |
