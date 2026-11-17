import * as THREE from './three.module.min.js';
import { PERSON, GROUPS, ITEMS, ALIASES } from './content.js';

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const byId = new Map(ITEMS.map(it => [it.id, it]));
const inGroup = g => ITEMS.filter(it => it.group === g);
const pad3 = n => String(n).padStart(3, '0');
const isMobile = () => innerWidth < 900;
const clock = () => performance.now() / 1000;

// Section order drives the scroll tour.
const SECTIONS = [
  { id: 'top', group: null, layer: 'L0 · CORE', shape: 'chip' },
  { id: 'about', group: 'about', layer: 'L1 · ABOUT', shape: 'net' },
  { id: 'work', group: 'work', layer: 'L2 · WORK', shape: 'wave' },
  { id: 'projects', group: 'projects', layer: 'L3 · PROJECTS', shape: 'lattice' },
  { id: 'life', group: 'life', layer: 'L4 · LIFE', shape: 'globe' },
  { id: 'io', group: 'io', layer: 'L5 · I/O', shape: 'beacon' },
];

// ---------- loader ----------
const loader = { shown: 0, target: 0, el: $('#loader-pct'), bar: $('#loader .loader-bar i') };
function progress(p) { loader.target = Math.max(loader.target, p); }
(function tickLoader() {
  loader.shown += (loader.target - loader.shown) * 0.18;
  const v = Math.round(loader.shown);
  loader.el.textContent = pad3(v) + '%';
  loader.bar.style.width = v + '%';
  if (document.body.classList.contains('is-loading')) requestAnimationFrame(tickLoader);
})();

// ---------- tour DOM ----------
const tour = $('#tour');
function lines(arr) { return arr.map(l => `<span class="ln"><span>${l}</span></span>`).join(''); }
function mediaThumb(it) { return (it.media || []).find(m => m.type === 'img') || (it.media || []).find(m => m.poster); }

function buildTour() {
  const about = byId.get('me');
  const facts = [
    ['education', 'Education', 'UW–Madison · CE + CS · Dec 2026'],
    ['stack', 'Stack', 'Python · C++ · PyTorch · ROCm · Verilog'],
    ['patent', 'Patent', 'Sign language to text · USPTO 17865379'],
    ['activities', 'Activities', 'USACO Gold · Conrad runner-up · Robotics'],
  ];
  const work = inGroup('work');
  const projects = inGroup('projects');
  const life = inGroup('life');
  const little = byId.get('life/little');

  tour.innerHTML = `
  <section class="sec hero" id="top" data-sec="0">
    <div class="col">
      <p class="tag mono">Hello</p>
      <h1 class="display">${lines(['Arihan', '<em>Yadav</em>'])}</h1>
      <p class="lede">I train language models and build what runs them: RL pipelines, GPU kernels, and the hardware underneath.</p>
      <p class="cap mono scr">AI Engineer @ AMD · UW–Madison CE + CS ’26 · SF / NYC</p>
    </div>
    <div class="hint mono">Scroll to trace the die<i></i></div>
  </section>

  <section class="sec" id="about" data-sec="1" style="--accent:${GROUPS.about.hue}">
    <div class="col">
      <p class="tag mono">01 · About</p>
      <h2 class="display">${lines(['<em>Somewhere</em>', 'between models', '<span class="indent">and metal</span>'])}</h2>
      <p class="lede words">Most of my work sits between machine learning, software, and hardware. At AMD I train language models for device code generation, plus the kernels and distributed systems that make that training possible.</p>
      <div class="strip">${about.media.map((m, i) => `<button type="button" data-lb="me" data-lb-i="${i}" aria-label="${esc(m.alt)}"><img src="${m.src}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>
      <p class="body">Outside of that: ice hockey, rock climbing, hiking, window-seat photos, and a lot of Madison. A frozen lake is a ton of fun. An electric skateboard on ice, less so :]</p>
    </div>
    <div class="facts">${facts.map(([id, k, v]) => `<button type="button" class="fact" data-id="${id}"><span class="mono">${k}</span><span class="v">${esc(v)}</span></button>`).join('')}
      <button type="button" class="fact" data-id="me"><span class="mono">More</span><span class="v">The longer version →</span></button></div>
  </section>

  <section class="sec tall" id="work" data-sec="2" style="--accent:${GROUPS.work.hue}">
    <div class="col">
      <p class="tag mono">02 · Work</p>
      <h2 class="display">${lines(['<em>Where</em> I’ve', 'been building'])}</h2>
      <p class="body">LLM post-training, hardware verification, multimodal retrieval, vector search, and robotics. Point at a row to find it on the die. Click for the full story.</p>
    </div>
    <ol class="rows">${work.map((it, i) => `<li><button type="button" class="row" data-id="${it.id}">
      <span class="idx mono">(${pad3(i + 1)})</span><span class="t">${esc(it.title)}</span><span class="o">${esc(it.org)} · ${esc(it.role)}</span><span class="d mono">${esc(it.date)}</span>
      <span class="s"><b>${esc(it.stat.value)}</b>${esc(it.stat.label)}</span></button></li>`).join('')}</ol>
  </section>

  <section class="sec tall" id="projects" data-sec="3" style="--accent:${GROUPS.projects.hue}">
    <div class="col">
      <p class="tag mono">03 · Projects</p>
      <h2 class="display">${lines(['<em>Some</em> things', 'I’ve built'])}</h2>
      <p class="body">From a 110× faster VLIW kernel to an FPGA bolted to a bike.</p>
    </div>
    <div class="cards">${projects.map(it => {
      const t = mediaThumb(it);
      const media = t ? `<img src="${t.poster || t.src}" alt="" loading="lazy" decoding="async">` : `<div class="num"><b>${esc(it.stat.value)}</b><small>${esc(it.stat.label)}</small></div>`;
      return `<button type="button" class="card" data-id="${it.id}"><div class="media">${media}<span class="glitch"></span></div>
        <div class="meta"><span class="mono">${esc((it.tags || []).join(' / '))}</span><span class="mono">${esc(it.year)}</span></div>
        <h3>${esc(it.title)}</h3>${t ? `<div class="stat">${esc(it.stat.value)} · ${esc(it.stat.label)}</div>` : ''}</button>`;
    }).join('')}</div>
  </section>

  <section class="sec tall" id="life" data-sec="4" style="--accent:${GROUPS.life.hue}">
    <div class="col">
      <p class="tag mono">04 · Life</p>
      <h2 class="display">${lines(['<em>Off</em> the die'])}</h2>
      <p class="body">Ice hockey, rock climbing, hiking, and the occasional window seat.</p>
    </div>
    <div class="photos">${life.filter(it => it.media).map(it => {
      const t = mediaThumb(it);
      return `<button type="button" class="photo-card" data-id="${it.id}"><div class="media"><img src="${t.poster || t.src}" alt="" loading="lazy" decoding="async"><span class="n">${it.media.length} ${it.media.some(m => m.type === 'video') ? 'clips + pics' : 'pics'}</span></div>
        <h3>${esc(it.title)}</h3><p class="mono">${esc(it.date)}</p></button>`;
    }).join('')}</div>
    <div class="little">${little.pairs.map(([k, v]) => `<button type="button" class="fact" data-id="life/little"><span class="mono">${k}</span><span class="v">${esc(v)}</span></button>`).join('')}</div>
  </section>

  <section class="sec" id="io" data-sec="5" style="--accent:${GROUPS.io.hue}">
    <div class="col">
      <p class="tag mono">05 · I/O</p>
      <h2 class="display">${lines(['<em>Say</em> hello'])}</h2>
      <p class="body">Always happy to talk about machine learning, systems, hardware, or something you’re building.</p>
      <a class="io-big" href="mailto:${PERSON.email}" data-id="io/mail">${PERSON.email}</a>
      <div class="pads">${inGroup('io').filter(it => it.id !== 'io/mail').map(it => `<a class="pad frame-btn mono" href="${it.href}" data-id="${it.id}" ${it.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}><span class="k">${esc(it.short)}</span><span class="v">${esc(it.title)} · ${esc(it.label)} ↗</span></a>`).join('')}</div>
    </div>
    <div class="foot mono"><span>© 2026 Arihan Yadav · Made in Madison</span><span><a href="tree.html">Previous version: the tree</a> · <a href="https://github.com/Air-crypto/Air-crypto.github.io" target="_blank" rel="noopener noreferrer">Source</a></span></div>
  </section>`;

  $('.rail').innerHTML = SECTIONS.map(() => '<li></li>').join('');
  // Lede words reveal with scroll.
  for (const p of $$('.lede.words')) p.innerHTML = p.textContent.split(' ').map(w => `<span class="w">${esc(w)}</span>`).join(' ');
}
buildTour();
progress(12);

// ---------- scene ----------
const canvas = $('#scene');
let renderer, scene, camera, gl = true;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch (e) { gl = false; document.body.classList.add('no-webgl'); }

const DIE = 100;
const BLOCKS = {
  core: { x: 0, z: 0, w: 40, d: 40, label: 'CORE · AY-26' },
  about: { x: -58, z: 58, w: 50, d: 50, label: 'ABOUT' },
  work: { x: -58, z: -58, w: 50, d: 50, label: 'WORK' },
  projects: { x: 58, z: -58, w: 50, d: 50, label: 'PROJECTS' },
  life: { x: 58, z: 58, w: 50, d: 50, label: 'LIFE' },
};
const COLS = { about: 3, work: 3, projects: 4, life: 4 };
const nodes = new Map(); // id -> {pos, color, trace}

function layoutNodes() {
  for (const g of ['about', 'work', 'projects', 'life']) {
    const items = inGroup(g), b = BLOCKS[g], cols = COLS[g], rows = Math.ceil(items.length / cols);
    const cw = (b.w - 10) / cols, ch = (b.d - 16) / rows;
    items.forEach((it, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = b.x - b.w / 2 + 5 + cw * (c + .5), z = b.z - b.d / 2 + 11 + ch * (r + .5);
      nodes.set(it.id, { id: it.id, group: g, pos: new THREE.Vector3(x, 0, z), cell: { w: cw - 2.2, d: ch - 2.6 }, color: new THREE.Color(GROUPS[g].hue) });
    });
  }
  inGroup('io').forEach((it, i) => {
    const x = (i - 1.5) * 15;
    nodes.set(it.id, { id: it.id, group: 'io', pos: new THREE.Vector3(x, 0, DIE - 5), cell: { w: 9, d: 5 }, color: new THREE.Color(GROUPS.io.hue) });
  });
}
layoutNodes();

// Manhattan traces with 45° chamfers, core edge to each node.
function chamfer(pts, c = 1.6) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], p = pts[i], b = pts[i + 1];
    const da = a.clone().sub(p), db = b.clone().sub(p);
    const la = da.length(), lb = db.length();
    if (la < .01 || lb < .01) continue;
    out.push(p.clone().add(da.multiplyScalar(Math.min(c, la / 2) / la)), p.clone().add(db.multiplyScalar(Math.min(c, lb / 2) / lb)));
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function routeFor(id, k) {
  const n = nodes.get(id), p = n.pos, y = .15;
  if (n.group === 'io') {
    const sx = p.x * .35;
    return chamfer([new THREE.Vector3(sx, y, 20), new THREE.Vector3(sx, y, 60), new THREE.Vector3(p.x, y, 72), new THREE.Vector3(p.x, y, p.z - 2.5)], 3);
  }
  const sx = Math.sign(p.x), sz = Math.sign(p.z);
  const startZ = sz * (3 + k * 1.45), laneX = sx * (23 + k * 1.15);
  const pts = [new THREE.Vector3(sx * 20, y, startZ), new THREE.Vector3(laneX, y, startZ), new THREE.Vector3(laneX, y, p.z), new THREE.Vector3(p.x - sx * 2.5, y, p.z)];
  return chamfer(pts);
}

let grid, gridMat, markers, markerGeo, packets, packetGeo, core, coreGeo, coreMat, traceGroup, silk;
const traces = new Map();
const state = {
  t: 0, mouse: new THREE.Vector2(-9, -9), mouseWorld: new THREE.Vector3(0, -999, 0), mouseIn: 0,
  hover: null, lit: null, panel: null, drag: null, yaw: 0, pitch: 0, s: 0, section: 0,
  camPos: new THREE.Vector3(0, 260, 240), camLook: new THREE.Vector3(0, 0, 0),
  coreFocus: new THREE.Vector3(0, 16, 0), coreScale: 1, shape: 'chip', music: 0, ripple: 0, intro: 0,
};

const vertGrid = `
attribute float aR; attribute float aZ;
uniform float uTime,uPix,uRip; uniform vec3 uMouse; uniform vec3 uFocus; uniform float uFocusA;
varying float vB; varying float vF;
void main(){
  vec3 p=position;
  float dm=length(p.xz-uMouse.xz); float m=exp(-dm*dm/140.0)*uMouse.y;
  float df=length(p.xz-uFocus.xz); float f=exp(-df*df/70.0)*uFocusA;
  float r=length(p.xz); float ring=exp(-pow(r-mod(uTime*30.0,300.0),2.0)/30.0)*uRip;
  p.y+=m*2.0+f*1.4+ring*.9;
  vB=.12+aR*.12+aZ*.26+m*.85+f*.7+ring*.55; vF=f+m*.6;
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  gl_PointSize=uPix*(1.0+m*1.2+f*.9)*(150.0/-mv.z);
  gl_Position=projectionMatrix*mv;
}`;
const fragGrid = `
uniform vec3 uCol,uHot; varying float vB; varying float vF;
void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); if(d>.5) discard;
  float a=smoothstep(.5,.05,d)*clamp(vB,0.0,1.4); gl_FragColor=vec4(mix(uCol,uHot,clamp(vF,0.0,1.0)),a); }`;
const vertSprite = `
attribute vec3 color; attribute float aS; uniform float uPix; varying vec3 vC;
void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=uPix*aS*(200.0/-mv.z); gl_Position=projectionMatrix*mv; }`;
const fragSprite = `
varying vec3 vC; void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); if(d>.5) discard;
  float a=pow(smoothstep(.5,.0,d),1.6); gl_FragColor=vec4(vC*a,a); }`;

function spriteMaterial(pix) {
  return new THREE.ShaderMaterial({ vertexShader: vertSprite, fragmentShader: fragSprite, uniforms: { uPix: { value: pix } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
}

// Silkscreen: block outlines, labels, fiducials painted on the die surface.
function drawSilk() {
  const S = 2048, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), k = S / (DIE * 2), X = x => (x + DIE) * k;
  g.clearRect(0, 0, S, S);
  g.strokeStyle = 'rgba(200,214,240,.42)'; g.fillStyle = 'rgba(200,214,240,.62)'; g.lineWidth = 2;
  g.strokeRect(X(-DIE + 1.2), X(-DIE + 1.2), (DIE * 2 - 2.4) * k, (DIE * 2 - 2.4) * k);
  g.lineWidth = 1; g.strokeStyle = 'rgba(200,214,240,.18)';
  g.strokeRect(X(-DIE + 3), X(-DIE + 3), (DIE * 2 - 6) * k, (DIE * 2 - 6) * k);
  // ruler ticks
  g.strokeStyle = 'rgba(200,214,240,.3)';
  for (let v = -DIE + 5; v <= DIE - 5; v += 5) {
    const L = v % 25 === 0 ? 2.2 : 1;
    g.beginPath(); g.moveTo(X(v), X(-DIE + 1.2)); g.lineTo(X(v), X(-DIE + 1.2 + L)); g.stroke();
    g.beginPath(); g.moveTo(X(-DIE + 1.2), X(v)); g.lineTo(X(-DIE + 1.2 + L), X(v)); g.stroke();
  }
  // fiducials
  for (const [fx, fz] of [[-92, -92], [92, -92], [-92, 92], [92, 92]]) {
    g.strokeStyle = 'rgba(200,214,240,.5)'; g.beginPath(); g.arc(X(fx), X(fz), 2.2 * k, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(X(fx - 3.4), X(fz)); g.lineTo(X(fx + 3.4), X(fz)); g.moveTo(X(fx), X(fz - 3.4)); g.lineTo(X(fx), X(fz + 3.4)); g.stroke();
  }
  // blocks
  for (const [key, b] of Object.entries(BLOCKS)) {
    const x0 = X(b.x - b.w / 2), z0 = X(b.z - b.d / 2), w = b.w * k, d = b.d * k;
    g.strokeStyle = 'rgba(200,214,240,.34)'; g.setLineDash([]); g.lineWidth = 1.5; g.strokeRect(x0, z0, w, d);
    g.lineWidth = 3; g.strokeStyle = 'rgba(230,238,255,.75)';
    const t = 3 * k;
    for (const [cx, cz, sx, sz] of [[x0, z0, 1, 1], [x0 + w, z0, -1, 1], [x0, z0 + d, 1, -1], [x0 + w, z0 + d, -1, -1]]) {
      g.beginPath(); g.moveTo(cx + sx * t, cz); g.lineTo(cx, cz); g.lineTo(cx, cz + sz * t); g.stroke();
    }
    g.font = `500 ${key === 'core' ? 22 : 30}px "IBM Plex Mono"`; g.fillStyle = 'rgba(220,230,250,.8)';
    const count = key === 'core' ? '' : '  ·  ' + String(inGroup(key).length).padStart(2, '0');
    g.fillText(b.label + count, x0 + 2.2 * k, z0 + 5.6 * k);
  }
  // core pattern
  g.strokeStyle = 'rgba(200,214,240,.12)'; g.lineWidth = 1;
  for (let v = -18; v <= 18; v += 3) { g.beginPath(); g.moveTo(X(v), X(-18)); g.lineTo(X(v), X(18)); g.stroke(); g.beginPath(); g.moveTo(X(-18), X(v)); g.lineTo(X(18), X(v)); g.stroke(); }
  // cells
  g.font = '500 15px "IBM Plex Mono"';
  let n = 0;
  for (const nd of nodes.values()) {
    const { pos: p, cell } = nd, it = byId.get(nd.id);
    g.strokeStyle = 'rgba(200,214,240,.28)'; g.lineWidth = 1.2; g.setLineDash(nd.group === 'io' ? [] : [6, 5]);
    g.strokeRect(X(p.x - cell.w / 2), X(p.z - cell.d / 2), cell.w * k, cell.d * k);
    g.setLineDash([]); g.fillStyle = 'rgba(200,214,240,.55)';
    const prefix = { about: 'A', work: 'W', projects: 'P', life: 'L', io: '' }[nd.group];
    const num = nd.group === 'io' ? '' : prefix + String(inGroup(nd.group).indexOf(it) + 1).padStart(2, '0') + ' ';
    let code = num + (it.short || it.title).toUpperCase().replace(/^AMD · /, 'AMD ');
    const room = cell.w * k - 12;
    while (code.length > 3 && g.measureText(code).width > room) code = code.slice(0, -2) + '…';
    g.fillText(code, X(p.x - cell.w / 2) + 6, X(p.z + cell.d / 2) - 8);
    n++;
  }
  // marking
  g.font = '500 20px "IBM Plex Mono"'; g.fillStyle = 'rgba(200,214,240,.42)';
  g.fillText('ARIHAN YADAV  ·  DIE REV 11.2026  ·  UW–MADISON CE/CS', X(-DIE + 6), X(DIE - 12));
  g.fillText('ML · SYSTEMS · HARDWARE', X(DIE - 52), X(-DIE + 8));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.generateMipmaps = true;
  return tex;
}

// Particle shapes for the floating core, one per section.
const N = 4200;
const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const C = h => new THREE.Color(h);
const PAL = { cyan: C('#73d9ff'), copper: C('#ffa565'), ink: C('#e9edf6'), rose: C('#ff86b8'), lilac: C('#cfd8ff'), mint: C('#8dffc4'), dim: C('#6c7a99') };
function makeShape(fn) {
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = fn(i, rand());
    pos[i * 3] = r[0]; pos[i * 3 + 1] = r[1]; pos[i * 3 + 2] = r[2];
    const c = r[3]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; size[i] = r[4] ?? 1;
  }
  return { pos, col, size };
}
const jit = a => (rand() - .5) * a;
const SHAPES = {
  chip: makeShape((i, u) => {
    if (u < .26) return [jit(22), jit(.3), jit(22), PAL.dim.clone().lerp(PAL.cyan, rand() * .5), .8];
    if (u < .5) { const a = rand() < .5, v = Math.round(jit(12) / 1.5) * 1.5; const t = jit(12); return [a ? v : t, 1.4 + jit(.15), a ? t : v, PAL.copper.clone().lerp(PAL.ink, rand() * .4), 1]; }
    if (u < .82) { const side = Math.floor(rand() * 4), k = Math.floor(rand() * 11) - 5, t = rand(); const o = 11 + t * 3.4, y = -t * 1.6, along = k * 1.9;
      const p = [[along, y, -o], [along, y, o], [-o, y, along], [o, y, along]][side]; return [p[0], p[1], p[2], PAL.ink.clone().lerp(PAL.dim, .3), .9]; }
    const t = rand(), s = Math.floor(rand() * 4), k = Math.floor(rand() * 9) - 4; const a = 6, b = 10.2; const r = lerp(a, b, t), y = 1.4 + Math.sin(t * Math.PI) * 1.6;
    const p = [[k * 1.3, y, -r], [k * 1.3, y, r], [-r, y, k * 1.3], [r, y, k * 1.3]][s]; return [p[0], p[1], p[2], PAL.cyan, .7];
  }),
  net: (() => {
    const L = [[-14, 4], [-5, 7], [4, 7], [13, 3]].map(([x, n]) => Array.from({ length: n }, (_, j) => [x, (j - (n - 1) / 2) * 3.4, jit(5)]));
    const edges = []; for (let l = 0; l < 3; l++) for (const a of L[l]) for (const b of L[l + 1]) edges.push([a, b]);
    const all = L.flat();
    return makeShape((i, u) => {
      if (u < .34) { const n = all[Math.floor(rand() * all.length)], th = rand() * 6.28, ph = Math.acos(2 * rand() - 1), r = .9 * Math.cbrt(rand());
        return [n[0] + r * Math.sin(ph) * Math.cos(th), n[1] + r * Math.cos(ph), n[2] + r * Math.sin(ph) * Math.sin(th), PAL.copper.clone().lerp(PAL.ink, rand() * .5), 1.2]; }
      const [a, b] = edges[Math.floor(rand() * edges.length)], t = rand();
      return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), PAL.lilac.clone().lerp(PAL.cyan, t), .6];
    });
  })(),
  wave: (() => {
    const lanes = 8, bits = Array.from({ length: lanes }, (_, l) => Array.from({ length: 16 }, (_, k) => l === 0 ? k % 2 : rand() < .5 ? 1 : 0));
    return makeShape((i, u) => {
      const l = Math.floor(rand() * lanes), z = (l - (lanes - 1) / 2) * 3, x = jit(32), k = clamp(Math.floor((x + 16) / 2), 0, 15);
      const hi = 2.4, edge = ((x + 16) % 2) < .18 && k > 0 && bits[l][k] !== bits[l][k - 1];
      const y = edge ? rand() * hi : bits[l][k] * hi;
      const c = l === 0 ? PAL.copper : PAL.cyan.clone().lerp(PAL.ink, bits[l][k] * .35);
      return [x, y - 3, z, c, l === 0 ? 1.1 : .9];
    });
  })(),
  lattice: makeShape((i, u) => {
    const n = 6, s = 18 / (n - 1), g = () => Math.floor(rand() * n) * s - 9;
    if (u < .3) return [g(), g(), g(), PAL.copper.clone().lerp(PAL.ink, rand() * .5), 1.3];
    const ax = Math.floor(rand() * 3), p = [g(), g(), g()]; p[ax] = jit(18);
    return [p[0], p[1], p[2], PAL.copper.clone().lerp(PAL.lilac, .55), .6];
  }),
  globe: makeShape((i, u) => {
    const R = 12;
    if (u < .45) { const lat = (Math.floor(rand() * 11) - 5) * Math.PI / 12, lon = rand() * 6.28;
      return [R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon), PAL.rose.clone().lerp(PAL.lilac, rand() * .6), .8]; }
    if (u < .8) { const lon = Math.floor(rand() * 12) * Math.PI / 6, lat = (rand() - .5) * Math.PI;
      return [R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon), PAL.lilac, .7]; }
    const th = rand() * 6.28, r = R * 1.35 + jit(1.4);
    return [r * Math.cos(th), Math.sin(th * 3) * 1.2 + 2, r * Math.sin(th), PAL.mint.clone().lerp(PAL.rose, rand()), 1];
  }),
  beacon: makeShape((i, u) => {
    if (u < .14) return [jit(.5), -10 + rand() * 16, jit(.5), PAL.ink, .9];
    if (u < .24) { const th = rand() * 6.28, ph = Math.acos(2 * rand() - 1), r = 1.4; return [r * Math.sin(ph) * Math.cos(th), 7 + r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th), PAL.mint, 1.6]; }
    if (u < .74) { const ring = 1 + Math.floor(rand() * 3), th = rand() * 6.28, r = ring * 4.2; return [r * Math.cos(th), 7 - ring * .4, r * Math.sin(th), PAL.mint.clone().lerp(PAL.cyan, ring / 3), 1]; }
    const th = Math.floor(rand() * 16) / 16 * 6.28, r = 2 + rand() * 13; return [r * Math.cos(th), 7 - r * .08, r * Math.sin(th), PAL.mint.clone().lerp(PAL.dim, r / 15), .6];
  }),
};

const morph = { from: null, to: 'chip', start: 0, dur: 1.5, delay: new Float32Array(N) };
for (let i = 0; i < N; i++) morph.delay[i] = rand() * .55;

function buildScene() {
  renderer.setClearColor(0x05070d, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x05070d, 120, 420);
  camera = new THREE.PerspectiveCamera(36, 1, .5, 900);

  const pix = Math.min(devicePixelRatio || 1, isMobile() ? 1.5 : 1.75);
  renderer.setPixelRatio(pix);

  // Substrate
  const sub = new THREE.Mesh(new THREE.PlaneGeometry(DIE * 2, DIE * 2), new THREE.MeshBasicMaterial({ color: 0x0a0f1c }));
  sub.rotation.x = -Math.PI / 2; sub.position.y = -.2; scene.add(sub);
  const halo = new THREE.Mesh(new THREE.RingGeometry(DIE * 1.42, DIE * 2.6, 64), new THREE.MeshBasicMaterial({ color: 0x070a13, transparent: true, opacity: .6 }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -.4; scene.add(halo);

  // Silkscreen
  silk = new THREE.Mesh(new THREE.PlaneGeometry(DIE * 2, DIE * 2), new THREE.MeshBasicMaterial({ map: drawSilk(), transparent: true, depthWrite: false }));
  silk.rotation.x = -Math.PI / 2; silk.position.y = .02; scene.add(silk);

  // Dot grid
  const step = 2, n = DIE * 2 / step + 1, gp = [], ar = [], az = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = -DIE + i * step, z = -DIE + j * step; gp.push(x, 0, z); ar.push(rand());
    let zone = 0; for (const b of Object.values(BLOCKS)) if (Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2) zone = b === BLOCKS.core ? 1 : .55;
    if (Math.abs(x) > DIE - 4 || Math.abs(z) > DIE - 4) zone = .4;
    az.push(zone);
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  gg.setAttribute('aR', new THREE.Float32BufferAttribute(ar, 1));
  gg.setAttribute('aZ', new THREE.Float32BufferAttribute(az, 1));
  gridMat = new THREE.ShaderMaterial({
    vertexShader: vertGrid, fragmentShader: fragGrid, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPix: { value: pix * 2.4 }, uRip: { value: 0 }, uMouse: { value: new THREE.Vector3(0, 0, 0) }, uFocus: { value: new THREE.Vector3(0, 0, 0) }, uFocusA: { value: 0 }, uCol: { value: new THREE.Color('#9fb1d6') }, uHot: { value: new THREE.Color('#73d9ff') } },
  });
  grid = new THREE.Points(gg, gridMat); scene.add(grid);

  // Traces
  traceGroup = new THREE.Group(); scene.add(traceGroup);
  const counters = {};
  for (const nd of nodes.values()) {
    const k = counters[nd.group] = (counters[nd.group] ?? -1) + 1;
    const pts = routeFor(nd.id, k);
    const lens = [0]; for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const mat = new THREE.LineBasicMaterial({ color: nd.color.clone().lerp(new THREE.Color('#ffa565'), .45), transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    traceGroup.add(line);
    traces.set(nd.id, { pts, lens, total: lens[lens.length - 1], mat, line, glow: 0, phase: rand() });
    nd.trace = traces.get(nd.id);
  }

  // Markers (one per node) and packets (moving along traces)
  const ids = [...nodes.keys()];
  markerGeo = new THREE.BufferGeometry();
  const mp = new Float32Array(ids.length * 3), mc = new Float32Array(ids.length * 3), ms = new Float32Array(ids.length);
  ids.forEach((id, i) => { const p = nodes.get(id).pos; mp.set([p.x, 1.2, p.z], i * 3); nodes.get(id).color.toArray(mc, i * 3); ms[i] = 2.2; nodes.get(id).mi = i; });
  markerGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  markerGeo.setAttribute('color', new THREE.BufferAttribute(mc, 3));
  markerGeo.setAttribute('aS', new THREE.BufferAttribute(ms, 1));
  markers = new THREE.Points(markerGeo, spriteMaterial(pix * 4.2)); scene.add(markers);
  // Vias under markers
  const vp = []; for (const nd of nodes.values()) vp.push(nd.pos.x, 0, nd.pos.z, nd.pos.x, 1.2, nd.pos.z);
  const vias = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vp, 3)), new THREE.LineBasicMaterial({ color: 0x9fb1d6, transparent: true, opacity: .5 }));
  scene.add(vias);

  const PK = ids.length * 2;
  packetGeo = new THREE.BufferGeometry();
  packetGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PK * 3), 3));
  packetGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PK * 3), 3));
  packetGeo.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(PK), 1));
  packets = new THREE.Points(packetGeo, spriteMaterial(pix * 3.2)); packets.frustumCulled = false; scene.add(packets);

  // Floating core
  coreGeo = new THREE.BufferGeometry();
  const s0 = SHAPES.chip;
  const scatter = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) scatter[i] = (rand() - .5) * 140;
  coreGeo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(scatter), 3));
  coreGeo.setAttribute('color', new THREE.BufferAttribute(Float32Array.from(s0.col), 3));
  coreGeo.setAttribute('aS', new THREE.BufferAttribute(Float32Array.from(s0.size), 1));
  coreMat = spriteMaterial(pix * 2.6);
  core = new THREE.Points(coreGeo, coreMat); core.frustumCulled = false; scene.add(core);
  morph.from = { pos: scatter, col: Float32Array.from(s0.col), size: Float32Array.from(s0.size) };
}

function setShape(name, now) {
  if (morph.to === name) return;
  const a = coreGeo.attributes;
  morph.from = { pos: Float32Array.from(a.position.array), col: Float32Array.from(a.color.array), size: Float32Array.from(a.aS.array) };
  morph.to = name; morph.start = now; state.shape = name;
}
function updateMorph(now) {
  const T = SHAPES[morph.to], a = coreGeo.attributes, P = a.position.array, Cc = a.color.array, Sz = a.aS.array, F = morph.from;
  const t0 = (now - morph.start) / (reduced.matches ? .001 : 1);
  if (t0 > morph.dur + .6 && morph.done === morph.to) return;
  let all = true;
  for (let i = 0; i < N; i++) {
    let k = clamp((t0 - morph.delay[i]) / morph.dur); if (k < 1) all = false;
    const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, lift = Math.sin(Math.PI * k) * 4;
    const j = i * 3;
    P[j] = lerp(F.pos[j], T.pos[j], e) + lift * Math.sin(i * 1.7);
    P[j + 1] = lerp(F.pos[j + 1], T.pos[j + 1], e) + lift * Math.cos(i * .9);
    P[j + 2] = lerp(F.pos[j + 2], T.pos[j + 2], e) + lift * Math.sin(i * 2.3);
    Cc[j] = lerp(F.col[j], T.col[j], e); Cc[j + 1] = lerp(F.col[j + 1], T.col[j + 1], e); Cc[j + 2] = lerp(F.col[j + 2], T.col[j + 2], e);
    Sz[i] = lerp(F.size[i], T.size[i], e);
  }
  a.position.needsUpdate = true; a.color.needsUpdate = true; a.aS.needsUpdate = true;
  if (all) morph.done = morph.to;
}

// ---------- camera stations ----------
function blockFocus(g) { const b = BLOCKS[g === 'io' ? 'core' : g]; return new THREE.Vector3(b.x, 16, b.z); }
// The core floats above and behind the block so it never covers the markers.
function coreSpot(F) { return F.clone().add(new THREE.Vector3(isMobile() ? 0 : 10, 4, -20)); }
function station(i) {
  const sec = SECTIONS[i], mob = isMobile();
  if (sec.id === 'io') return { pos: new THREE.Vector3(0, mob ? 300 : 210, mob ? 250 : 175), look: new THREE.Vector3(mob ? 0 : -24, 0, 18), focus: new THREE.Vector3(0, 22, 0), scale: 1.35 };
  const F = sec.group ? blockFocus(sec.group) : new THREE.Vector3(0, 16, 0);
  if (mob) return { pos: F.clone().add(new THREE.Vector3(0, 58, 104)), look: F.clone().add(new THREE.Vector3(0, -6, -8)), focus: sec.group ? coreSpot(F) : F, scale: sec.group ? .6 : 1.1 };
  const side = 1, wide = sec.id === 'projects' || sec.id === 'life' || sec.id === 'work';
  return { pos: F.clone().add(new THREE.Vector3(-side * 18, wide ? 50 : 40, wide ? 92 : 78)), look: F.clone().add(new THREE.Vector3(-side * (wide ? 30 : 24), -2, wide ? 12 : 4)), focus: sec.group ? coreSpot(F) : F, scale: sec.group ? 1 : 1.3 };
}
function panelStation(id) {
  const nd = nodes.get(id); if (!nd) return null;
  const F = nd.pos.clone(), mob = isMobile();
  const look = F.clone().add(new THREE.Vector3(mob ? 0 : 15, 0, mob ? -8 : 2));
  return { pos: look.clone().add(new THREE.Vector3(-4, mob ? 52 : 46, mob ? 70 : 66)), look, focus: F.clone().add(new THREE.Vector3(0, 10, -10)), scale: .45 };
}

// ---------- scroll tour ----------
let secEls = [], secTops = [];
function measure() { secEls = $$('#tour .sec'); secTops = secEls.map(el => el.offsetTop); }
function scrollS() {
  const vh = innerHeight, y = scrollY + vh * .5;
  let s = 0;
  for (let j = 1; j < secTops.length; j++) s += smooth(clamp((y - secTops[j] + vh * .45) / (vh * .9)));
  return s;
}
const navLinks = $$('.nav a'), railLis = () => $$('.rail li');
function setSection(i) {
  if (i === state.section && state.secInit) return;
  state.section = i; state.secInit = true;
  const sec = SECTIONS[i];
  navLinks.forEach(a => a.classList.toggle('on', a.dataset.go === sec.id));
  railLis().forEach((li, k) => li.classList.toggle('on', k === i));
  $('#layer').textContent = sec.layer;
  if (gl && !state.panel) setShape(sec.shape, clock());
  document.documentElement.style.setProperty('--accent', sec.group ? GROUPS[sec.group].hue : '#73d9ff');
  document.body.classList.toggle('at-top', i === 0);
}

// Lede word reveal, scrubbed by scroll.
function updateWords() {
  for (const p of $$('.lede.words')) {
    const r = p.getBoundingClientRect(), vh = innerHeight;
    const f = clamp((vh * .82 - r.top) / (r.height + vh * .3));
    const ws = p.querySelectorAll('.w'), on = Math.round(f * ws.length);
    ws.forEach((w, k) => w.classList.toggle('on', k < on));
  }
}

// Scramble mono captions when they first show.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·+—<>#';
function scramble(el) {
  if (el.dataset.done) return; el.dataset.done = 1;
  const final = el.textContent; if (reduced.matches) return;
  const start = performance.now(), dur = 900;
  (function step(now) {
    const k = clamp((now - start) / dur), n = Math.floor(final.length * k);
    el.textContent = final.slice(0, n) + [...final.slice(n)].map(ch => ch === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join('');
    if (k < 1) requestAnimationFrame(step); else el.textContent = final;
  })(start);
}
const seenObs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('seen'); e.target.querySelectorAll('.tag, .scr').forEach(scramble); }
}), { threshold: .18 });

// ---------- highlight (list ↔ die) ----------
function lightDom(id, on) { $$(`[data-id="${CSS.escape(id)}"]`).forEach(el => el.classList.toggle('lit', on)); }
function setLit(id) {
  if (state.lit === id) return;
  if (state.lit) lightDom(state.lit, false);
  state.lit = id;
  if (id) lightDom(id, true);
  if (gl) {
    const nd = id && nodes.get(id);
    if (nd) { gridMat.uniforms.uFocus.value.copy(nd.pos); gridMat.uniforms.uHot.value.copy(nd.color); }
  }
}

// ---------- tooltip + pointer ----------
const tip = $('#tip');
function showTip(id, x, y) {
  if (!id) { tip.classList.remove('show'); return; }
  const it = byId.get(id), g = GROUPS[it.group];
  tip.innerHTML = `${esc(it.short || it.title)}<small>${esc(g.label)}${it.date ? ' · ' + esc(it.date) : ''}</small>`;
  tip.style.transform = `translate(${Math.min(x + 16, innerWidth - tip.offsetWidth - 12)}px, ${y + 16}px)`;
  tip.classList.add('show');
}
const v3 = new THREE.Vector3();
function nodeAt(x, y) {
  if (!gl) return null;
  let best = null, bd = isMobile() ? 26 : 22;
  for (const nd of nodes.values()) {
    v3.set(nd.pos.x, 1.2, nd.pos.z).project(camera);
    if (v3.z > 1) continue;
    const sx = (v3.x + 1) / 2 * innerWidth, sy = (1 - v3.y) / 2 * innerHeight, d = Math.hypot(sx - x, sy - y);
    if (d < bd) { bd = d; best = nd.id; }
  }
  return best;
}
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function overUI(e) { return e.target !== canvas; }
addEventListener('pointermove', e => {
  state.mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  state.mouseIn = 1;
  if (state.drag) {
    const dx = e.clientX - state.drag.x, dy = e.clientY - state.drag.y;
    state.yaw = clamp(state.drag.yaw - dx * .005, -1.2, 1.2); state.pitch = clamp(state.drag.pitch + dy * .003, -.35, .5);
    if (Math.abs(dx) + Math.abs(dy) > 4) state.drag.moved = true;
    return;
  }
  // Hover nodes only when the pointer is over the scene, not over text.
  const hit = !overUI(e) && e.pointerType !== 'touch' ? nodeAt(e.clientX, e.clientY) : null;
  if (hit !== state.hover) { state.hover = hit; canvas.classList.toggle('over-node', !!hit); setLit(hit); }
  showTip(hit, e.clientX, e.clientY);
}, { passive: true });
document.addEventListener('pointerleave', () => { state.mouseIn = 0; });
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') { state.tap = { x: e.clientX, y: e.clientY, t: performance.now() }; return; }
  state.drag = { x: e.clientX, y: e.clientY, yaw: state.yaw, pitch: state.pitch, moved: false };
  canvas.classList.add('dragging'); canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointerup', e => {
  if (e.pointerType === 'touch') {
    const tp = state.tap; state.tap = null;
    if (tp && Math.hypot(e.clientX - tp.x, e.clientY - tp.y) < 10 && performance.now() - tp.t < 400) { const id = nodeAt(e.clientX, e.clientY); if (id) activate(id); }
    return;
  }
  const d = state.drag; state.drag = null; canvas.classList.remove('dragging');
  if (d && !d.moved) { const id = nodeAt(e.clientX, e.clientY); if (id) activate(id); else if (state.panel) closePanel(); }
});
// Wheel on the canvas still scrolls the page (canvas does not block it).

// DOM elements with data-id light their node and open the panel.
document.addEventListener('pointerover', e => { const el = e.target.closest('[data-id]'); if (el && !el.closest('#panel')) setLit(el.dataset.id); });
document.addEventListener('pointerout', e => { const el = e.target.closest('[data-id]'); if (el && !el.contains(e.relatedTarget) && state.lit === el.dataset.id && !state.hover) setLit(state.panel); });
document.addEventListener('focusin', e => { const el = e.target.closest('[data-id]'); if (el) setLit(el.dataset.id); });
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { e.preventDefault(); goSection(go.dataset.go); return; }
  const lb = e.target.closest('[data-lb]');
  if (lb) { openLightbox(lb.dataset.lb, +lb.dataset.lbI); return; }
  const el = e.target.closest('[data-id]');
  if (!el || e.metaKey || e.ctrlKey) return;
  if (el.tagName === 'A' && el.dataset.id.startsWith('io/')) return; // real links
  e.preventDefault(); openPanel(el.dataset.id);
});

function activate(id) {
  const it = byId.get(id); if (!it) return;
  if (it.group === 'io') { goSection('io'); setLit(id); return; }
  openPanel(id);
}
function goSection(id, behavior) {
  const el = document.getElementById(id); if (!el) return;
  if (state.panel) closePanel(true);
  window.scrollTo({ top: id === 'top' ? 0 : el.offsetTop - 20, behavior: behavior || (reduced.matches ? 'auto' : 'smooth') });
  history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id);
}

// ---------- detail panel ----------
const panel = $('#panel'), panelBody = $('#panel-body');
function panelHTML(it) {
  const g = GROUPS[it.group];
  const kick = it.org ? `${it.org} · ${it.role}` : (it.kicker || g.label);
  let h = `<p class="kick mono">${esc(kick)}</p><h2 id="panel-title">${esc(it.title)}</h2>`;
  if (it.date) h += `<p class="sub mono">${esc(it.date)}</p>`;
  if (it.stat) h += `<div class="statline"><b>${esc(it.stat.value)}</b><span>${esc(it.stat.label)}</span></div>`;
  const chips = it.chips || (it.group !== 'about' ? it.tags : null);
  if (chips?.length) h += `<ul class="chips">${chips.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  if (it.group === 'about' && it.tags) h += `<ul class="chips">${it.tags.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  h += (it.body || []).map(p => `<p>${esc(p)}</p>`).join('');
  if (it.list) h += `<ul class="plain">${it.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  if (it.pairs) h += `<dl class="pairs">${it.pairs.map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  if (it.media?.length) {
    h += `<div class="gallery">${it.media.map((m, i) => {
      const wide = it.media.length === 1 || (i === 0 && it.media.length % 2 === 1);
      return `<button type="button" class="${wide ? 'wide' : ''}" data-lb="${esc(it.id)}" data-lb-i="${i}" aria-label="${esc(m.alt)}"><img src="${esc(m.poster || m.src)}" alt="" loading="lazy" decoding="async">${m.type === 'video' ? '<span class="play">▶ Play</span>' : ''}</button>`;
    }).join('')}</div>`;
  }
  const links = [...(it.links || [])];
  if (links.length) h += `<div class="links">${links.map(l => `<a class="frame-btn mono" href="${esc(l.href)}" ${/^https?:/.test(l.href) ? 'target="_blank" rel="noopener noreferrer"' : ''}>${esc(l.label)} ↗</a>`).join('')}</div>`;
  if (it.related && byId.get(it.related)) h += `<p class="related mono"><a href="#${esc(it.related)}" data-id="${esc(it.related)}">Related · ${esc(byId.get(it.related).short || byId.get(it.related).title)} →</a></p>`;
  return h;
}
function groupSiblings(it) { return ITEMS.filter(x => x.group === it.group && x.group !== 'io'); }
function openPanel(id, opts = {}) {
  const it = byId.get(id); if (!it || it.group === 'io') return;
  state.panel = id; setLit(id);
  panel.style.setProperty('--accent', GROUPS[it.group].hue);
  $('#panel-crumb').textContent = `${GROUPS[it.group].index} · ${GROUPS[it.group].label}`;
  panelBody.innerHTML = panelHTML(it); panelBody.scrollTop = 0;
  const sib = groupSiblings(it), i = sib.indexOf(it);
  $('#panel-count').textContent = `${pad3(i + 1)} / ${pad3(sib.length)}`;
  panel.hidden = false; requestAnimationFrame(() => panel.classList.add('open'));
  document.body.classList.add('panel-open');
  if (gl) setShape(SECTIONS.find(s => s.group === it.group)?.shape || 'chip', clock());
  if (!opts.noHash) history.replaceState(null, '', '#' + id);
  if (opts.scroll !== false) {
    const sec = document.getElementById(it.group === 'about' ? 'about' : it.group);
    if (sec && Math.abs(scrollS() - SECTIONS.findIndex(s => s.id === sec.id)) > .6) window.scrollTo({ top: sec.offsetTop - 20, behavior: 'auto' });
  }
  if (!opts.keepFocus) setTimeout(() => $('#panel-close').focus({ preventScroll: true }), 50);
}
function closePanel(quiet) {
  if (!state.panel) return;
  const was = state.panel; state.panel = null;
  panel.classList.remove('open'); document.body.classList.remove('panel-open');
  setTimeout(() => { if (!state.panel) panel.hidden = true; }, 600);
  setLit(null);
  if (gl) setShape(SECTIONS[state.section].shape, clock());
  if (!quiet) { history.replaceState(null, '', '#' + (SECTIONS[state.section].id === 'top' ? '' : SECTIONS[state.section].id)); $(`[data-id="${CSS.escape(was)}"]`)?.focus({ preventScroll: true }); }
}
$('#panel-close').addEventListener('click', () => closePanel());
function stepPanel(d) { const it = byId.get(state.panel), sib = groupSiblings(it), i = sib.indexOf(it); openPanel(sib[(i + d + sib.length) % sib.length].id, { keepFocus: true }); }
$('#panel-prev').addEventListener('click', () => stepPanel(-1));
$('#panel-next').addEventListener('click', () => stepPanel(1));

// ---------- index overlay ----------
const ix = $('#index'), ixq = $('#index-q'), ixList = $('#index-list');
function renderIndex(q = '') {
  const t = q.trim().toLowerCase();
  const match = it => !t || [it.title, it.short, it.org, it.role, it.date, ...(it.tags || []), ...(it.chips || []), ...(it.body || []), it.label].join(' ').toLowerCase().includes(t);
  let html = '', count = 0;
  for (const [g, meta] of Object.entries(GROUPS)) {
    const rows = inGroup(g).filter(match); if (!rows.length) continue;
    html += `<div class="ix-group"><h3 class="mono">${meta.index} · ${meta.label}</h3>` + rows.map((it, i) => {
      count++;
      const m = it.org ? `${it.org} · ${it.date}` : it.date || it.label || '';
      const attrs = it.group === 'io' ? `href="${esc(it.href)}" ${/^https?:/.test(it.href) ? 'target="_blank" rel="noopener noreferrer"' : ''}` : 'type="button"';
      const tag = it.group === 'io' ? 'a' : 'button';
      return `<${tag} class="ix-row" ${attrs} data-ix="${esc(it.id)}" data-id="${esc(it.id)}"><span class="idx mono">${pad3(i + 1)}</span><span class="t">${esc(it.group === 'io' ? it.title : it.title)}</span><span class="m mono">${esc(m)}</span></${tag}>`;
    }).join('') + '</div>';
  }
  ixList.innerHTML = html || `<p class="ix-empty mono">Nothing matches “${esc(q)}”.</p>`;
  return count;
}
function openIndex() { renderIndex(ixq.value); ix.hidden = false; requestAnimationFrame(() => ix.classList.add('open')); setTimeout(() => ixq.focus(), 30); }
function closeIndex() { ix.classList.remove('open'); setTimeout(() => { ix.hidden = true; }, 350); $('#index-open').focus({ preventScroll: true }); }
$('#index-open').addEventListener('click', openIndex);
$('#index-close').addEventListener('click', closeIndex);
ixq.addEventListener('input', () => renderIndex(ixq.value));
ixList.addEventListener('click', e => {
  const r = e.target.closest('[data-ix]'); if (!r) return;
  const it = byId.get(r.dataset.ix);
  if (it.group === 'io') return;
  e.preventDefault(); e.stopPropagation();
  ix.classList.remove('open'); ix.hidden = true;
  openPanel(it.id);
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
  if (e.key === 'Escape') {
    if (!lb.hidden) return closeLb();
    if (!ix.hidden) return closeIndex();
    if (state.panel) return closePanel();
  }
  if (!lb.hidden && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { lbI = (lbI + (e.key === 'ArrowRight' ? 1 : -1) + lbList.length) % lbList.length; showLb(); return; }
  if (state.panel && lb.hidden && !e.target.closest('input') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { stepPanel(e.key === 'ArrowRight' ? 1 : -1); return; }
  if (e.key === '/' && ix.hidden && !e.target.closest('input,textarea')) { e.preventDefault(); openIndex(); }
});

// ---------- routing ----------
function route(hash, first) {
  let h = decodeURIComponent((hash || '').replace(/^#/, ''));
  h = ALIASES[h] || h;
  if (!h) return;
  if (byId.has(h) && byId.get(h).group !== 'io') { openPanel(h, { noHash: true }); return; }
  const sec = SECTIONS.find(s => s.id === h);
  if (sec) goSection(sec.id, first ? 'auto' : undefined);
}
addEventListener('hashchange', () => route(location.hash));

// ---------- music influence ----------
const music = $('.music');
new MutationObserver(() => { state.musicOn = music.classList.contains('is-playing'); }).observe(music, { attributes: true, attributeFilter: ['class'] });

// ---------- frame loop ----------
const look = new THREE.Vector3(), pos = new THREE.Vector3(), tmp = new THREE.Vector3(), coreTarget = new THREE.Vector3();
let last = performance.now(), lastScroll = scrollY, scrollVel = 0;
function resize() {
  const w = innerWidth, h = innerHeight;
  if (gl) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 600 ? 50 : 36; camera.updateProjectionMatrix(); }
  measure();
}
function frame(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now; state.t += dt;
  const t = state.t, rm = reduced.matches;
  scrollVel = lerp(scrollVel, (scrollY - lastScroll) / Math.max(dt, .001), .1); lastScroll = scrollY;
  state.s = scrollS();
  setSection(Math.round(state.s));
  updateWords();
  if (gl) {
    // Camera target: scroll station, or the open node.
    let st;
    const p = state.panel && panelStation(state.panel);
    if (p) st = p;
    else {
      const i = Math.floor(state.s), f = state.s - i, a = station(i), b = station(Math.min(i + 1, SECTIONS.length - 1));
      st = { pos: a.pos.clone().lerp(b.pos, f), look: a.look.clone().lerp(b.look, f), focus: a.focus.clone().lerp(b.focus, f), scale: lerp(a.scale, b.scale, f) };
      st.pos.y += Math.sin(Math.PI * f) * 34; // rise while flying between blocks
    }
    // Intro: start high, settle down.
    const intro = smooth(clamp(state.intro));
    st.pos.lerp(tmp.set(st.pos.x * .3, 330, 330), 1 - intro);
    // Drag orbit around the look point; it eases back while not dragging.
    if (!state.drag) { state.yaw *= Math.pow(.25, dt); state.pitch *= Math.pow(.25, dt); }
    tmp.copy(st.pos).sub(st.look).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
    tmp.y += state.pitch * tmp.length() * .6;
    // Mouse parallax
    const par = rm ? 0 : 1;
    tmp.x += state.mouse.x * 4 * par * state.mouseIn; tmp.y += state.mouse.y * 3 * par * state.mouseIn;
    const k = rm ? 1 : 1 - Math.pow(.02, dt);
    state.camPos.lerp(tmp.add(st.look), k); state.camLook.lerp(st.look, k);
    camera.position.copy(state.camPos); camera.lookAt(state.camLook);

    // Core follows its focus, bobbing and turning.
    coreTarget.copy(st.focus);
    core.position.lerp(coreTarget, rm ? 1 : 1 - Math.pow(.08, dt));
    state.coreScale = lerp(state.coreScale, st.scale, rm ? 1 : 1 - Math.pow(.05, dt));
    const beat = state.musicOn ? Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.65)), 8) * .06 : 0;
    core.scale.setScalar(state.coreScale * (1 + beat));
    core.rotation.y = rm ? .5 : t * .12 + state.mouse.x * .25;
    core.rotation.x = rm ? 0 : Math.sin(t * .4) * .06 - state.mouse.y * .08;
    core.position.y += rm ? 0 : Math.sin(t * .9) * .6;
    // Fast scrolling stirs the core a little.
    const stir = clamp(Math.abs(scrollVel) / 3000, 0, .6);
    core.rotation.z = stir * .3 * Math.sign(scrollVel);
    updateMorph(clock());

    // Grid uniforms
    ray.setFromCamera(state.mouse, camera); ray.ray.intersectPlane(plane, state.mouseWorld);
    const mu = gridMat.uniforms;
    mu.uTime.value = rm ? 0 : t;
    mu.uMouse.value.set(state.mouseWorld?.x || 0, state.mouseIn && !state.drag ? 1 : 0, state.mouseWorld?.z || 0);
    mu.uFocusA.value = lerp(mu.uFocusA.value, state.lit ? 1 : 0, 1 - Math.pow(.01, dt));
    mu.uRip.value = rm ? 0 : (state.musicOn ? .9 : .35) * (1 - Math.exp(-state.intro * 2));

    // Traces, markers, packets
    const ma = markerGeo.attributes.aS.array, pa = packetGeo.attributes;
    const P = pa.position.array, PC = pa.color.array, PS = pa.aS.array;
    let pi = 0;
    for (const nd of nodes.values()) {
      const tr = nd.trace, on = nd.id === state.lit || nd.id === state.panel;
      tr.glow = lerp(tr.glow, on ? 1 : 0, 1 - Math.pow(.005, dt));
      tr.mat.opacity = .22 + tr.glow * .75 + (state.musicOn ? .12 : 0);
      ma[nd.mi] = 2.2 + tr.glow * 2.6 + (rm ? 0 : Math.sin(t * 2 + nd.mi) * .25) + (nd.group === SECTIONS[state.section].group ? .8 : 0);
      for (let q = 0; q < 2; q++) {
        const speed = on ? .9 : (state.musicOn ? .45 : .18);
        const u = rm ? .5 : ((t * speed + tr.phase + q * .5) % 1);
        const d = u * tr.total; let s = 1; while (s < tr.lens.length - 1 && tr.lens[s] < d) s++;
        const a = tr.pts[s - 1], b = tr.pts[s], f = (d - tr.lens[s - 1]) / Math.max(.001, tr.lens[s] - tr.lens[s - 1]);
        P[pi * 3] = lerp(a.x, b.x, f); P[pi * 3 + 1] = .4; P[pi * 3 + 2] = lerp(a.z, b.z, f);
        const br = (.35 + tr.glow * .9) * Math.sin(Math.PI * u);
        PC[pi * 3] = nd.color.r * br; PC[pi * 3 + 1] = nd.color.g * br; PC[pi * 3 + 2] = nd.color.b * br;
        PS[pi] = 1.2 + tr.glow * 1.6; pi++;
      }
    }
    markerGeo.attributes.aS.needsUpdate = true; pa.position.needsUpdate = true; pa.color.needsUpdate = true; pa.aS.needsUpdate = true;

    renderer.render(scene, camera);
    state.intro = Math.min(1, state.intro + dt / (rm ? .01 : 2.6) * (document.body.classList.contains('is-loading') ? 0 : 1));
    const L = state.camLook;
    $('#coords').textContent = `X ${L.x >= 0 ? '+' : '−'}${Math.abs(L.x).toFixed(1).padStart(5, '0')} · Z ${L.z >= 0 ? '+' : '−'}${Math.abs(L.z).toFixed(1).padStart(5, '0')}`;
  }
  requestAnimationFrame(frame);
}

// ---------- boot ----------
async function boot() {
  const fonts = ['400 20px "Instrument Serif"', 'italic 400 20px "Instrument Serif"', '500 20px "IBM Plex Mono"', '400 20px "IBM Plex Mono"', '400 16px Inter'];
  let done = 0;
  await Promise.all(fonts.map(f => document.fonts.load(f).catch(() => {}).then(() => progress(12 + (++done / fonts.length) * 38))));
  if (gl) {
    try { buildScene(); } catch (e) { console.error(e); gl = false; document.body.classList.add('no-webgl'); }
  }
  progress(78);
  resize();
  $$('#tour .sec').forEach(s => seenObs.observe(s));
  // Warm up the first frame, then reveal.
  await new Promise(r => requestAnimationFrame(() => { if (gl) renderer.render(scene, camera); r(); }));
  progress(100);
  await new Promise(r => setTimeout(r, 650));
  document.body.classList.remove('is-loading');
  morph.start = clock() + .2; morph.dur = 2; setTimeout(() => { morph.dur = 1.5; }, 3000);
  if (location.hash) setTimeout(() => route(location.hash, true), rmDelay());
}
function rmDelay() { return reduced.matches ? 0 : 900; }
addEventListener('resize', resize);
new ResizeObserver(measure).observe(tour);
boot().then(() => requestAnimationFrame(frame));
