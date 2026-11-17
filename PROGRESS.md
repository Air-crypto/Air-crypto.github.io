# Personal tree website

## Objective
Adapt the monochrome botanical atmosphere of natochi.cv into an original homepage for Arihan, preserving portfolio content and standalone pages. Use Unethical by Faouzia via the official YouTube player. Test in the macOS VM, push to GitHub, and test the deployed site.

## Setup
Static HTML/CSS/JS, no build or package dependencies. Run: `python3 -m http.server 8765 --bind 127.0.0.1`.

## Implemented
Original seeded canvas tree, ambient particles, grasses, branch navigation, accessible portfolio dialogs, reduced-motion/pause control, official music embed. Prior homepage preserved at workbench.html.

## Verification
Local Safari in the macOS VM: all primary panels opened; experience disclosure expanded; project and life panels scrolled; nested flight-photo navigation opened; contact details loaded; Escape closed dialogs. Official YouTube video reached playing state on desktop and at an iPhone-size viewport (second tap required on mobile). Pause/resume scene control worked. Responsive layouts inspected at 402×874 and 320×874; mobile tree width and label contrast corrected after inspection.

JavaScript syntax: both new JS files compiled with JavaScriptCore via osascript. Static HTML checks passed for all local asset/link paths against tracked files, and unique IDs on seven pages. No repository test/build commands exist.

Safari remote WebDriver setup was rejected by automatic approval review. It was not enabled; browser acceptance used the authorized VMPal UI controls.

Live deployment verification pending.

## Next action
Push verified files to main, wait for GitHub Pages, and repeat the primary checks on the deployed URL.
