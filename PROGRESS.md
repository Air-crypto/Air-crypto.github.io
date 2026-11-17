# Persistent tree landscape

## Objective
One continuous scene. Limbs grow sideways from the existing tree while the camera pans. Opening content adds to the same scene. Empty-background clicks return to the default tree. Preserve natural text without boxes, lower scenery opacity behind text, extend the roots, and use larger halftone dots.

## Implemented
- Persistent branch state and persistent navigation elements; opening a leaf does not recreate or regrow its parent limb.
- Flat project navigation, with compatibility for former category URLs.
- Shared world coordinates for the tree, twigs, labels, terrain, and articles.
- Background, back-arrow, and Escape reset; scrollable underground space on the default tree too.
- Root artwork extends through an 1800px underground region.
- 4px circular halftone dots with color reveal on hover/focus/tap.
- Location remains San Francisco/New York; official Unethical by Faouzia player preserved.

## Verification
Local Safari in the macOS VM: persistent desktop tree → projects → eBike article; scrolling into soil; background return to default tree; deeper roots viewed well underground. Inspected the revised dot treatment. At 320px: all 11 project links fit, article navigation and background reset work.

`osascript -l JavaScript tests/forest-scene.test.js`: PASS at 1250×540 and 302×856. Checks camera continuity, original twig attachment, progressive growth, no growth reset when opening an article, retention of another open limb, default reset, root extent, and canvas identity. Drawing is stubbed in this state regression; Safari supplies visual acceptance.

Static site, no build step. Local preview: `python3 -m http.server 8765 --bind 127.0.0.1`. Publish to main through GitHub Pages and verify the deployed files and interactions.

The scrollable world grows from the measured tree, branch foliage, labels, roots, and article bounds. It expands above and to either side as limbs grow, retaining earlier extents until the scene resets. Origin changes compensate the scroll position so existing content stays steady. Vertical and horizontal scrolling can revisit earlier limbs after opening an article. Empty background, including gaps between paragraphs, returns to the default view. The tree has a substantially wider canopy and taller trunk; branches use tapering stems, irregular bends, uneven forks, and varied foliage clusters.
