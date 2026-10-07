# Publishing on GitHub Pages

The site is plain files, so Pages can host it for free. **Decide how to protect the answer key first** (see `SECURITY_AND_INTEGRITY.md`).

## Option A (recommended): publish only the student files
1. In a terminal in this folder: `node tools/release.js` (use `node tools/release.js --strip` if you chose server-side grading). This creates `dist/` with only student-facing files.
2. Create a new **public** GitHub repository (for example `signal-health`). Upload the **contents** of `dist/` to its main branch (drag and drop in the browser works).
3. In that repo: **Settings > Pages > Build and deployment > Deploy from a branch > main / (root) > Save**.
4. After a minute your link appears: `https://YOUR-NAME.github.io/signal-health/`.
5. Keep this full folder (with `authoring/`) in a **private** repository.

## Option B: publish this whole repository
Works, but `authoring/*.js` and `teacher-private/*.md` (answers) become downloadable by anyone who guesses the URL. Only do this if the repository is private and your GitHub plan allows private Pages, or if you accept that risk.

## Student link and the teacher dashboard
* Students: `https://YOUR-NAME.github.io/signal-health/`
* Teacher dashboard: `.../teacher/` (bookmark it; it is not linked anywhere)
* Preview Mode: `.../?preview=1` (see `PREVIEW_MODE.md`)

## Updating
Edit, run `node tools/release.js`, upload the new `dist/` contents. Students currently mid-attempt keep their saved progress as long as the content version is unchanged; if you change the content version, their saved attempt is discarded when they next open the page.

## Local testing
`file://` does not work (browsers block JavaScript modules there). Use `npm run serve` or any static server.
