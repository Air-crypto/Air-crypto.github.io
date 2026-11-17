// World 1: the silicon die, sitting on a wafer of dies that runs to the horizon.
import * as THREE from './three.module.min.js';
import { clamp, lerp, makeRand, PAL, spriteMaterial, pointsGeo } from './gfx.js?v=9';

const DIE = 100;
const BLOCKS = {
  core: { x: 0, z: 0, w: 40, d: 40, label: 'CORE · AY-26' },
  about: { x: -58, z: 58, w: 50, d: 50, label: 'ABOUT' },
  work: { x: -58, z: -58, w: 50, d: 50, label: 'WORK' },
  projects: { x: 58, z: -58, w: 50, d: 50, label: 'PROJECTS' },
  life: { x: 58, z: 58, w: 50, d: 50, label: 'LIFE' },
};
const COLS = { about: 3, work: 3, projects: 4, life: 4 };
const SHAPE_OF = { about: 'net', work: 'wave', projects: 'lattice', life: 'globe', io: 'beacon' };

export function createDieWorld({ renderer, pix, GROUPS, inGroup, byId, reduced }) {
  const rand = makeRand(7);
  const scene = new THREE.Scene();
  const BG = new THREE.Color(0x05070d);
  scene.background = BG;

  // ---------- layout ----------
  const nodes = new Map();
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
    nodes.set(it.id, { id: it.id, group: 'io', pos: new THREE.Vector3((i - 1.5) * 15, 0, DIE - 5), cell: { w: 9, d: 5 }, color: new THREE.Color(GROUPS.io.hue) });
  });

  const regions = {};
  for (const g of ['about', 'work', 'projects', 'life']) {
    const b = BLOCKS[g], dir = new THREE.Vector3(b.x, 0, b.z).normalize();
    regions[g] = { center: new THREE.Vector3(b.x, 24, b.z - 12), stand: { eye: new THREE.Vector3(b.x, 3.4, b.z).addScaledVector(dir, -b.w * .75), dir } };
  }
  regions.io = { center: new THREE.Vector3(0, 14, 92), stand: { eye: new THREE.Vector3(0, 3.4, 56), dir: new THREE.Vector3(0, 0, 1) } };
  const regionAt = (x, z) => {
    for (const g of ['about', 'work', 'projects', 'life']) { const b = BLOCKS[g]; if (Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2) return g; }
    if (Math.abs(x) < 32 && z > 84 && z < 101) return 'io';
    return null;
  };

  // ---------- traces ----------
  function chamfer(pts, c = 1.6) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], p = pts[i], b = pts[i + 1];
      const da = a.clone().sub(p), db = b.clone().sub(p), la = da.length(), lb = db.length();
      if (la < .01 || lb < .01) continue;
      out.push(p.clone().add(da.multiplyScalar(Math.min(c, la / 2) / la)), p.clone().add(db.multiplyScalar(Math.min(c, lb / 2) / lb)));
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function routeFor(nd, k) {
    const p = nd.pos, y = .15;
    if (nd.group === 'io') {
      const sx = p.x * .35;
      return chamfer([new THREE.Vector3(sx, y, 20), new THREE.Vector3(sx, y, 60), new THREE.Vector3(p.x, y, 72), new THREE.Vector3(p.x, y, p.z - 2.5)], 3);
    }
    const sx = Math.sign(p.x), sz = Math.sign(p.z), startZ = sz * (3 + k * 1.45), laneX = sx * (23 + k * 1.15);
    return chamfer([new THREE.Vector3(sx * 20, y, startZ), new THREE.Vector3(laneX, y, startZ), new THREE.Vector3(laneX, y, p.z), new THREE.Vector3(p.x - sx * 2.5, y, p.z)]);
  }

  // ---------- silkscreen ----------
  function drawSilk() {
    const S = 2048, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), k = S / (DIE * 2), X = x => (x + DIE) * k;
    g.strokeStyle = 'rgba(200,214,240,.42)'; g.lineWidth = 2;
    g.strokeRect(X(-DIE + 1.2), X(-DIE + 1.2), (DIE * 2 - 2.4) * k, (DIE * 2 - 2.4) * k);
    g.lineWidth = 1; g.strokeStyle = 'rgba(200,214,240,.18)';
    g.strokeRect(X(-DIE + 3), X(-DIE + 3), (DIE * 2 - 6) * k, (DIE * 2 - 6) * k);
    g.strokeStyle = 'rgba(200,214,240,.3)';
    for (let v = -DIE + 5; v <= DIE - 5; v += 5) {
      const L = v % 25 === 0 ? 2.2 : 1;
      g.beginPath(); g.moveTo(X(v), X(-DIE + 1.2)); g.lineTo(X(v), X(-DIE + 1.2 + L)); g.stroke();
      g.beginPath(); g.moveTo(X(-DIE + 1.2), X(v)); g.lineTo(X(-DIE + 1.2 + L), X(v)); g.stroke();
    }
    for (const [fx, fz] of [[-92, -92], [92, -92], [-92, 92], [92, 92]]) {
      g.strokeStyle = 'rgba(200,214,240,.5)'; g.beginPath(); g.arc(X(fx), X(fz), 2.2 * k, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(X(fx - 3.4), X(fz)); g.lineTo(X(fx + 3.4), X(fz)); g.moveTo(X(fx), X(fz - 3.4)); g.lineTo(X(fx), X(fz + 3.4)); g.stroke();
    }
    for (const [key, b] of Object.entries(BLOCKS)) {
      const x0 = X(b.x - b.w / 2), z0 = X(b.z - b.d / 2), w = b.w * k, d = b.d * k;
      g.strokeStyle = 'rgba(200,214,240,.34)'; g.setLineDash([]); g.lineWidth = 1.5; g.strokeRect(x0, z0, w, d);
      g.lineWidth = 3; g.strokeStyle = 'rgba(230,238,255,.75)';
      const t = 3 * k;
      for (const [cx, cz, sx, sz] of [[x0, z0, 1, 1], [x0 + w, z0, -1, 1], [x0, z0 + d, 1, -1], [x0 + w, z0 + d, -1, -1]]) {
        g.beginPath(); g.moveTo(cx + sx * t, cz); g.lineTo(cx, cz); g.lineTo(cx, cz + sz * t); g.stroke();
      }
      g.font = `500 ${key === 'core' ? 22 : 30}px "IBM Plex Mono"`; g.fillStyle = 'rgba(220,230,250,.8)';
      g.fillText(b.label + (key === 'core' ? '' : '  ·  ' + String(inGroup(key).length).padStart(2, '0')), x0 + 2.2 * k, z0 + 5.6 * k);
    }
    g.strokeStyle = 'rgba(200,214,240,.12)'; g.lineWidth = 1;
    for (let v = -18; v <= 18; v += 3) { g.beginPath(); g.moveTo(X(v), X(-18)); g.lineTo(X(v), X(18)); g.stroke(); g.beginPath(); g.moveTo(X(-18), X(v)); g.lineTo(X(18), X(v)); g.stroke(); }
    g.font = '500 15px "IBM Plex Mono"';
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
    }
    g.font = '500 20px "IBM Plex Mono"'; g.fillStyle = 'rgba(200,214,240,.42)';
    g.fillText('ARIHAN YADAV  ·  DIE REV 11.2026  ·  UW–MADISON CE/CS', X(-DIE + 6), X(DIE - 12));
    g.fillText('ML · SYSTEMS · HARDWARE', X(DIE - 52), X(-DIE + 8));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  // ---------- sky and wafer ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; void main(){ float h=vP.y;
      vec3 c=mix(vec3(.075,.105,.19),vec3(.02,.027,.05),smoothstep(.0,.32,h));
      c+=vec3(.45,.6,1.0)*.05*exp(-abs(h)*60.0); if(h<0.0) c=vec3(.02,.027,.05); gl_FragColor=vec4(c,1.0); }`,
  }));
  sky.renderOrder = -2; scene.add(sky);

  const waferMat = new THREE.ShaderMaterial({
    uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `varying vec3 vW; uniform vec3 uCam; uniform float uTime;
      float box(vec2 q, vec2 c, vec2 h){ vec2 d=abs(q-c)-h; float e=abs(max(d.x,d.y)); float w=fwidth(e)*1.2; return 1.0-smoothstep(0.0,w+.25,e); }
      void main(){
        vec2 p=vW.xz; vec2 id=floor((p+106.0)/212.0); vec2 q=mod(p+106.0,212.0)-106.0;
        float inDie=step(max(abs(q.x),abs(q.y)),100.0);
        vec3 street=vec3(.018,.024,.045), die=vec3(.035,.05,.09);
        float h=fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453);
        vec3 col=mix(street,die*(.85+.3*h),inDie);
        float L=box(q,vec2(0.0),vec2(100.0))*.55+box(q,vec2(0.0),vec2(20.0))*.25;
        L+=(box(q,vec2(58.0,58.0),vec2(25.0))+box(q,vec2(-58.0,58.0),vec2(25.0))+box(q,vec2(58.0,-58.0),vec2(25.0))+box(q,vec2(-58.0,-58.0),vec2(25.0)))*.16;
        col+=vec3(.55,.66,.9)*L*.35;
        float blink=step(.985,fract(h*91.0+uTime*.05))*inDie*box(q,vec2(0.0),vec2(20.0));
        col+=vec3(1.0,.65,.4)*blink*.4;
        float d=length(p-uCam.xz), r=length(p);
        float a=(1.0-smoothstep(500.0,1700.0,d))*(1.0-smoothstep(1800.0,2000.0,r));
        gl_FragColor=vec4(mix(vec3(.02,.027,.05),col,a),1.0);
      }`,
  });
  waferMat.extensions = { derivatives: true };
  const wafer = new THREE.Mesh(new THREE.PlaneGeometry(4400, 4400), waferMat);
  wafer.rotation.x = -Math.PI / 2; wafer.position.y = -.6; scene.add(wafer);

  // ---------- die ----------
  const sub = new THREE.Mesh(new THREE.PlaneGeometry(DIE * 2 + 6, DIE * 2 + 6), new THREE.MeshBasicMaterial({ color: 0x0a0f1c }));
  sub.rotation.x = -Math.PI / 2; sub.position.y = -.2; scene.add(sub);
  const silk = new THREE.Mesh(new THREE.PlaneGeometry(DIE * 2, DIE * 2), new THREE.MeshBasicMaterial({ map: drawSilk(), transparent: true, depthWrite: false }));
  silk.rotation.x = -Math.PI / 2; silk.position.y = .02; scene.add(silk);

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
  const gridMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPix: { value: pix * 2.4 }, uRip: { value: 0 }, uMouse: { value: new THREE.Vector3() }, uFocus: { value: new THREE.Vector3() }, uFocusA: { value: 0 }, uRegion: { value: new THREE.Vector4(0, 0, 25, 0) }, uCol: { value: new THREE.Color('#9fb1d6') }, uHot: { value: new THREE.Color('#73d9ff') } },
    vertexShader: `attribute float aR; attribute float aZ;
      uniform float uTime,uPix,uRip,uFocusA; uniform vec3 uMouse,uFocus; uniform vec4 uRegion;
      varying float vB; varying float vF;
      void main(){ vec3 p=position;
        float dm=length(p.xz-uMouse.xz); float m=exp(-dm*dm/140.0)*uMouse.y;
        float df=length(p.xz-uFocus.xz); float f=exp(-df*df/70.0)*uFocusA;
        vec2 rd=abs(p.xz-uRegion.xy); float reg=(1.0-smoothstep(uRegion.z-2.0,uRegion.z+1.0,max(rd.x,rd.y)))*uRegion.w;
        float r=length(p.xz); float ring=exp(-pow(r-mod(uTime*30.0,300.0),2.0)/30.0)*uRip;
        p.y+=m*2.0+f*1.4+ring*.9+reg*.35;
        vB=.12+aR*.12+aZ*.26+m*.85+f*.7+ring*.55+reg*.45; vF=f+m*.6+reg*.5;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_PointSize=min(uPix*(1.0+m*1.2+f*.9+reg*.25)*(150.0/-mv.z),uPix*5.0); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uCol,uHot; varying float vB; varying float vF;
      void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); if(d>.5) discard;
        float a=smoothstep(.5,.05,d)*clamp(vB,0.0,1.4); gl_FragColor=vec4(mix(uCol,uHot,clamp(vF,0.0,1.0)),a); }`,
  });
  scene.add(new THREE.Points(gg, gridMat));

  // traces
  const counters = {};
  for (const nd of nodes.values()) {
    const k = counters[nd.group] = (counters[nd.group] ?? -1) + 1;
    const pts = routeFor(nd, k), lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const mat = new THREE.LineBasicMaterial({ color: nd.color.clone().lerp(PAL.copper, .45), transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending });
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    nd.trace = { pts, lens, total: lens[lens.length - 1], mat, glow: 0, phase: rand() };
  }

  // markers, vias, packets
  const ids = [...nodes.keys()];
  const markerGeo = pointsGeo(ids.length);
  ids.forEach((id, i) => { const nd = nodes.get(id); markerGeo.attributes.position.array.set([nd.pos.x, 1.2, nd.pos.z], i * 3); nd.color.toArray(markerGeo.attributes.color.array, i * 3); nd.mi = i; });
  scene.add(new THREE.Points(markerGeo, spriteMaterial(pix * 4.2)));
  const vp = []; for (const nd of nodes.values()) vp.push(nd.pos.x, 0, nd.pos.z, nd.pos.x, 1.2, nd.pos.z);
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vp, 3)), new THREE.LineBasicMaterial({ color: 0x9fb1d6, transparent: true, opacity: .5 })));
  const packetGeo = pointsGeo(ids.length * 2);
  const packets = new THREE.Points(packetGeo, spriteMaterial(pix * 3.2)); packets.frustumCulled = false; scene.add(packets);

  // ---------- floating core: particle shapes ----------
  const N = 4200;
  function makeShape(fn) {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = fn(i, rand()); pos.set([r[0], r[1], r[2]], i * 3);
      col[i * 3] = r[3].r; col[i * 3 + 1] = r[3].g; col[i * 3 + 2] = r[3].b; size[i] = r[4] ?? 1;
    }
    return { pos, col, size };
  }
  const jit = a => (rand() - .5) * a;
  const SHAPES = {
    chip: makeShape((i, u) => {
      if (u < .26) return [jit(22), jit(.3), jit(22), PAL.dim.clone().lerp(PAL.cyan, rand() * .5), .8];
      if (u < .5) { const a = rand() < .5, v = Math.round(jit(12) / 1.5) * 1.5, t = jit(12); return [a ? v : t, 1.4 + jit(.15), a ? t : v, PAL.copper.clone().lerp(PAL.ink, rand() * .4), 1]; }
      if (u < .82) { const side = Math.floor(rand() * 4), k = Math.floor(rand() * 11) - 5, t = rand(), o = 11 + t * 3.4, y = -t * 1.6, along = k * 1.9;
        const p = [[along, y, -o], [along, y, o], [-o, y, along], [o, y, along]][side]; return [...p, PAL.ink.clone().lerp(PAL.dim, .3), .9]; }
      const t = rand(), s = Math.floor(rand() * 4), k = Math.floor(rand() * 9) - 4, r = lerp(6, 10.2, t), y = 1.4 + Math.sin(t * Math.PI) * 1.6;
      const p = [[k * 1.3, y, -r], [k * 1.3, y, r], [-r, y, k * 1.3], [r, y, k * 1.3]][s]; return [...p, PAL.cyan, .7];
    }),
    net: (() => {
      const L = [[-14, 4], [-5, 7], [4, 7], [13, 3]].map(([x, c]) => Array.from({ length: c }, (_, j) => [x, (j - (c - 1) / 2) * 3.4, jit(5)]));
      const edges = []; for (let l = 0; l < 3; l++) for (const a of L[l]) for (const b of L[l + 1]) edges.push([a, b]);
      const all = L.flat();
      return makeShape((i, u) => {
        if (u < .34) { const q = all[Math.floor(rand() * all.length)], th = rand() * 6.28, ph = Math.acos(2 * rand() - 1), r = .9 * Math.cbrt(rand());
          return [q[0] + r * Math.sin(ph) * Math.cos(th), q[1] + r * Math.cos(ph), q[2] + r * Math.sin(ph) * Math.sin(th), PAL.copper.clone().lerp(PAL.ink, rand() * .5), 1.2]; }
        const [a, b] = edges[Math.floor(rand() * edges.length)], t = rand();
        return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), PAL.lilac.clone().lerp(PAL.cyan, t), .6];
      });
    })(),
    wave: (() => {
      const lanes = 8, bits = Array.from({ length: lanes }, (_, l) => Array.from({ length: 16 }, (_, k) => l === 0 ? k % 2 : rand() < .5 ? 1 : 0));
      return makeShape(() => {
        const l = Math.floor(rand() * lanes), z = (l - (lanes - 1) / 2) * 3, x = jit(32), k = clamp(Math.floor((x + 16) / 2), 0, 15);
        const edge = ((x + 16) % 2) < .18 && k > 0 && bits[l][k] !== bits[l][k - 1], y = edge ? rand() * 2.4 : bits[l][k] * 2.4;
        return [x, y - 3, z, l === 0 ? PAL.copper : PAL.cyan.clone().lerp(PAL.ink, bits[l][k] * .35), l === 0 ? 1.1 : .9];
      });
    })(),
    lattice: makeShape((i, u) => {
      const g = () => Math.floor(rand() * 6) * 3.6 - 9;
      if (u < .3) return [g(), g(), g(), PAL.copper.clone().lerp(PAL.ink, rand() * .5), 1.3];
      const ax = Math.floor(rand() * 3), p = [g(), g(), g()]; p[ax] = jit(18);
      return [...p, PAL.copper.clone().lerp(PAL.lilac, .55), .6];
    }),
    globe: makeShape((i, u) => {
      const R = 12;
      if (u < .45) { const lat = (Math.floor(rand() * 11) - 5) * Math.PI / 12, lon = rand() * 6.28; return [R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon), PAL.rose.clone().lerp(PAL.lilac, rand() * .6), .8]; }
      if (u < .8) { const lon = Math.floor(rand() * 12) * Math.PI / 6, lat = (rand() - .5) * Math.PI; return [R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon), PAL.lilac, .7]; }
      const th = rand() * 6.28, r = R * 1.35 + jit(1.4); return [r * Math.cos(th), Math.sin(th * 3) * 1.2 + 2, r * Math.sin(th), PAL.mint.clone().lerp(PAL.rose, rand()), 1];
    }),
    beacon: makeShape((i, u) => {
      if (u < .14) return [jit(.5), -10 + rand() * 16, jit(.5), PAL.ink, .9];
      if (u < .24) { const th = rand() * 6.28, ph = Math.acos(2 * rand() - 1); return [1.4 * Math.sin(ph) * Math.cos(th), 7 + 1.4 * Math.cos(ph), 1.4 * Math.sin(ph) * Math.sin(th), PAL.mint, 1.6]; }
      if (u < .74) { const ring = 1 + Math.floor(rand() * 3), th = rand() * 6.28, r = ring * 4.2; return [r * Math.cos(th), 7 - ring * .4, r * Math.sin(th), PAL.mint.clone().lerp(PAL.cyan, ring / 3), 1]; }
      const th = Math.floor(rand() * 16) / 16 * 6.28, r = 2 + rand() * 13; return [r * Math.cos(th), 7 - r * .08, r * Math.sin(th), PAL.mint.clone().lerp(PAL.dim, r / 15), .6];
    }),
  };
  const coreGeo = pointsGeo(N);
  const scatter = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) scatter[i] = (rand() - .5) * 140;
  coreGeo.attributes.position.array.set(scatter); coreGeo.attributes.color.array.set(SHAPES.chip.col); coreGeo.attributes.aS.array.set(SHAPES.chip.size);
  const core = new THREE.Points(coreGeo, spriteMaterial(pix * 2.6)); core.frustumCulled = false; scene.add(core);
  const morph = { from: { pos: scatter, col: Float32Array.from(SHAPES.chip.col), size: Float32Array.from(SHAPES.chip.size) }, to: 'chip', start: performance.now() / 1000 + .3, dur: 2, delay: new Float32Array(N) };
  for (let i = 0; i < N; i++) morph.delay[i] = rand() * .55;
  function setShape(name, now) {
    if (morph.to === name) return;
    const a = coreGeo.attributes;
    morph.from = { pos: Float32Array.from(a.position.array), col: Float32Array.from(a.color.array), size: Float32Array.from(a.aS.array) };
    morph.to = name; morph.start = now; morph.dur = 1.5; morph.done = null;
  }
  function updateMorph(now) {
    const T = SHAPES[morph.to], a = coreGeo.attributes, P = a.position.array, Cc = a.color.array, Sz = a.aS.array, F = morph.from;
    const t0 = (now - morph.start) / (reduced.matches ? .001 : 1);
    if (morph.done === morph.to) return;
    let all = true;
    for (let i = 0; i < N; i++) {
      const k = clamp((t0 - morph.delay[i]) / morph.dur); if (k < 1) all = false;
      const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, lift = Math.sin(Math.PI * k) * 4, j = i * 3;
      P[j] = lerp(F.pos[j], T.pos[j], e) + lift * Math.sin(i * 1.7);
      P[j + 1] = lerp(F.pos[j + 1], T.pos[j + 1], e) + lift * Math.cos(i * .9);
      P[j + 2] = lerp(F.pos[j + 2], T.pos[j + 2], e) + lift * Math.sin(i * 2.3);
      Cc[j] = lerp(F.col[j], T.col[j], e); Cc[j + 1] = lerp(F.col[j + 1], T.col[j + 1], e); Cc[j + 2] = lerp(F.col[j + 2], T.col[j + 2], e);
      Sz[i] = lerp(F.size[i], T.size[i], e);
    }
    a.position.needsUpdate = a.color.needsUpdate = a.aS.needsUpdate = true;
    if (all) morph.done = morph.to;
  }

  // ---------- per frame ----------
  const coreTarget = new THREE.Vector3(), regionV = new THREE.Vector4();
  let coreScale = 1.3;
  function update(s) {
    const { dt, t, now, view, region, hoverRegion, lit, musicOn, mouseWorld, mouseIn, camera } = s, rm = reduced.matches;
    // core: over the die in overview, a moon over the horizon in a region
    const g = view === 'ground' ? region : hoverRegion;
    setShape(g ? SHAPE_OF[g] : 'chip', now);
    let sc = 1.3;
    if (view === 'ground' && region) {
      const st = regions[region].stand;
      const side = st.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -.62);
      coreTarget.copy(st.eye).addScaledVector(side, 300).add(new THREE.Vector3(0, 150, 0)); sc = 5;
    } else coreTarget.set(0, 18, 0);
    const k = rm ? 1 : 1 - Math.pow(.06, dt);
    core.position.lerp(coreTarget, k); coreScale = lerp(coreScale, sc, k);
    const beat = musicOn ? Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.65)), 8) * .06 : 0;
    core.scale.setScalar(coreScale * (1 + beat));
    core.rotation.y = rm ? .5 : t * .12; core.rotation.x = rm ? 0 : Math.sin(t * .4) * .06;
    if (!rm) core.position.y += Math.sin(t * .9) * .6;
    updateMorph(now);

    const mu = gridMat.uniforms;
    mu.uTime.value = rm ? 0 : t;
    mu.uMouse.value.set(mouseWorld.x, mouseIn ? 1 : 0, mouseWorld.z);
    mu.uFocusA.value = lerp(mu.uFocusA.value, lit && nodes.get(lit) ? 1 : 0, 1 - Math.pow(.01, dt));
    if (lit && nodes.get(lit)) { mu.uFocus.value.copy(nodes.get(lit).pos); mu.uHot.value.copy(nodes.get(lit).color); }
    mu.uRip.value = rm ? 0 : musicOn ? .9 : .35;
    const rg = view === 'ground' ? region : hoverRegion;
    if (rg && rg !== 'io') { const b = BLOCKS[rg]; regionV.set(b.x, b.z, b.w / 2, 1); }
    else if (rg === 'io') regionV.set(0, 95, 30, 1); else regionV.w = 0;
    const R = mu.uRegion.value; R.x = regionV.x; R.y = regionV.y; R.z = regionV.z; R.w = lerp(R.w, regionV.w, 1 - Math.pow(.02, dt));
    waferMat.uniforms.uCam.value.copy(camera.position); waferMat.uniforms.uTime.value = t;

    const ma = markerGeo.attributes.aS.array, pa = packetGeo.attributes, P = pa.position.array, PC = pa.color.array, PS = pa.aS.array;
    let pi = 0;
    for (const nd of nodes.values()) {
      const tr = nd.trace, on = nd.id === lit, inR = nd.group === rg;
      tr.glow = lerp(tr.glow, on ? 1 : inR ? .4 : 0, 1 - Math.pow(.005, dt));
      tr.mat.opacity = .22 + tr.glow * .75 + (musicOn ? .12 : 0);
      ma[nd.mi] = 2.2 + tr.glow * 2.6 + (rm ? 0 : Math.sin(t * 2 + nd.mi) * .25);
      for (let q = 0; q < 2; q++) {
        const speed = on ? .9 : musicOn ? .45 : .18, u = rm ? .5 : ((t * speed + tr.phase + q * .5) % 1);
        const d = u * tr.total; let si = 1; while (si < tr.lens.length - 1 && tr.lens[si] < d) si++;
        const a = tr.pts[si - 1], b = tr.pts[si], f = (d - tr.lens[si - 1]) / Math.max(.001, tr.lens[si] - tr.lens[si - 1]);
        P[pi * 3] = lerp(a.x, b.x, f); P[pi * 3 + 1] = .4; P[pi * 3 + 2] = lerp(a.z, b.z, f);
        const br = (.35 + tr.glow * .9) * Math.sin(Math.PI * u);
        PC[pi * 3] = nd.color.r * br; PC[pi * 3 + 1] = nd.color.g * br; PC[pi * 3 + 2] = nd.color.b * br;
        PS[pi] = 1.2 + tr.glow * 1.6; pi++;
      }
    }
    markerGeo.attributes.aS.needsUpdate = pa.position.needsUpdate = pa.color.needsUpdate = pa.aS.needsUpdate = true;
  }

  const mob = innerWidth < 900;
  return {
    key: 'die', scene, regions, regionAt, update,
    markerPos: id => { const nd = nodes.get(id); return nd ? new THREE.Vector3(nd.pos.x, 1.2, nd.pos.z) : null; },
    ids: () => [...nodes.keys()],
    overview: { target: mob ? new THREE.Vector3(0, 0, 60) : new THREE.Vector3(-62, 0, 14), dist: mob ? 440 : 340, minDist: 70, maxDist: 700, pitch: .98, bounds: 150 },
    labelLOD: 200,
  };
}
