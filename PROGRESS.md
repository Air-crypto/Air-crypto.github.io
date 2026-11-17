# Living grayscale landscape

## Scope
One persistent, scrollable world with a substantial tree and trunk. A clicked word and twig transform into a thick growing limb, the word disappears, and new items emerge from it. Upper and lower labels direct new growth upward or downward. All opened branches and articles remain until an empty-background, back-arrow, or Escape reset.

## Implementation
- Runtime randomized branch angles, curvature, taper, foliage and thickness. Open geometry is stable; fresh openings vary.
- Collision search places sibling labels, new limbs, and article footprints around existing content. Connector routes seek clear paths; scenery fades softly behind text when crossing cannot be avoided.
- Geometry-derived scrolling expands in every direction and preserves previous extents until reset. Responsive resizing replans open geometry.
- A broader, smoothly tapered trunk, curved roots with continuous fork tangents, irregular canopy, and graded ground litter replace rigid scenery. The full default tree fits the viewport.
- Three unlabeled root knots reveal a circuit, hockey stick and puck, and paper plane. Native buttons support hover, touch and keyboard; discovery persists for the visit, and reduced motion reveals immediately.
- The music-note arrow is on its right side, and the separate diagonal arrow in the play bar has been removed. The back arrow is centered, short, and gently curved.
- Larger circular halftone photos, San Francisco/New York, and the official Unethical by Faouzia player are preserved.

## Validation
Static site; no build step. Preview: python3 -m http.server 8765 --bind 127.0.0.1.

- osascript -l JavaScript tests/forest-scene.test.js: desktop/mobile state checks for attached limbs, camera continuity, retained growth, prior article retention, reachable branch bounds, reset, deep roots, and canvas identity.
- osascript -l JavaScript tests/forest-layout.test.js: 12 varied desktop/mobile worlds test direction, label/article separation, retained geometry, media resize, and fresh layouts.
- osascript -l JavaScript tests/forest-roots.test.js: discovery, replay, keyboard, touch handling, pause/reduced motion, and reachable mobile targets.
- Safari in macOS VM: all three root discoveries, background reset, downward life branch followed by upward work branch with the first retained, and two separate AMD articles opened on a 320px viewport. Full default tree and music controls visually inspected.

Drawing is stubbed in state tests; Safari provides visual acceptance. Publish to main through GitHub Pages, verify deployed bytes, then repeat live interactions.
