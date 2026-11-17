# Arihan's tree

[air-crypto.github.io](https://air-crypto.github.io/) is a continuous landscape: follow growing branches into work, projects, and life, then scroll past the grass into deep roots and soil. The visual direction follows [natochi.cv](https://natochi.cv/), with independently written procedural scenery and Arihan's own content and photos.

## Run locally

This is a static site with no build step.

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765. Serve over HTTP so the content pages can be fetched.

## Editing

- `index.html`: landscape shell, accessible branch navigation, music controls.
- `forest-scene.js`: seeded tree, growing branches, grasses, roots, soil, animation and text-overlap fading.
- `forest.js`: flat branch navigation, cached article content, history, and circular halftone photo treatment.
- `forest.css`: Libre Franklin typography, rough underlines, framing and responsive layout.
- `music.js`: official **Unethical — Faouzia** YouTube player.
- `portfolio.html`, `projects.html`, `life.html`, `gallery.html`, `hockey.html`: canonical content, also usable as standalone pages.
- `assets/libre-franklin.woff2`: self-hosted Libre Franklin; license in `assets/Libre-Franklin-OFL.txt`.
- `workbench.html`, `desk.css`, `desk.js`: preserved previous homepage.

Articles live in the landscape itself. They do not open portfolio side panels or tabs. Photos use a two-color halftone treatment with visible 4px circular dots; hover, keyboard focus, or tap reveals color. Text stays selectable and links are native elements. Scenery fades only where it crosses text.

When updating content, change the canonical HTML page and bump the fetch version in `forest.js`. Bump the asset query versions in `index.html` after JS/CSS changes.

## Navigation and music

Routes are shareable, for example `#projects`, `#projects/ebike`, and `#life/flights`. Projects have one flat set of leaves. Every limb remains attached to the original tree as the camera pans; opening an article extends its existing limb without restarting it. Previously opened limbs remain in the scene until reset. Click empty background, use the back arrow, or press Escape to return to the default tree. Browser history works. Old project category URLs still resolve to the project branch. Standalone pages are available through the no-JavaScript fallback.

The scene respects reduced-motion preferences, can be paused with the top-right keyboard-accessible control, and stops animating in hidden tabs. Branch and article layouts adapt to narrow screens.

The official YouTube player loads only after clicking play. No audio is redistributed. Playback may require a second tap in the video; a direct YouTube link is included. Closing the player pauses playback.

GitHub Pages serves the static site from `main`.

## Regression check

On macOS, from the repository root: `osascript -l JavaScript tests/forest-scene.test.js`. This runs the actual scene code with drawing stubs and checks continuous camera motion, twig attachment, retained branch growth, flat reset behavior, and deep-root extent at desktop and mobile dimensions. Visual acceptance is performed separately in Safari.

The scrollable world grows from the measured tree, branch foliage, labels, roots, and article bounds. It expands above and to either side as limbs grow, retaining earlier extents until the scene resets. Origin changes compensate the scroll position so existing content stays steady. Vertical and horizontal scrolling can revisit earlier limbs after opening an article. Empty background, including gaps between paragraphs, returns to the default view. The tree has a substantially wider canopy and taller trunk; branches use tapering stems, irregular bends, uneven forks, and varied foliage clusters.
