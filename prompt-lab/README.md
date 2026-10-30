# Prompt Lab: How AI Reads, and How to Read It Back

A single-file interactive lesson (about 30 minutes) for educators on how AI reads context, how to build and debug prompts, how to judge AI output, how to check a cited source by reading laterally, and why "simplified" is not the same as "faithful." It has a friendly lab theme, a robot guide named Pip, a Toolbelt that fills in as you learn, a capstone, and an ungraded practice quiz.

No build step, no libraries, no network calls, no accounts, and no data collected. Progress lives in memory only.

Students type their name on the Welcome screen (required before they can continue). It is shown on the locked-until-complete Completion card in the Wrap-up, which students screenshot to submit.

## Open it locally

Double-click `index.html` (it works from `file://`), or serve the folder:

```bash
python3 -m http.server 8000
```

then visit http://localhost:8000/.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository (put `index.html` at the repo root, or keep it in a subfolder and use that URL path).
2. In the repo, go to **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and the `/ (root)` folder, then Save.
4. After a minute the lesson is live at `https://<user>.github.io/<repo>/` (add `/prompt-lab/` if it lives in a subfolder).

## Editing the wording

All lesson text is in the `L` object at the top of the `<script>` in `index.html`. Logic lives below it.

## Accessibility

Full keyboard operation (arrow keys move between stops, `?` lists shortcuts), visible focus, semantic HTML, ARIA live feedback, no meaning by color alone, light/dark themes, and `prefers-reduced-motion` support.
