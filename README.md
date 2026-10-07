# Arihan's workbench

Source code for my personal website: [air-crypto.github.io](https://air-crypto.github.io/).

An interactive desk with a laptop, engineering notebook, circuit board, and photos. Click an object to explore, or use the navigation. On smaller screens, the same sections have larger cards below the desk.

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
- `gallery.html` and `hockey.html`: photos and skating.
- `styles.css` and `scripts.js`: shared page styles and accessible photo/video viewers.
- `assets/workbench.webp`: the original desk photograph. Its generation prompt is recorded in [assets/README.md](assets/README.md).

Desk windows reuse the standalone pages so descriptions stay consistent. Links still open those pages when JavaScript is unavailable. Native dialogs support keyboard focus, Escape to close, and reduced motion preferences.

GitHub Pages deploys the static files from `main`.
