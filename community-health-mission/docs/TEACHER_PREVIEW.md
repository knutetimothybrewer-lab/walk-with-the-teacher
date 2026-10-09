# Private teacher preview — plain-language guide

## Open it
1. Open the deployed link. At the sign-in screen type `WALK-TEACHER` in the **Class code** box (or choose **Teacher sign-in**). That only shows the passcode screen; your passcode is checked by the server. Teacher Mode has tabs for Overview, Students and resets, Analytics, Class codes, Preview and testing, Answer key, Coverage checklist and Export.
2. Enter your teacher passcode (set from the spreadsheet menu). The *server* checks it. A class code, a hidden button or a URL parameter does nothing.
3. On **Preview**, choose when explanations appear and press **Start preview**.

## What you see
A purple bar stays on every screen: **“Teacher Preview — No Student Grade Recorded”**. It also appears on the final results and the receipt.

- **Student View** shows exactly what students see: animations, directions, reference panels, accessibility controls, hints and feedback.
- **Answer and Scoring View** adds, under each question: accepted answers and equivalent solutions, numeric tolerances, maximum points and credit by attempt, scoring rubric, learning target, source alignment, hints after attempt 1 and 2, and the explanation. The full list is also under the teacher panel's **Answers and scoring** tab (version shown).
- **Jump to…** goes straight to any task; **Map** returns to the county map. Replay simulations as often as you like (smoke/UV/heat plans, noise chart, outbreak timeline, boil-water, charts, ad cues, advocacy board).
- **Motion** toggle (top right) and your browser's reduced-motion setting both switch animations off.
- **Reset all preview responses** clears the preview session.

## Test every score outcome
Buttons in the bar fill the preview: **All correct on attempt 1** (100.0%), **attempt 2** (85.0%), **attempt 3** (75.0%), **All exhausted** (0.0%). Then **Final review** → confirm → submit to see the results screen and receipt. Preview delivery is labeled **Simulated only: nothing was delivered**. You can also answer manually, wrongly or rightly, to try hints and locking.

## Coverage checklist
**Coverage checklist** tab: every scored unit with points, target, demand, formats and graph flag, plus totals (100 points; share at application or higher; formats used). Tick boxes are for your own use.

## Delivery test (separate from preview)
Ordinary preview never touches the gradebook, so it proves nothing about live delivery. Use **Delivery test** (or the sheet menu) to write one isolated record to a `DeliveryTest` tab and read it back; it is excluded from reports. Run it from the deployed URL to exercise the real browser → Apps Script → Sheet path. For a full real run use a test class code with a test student, then reset it.

## Return to the normal assessment
Press **Teacher panel** → **Return to normal student sign-in** (or reload). Teacher mode ends when you close the tab or press **Sign out of teacher mode**.

## What preview cannot do
It cannot read or change a real student's session, consume their attempts, or appear in summaries/exports. A preview token is refused by real sessions and vice versa (tested).
