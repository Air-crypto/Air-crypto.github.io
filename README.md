# Arihan's workbench

Source code for my personal website: [air-crypto.github.io](https://air-crypto.github.io/).

An interactive desk with a laptop, engineering notebook, circuit board, and photos. Everything starts on the image: use the laptop screen for about and the keyboard for projects, the notebook for experience, the board for hardware, the photos for life outside of code, the cup for little life things, the plant for student life, and the sticky note for contact. The same objects work on smaller screens. A bounded frame keeps the whole desk in view, with small labels beside the objects. Light and dark modes follow your system preference until you choose one; the choice is remembered across the desk and standalone pages.

## Run locally

This is a static site, with no build step or package dependencies.

```sh
python3 -m http.server 8765
```

Open `http://localhost:8765`. A server is needed for the desk windows to load the portfolio pages.

## Editing

- `index.html`, `desk.css`, and `desk.js`: the interactive desk and its windows.
- `portfolio.html`: about, education, experience, patents, and activities.
- `projects.html`: project descriptions and media.
- `life.html`: personal stories and small notes, drawn from the photo and skating pages.
- `gallery.html` and `hockey.html`: photos and skating.
- `styles.css` and `scripts.js`: shared page styles and accessible photo/video viewers.
- `theme.js`: applies and remembers the light/dark palette before rendering.
- `selfie.jpg`: the original profile photo, rendered at 96 × 54 pixels on the laptop using canvas.
- The desk photo prints use existing Madison and hockey photos as HTML overlays.
- `assets/workbench.webp`: the generated desk background. Its generation prompt is recorded in [assets/README.md](assets/README.md).

Desk windows reuse the standalone pages so descriptions stay consistent. When changing their content, bump `pageVersion` in `desk.js` and its versioned URL in `index.html` so returning visitors get the new pages. Photos and skating also open over the desk. Links still open those pages when JavaScript is unavailable. Native dialogs support keyboard focus, Escape to close, and reduced motion preferences.

GitHub Pages deploys the static files from `main`.
