# Classroom pacing plan (45–60 minutes)

This is a plan, not a measured result. Use it with the pilot checklist at the end.

| Clock | Students | Teacher |
|---|---|---|
| 0–3 | Join with class code + roster ID; entry briefing (ungraded): controls, three-attempt rule, practice item | Project the link and code; read the privacy line: no personal health information |
| 3–11 | Location 1 Neighborhood (18 pts) | Circulate; no hints beyond the app's |
| 11–17 | Location 2 Operations Center (12 pts) | |
| 17–28 | Location 3 Safety Lab (22 pts) — longest | Nudge students at 28 min who are still in Location 3 |
| 28–34 | Location 4 Data Observatory (12 pts) | |
| 34–42 | Location 5 Media Studio (16 pts) | |
| 42–51 | Location 6 Action Council (20 pts) | |
| 51–53 | Final review and submit; results, receipt | Confirm "Recorded in teacher gradebook" chip for each student |
| 53–60 | Buffer for retries, reading speed, slow connections | Students who are done may explore explanations |

Options: split across two periods (progress saves; students sign in again with the same code and roster ID); set `PacingFactor` (1.25–1.5) for accommodations; the 90-minute limit starts when the student joins, so for an accommodation raise `TIME_LIMIT_MIN` in `server/grading.js` and rebuild (it applies to the whole class code). Students can sign out and return; the clock keeps running.

**Pilot checklist.** Run 5–8 students (include a slower reader and one with accommodations) on real Chromebooks; record start/finish time per location from `Sessions`/`Responses` timestamps; note any question students re-read repeatedly; confirm every student sees the green gradebook chip; check one flaky-Wi-Fi case (disconnect mid-submit, then reconnect).
