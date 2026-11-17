import * as THREE from './three.module.min.js';
import { GROUPS, ITEMS, ALIASES } from './content.js?v=5';
import { clamp, lerp, easeInOut } from './gfx.js?v=5';
import { createDieWorld } from './world-die.js?v=5';

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const byId = new Map(ITEMS.map(it => [it.id, it]));
const inGroup = g => ITEMS.filter(it => it.group === g);
const pad3 = n => String(n).padStart(3, '0');
const pad2 = n => String(n).padStart(2, '0');
const isMobile = () => innerWidth < 900;
const clock = () => performance.now() / 1000;
const REGIONS = ['about', 'work', 'projects', 'life', 'io'];
const COPY = {
  about: { title: '<em>Somewhere</em> between models and metal', blurb: 'CE + CS at UW–Madison. At AMD I train language models for device code generation, plus the kernels and systems behind them.' },
  work: { title: '<em>Where</em> I’ve been building', blurb: 'LLM post-training, hardware verification, multimodal retrieval, vector search, and robotics.' },
  projects: { title: '<em>Some</em> things I’ve built', blurb: 'From a 110× faster VLIW kernel to an FPGA bolted to a bike.' },
  life: { title: '<em>Off</em> the clock', blurb: 'Ice hockey, window seats, Madison, and the occasional night sky.' },
  io: { title: '<em>Say</em> hello', blurb: 'Always happy to talk about ML, systems, hardware, or something you’re building.' },
};

// ---------- loader ----------
const loader = { shown: 0, target: 0, el: $('#loader-pct'), bar: $('#loader .loader-bar i') };
const progress = p => { loader.target = Math.max(loader.target, p); };
(function tickLoader() {
  loader.shown += (loader.target - loader.shown) * .18;
  const v = Math.round(loader.shown);
  loader.el.textContent = pad3(v) + '%'; loader.bar.style.width = v + '%';
  if (document.body.classList.contains('is-loading')) requestAnimationFrame(tickLoader);
})();

// ---------- renderer ----------
const canvas = $('#scene');
let renderer, gl = true;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch { gl = false; document.body.classList.add('no-webgl'); }
const pix = Math.min(devicePixelRatio || 1, isMobile() ? 1.5 : 1.75);
if (gl) { renderer.setPixelRatio(pix); renderer.outputColorSpace = THREE.SRGBColorSpace; }
const camera = new THREE.PerspectiveCamera(45, 1, .5, 3600);

const worlds = {};
let w = null;
const ctx = { renderer, pix, GROUPS, inGroup, byId, reduced };

// ---------- state ----------
const state = {
  world: 'die', view: 'overview', region: null, panel: null, lit: null, hoverRegion: null, hoverItem: null,
  ov: { target: new THREE.Vector3(), dist: 330, yaw: 0, pitch: 1 },
  gd: { yaw: 0, pitch: 0, look: 0, lookElev: .1, maxYaw: 0 },
  cam: { pos: new THREE.Vector3(0, 400, 400), look: new THREE.Vector3() },
  tween: null, mouse: new THREE.Vector2(), mouseIn: 0, mouseWorld: new THREE.Vector3(), t: 0,
  pointers: new Map(), drag: null, pinch: null, wheelPush: 0, wheelOut: 0, cooldown: 0, musicOn: false,
};
try {
  const q = new URLSearchParams(location.search), wq = q.get('world'), eq = q.get('env');
  state.world = wq === 'game' || eq === 'rl' ? 'env' : wq === 'silicon' ? 'die' : (localStorage.getItem('world') === 'env' ? 'env' : 'die');
} catch {}

// ---------- DOM ----------
const labels = $('#labels'), cards = $('#cards'), beams = $('#beams'), tip = $('#tip');
function buildLabels() {
  labels.innerHTML = REGIONS.map(g => `<button type="button" class="rlabel" data-region="${g}" style="--accent:${GROUPS[g].hue}">
      <span class="mono">${GROUPS[g].index}</span><b class="serif">${GROUPS[g].label}</b><span class="mono rl-n">${pad2(inGroup(g).length)} ${g === 'io' ? 'links' : 'items'}${state.world === 'env' && w?.isleName ? ' · ' + esc(w.isleName(g)) : ''}</span><span class="rl-go mono">Enter →</span></button>`).join('')
    + ITEMS.map(it => `<button type="button" class="ilabel mono" data-item="${esc(it.id)}" data-id="${esc(it.id)}" style="--accent:${GROUPS[it.group].hue}" tabindex="-1">${esc(it.short || it.title)}</button>`).join('');
}
function cardHTML(it) {
  const thumb = (it.media || []).find(m => m.type === 'img') || (it.media || []).find(m => m.poster);
  const top = it.org ? `${it.org}` : it.kicker && it.group === 'about' ? it.kicker.split(' · ')[0] : (it.tags || []).slice(0, 2).join(' / ') || it.date || '';
  const date = it.org || it.group === 'projects' ? (it.year || it.date || '') : it.group === 'life' ? it.date : '';
  const stat = it.stat ? `<span class="c-stat"><b>${esc(it.stat.value)}</b> ${esc(it.stat.label)}</span>` : it.group === 'life' && it.media ? `<span class="c-stat">${it.media.length} ${it.media.some(m => m.type === 'video') ? 'clips + pics' : 'pics'}</span>` : '';
  const img = thumb && it.group !== 'about' ? `<span class="c-img"><img src="${esc(thumb.poster || thumb.src)}" alt="" loading="lazy" decoding="async"></span>` : '';
  if (it.group === 'io') return `<a class="card3d io" href="${esc(it.href)}" data-id="${esc(it.id)}" ${/^https?:/.test(it.href) ? 'target="_blank" rel="noopener noreferrer"' : ''}><span class="c-top mono">${esc(it.short)}</span><span class="c-t serif">${esc(it.title)}</span><span class="c-stat">${esc(it.label)} ↗</span></a>`;
  return `<button type="button" class="card3d" data-id="${esc(it.id)}">${img}<span class="c-top mono"><span>${esc(top)}</span><span>${esc(date)}</span></span><span class="c-t serif">${esc(it.title)}</span>${stat}</button>`;
}
function buildA11y() {
  $('#a11y').innerHTML = REGIONS.map(g => `<h2>${GROUPS[g].label}</h2><ul>${inGroup(g).map(it => it.group === 'io' ? `<li><a href="${esc(it.href)}">${esc(it.title)}: ${esc(it.label)}</a></li>` : `<li><button type="button" data-id="${esc(it.id)}">${esc(it.title)}</button></li>`).join('')}</ul>`).join('');
}

// ---------- cards in the sky ----------
const cardState = { list: [], region: null };
function buildCards(g) {
  const items = inGroup(g), st = w.regions[g].stand;
  cards.innerHTML = items.map(cardHTML).join('');
  cards.style.setProperty('--accent', GROUPS[g].hue);
  const els = $$('.card3d', cards);
  const mob = isMobile(), n = items.length;
  const rows = n <= (mob ? 2 : 5) ? 1 : 2, perTop = Math.ceil(n / rows);
  const ppr = (innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const cw = Math.max(...els.map(e => e.offsetWidth)), ch = Math.max(...els.map(e => e.offsetHeight));
  const gap = mob ? 14 : 22, stepAz = (cw + gap) / ppr, stepEl = (ch + gap) / ppr, base = (ch / 2 + (mob ? 26 : 40)) / ppr;
  const f = st.dir, r = new THREE.Vector3(-f.z, 0, f.x), R = 60;
  cardState.list = items.map((it, i) => {
    const row = rows === 1 ? 0 : i < perTop ? 1 : 0, inRow = rows === 1 ? n : row === 1 ? perTop : n - perTop, k = rows === 1 || row === 1 ? i : i - perTop;
    const az = (k - (inRow - 1) / 2) * stepAz, el = base + row * stepEl;
    const anchor = st.eye.clone().addScaledVector(f, R * Math.cos(el) * Math.cos(az)).addScaledVector(r, R * Math.cos(el) * Math.sin(az)).add(new THREE.Vector3(0, R * Math.sin(el), 0));
    els[i].style.setProperty('--d', (i * .05 + .35) + 's');
    return { id: it.id, el: els[i], anchor, i };
  });
  const spanAz = (Math.max(perTop, n - perTop || 1) - 1) * stepAz + cw / ppr;
  const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
  state.gd.maxYaw = Math.max(0, spanAz / 2 - hfov / 2 + (mob ? .12 : .06));
  // Keep the top row below the region heading, and the horizon on screen.
  const topEdge = base + (rows - 1) * stepEl + (ch / 2) / ppr, reserve = mob ? 250 : 285;
  state.gd.lookElev = Math.max(base + (rows - 1) * stepEl / 2 + (mob ? .02 : .04), topEdge - (innerHeight / 2 - reserve) / ppr);
  state.gd.lookElev = Math.min(state.gd.lookElev, (innerHeight / 2 - 70) / ppr);
  cardState.region = g;
  beams.innerHTML = cardState.list.map(() => '<line/><circle r="3"/>').join('');
  requestAnimationFrame(() => cards.classList.add('in'));
}
function clearCards() { cards.classList.remove('in'); cardState.region = null; setTimeout(() => { if (!cardState.region) { cards.innerHTML = ''; beams.innerHTML = ''; cardState.list = []; } }, 500); }

// ---------- camera ----------
const tmpV = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
function ovPose() {
  const o = state.ov, c = Math.cos(o.pitch);
  return { pos: new THREE.Vector3(o.target.x + Math.sin(o.yaw) * c * o.dist, o.target.y + Math.sin(o.pitch) * o.dist, o.target.z + Math.cos(o.yaw) * c * o.dist), look: o.target.clone() };
}
function gdPose() {
  const st = w.regions[state.region].stand, gd = state.gd;
  const f = st.dir.clone().applyAxisAngle(UP, -(gd.yaw + gd.look)), el = gd.lookElev + gd.pitch;
  return { pos: st.eye.clone(), look: st.eye.clone().add(new THREE.Vector3(f.x * Math.cos(el), Math.sin(el), f.z * Math.cos(el)).multiplyScalar(60)) };
}
const pose = () => state.view === 'ground' && state.region ? gdPose() : ovPose();
function startTween(lift = 0, dur = 1.9) {
  state.tween = reduced.matches ? null : { from: { pos: state.cam.pos.clone(), look: state.cam.look.clone() }, t0: clock(), dur, lift };
}
function clampTarget() { const b = w.overview.bounds, T = state.ov.target; T.x = clamp(T.x, -b, b); T.z = clamp(T.z, -b, b); }

// ---------- regions ----------
function setBodyView() {
  document.body.classList.toggle('view-ground', state.view === 'ground');
  document.body.classList.toggle('view-overview', state.view !== 'ground');
  $$('.nav a').forEach(a => a.classList.toggle('on', state.view === 'ground' && a.dataset.go === state.region));
  if (state.view === 'ground') {
    const g = state.region;
    $('#rh-tag').textContent = `${GROUPS[g].index} · ${GROUPS[g].label}${state.world === 'env' && w.isleName ? ' · ' + w.isleName(g) : ''}`;
    $('#rh-title').innerHTML = COPY[g].title; $('#rh-blurb').textContent = COPY[g].blurb;
    $('#region-head').style.setProperty('--accent', GROUPS[g].hue);
  }
  $('#hud-line').textContent = state.view === 'ground'
    ? (isMobile() ? 'Swipe to look · tap a card · pinch out to leave' : 'Drag to look around · click a card · scroll out to leave')
    : (isMobile() ? 'Pinch to zoom · drag to move · tap a region' : 'Scroll to zoom · drag to move · click a region');
}
function enterRegion(g, opts = {}) {
  if (!g || !w.regions[g]) return;
  const from = state.view;
  if (state.panel && byId.get(state.panel)?.group !== g) closePanel(true);
  state.view = 'ground'; state.region = g; state.hoverRegion = null;
  Object.assign(state.gd, { yaw: 0, pitch: 0, look: 0 });
  buildCards(g);
  state.ov.target.copy(w.regions[g].center).setY(0); state.ov.dist = Math.max(w.overview.minDist * 2.2, 170); clampTarget();
  startTween(from === 'ground' ? 70 : 0, from === 'ground' ? 2.1 : 1.9);
  state.cooldown = clock() + (reduced.matches ? 0 : 1.2);
  setBodyView();
  if (opts.open) setTimeout(() => openPanel(opts.open, { noHash: opts.noHash }), reduced.matches ? 0 : 1100);
  else if (!opts.noHash) history.replaceState(null, '', '#' + g);
  tip.classList.remove('show');
}
function exitRegion() {
  if (state.view !== 'ground') return;
  closePanel(true);
  const was = state.region;
  state.view = 'overview'; state.region = null;
  // Pull back most of the way so the whole map is in view again.
  state.ov.target.lerpVectors(w.regions[was].center.clone().setY(0), w.overview.target, .7); state.ov.dist = w.overview.dist * .9; state.ov.yaw = 0; state.ov.pitch = w.overview.pitch;
  clearCards(); startTween(0, 1.7); state.cooldown = clock() + (reduced.matches ? 0 : .8); state.wheelLock = true; state.lastWheel = clock();
  setBodyView(); history.replaceState(null, '', location.pathname + location.search);
}
function goHome() {
  if (state.view === 'ground') exitRegion();
  Object.assign(state.ov, { target: w.overview.target.clone(), dist: w.overview.dist, yaw: 0, pitch: w.overview.pitch });
  history.replaceState(null, '', location.pathname + location.search);
}

// ---------- highlight ----------
function setLit(id) {
  if (state.lit === id) return;
  if (state.lit) $$(`[data-id="${CSS.escape(state.lit)}"]`).forEach(el => el.classList.remove('lit'));
  state.lit = id;
  if (id) $$(`[data-id="${CSS.escape(id)}"]`).forEach(el => el.classList.add('lit'));
}
document.addEventListener('pointerover', e => { const el = e.target.closest('[data-id]'); if (el && !el.closest('#panel,#index')) setLit(el.dataset.id); const rl = e.target.closest('.rlabel'); if (rl) state.hoverRegion = rl.dataset.region; });
document.addEventListener('pointerout', e => {
  const el = e.target.closest('[data-id]'); if (el && !el.contains(e.relatedTarget) && state.lit === el.dataset.id) setLit(state.panel);
  const rl = e.target.closest('.rlabel'); if (rl && !rl.contains(e.relatedTarget)) state.hoverRegion = null;
});
document.addEventListener('focusin', e => { const el = e.target.closest('[data-id]'); if (el && el.matches(':focus-visible')) setLit(el.dataset.id); });

// ---------- picking ----------
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function groundAt(x, y, out = new THREE.Vector3()) {
  ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  return ray.ray.intersectPlane(plane, out);
}
function project(v) { tmpV.copy(v).project(camera); return { x: (tmpV.x + 1) / 2 * innerWidth, y: (1 - tmpV.y) / 2 * innerHeight, ok: tmpV.z < 1 && tmpV.z > -1 }; }
function itemAt(x, y) {
  let best = null, bd = isMobile() ? 24 : 18;
  for (const id of w.ids()) { const p = project(w.markerPos(id)); if (!p.ok) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = id; } }
  return best;
}
function showTip(id, x, y) {
  if (!id) { tip.classList.remove('show'); return; }
  const it = byId.get(id);
  tip.innerHTML = `${esc(it.short || it.title)}<small>${esc(GROUPS[it.group].label)}${it.date ? ' · ' + esc(it.date) : ''}</small>`;
  tip.style.transform = `translate(${Math.min(x + 16, innerWidth - tip.offsetWidth - 12)}px, ${y + 16}px)`;
  tip.classList.add('show');
}

// ---------- pointer: pan, look, pinch, click ----------
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.setPointerCapture(e.pointerId);
  if (state.pointers.size === 2) {
    const [a, b] = [...state.pointers.values()];
    state.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: state.ov.dist }; state.drag = null; return;
  }
  state.drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, rotate: e.button === 2 || e.shiftKey, type: e.pointerType };
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', e => {
  if (!state.pointers.has(e.pointerId)) return;
  state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (state.pinch && state.pointers.size === 2) {
    const [a, b] = [...state.pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), k = state.pinch.d / Math.max(d, 1);
    if (state.view === 'overview') { state.ov.dist = clamp(state.pinch.dist * k, w.overview.minDist, w.overview.maxDist); if (k < .55 && state.ov.dist <= w.overview.minDist + 1) tryEnterAt((a.x + b.x) / 2, (a.y + b.y) / 2); }
    else if (k > 1.5 && clock() > state.cooldown) { exitRegion(); state.pinch = null; }
    return;
  }
  const d = state.drag; if (!d) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) d.moved = true;
  if (state.view === 'overview') {
    if (d.rotate) { state.ov.yaw -= dx * .005; state.ov.pitch = clamp(state.ov.pitch + dy * .003, .45, 1.35); }
    else {
      const a = groundAt(d.x, d.y), b = groundAt(e.clientX, e.clientY);
      if (a && b) { const mx = a.x - b.x, mz = a.z - b.z; state.ov.target.x += mx; state.ov.target.z += mz; clampTarget(); state.cam.pos.x += mx; state.cam.pos.z += mz; state.cam.look.x += mx; state.cam.look.z += mz; }
    }
  } else {
    const s = d.type === 'touch' ? .006 : .004;
    state.gd.yaw = clamp(state.gd.yaw - dx * s, -state.gd.maxYaw - .25, state.gd.maxYaw + .25);
    state.gd.pitch = clamp(state.gd.pitch + dy * s * .6, -.22, .22);
  }
  d.x = e.clientX; d.y = e.clientY;
});
function endPointer(e) {
  state.pointers.delete(e.pointerId);
  if (state.pointers.size < 2) state.pinch = null;
  const d = state.drag; if (!d || state.pointers.size) return;
  state.drag = null; canvas.classList.remove('dragging');
  if (d.moved || e.type === 'pointercancel') return;
  if (state.view === 'overview') {
    const id = itemAt(e.clientX, e.clientY);
    if (id) { const g = byId.get(id).group; enterRegion(g, { open: g === 'io' ? null : id }); return; }
    const p = groundAt(e.clientX, e.clientY), g = p && w.regionAt(p.x, p.z);
    if (g) enterRegion(g);
  } else if (state.panel) closePanel();
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
addEventListener('pointermove', e => {
  state.mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); state.mouseIn = e.pointerType === 'touch' ? 0 : 1;
  if (state.drag || e.target !== canvas || state.view !== 'overview' || !w) { if (e.target !== canvas) { tip.classList.remove('show'); canvas.classList.remove('over-node'); } return; }
  const id = itemAt(e.clientX, e.clientY); showTip(id, e.clientX, e.clientY);
  if (id !== state.hoverItem) { state.hoverItem = id; setLit(id || state.panel); }
  const p = groundAt(e.clientX, e.clientY); state.hoverRegion = id ? byId.get(id).group : p ? w.regionAt(p.x, p.z) : null;
  canvas.classList.toggle('over-node', !!(id || state.hoverRegion));
}, { passive: true });
document.addEventListener('pointerleave', () => { state.mouseIn = 0; });

// ---------- wheel and trackpad zoom ----------
function zoomAt(x, y, f) {
  const o = state.ov, before = groundAt(x, y);
  const nd = clamp(o.dist * f, w.overview.minDist, w.overview.maxDist), k = nd / o.dist; o.dist = nd;
  if (before) { o.target.x = before.x + (o.target.x - before.x) * k; o.target.z = before.z + (o.target.z - before.z) * k; clampTarget(); }
}
function tryEnterAt(x, y) {
  if (clock() < state.cooldown) return;
  const p = groundAt(x, y), g = (p && w.regionAt(p.x, p.z)) || w.regionAt(state.ov.target.x, state.ov.target.z);
  if (g) enterRegion(g);
}
addEventListener('wheel', e => {
  if (e.target.closest('#panel,#index,#lightbox,#music-panel') || !w) return;
  e.preventDefault();
  if (state.view === 'ground') state.lastWheel = clock();
  let dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
  if (e.ctrlKey) dy *= 4;
  if (state.view === 'overview') {
    // Swallow leftover momentum after leaving a region, until the wheel goes quiet.
    if (state.wheelLock) { if (clock() - state.lastWheel < .3) { state.lastWheel = clock(); return; } state.wheelLock = false; }
    zoomAt(e.clientX, e.clientY, Math.exp(clamp(dy, -200, 200) * .0016));
    if (dy < 0 && state.ov.dist <= w.overview.minDist + .5) { state.wheelPush += -dy; if (state.wheelPush > 260) { state.wheelPush = 0; tryEnterAt(e.clientX, e.clientY); } }
    else state.wheelPush = 0;
  } else if (!state.panel && clock() > state.cooldown) {
    if (dy > 0) { state.wheelOut += dy; if (state.wheelOut > 220) { state.wheelOut = 0; exitRegion(); } } else state.wheelOut = 0;
  }
}, { passive: false });
let gesture = null;
addEventListener('gesturestart', e => { e.preventDefault(); gesture = { dist: state.ov.dist }; });
addEventListener('gesturechange', e => {
  e.preventDefault(); if (!gesture || !w) return;
  if (state.view === 'overview') { state.ov.dist = clamp(gesture.dist / e.scale, w.overview.minDist, w.overview.maxDist); if (e.scale > 1.6 && state.ov.dist <= w.overview.minDist + 1) { gesture = null; tryEnterAt(innerWidth / 2, innerHeight / 2); } }
  else if (e.scale < .7 && clock() > state.cooldown) { gesture = null; exitRegion(); }
});
addEventListener('gestureend', e => { e.preventDefault(); gesture = null; });

// ---------- clicks on DOM ----------
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { e.preventDefault(); go.dataset.go === 'top' ? goHome() : enterRegion(go.dataset.go); return; }
  if (e.target.closest('#rh-back')) { exitRegion(); return; }
  const rl = e.target.closest('.rlabel'); if (rl) { enterRegion(rl.dataset.region); return; }
  const il = e.target.closest('.ilabel'); if (il) { const it = byId.get(il.dataset.item); enterRegion(it.group, { open: it.group === 'io' ? null : it.id }); return; }
  const lbt = e.target.closest('[data-lb]'); if (lbt) { openLightbox(lbt.dataset.lb, +lbt.dataset.lbI); return; }
  const el = e.target.closest('[data-id]');
  if (!el) {
    if (state.panel && e.target !== canvas && !e.target.closest('#panel,#lightbox,#index,.music,.hud,a,button,input,video')) closePanel();
    return;
  }
  if (e.metaKey || e.ctrlKey) return;
  if (el.tagName === 'A' && el.dataset.id.startsWith('io/')) return;
  e.preventDefault(); openPanel(el.dataset.id);
});

// ---------- detail panel ----------
const panel = $('#panel'), panelBody = $('#panel-body');
function panelHTML(it) {
  const g = GROUPS[it.group], kick = it.org ? `${it.org} · ${it.role}` : (it.kicker || g.label);
  let h = `<p class="kick mono">${esc(kick)}</p><h2 id="panel-title">${esc(it.title)}</h2>`;
  if (it.date) h += `<p class="sub mono">${esc(it.date)}</p>`;
  if (it.stat) h += `<div class="statline"><b>${esc(it.stat.value)}</b><span>${esc(it.stat.label)}</span></div>`;
  const chips = it.chips || it.tags;
  if (chips?.length) h += `<ul class="chips">${chips.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  h += (it.body || []).map(p => `<p>${esc(p)}</p>`).join('');
  if (it.list) h += `<ul class="plain">${it.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  if (it.pairs) h += `<dl class="pairs">${it.pairs.map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  if (it.media?.length) h += `<div class="gallery">${it.media.map((m, i) => `<button type="button" class="${it.media.length === 1 || (i === 0 && it.media.length % 2) ? 'wide' : ''}" data-lb="${esc(it.id)}" data-lb-i="${i}" aria-label="${esc(m.alt)}"><img src="${esc(m.poster || m.src)}" alt="" loading="lazy" decoding="async">${m.type === 'video' ? '<span class="play">▶ Play</span>' : ''}</button>`).join('')}</div>`;
  if (it.links?.length) h += `<div class="links">${it.links.map(l => `<a class="frame-btn mono" href="${esc(l.href)}" ${/^https?:/.test(l.href) ? 'target="_blank" rel="noopener noreferrer"' : ''}>${esc(l.label)} ↗</a>`).join('')}</div>`;
  if (it.related && byId.get(it.related)) h += `<p class="related mono"><a href="#${esc(it.related)}" data-id="${esc(it.related)}">Related · ${esc(byId.get(it.related).short || byId.get(it.related).title)} →</a></p>`;
  return h;
}
const siblings = it => inGroup(it.group);
function openPanel(id, opts = {}) {
  const it = byId.get(id); if (!it || it.group === 'io') return;
  if (state.view !== 'ground' || state.region !== it.group) { enterRegion(it.group, { open: id, noHash: opts.noHash }); return; }
  state.panel = id; setLit(id);
  panel.style.setProperty('--accent', GROUPS[it.group].hue);
  $('#panel-crumb').textContent = `${GROUPS[it.group].index} · ${GROUPS[it.group].label}`;
  panelBody.innerHTML = panelHTML(it); panelBody.scrollTop = 0;
  const sib = siblings(it), i = sib.indexOf(it);
  $('#panel-count').textContent = `${pad3(i + 1)} / ${pad3(sib.length)}`;
  panel.hidden = false; requestAnimationFrame(() => panel.classList.add('open'));
  document.body.classList.add('panel-open');
  // Turn to face the card, leaving room for the panel.
  const c = cardState.list.find(x => x.id === id);
  if (c) {
    const st = w.regions[state.region].stand, v = c.anchor.clone().sub(st.eye);
    const az = Math.atan2(v.x * -st.dir.z + v.z * st.dir.x, v.x * st.dir.x + v.z * st.dir.z);
    state.gd.yaw = clamp(az + (isMobile() ? 0 : .22), -state.gd.maxYaw - .25, state.gd.maxYaw + .25);
  }
  if (!opts.noHash) history.replaceState(null, '', '#' + id);
  if (!opts.keepFocus) setTimeout(() => $('#panel-close').focus({ preventScroll: true }), 50);
}
function closePanel(quiet) {
  if (!state.panel) return;
  const was = state.panel; state.panel = null;
  panel.classList.remove('open'); document.body.classList.remove('panel-open');
  setTimeout(() => { if (!state.panel) panel.hidden = true; }, 600);
  setLit(null);
  if (!quiet) { history.replaceState(null, '', state.region ? '#' + state.region : location.pathname); $(`.card3d[data-id="${CSS.escape(was)}"]`)?.focus({ preventScroll: true }); }
}
$('#panel-close').addEventListener('click', () => closePanel());
function stepPanel(d) { const it = byId.get(state.panel), sib = siblings(it), i = sib.indexOf(it); openPanel(sib[(i + d + sib.length) % sib.length].id, { keepFocus: true }); }
$('#panel-prev').addEventListener('click', () => stepPanel(-1));
$('#panel-next').addEventListener('click', () => stepPanel(1));

// ---------- index ----------
const ix = $('#index'), ixq = $('#index-q'), ixList = $('#index-list');
function renderIndex(q = '') {
  const t = q.trim().toLowerCase();
  const match = it => !t || [it.title, it.short, it.org, it.role, it.date, ...(it.tags || []), ...(it.chips || []), ...(it.body || []), it.label].join(' ').toLowerCase().includes(t);
  let html = '';
  for (const [g, meta] of Object.entries(GROUPS)) {
    const rows = inGroup(g).filter(match); if (!rows.length) continue;
    html += `<div class="ix-group"><h3 class="mono">${meta.index} · ${meta.label}</h3>` + rows.map((it, i) => {
      const m = it.org ? `${it.org} · ${it.date}` : it.date || it.label || '';
      const io = it.group === 'io', attrs = io ? `href="${esc(it.href)}" ${/^https?:/.test(it.href) ? 'target="_blank" rel="noopener noreferrer"' : ''}` : 'type="button"';
      return `<${io ? 'a' : 'button'} class="ix-row" ${attrs} data-ix="${esc(it.id)}"><span class="idx mono">${pad3(i + 1)}</span><span class="t">${esc(it.title)}</span><span class="m mono">${esc(m)}</span></${io ? 'a' : 'button'}>`;
    }).join('') + '</div>';
  }
  ixList.innerHTML = html || `<p class="ix-empty mono">Nothing matches “${esc(q)}”.</p>`;
}
function openIndex() { renderIndex(ixq.value); ix.hidden = false; requestAnimationFrame(() => ix.classList.add('open')); setTimeout(() => ixq.focus(), 30); }
function closeIndex(refocus = true) { ix.classList.remove('open'); setTimeout(() => { ix.hidden = true; }, 350); if (refocus) $('#index-open').focus({ preventScroll: true }); }
$('#index-open').addEventListener('click', openIndex);
$('#index-close').addEventListener('click', () => closeIndex());
ixq.addEventListener('input', () => renderIndex(ixq.value));
ixList.addEventListener('click', e => {
  const r = e.target.closest('[data-ix]'); if (!r) return;
  const it = byId.get(r.dataset.ix); if (it.group === 'io') return;
  e.preventDefault(); e.stopPropagation(); closeIndex(false); openPanel(it.id);
});
ix.addEventListener('click', e => { if (e.target === ix) closeIndex(); });

// ---------- lightbox ----------
const lb = $('#lightbox'), lbMedia = $('.lb-media', lb), lbCap = $('figcaption', lb);
let lbList = [], lbI = 0, lbReturn = null;
function showLb() {
  const m = lbList[lbI];
  lbMedia.innerHTML = m.type === 'video' ? `<video src="${esc(m.src)}" poster="${esc(m.poster || '')}" controls playsinline autoplay muted loop></video>` : `<img src="${esc(m.src)}" alt="${esc(m.alt)}">`;
  lbCap.textContent = `${m.caption || m.alt}  ·  ${lbI + 1} / ${lbList.length}`;
}
function openLightbox(id, i) { const it = byId.get(id); if (!it?.media) return; lbReturn = document.activeElement; lbList = it.media; lbI = i || 0; showLb(); lb.hidden = false; requestAnimationFrame(() => lb.classList.add('open')); $('.lb-close', lb).focus(); }
function closeLb() { lb.classList.remove('open'); lbMedia.querySelector('video')?.pause(); setTimeout(() => { lb.hidden = true; lbMedia.innerHTML = ''; }, 300); lbReturn?.focus?.({ preventScroll: true }); }
$('.lb-close', lb).addEventListener('click', closeLb);
$('.lb-prev', lb).addEventListener('click', () => { lbI = (lbI - 1 + lbList.length) % lbList.length; showLb(); });
$('.lb-next', lb).addEventListener('click', () => { lbI = (lbI + 1) % lbList.length; showLb(); });
lb.addEventListener('click', e => { if (e.target === lb || e.target.tagName === 'FIGURE') closeLb(); });

// ---------- keyboard ----------
addEventListener('keydown', e => {
  const typing = e.target.closest('input,textarea');
  if (e.key === 'Escape') {
    if (!lb.hidden) return closeLb();
    if (!ix.hidden) return closeIndex();
    if (state.panel) return closePanel();
    if (state.view === 'ground') return exitRegion();
  }
  if (!lb.hidden && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { lbI = (lbI + (e.key === 'ArrowRight' ? 1 : -1) + lbList.length) % lbList.length; showLb(); return; }
  if (state.panel && lb.hidden && !typing && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { stepPanel(e.key === 'ArrowRight' ? 1 : -1); return; }
  if (state.view === 'ground' && !state.panel && !typing && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { state.gd.yaw = clamp(state.gd.yaw + (e.key === 'ArrowRight' ? .25 : -.25), -state.gd.maxYaw - .25, state.gd.maxYaw + .25); return; }
  if (state.view === 'overview' && w && !typing && (e.key === '+' || e.key === '=' || e.key === '-')) { zoomAt(innerWidth / 2, innerHeight / 2, e.key === '-' ? 1.25 : .8); return; }
  if (e.key === '/' && ix.hidden && !typing) { e.preventDefault(); openIndex(); }
});

// ---------- routing ----------
function route(hash, first) {
  let h = decodeURIComponent((hash || '').replace(/^#/, ''));
  h = ALIASES[h] || h;
  if (!h) { if (state.view === 'ground') exitRegion(); return; }
  if (REGIONS.includes(h)) return enterRegion(h, { noHash: first });
  const it = byId.get(h);
  if (it) enterRegion(it.group, { open: it.group === 'io' ? null : h, noHash: true });
}
addEventListener('hashchange', () => route(location.hash));

// ---------- music ----------
const music = $('.music');
new MutationObserver(() => { state.musicOn = music.classList.contains('is-playing'); }).observe(music, { attributes: true, attributeFilter: ['class'] });

// ---------- worlds ----------
const worldBtn = $('#world-toggle');
async function getWorld(key) {
  if (!worlds[key]) {
    if (key === 'env') { const { createEnvWorld } = await import('./world-env.js?v=5'); worlds.env = createEnvWorld(ctx); worlds.env.sim.onReward = popReward; }
    else worlds.die = createDieWorld(ctx);
  }
  return worlds[key];
}
function labelWorld() {
  worldBtn.innerHTML = `<span class="env-k">World · </span>${state.world === 'env' ? 'Game' : 'Silicon'}`;
  worldBtn.setAttribute('aria-pressed', String(state.world === 'env'));
  document.body.classList.toggle('world-env', state.world === 'env');
}
async function setWorld(key) {
  if (key === state.world && w) return;
  const fade = $('#fade'); fade.classList.add('on');
  await new Promise(r => setTimeout(r, reduced.matches ? 0 : 380));
  state.world = key; w = await getWorld(key);
  try { localStorage.setItem('world', key); } catch {}
  labelWorld(); buildLabels();
  if (state.view === 'ground') { buildCards(state.region); state.tween = null; const p = gdPose(); state.cam.pos.copy(p.pos); state.cam.look.copy(p.look); setBodyView(); }
  else { Object.assign(state.ov, { target: w.overview.target.clone(), dist: w.overview.dist, yaw: 0, pitch: w.overview.pitch }); const p = ovPose(); state.cam.pos.copy(p.pos); state.cam.look.copy(p.look); }
  if (state.lit) { const l = state.lit; state.lit = null; setLit(l); }
  requestAnimationFrame(() => fade.classList.remove('on'));
}
worldBtn.addEventListener('click', () => setWorld(state.world === 'env' ? 'die' : 'env'));
function popReward() {
  if (state.world !== 'env') return;
  const el = $('#reward'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

// ---------- frame ----------
let last = performance.now();
function resize() {
  camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < 600 ? 58 : 45; camera.updateProjectionMatrix();
  if (gl) renderer.setSize(innerWidth, innerHeight, false);
  if (state.view === 'ground' && state.region && w) buildCards(state.region);
  if (w) setBodyView();
}
function frame(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now; state.t += dt;
  const t = state.t, rm = reduced.matches, c = clock();
  if (gl && w) {
    // Ground view: the mouse turns the head a little, so wide arcs reveal themselves.
    if (state.view === 'ground' && !state.drag && state.mouseIn && !isMobile()) state.gd.look = lerp(state.gd.look, state.panel ? 0 : state.mouse.x * Math.max(state.gd.maxYaw, .05), 1 - Math.pow(.05, dt));
    else state.gd.look = lerp(state.gd.look, 0, 1 - Math.pow(.05, dt));
    const target = pose();
    if (state.tween) {
      const tw = state.tween, k = clamp((c - tw.t0) / tw.dur), e = easeInOut(k), el = easeInOut(clamp(k * 1.25 - .15));
      state.cam.pos.lerpVectors(tw.from.pos, target.pos, e).addScaledVector(UP, Math.sin(Math.PI * k) * tw.lift);
      state.cam.look.lerpVectors(tw.from.look, target.look, el);
      if (k >= 1) state.tween = null;
    } else {
      const k = rm ? 1 : 1 - Math.pow(state.view === 'ground' ? .004 : .0008, dt);
      state.cam.pos.lerp(target.pos, k); state.cam.look.lerp(target.look, k);
    }
    camera.position.copy(state.cam.pos); camera.lookAt(state.cam.look); camera.updateMatrixWorld();
    if (state.mouseIn) groundAt((state.mouse.x + 1) / 2 * innerWidth, (1 - state.mouse.y) / 2 * innerHeight, state.mouseWorld);

    w.update({ dt, t, now: c, camera, view: state.view, region: state.region, hoverRegion: state.view === 'overview' ? state.hoverRegion : null, lit: state.lit, musicOn: state.musicOn, mouseWorld: state.mouseWorld, mouseIn: state.mouseIn && state.view === 'overview' && !state.drag });
    renderer.render(w.scene, camera);

    // Overview labels
    if (state.view === 'overview' || state.tween) {
      const showItems = state.view === 'overview' && state.ov.dist < w.labelLOD;
      for (const el of labels.children) {
        if (el.dataset.region) {
          const g = el.dataset.region, p = project(w.regions[g].center);
          el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
          el.classList.toggle('hot', state.hoverRegion === g); el.style.visibility = p.ok ? '' : 'hidden';
        } else {
          const p = project(w.markerPos(el.dataset.item));
          el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-150%)`;
          el.classList.toggle('show', showItems && p.ok); el.tabIndex = showItems ? 0 : -1;
        }
      }
    }
    // Ground cards and beams
    if (cardState.list.length) {
      const ls = beams.children;
      cardState.list.forEach((cd, i) => {
        tmpV.copy(cd.anchor); if (!rm) tmpV.y += Math.sin(t * 1.1 + i * .9) * .35;
        const p = project(tmpV), vis = p.ok && p.x > -300 && p.x < innerWidth + 300;
        cd.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
        cd.el.style.visibility = vis ? '' : 'hidden';
        const line = ls[i * 2], dot = ls[i * 2 + 1], m = w.markerPos(cd.id), q = m && project(m);
        if (line && q && q.ok && vis) {
          line.setAttribute('x1', p.x); line.setAttribute('y1', p.y + cd.el.offsetHeight / 2); line.setAttribute('x2', q.x); line.setAttribute('y2', q.y);
          dot.setAttribute('cx', q.x); dot.setAttribute('cy', q.y);
          line.classList.toggle('lit', state.lit === cd.id); dot.classList.toggle('lit', state.lit === cd.id);
          line.style.display = dot.style.display = '';
        } else if (line) line.style.display = dot.style.display = 'none';
      });
    }
    const hud = w.hud(); if (hud && (t * 5 | 0) !== state.hudT) { state.hudT = t * 5 | 0; $('#rl-stat').textContent = hud; }
    if ((t * 8 | 0) !== state.coT) {
      state.coT = t * 8 | 0; const L = state.cam.look;
      $('#coords').textContent = state.view === 'ground' ? `${GROUPS[state.region].label.toUpperCase()} · LOOK ${((state.gd.yaw + state.gd.look) * 57.3).toFixed(0)}°` : `X ${L.x >= 0 ? '+' : '−'}${Math.abs(L.x).toFixed(0).padStart(3, '0')} · Z ${L.z >= 0 ? '+' : '−'}${Math.abs(L.z).toFixed(0).padStart(3, '0')} · ZOOM ${(w.overview.dist / state.ov.dist).toFixed(1)}×`;
    }
  }
  requestAnimationFrame(frame);
}

// Test hook
window.__site = { state, screenOf: id => w && project(w.markerPos(id)), regionScreen: g => w && project(w.regions[g].center), cards: () => cardState.list.map(c => ({ id: c.id, ...c.el.getBoundingClientRect().toJSON() })), world: () => w, setWorld };

// ---------- boot ----------
async function boot() {
  buildA11y();
  const fonts = ['400 20px "Instrument Serif"', 'italic 400 20px "Instrument Serif"', '500 20px "IBM Plex Mono"', '400 20px "IBM Plex Mono"', '400 16px Inter'];
  let done = 0;
  await Promise.all(fonts.map(f => document.fonts.load(f).catch(() => {}).then(() => progress(10 + (++done / fonts.length) * 35))));
  if (gl) {
    try { w = await getWorld(state.world); }
    catch (err) { console.error(err); gl = false; document.body.classList.add('no-webgl'); }
  }
  progress(80);
  labelWorld();
  if (w) { buildLabels(); Object.assign(state.ov, { target: w.overview.target.clone(), dist: w.overview.dist, yaw: 0, pitch: w.overview.pitch }); }
  resize(); setBodyView();
  if (w) { const p = ovPose(); state.cam.pos.copy(p.pos).multiplyScalar(1.7); state.cam.look.copy(p.look); }
  await new Promise(r => requestAnimationFrame(() => { if (gl && w) { camera.position.copy(state.cam.pos); camera.lookAt(state.cam.look); renderer.render(w.scene, camera); } r(); }));
  progress(100);
  await new Promise(r => setTimeout(r, 600));
  document.body.classList.remove('is-loading');
  if (w) startTween(0, 2.6);
  if (location.hash) setTimeout(() => route(location.hash, true), reduced.matches ? 0 : 1400);
}
addEventListener('resize', resize);
boot().then(() => requestAnimationFrame(frame));
