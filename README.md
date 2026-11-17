# Arihan Yadav · air-crypto.github.io

**Status:** live. One page, one scene, no scrolling. You zoom in and out of a world. Click or zoom into a region to stand in it: its items float above the horizon as cards, with dashed lines down to where they sit in the world.

**Verified:** desktop (1440×900) and phone (390×844) in headless Chrome with WebGL, and in Safari on macOS. Checked: wheel zoom into a region, then out; region label click; marker click opening its panel; drag to pan and to look; off-panel click and Esc closing; deep links (`#projects/ebike`); world switch; all five islands reachable by the game agent.

## Two worlds

```mermaid
flowchart TB
  C[die/content.js<br/>every item, once] --> A[die/app.js<br/>camera, zoom, ground view,<br/>cards, panel, index, routing]
  A --> D[world-die.js<br/>silicon die on a wafer]
  A --> E[world-env.js<br/>island game]
  E --> R[rl.js<br/>gridworld + value iteration]
  A -- region, hover, open item, music --> D
  A -- region, hover, open item, music --> E
```

- **Silicon** (default): the die has a block for About, Work, Projects and Life, plus I/O pads for Contact, and sits on a wafer of dies that runs to the horizon. Standing in a block, a particle core floats over the horizon and changes shape per region.
- **Game**: five low-poly islands joined by causeways (Spawn, The Ridge, The Workshop, The Grove, The Lighthouse) at dusk. An agent runs value iteration on a gridworld over the terrain and walks quest to quest. It heads to whatever region you hover or stand in, and a reward burst goes off when it arrives. The HUD shows episode, mean return and current quest.
- The switch at the top right toggles worlds and is remembered. `?world=game` or `?world=silicon` links to one.

## Controls

- **Overview:** scroll or pinch to zoom, drag to pan, right-drag or shift-drag to orbit. Click a region or its label, or zoom all the way in, to enter it.
- **Standing in a region:** drag to look around. Click a card for its panel; ← → step through the group. Click anywhere off the panel to close it. Scroll out, pinch out, Esc or "← Overview" to leave.
- **Index** (`/`) searches everything.

## Files

- `index.html`: shell, header, intro, region heading, panel, index, lightbox, music.
- `die/content.js`: all content. Edit here.
- `die/app.js`, `die/world-die.js`, `die/world-env.js`, `die/rl.js`, `die/gfx.js`, `die/style.css`.
- `die/three.module.min.js`: three.js r170 (MIT). Fonts: Instrument Serif, IBM Plex Mono, Inter (OFL).
- `tree.html` + `forest*.js`: the older tree version. `portfolio.html`, `projects.html`, `life.html`, `gallery.html`, `hockey.html`: plain no-JavaScript pages.

## Run locally

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```
