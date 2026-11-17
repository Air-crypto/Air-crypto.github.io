# Living grayscale landscape

## Current scope
One persistent scrollable grayscale scene. Opening a main branch now retracts other main branches; opening an article closes the prior article while keeping the current parent limb. This supersedes the earlier keep-all-branches-open behavior.

## Changes
- Thicker primary roots taper into fine curved forks.
- Trackpad pinch scales scenery, text, photos, links and root targets together, centered around the pointer, without regenerating geometry. Range: 35–160%.
- Safari gesture events and Chromium/Firefox ctrl-wheel pinch events are supported; ordinary scrolling is untouched. Fixed music/back controls retain their size.
- A subtle top message, “[click anywhere to return to original view]”, appears after opening a branch. It is also a keyboard-accessible reset button.
- Empty-background click, back arrow, hint, and Escape restore the tree and 100% zoom.
- Existing procedural tree, larger halftone dots, personal content, root discoveries and music are preserved.

## Validation
Static site; no build step. Preview: python3 -m http.server 8765 --bind 127.0.0.1.

- osascript -l JavaScript tests/forest-scene.test.js: desktop/mobile attached branch growth, exclusive switching/retraction, article removal, stable zoom geometry, anchored zoom, limits, reset and deep roots.
- osascript -l JavaScript tests/forest-zoom.test.js: Safari gesture lifecycle, ctrl-wheel, ordinary scroll, correct pointer coordinates and duplicate-event suppression.
- Existing forest-layout.test.js and forest-roots.test.js pass.
- tests/forest-browser.html passed in Safari at desktop and 320px widths: exclusive branches/articles, hint visibility, actual DOM scaling/alignment, stationary pinch anchor, scrolling and reset.
- macOS VM native clicks and Ctrl-scroll: zoomed navigation, old-limb closure, hint, and thicker roots visually inspected.
- Browser checks synthesize Safari pinch events; the VM tool cannot issue a physical trackpad pinch. Native Ctrl-scroll covers the other input path.

## Delivery
Publish the reviewed files to main, wait for GitHub Pages, compare deployed bytes, and repeat the live browser checks. Preview server and test tab are temporary; preserve the repository and unrelated tabs.
