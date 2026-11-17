# Arihan's little corner

[air-crypto.github.io](https://air-crypto.github.io/) is a quiet, interactive personal website: an original stippled tree, a field of grasses, drifting particles, and branches into work, projects, life, and contact. The monochrome botanical direction is inspired by [natochi.cv](https://natochi.cv/); the scene is drawn procedurally from original code.

## Run locally

This is a static site with no build step or package dependencies.

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765. A web server is needed for the portfolio panels to load their content.

## Editing

- `index.html`: homepage, branch links, music controls, and panel shell.
- `grove.css`: scene layout, responsive presentation, and panel palette.
- `grove.js`: seeded canvas illustration, animation lifecycle, reduced motion, and music.
- `grove-panels.js`: portfolio content loading, deep links, navigation, and dialogs.
- `portfolio.html`, `projects.html`, `life.html`, `gallery.html`, and `hockey.html`: canonical content. These remain usable as standalone pages.
- `styles.css` and `scripts.js`: shared reading styles and accessible photo/video viewers.
- `desk.css`: shared panel base styles and the previous workbench layout.
- `workbench.html` and `desk.js`: preserved previous homepage.
- `thumbs/`: small gallery images; full-size originals load when opened.
- `assets/kalam-light.woff2`: self-hosted handwritten font; license in `assets/Kalam-OFL.txt`.

Panels reuse the standalone pages so descriptions stay consistent. After changing content, bump `pageVersion` in `grove-panels.js` and its versioned URL in `index.html`. The old workbench uses its own page version in `desk.js`.

## Music and accessibility

The player loads the official **Unethical — Faouzia** YouTube video only after a visitor clicks play. No audio is redistributed. A visible player and direct YouTube link are available; some browsers require a second tap in the video. Closing the music panel pauses playback.

Navigation works without JavaScript via the standalone links. Native dialogs support Escape, keyboard focus, and photo enlargement. Scene animation can be paused, respects reduced-motion preferences, and stops while the tab is hidden. Mobile artwork uses separate horizontal proportions to keep branch labels readable.

## Deployment and verification

GitHub Pages serves static files from `main`. See `PROGRESS.md` for verification evidence. The previous homepage is available at [workbench.html](https://air-crypto.github.io/workbench.html).
