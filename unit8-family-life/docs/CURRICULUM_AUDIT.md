# Curriculum audit

**Status: the audit you asked for in section 1 of the build brief could not be performed.** The Unit 8 curriculum zip was not available to me, so nothing in this assessment has been checked against your slides, handouts or vocabulary. This file records exactly what I looked for, what I did read, what I could and could not conclude, and what I need from you to finish the job.

Date of this audit: 9 October 2026.

## What the brief asked for

> The curriculum is in `Unit 8_ Family Life and Specialist -20261008T184748Z-1-001.zip` in the project folder (if the name differs, use the only Unit 8 .zip present). Extract it to `source/` ... Extract text from every file (.pptx, .docx, .pdf) ...

## Where I looked for it

| Place | How | Result |
|---|---|---|
| The repository working tree | Searched every file for `*.zip` and listed every file | No zip, no Unit 8 files |
| The rest of the build machine | Searched the whole filesystem for names containing "Unit 8", "Family Life", "unit8", or ending in `.zip` | Only an unrelated browser-driver zip |
| Every remote git branch | Listed each branch's files and filtered for unit 8, family, `.zip`, `.pptx`, `.docx`, `.pdf` | Nothing |
| Your Google Drive (through the connected Drive tool) | Searched titles for "Unit 8", "Family Life", "Specialist"; searched for files of type zip; searched full text for abstinence, puberty, contraception, sexually transmitted; listed recent files | No Unit 8 zip and no Unit 8 slides. The only zips are unrelated (names such as "The Greatest Hits - Grits.zip" and "Dewey Beach Patrol .zip"). The text searches returned two district documents, described below, plus unrelated files |
| The web (CDC and other health agencies) | Tried to open pages to verify health facts | Blocked by the network proxy (HTTP 403 / egress blocked) for every approved domain. See "Sources" below |

I did **not** open the unrelated files that the searches returned (policies, handbooks, medical forms and so on). I opened exactly two Drive documents, both listed next.

## What I did read

1. **NCCVT Health Curriculum Overview** (Google Doc in your Drive). It states: Course Name Health, 0.5 credit / 67.5 hours; the eight state standards; and, in the **Family Life and Sexuality** section, three lessons with objectives, Criteria for Success, standards, and assessment examples.
2. **K-12 Health Education Concepts and Grade/Hours Requirements (Reg. 551)**. It lists Family Life and Sexuality as a core concept for all grades. It has no lesson detail and no medical content.

A third document that appeared in the search results, "Ways to Address the Health Standards", was **not opened**. If it covers Unit 8, it is worth a look.

### What the overview says about Family Life and Sexuality (quoted)

**Lesson 1: Anatomy and Functions Essentials.** Objective: "Students will demonstrate an understanding of sexual health anatomy and functions essentials, focusing on the structures and functions of the reproductive system, methods of contraception, and basics of pregnancy."
Criteria for Success: Identify the major structures of the male and female reproductive systems. Explain the functions of key reproductive organs such as the ovaries, testes, uterus, and fallopian tubes. Differentiate between various methods of contraception, including barrier methods, hormonal methods, and sterilization. Describe the basic stages of pregnancy from conception to birth.
Standards listed: 1, 2, 3.
Assessment examples include: label diagrams of the male and female reproductive systems; explain ovulation; evaluate the effectiveness and drawbacks of contraceptive methods in scenarios; create a presentation on the stages of pregnancy "and the changes that occur during each trimester".

**Lesson 2: Core Concepts of Family Life and Sexuality.** Criteria for Success: Define key terms related to family life and sexuality. Identify factors that contribute to healthy family dynamics. Analyze the impact of communication on family relationships. Evaluate the importance of consent and healthy boundaries in relationships.
Standards listed: 1, 2, 4, 5, 7.
Assessment examples include: a vocabulary quiz; case-study analysis of healthy family dynamics; critique of communication styles; "apply the concept of consent and healthy boundaries in a scenario-based activity".

**Lesson 3: HIV Prevention and the Benefits of Abstinence.** Criteria for Success: Identify and explain effective HIV prevention strategies. Describe the advantages of practicing abstinence as a method of HIV prevention. Evaluate the effectiveness of abstinence compared to other prevention strategies. Apply knowledge of prevention strategies to real-life scenarios involving HIV risk.
Standards listed: 1, 2, 3.
Assessment examples include: a quiz on HIV prevention strategies "including abstinence"; scenarios where students decide how to apply HIV prevention strategies and justify the choice.

## What I could and could not conclude

**Could conclude** (from the overview): the district's framing of HIV prevention is "the benefits of abstinence", and the contraception categories are barrier, hormonal and sterilization. These are the 12 district Criteria for Success bullets that the alignment matrix uses as objectives FL1.1 to FL3.4.

**Could not conclude** (no slides): anything about how the unit was actually taught. In particular I cannot tell you:

- which STIs your slides name, and whether they classify them as bacterial and viral (Chapter 3 assumes they do);
- which contraceptive methods you covered, and whether you covered effectiveness numbers (I use none);
- whether puberty, hormones and common puberty myths were part of this unit (Chapter 1 items C1-05 and C1-06 assume they were);
- the vocabulary list behind "define key terms" (FL2.1 is covered by one item, C2-07, with terms I chose);
- the wording of the consent definition your slides use (I used the one in the build brief);
- whether your decision-making model is STOP (I borrowed it from your earlier unit in this repository; see TEACHER_REVIEW.md);
- which school and community resources you named, and what you say about confidentiality for minors;
- how your slides draw the reproductive-system diagrams (I drew my own simplified ones);
- whether Standard 8 (advocacy) belongs in this unit. The overview does not list it for lessons 1 to 3, but the build brief asks for a "Resources & Advocacy" chapter.

## How the gap was handled

1. Every objective is tagged with its **basis**: `district` (a Criteria for Success bullet I could read), `standard` (one of the course standards in the overview), or `blueprint` (requested in the build brief but not found in the overview). See ALIGNMENT_MATRIX.md. By strongest basis the points split 66 district, 25 standard, 9 blueprint-only.
2. Health facts come from the accuracy points in section 2 of the build brief. None was checked against an outside source (`content/sources.json` lists 13 claims, each marked NEEDS VERIFICATION, and no accessed pages).
3. Anything I could not confirm is flagged for you in TEACHER_REVIEW.md and QA_REPORT.md. The Teacher Mode **Reference** tab shows the same provisional warning, the claims list and the alignment matrix (with each objective's basis).
4. Nothing was invented to fill the gap: no statistics, no study names, no URLs, no phone numbers. The one chart (C3-07) is labeled "Fictional data for this activity".

## Sources

I tried to open health-agency pages (for example the CDC's HIV overview) and the network blocked each request, so **no web page was opened and no source is cited as accessed**. `content/sources.json` therefore has an empty `sources` list and thirteen `claims` entries, each with the kind of page that should confirm it.

## What I need from you to complete the audit

Put the Unit 8 zip somewhere I can reach (the repository, or a Drive folder shared with this connection) and ask for the audit again. I will then:

1. Extract text from every slide, handout and document without changing the originals.
2. Build a table of every learning target, vocabulary term, diagram and number in the slides.
3. Compare each item against that table and mark it supported, partly supported or not in the slides; flag every term or fact in an item that the slides never use.
4. Replace the provisional blueprint-basis rows in ALIGNMENT_MATRIX.md with real citations, re-balance the points if needed, and update QA_REPORT.md.
