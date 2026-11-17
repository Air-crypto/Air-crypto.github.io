# Arihan's tree

[air-crypto.github.io](https://air-crypto.github.io/) is a continuous landscape: follow growing branches into work, projects, and life, then scroll past the grass into roots and soil. The visual direction follows [natochi.cv](https://natochi.cv/), with independently written procedural scenery and Arihan's own content and photos.

## Run locally

This is a static site with no build step.

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765. Serve over HTTP so the content pages can be fetched.

## Editing

- `index.html`: landscape shell, accessible branch navigation, music controls.
- `forest-scene.js`: seeded tree, growing branches, grasses, roots, soil, animation and text-overlap fading.
- `forest.js`: nested routes, content loading, history, and halftone photo treatment.
- `forest.css`: Libre Franklin typography, rough underlines, framing and responsive layout.
- `music.js`: official **Unethical — Faouzia** YouTube player.
- `portfolio.html`, `projects.html`, `life.html`, `gallery.html`, `hockey.html`: canonical content, also usable as standalone pages.
- `assets/libre-franklin.woff2`: self-hosted Libre Franklin; license in `assets/Libre-Franklin-OFL.txt`.
- `workbench.html`, `desk.css`, `desk.js`: preserved previous homepage.

Articles live in the landscape itself. They do not open portfolio side panels or tabs. Photos use a two-color halftone treatment; hover, keyboard focus, or tap reveals color. Text stays selectable and links are native elements. Scenery fades only where it crosses text.

When updating content, change the canonical HTML page and bump the fetch version in `forest.js`. Bump the asset query versions in `index.html` after JS/CSS changes.

## Navigation and music

Nested routes are shareable, for example `#projects/systems`, `#projects/ebike`, and `#life/flights`. The back arrow and Escape return to the parent branch. Browser history works. Standalone pages are available through the no-JavaScript fallback.

The scene respects reduced-motion preferences, can be paused with the top-right keyboard-accessible control, and stops animating in hidden tabs. Branch and article layouts adapt to narrow screens.

The official YouTube player loads only after clicking play. No audio is redistributed. Playback may require a second tap in the video; a direct YouTube link is included. Closing the player pauses playback.

GitHub Pages serves the static site from `main`.
