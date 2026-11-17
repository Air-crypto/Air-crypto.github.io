// World 2: an island world you explore on foot.
// You are the agent. Each tile walked is one step. Finding an item gives reward,
// finishing an island gives a bonus, and finishing everything in fewer steps than
// par gives the largest bonus. Value iteration draws a hint toward the nearest item.
import * as THREE from './three.module.min.js';
import { clamp, lerp, makeRand, makeNoise, spriteMaterial, pointsGeo } from './gfx.js?v=9';
import { Gym } from './rl.js?v=9';

const ISLES = {
  about: { x: 0, z: 0, r: 42, h: 5, kind: 'meadow', name: 'Spawn' },
  work: { x: -128, z: -88, r: 48, h: 30, kind: 'peaks', name: 'The Ridge' },
  projects: { x: 128, z: -86, r: 44, h: 10, kind: 'mesa', name: 'The Workshop' },
  life: { x: 122, z: 104, r: 48, h: 6, kind: 'forest', name: 'The Grove' },
  io: { x: -118, z: 104, r: 30, h: 8, kind: 'cape', name: 'The Lighthouse' },
};
const REWARD = { item: 1, island: 2, step: -.01, finish: 10 };

export function createEnvWorld({ renderer, pix, GROUPS, inGroup, byId, reduced }) {
  const rand = makeRand(11), { fbm } = makeNoise(5);
  const scene = new THREE.Scene();
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const UP = new THREE.Vector3(0, 1, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ---------- terrain height ----------
  function isle(I, x, z) {
    const dx = x - I.x, dz = z - I.z, d0 = Math.hypot(dx, dz) / I.r;
    if (d0 > 1.45) return -99;
    const d = d0 + (fbm(x * .03 + I.x, z * .03) - .5) * .38, base = 1 - smooth(.5, 1.12, d);
    let h;
    if (I.kind === 'peaks') {
      const rid = 1 - Math.abs(2 * fbm(x * .03 + 9, z * .03 + 4, 5) - 1);
      h = 2.2 * base + I.h * Math.pow(1 - smooth(.1, .78, d), 1.25) * (.4 + .6 * rid);
    } else if (I.kind === 'mesa') {
      const v = base * I.h + fbm(x * .05, z * .05) * 4 * base;
      h = Math.floor(v / 2.6) * 2.6 + (v % 2.6) * .12;
    } else if (I.kind === 'forest') {
      h = I.h * base + fbm(x * .06, z * .06) * 2.4 * base;
      h -= 8 * (1 - smooth(7, 15, Math.hypot(x - (I.x + 10), z - (I.z - 6))));
    } else if (I.kind === 'cape') {
      h = I.h * Math.pow(base, .6) + fbm(x * .07, z * .07) * 1.5 * base;
    } else h = I.h * base + fbm(x * .06, z * .06) * 1.8 * base;
    return h - 2 + 3 * base;
  }
  const bridges = Object.entries(ISLES).filter(([k]) => k !== 'about').map(([, I]) => [ISLES.about, I]);
  const segDist = (A, B, x, z) => { const vx = B.x - A.x, vz = B.z - A.z, t = clamp(((x - A.x) * vx + (z - A.z) * vz) / (vx * vx + vz * vz)); return [Math.hypot(x - (A.x + vx * t), z - (A.z + vz * t)), t]; };
  function H(x, z) {
    let h = -7 + fbm(x * .02, z * .02) * 2.5;
    for (const I of Object.values(ISLES)) h = Math.max(h, isle(I, x, z));
    for (const [A, B] of bridges) { const [ds, t] = segDist(A, B, x, z); h = Math.max(h, 1.1 + Math.sin(t * Math.PI * 9) * .12 - 4 * smooth(2.4, 5.6, ds)); }
    return h;
  }
  const bridgeDist = (x, z) => Math.min(...bridges.map(([A, B]) => segDist(A, B, x, z)[0]));
  const slope = (x, z) => Math.hypot(H(x + 1.4, z) - H(x - 1.4, z), H(x, z + 1.4) - H(x, z - 1.4)) / 2.8;
  const isleOf = (x, z) => { let best = null, bd = 1e9; for (const [k, I] of Object.entries(ISLES)) { const d = Math.hypot(x - I.x, z - I.z) / I.r; if (d < bd) { bd = d; best = k; } } return [best, bd]; };
  const regionAt = (x, z) => { const [k, d] = isleOf(x, z); return d < 1.05 && bridgeDist(x, z) > 3.5 || d < .8 ? k : null; };
  const ground = (x, z) => Math.max(H(x, z), 0);

  // ---------- grid ----------
  const gym = new Gym({ n: 150, step: 2.8, x0: -210, z0: -210, walkable: (x, z) => bridgeDist(x, z) < 3.4 || (H(x, z) > .55 && slope(x, z) < 1.1) });

  // ---------- stand spots, crystal cells ----------
  const regions = {}, items = new Map(), taken = new Set();
  for (const [k, I] of Object.entries(ISLES)) {
    const dir = k === 'about' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(I.x, 0, I.z).normalize();
    const sc = gym.nearestFree(I.x + dir.x * I.r * (k === 'about' ? .1 : .22), I.z + dir.z * I.r * (k === 'about' ? .1 : .22));
    const [sx, sz] = gym.cellXZ(sc), ex = sx - dir.x * 32, ez = sz - dir.z * 32;
    const eye = new THREE.Vector3(ex, Math.max(ground(ex, ez), ground(sx, sz)) + 12.5, ez);
    regions[k] = { center: new THREE.Vector3(I.x, Math.max(16, H(I.x, I.z) + 18), I.z), stand: { eye, dir }, spot: sc };
    const list = inGroup(k), n = list.length, perp = new THREE.Vector3(-dir.z, 0, dir.x), L = Math.min(19, 3.4 * n);
    list.forEach((it, i) => {
      const fwd = 7 + (i % 2) * 8, lat = n === 1 ? 0 : -L + 2 * L * i / (n - 1);
      const c = gym.nearestFree(sx + dir.x * fwd + perp.x * lat, sz + dir.z * fwd + perp.z * lat, taken);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) taken.add(c + di * gym.n + dj);
      items.set(it.id, { id: it.id, group: k, cell: c, color: new THREE.Color(GROUPS[k].hue) });
    });
  }
  // Keep props out of each spot's view and walkway.
  const inView = (x, z, pad = 0) => Object.values(regions).some(R => {
    const st = R.stand, dx = x - st.eye.x, dz = z - st.eye.z, a = dx * st.dir.x + dz * st.dir.z, l = dx * -st.dir.z + dz * st.dir.x;
    return a > -6 && a < 70 && Math.abs(l) < 24 + pad;
  });
  const nearBridge = (x, z) => bridgeDist(x, z) < 6;

  // ---------- sky, light, fog ----------
  const SUN = new THREE.Vector3(-.55, .16, -.82).normalize();
  const FOG = new THREE.Color(0x2a2a48);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uSun: { value: SUN }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 uSun; uniform float uTime;
      float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){ float h=vP.y, s=max(dot(vP,uSun),0.0);
        vec3 zen=vec3(.035,.05,.12), mid=vec3(.12,.13,.27), hor=vec3(.86,.5,.36);
        vec3 c=mix(hor,mid,smoothstep(-.02,.22,h)); c=mix(c,zen,smoothstep(.2,.7,h));
        c+=vec3(1.0,.62,.38)*pow(s,10.0)*.55+vec3(1.0,.85,.65)*smoothstep(.9985,.9995,s);
        vec2 g=floor(vP.xz/(vP.y+.2)*180.0); c+=vec3(step(.996,h21(g))*smoothstep(.25,.6,h)*(.6+.4*sin(uTime*2.0+h21(g)*40.0)));
        if(h<0.0) c=mix(hor*.55,vec3(.05,.08,.14),smoothstep(0.0,-.15,h));
        gl_FragColor=vec4(c,1.0); }`,
  }));
  sky.renderOrder = -2; scene.add(sky);
  scene.fog = new THREE.Fog(FOG, 300, 1600);
  scene.add(new THREE.HemisphereLight(0x8fa6ff, 0x221a2c, 1.0));
  const sun = new THREE.DirectionalLight(0xffb48a, 2.6);
  sun.position.copy(SUN).multiplyScalar(500); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -230, right: 230, top: 230, bottom: -230, near: 10, far: 1200 });
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .5;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x6f86ff, .55); fill.position.set(200, 120, 260); scene.add(fill);

  // ---------- terrain ----------
  const SIZE = 420, SEG = 210;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, H(tp.getX(i), tp.getZ(i)));
  const terrainGeo = tg.toNonIndexed(); terrainGeo.computeVertexNormals();
  const P = terrainGeo.attributes.position, cols = new Float32Array(P.count * 3), col = new THREE.Color();
  const C = { sand: new THREE.Color('#d0b07c'), wet: new THREE.Color('#6f6250'), grass: new THREE.Color('#5d8f58'), grass2: new THREE.Color('#79a65e'), forest: new THREE.Color('#3b6a48'), rock: new THREE.Color('#6d6878'), rock2: new THREE.Color('#857f8f'), snow: new THREE.Color('#eef1f7'), clay: new THREE.Color('#b8704f'), clay2: new THREE.Color('#d39466'), path: new THREE.Color('#a88f6a'), plank: new THREE.Color('#8a6a4a') };
  for (let f = 0; f < P.count; f += 3) {
    const x = (P.getX(f) + P.getX(f + 1) + P.getX(f + 2)) / 3, y = (P.getY(f) + P.getY(f + 1) + P.getY(f + 2)) / 3, z = (P.getZ(f) + P.getZ(f + 1) + P.getZ(f + 2)) / 3;
    const [k, d] = isleOf(x, z), kind = ISLES[k].kind, n = terrainGeo.attributes.normal.getY(f), j = (rand() - .5) * .07, v = fbm(x * .08, z * .08);
    if (y < .3) col.copy(C.wet);
    else if (bridgeDist(x, z) < 3 && d > .95) { const bt = bridges.map(([A, B]) => segDist(A, B, x, z)).sort((a, b) => a[0] - b[0])[0][1]; col.copy(C.plank).offsetHSL(0, 0, Math.floor(bt * 70) % 2 ? .03 : -.03); }
    else if (y < 1.1) col.copy(C.sand);
    else if (kind === 'peaks') col.copy(y > 21 ? C.snow : n < .82 || y > 10 ? (v > .5 ? C.rock2 : C.rock) : C.grass);
    else if (kind === 'mesa') col.copy(n < .9 ? C.clay : Math.floor(y / 2.6) % 2 ? C.clay2 : C.sand).lerp(C.grass, y < 3 ? .45 : 0);
    else if (kind === 'forest') col.copy(C.forest).lerp(C.grass2, v * .5);
    else col.copy(n < .8 ? C.rock : C.grass).lerp(C.grass2, n < .8 ? 0 : v * .7);
    col.offsetHSL(0, 0, j);
    for (let q = 0; q < 3; q++) col.toArray(cols, (f + q) * 3);
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95 }));
  terrain.receiveShadow = true; terrain.castShadow = true; scene.add(terrain);

  // ---------- water ----------
  const HT = 256, hdata = new Uint8Array(HT * HT * 4);
  for (let v = 0; v < HT; v++) for (let u = 0; u < HT; u++) {
    const x = -210 + (u + .5) / HT * 420, z = -210 + (v + .5) / HT * 420, e = clamp((H(x, z) + 8) / 48) * 255;
    hdata.set([e, e, e, 255], (v * HT + u) * 4);
  }
  const heightTex = new THREE.DataTexture(hdata, HT, HT, THREE.RGBAFormat); heightTex.magFilter = heightTex.minFilter = THREE.LinearFilter; heightTex.needsUpdate = true;
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSun: { value: SUN }, uCam: { value: new THREE.Vector3() }, uFog: { value: FOG }, uH: { value: heightTex } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uTime; uniform vec3 uSun,uCam,uFog; uniform sampler2D uH; varying vec3 vW;
      float hAt(vec2 p){ vec2 uv=(p+210.0)/420.0; if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0) return -7.0; return texture2D(uH,uv).r*48.0-8.0; }
      void main(){ vec2 p=vW.xz; float t=uTime;
        float dx=.18*cos(p.x*.09+t*.9)+.12*cos((p.x+p.y)*.13+t*1.3)+.07*cos(p.x*.31-p.y*.2+t*2.1)+.04*cos(p.x*.7+t*3.0);
        float dz=.16*cos(p.y*.08+t*.7)+.12*cos((p.x+p.y)*.13+t*1.3)+.06*cos(p.y*.29+p.x*.17+t*1.9)+.04*cos(p.y*.66-t*2.7);
        vec3 n=normalize(vec3(-dx*.32,1.0,-dz*.32)), V=normalize(uCam-vW);
        float h=hAt(p), sh=smoothstep(-4.8,-.3,h);
        vec3 c=mix(vec3(.03,.08,.15),vec3(.1,.34,.39),sh*sh);
        float fr=pow(1.0-max(dot(n,V),0.0),5.0);
        vec3 r=reflect(-V,n), sky=mix(vec3(.86,.5,.36),vec3(.12,.13,.27),clamp(r.y*3.0,0.0,1.0));
        c=mix(c,sky,.12+fr*.65);
        float sp=max(dot(reflect(-uSun,n),V),0.0); c+=vec3(1.0,.72,.48)*(pow(sp,220.0)*2.6+pow(sp,20.0)*.14);
        float edge=smoothstep(-1.5,-.05,h), bands=.5+.5*sin(h*7.0-t*1.8+sin(p.x*.3+p.y*.2)*.8);
        float foam=edge*(smoothstep(.78,.96,bands)*.7)+smoothstep(-.4,-.05,h);
        c=mix(c,vec3(.93,.95,.97),clamp(foam,0.0,1.0)*.8);
        c=mix(c,uFog,smoothstep(300.0,1600.0,length(vW-uCam)));
        gl_FragColor=vec4(c,1.0); }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), waterMat); water.rotation.x = -Math.PI / 2; scene.add(water);

  // ---------- props ----------
  const dummy = new THREE.Object3D();
  function scatter(n, ok, tries = 60) { const out = []; let g = 0; while (out.length < n && g++ < n * tries) { const x = (rand() - .5) * SIZE, z = (rand() - .5) * SIZE, y = H(x, z); if (ok(x, y, z)) out.push([x, y, z]); } return out; }
  function instanced(geo, mat, list, place, shadow = true) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((p, i) => { place(dummy, p, i); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.count = list.length; m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m;
  }
  const flat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: .9, ...o });
  const glow = (c, i = 1.6) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, flatShading: true });
  const okLand = (x, y, z, k, lo = 1.6, hi = 12, s = .55) => { const [kk, d] = isleOf(x, z); return kk === k && d < .97 && y > lo && y < hi && slope(x, z) < s && !inView(x, z) && !nearBridge(x, z); };
  const shade = (h, s, l) => new THREE.Color().setHSL(h, s, l);

  // pines on the ridge and cape, round trees on spawn and grove, cherry in the grove, cacti on the mesa
  const pines = [...scatter(260, (x, y, z) => okLand(x, y, z, 'work', 1.6, 16, .7)), ...scatter(50, (x, y, z) => okLand(x, y, z, 'io')), ...scatter(30, (x, y, z) => okLand(x, y, z, 'about'))];
  const pineSc = pines.map(() => .8 + rand() * .8);
  instanced(new THREE.CylinderGeometry(.22, .3, 1.6, 5).translate(0, .8, 0), flat(0x5a4032), pines, (d, [x, y, z], i) => { d.position.set(x, y - .1, z); d.scale.setScalar(pineSc[i]); d.rotation.set(0, i, 0); });
  const pineTop = instanced(new THREE.ConeGeometry(1.7, 3.4, 6).translate(0, 3.2, 0), flat(0xffffff), pines, (d, [x, y, z], i) => { d.position.set(x, y - .1, z); d.scale.setScalar(pineSc[i]); d.rotation.set(0, i, 0); });
  const pineTop2 = instanced(new THREE.ConeGeometry(1.25, 2.6, 6).translate(0, 4.9, 0), flat(0xffffff), pines, (d, [x, y, z], i) => { d.position.set(x, y - .1, z); d.scale.setScalar(pineSc[i]); d.rotation.set(0, i + 1, 0); });
  pines.forEach((p, i) => { const c = shade(.36 + rand() * .05, .32, .2 + rand() * .08); pineTop.setColorAt(i, c); pineTop2.setColorAt(i, c.clone().offsetHSL(0, 0, .04)); });

  const rounds = [...scatter(140, (x, y, z) => okLand(x, y, z, 'about', 1.4)), ...scatter(260, (x, y, z) => okLand(x, y, z, 'life', 1.2, 12, .6))];
  const roundSc = rounds.map(() => .8 + rand() * .7), cherry = rounds.map(([x, , z]) => isleOf(x, z)[0] === 'life' && rand() < .32);
  instanced(new THREE.CylinderGeometry(.25, .35, 2, 5).translate(0, 1, 0), flat(0x5e4434), rounds, (d, [x, y, z], i) => { d.position.set(x, y - .1, z); d.scale.setScalar(roundSc[i]); });
  const crowns = instanced(new THREE.IcosahedronGeometry(1.7, 0).translate(0, 3, 0), flat(0xffffff), rounds, (d, [x, y, z], i) => { d.position.set(x, y - .1, z); d.scale.set(roundSc[i], roundSc[i] * (.85 + rand() * .4), roundSc[i]); d.rotation.set(rand(), rand() * 6, 0); });
  rounds.forEach((p, i) => crowns.setColorAt(i, cherry[i] ? shade(.94 + rand() * .03, .55, .72 + rand() * .08) : shade(.27 + rand() * .08, .4, .3 + rand() * .1)));

  const cacti = scatter(45, (x, y, z) => okLand(x, y, z, 'projects', 1.2, 14, .5));
  instanced(new THREE.CylinderGeometry(.35, .42, 3, 7).translate(0, 1.5, 0), flat(0x4f7a52), cacti, (d, [x, y, z], i) => { d.position.set(x, y, z); d.scale.set(1, .7 + rand() * .7, 1); });
  instanced(new THREE.CylinderGeometry(.22, .25, 1.4, 6).translate(0, .7, 0), flat(0x5c8a5c), cacti, (d, [x, y, z], i) => { d.position.set(x + .5, y + 1.2, z); d.rotation.set(0, i, -.5); });

  const grass = scatter(3200, (x, y, z) => { const [k, d] = isleOf(x, z); return d < 1 && y > 1.3 && y < 11 && slope(x, z) < .55 && (k === 'about' || k === 'life' || k === 'io' || (k === 'work' && y < 8)) && bridgeDist(x, z) > 3.5; }, 12);
  const grassM = instanced(new THREE.ConeGeometry(.18, 1, 3).translate(0, .45, 0), flat(0xffffff), grass, (d, [x, y, z], i) => { d.position.set(x, y - .05, z); d.scale.set(1, .6 + rand() * .9, 1); d.rotation.set((rand() - .5) * .4, rand() * 6, (rand() - .5) * .4); }, false);
  grass.forEach((p, i) => grassM.setColorAt(i, shade(.24 + rand() * .07, .42, .42 + rand() * .14)));
  const flowers = scatter(520, (x, y, z) => { const [k, d] = isleOf(x, z); return d < .95 && y > 1.4 && y < 9 && slope(x, z) < .4 && (k === 'about' || k === 'life' || k === 'io') && bridgeDist(x, z) > 3.5; }, 12);
  const fl = instanced(new THREE.IcosahedronGeometry(.22, 0), new THREE.MeshStandardMaterial({ flatShading: true, emissive: 0x221111, roughness: .7 }), flowers, (d, [x, y, z]) => { d.position.set(x, y + .35, z); }, false);
  const FC = ['#ffd27a', '#ff86b8', '#f2f2ff', '#cfd8ff', '#ff9f6b'];
  flowers.forEach((p, i) => fl.setColorAt(i, new THREE.Color(FC[i % FC.length])));
  const rocks = scatter(220, (x, y, z) => { const [k, d] = isleOf(x, z); return d < 1.08 && y > -1 && (k !== 'life' || rand() < .3) && !inView(x, z) && !nearBridge(x, z); });
  instanced(new THREE.DodecahedronGeometry(1.2, 0), flat(0x7a7488), rocks, (d, [x, y, z]) => { const s = .4 + rand() * 1.5; d.position.set(x, y, z); d.scale.set(s, s * (.5 + rand() * .4), s); d.rotation.set(rand(), rand() * 6, rand()); });

  // causeway posts and lanterns
  const posts = [], lamps = [];
  for (const [A, B] of bridges) {
    const L = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / L, uz = (B.z - A.z) / L;
    for (let s = A.r * .95; s < L - B.r * .9; s += 6) for (const side of [-1, 1]) {
      const x = A.x + ux * s - uz * 3 * side, z = A.z + uz * s + ux * 3 * side; posts.push([x, H(x, z), z]);
      if (Math.round(s / 6) % 4 === 0) lamps.push([x, H(x, z) + 2.1, z]);
    }
  }
  instanced(new THREE.CylinderGeometry(.16, .2, 2, 5).translate(0, 1, 0), flat(0x6b5038), posts, (d, [x, y, z]) => d.position.set(x, y - .2, z));
  instanced(new THREE.IcosahedronGeometry(.32, 0), glow(0xffc27a, 2.4), lamps, (d, [x, y, z]) => d.position.set(x, y, z), false);

  // distant islets for a sense of a larger world
  const isletMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * 6.283 + rand() * .3, r = 300 + rand() * 420, h = 6 + rand() * 34, w = 22 + rand() * 50;
    const g = new THREE.IcosahedronGeometry(1, 2); const pc = g.attributes.position, cc = new Float32Array(pc.count * 3), seed = rand() * 50;
    for (let v = 0; v < pc.count; v++) {
      const x = pc.getX(v), y = pc.getY(v), z = pc.getZ(v), n = .75 + fbm(x * 2 + seed, z * 2 + y + seed) * .6;
      pc.setXYZ(v, x * w * n, Math.max(y, -.2) * h * n - 2, z * w * n);
    }
    g.computeVertexNormals();
    for (let f = 0; f < pc.count; f += 3) { const y = (pc.getY(f) + pc.getY(f + 1) + pc.getY(f + 2)) / 3, ny = g.attributes.normal.getY(f); const c = (y > h * .6 && h > 30 ? C.snow : y < 1.5 ? C.sand : ny < .7 ? C.rock : C.forest).clone().offsetHSL(0, 0, (rand() - .5) * .06); for (let q = 0; q < 3; q++) c.toArray(cc, (f + q) * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, isletMat); m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); m.rotation.y = rand() * 6; scene.add(m);
  }

  // clouds
  const cloudMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(10, 1), new THREE.MeshStandardMaterial({ color: 0xe2dff0, flatShading: true, roughness: 1, transparent: true, opacity: .55 }), 22);
  const clouds = Array.from({ length: 22 }, () => ({ x: (rand() - .5) * 760, z: (rand() - .5) * 760, y: 80 + rand() * 50, s: .7 + rand() * 1.6, v: 2 + rand() * 3 }));
  scene.add(cloudMesh);

  // ---------- landmarks ----------
  const add = (geo, mat, x, z, y = null, ry = 0, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y ?? H(x, z), z); m.rotation.y = ry; m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m; };
  const clearSpot = (x, z) => { if (!inView(x, z, 4)) return [x, z]; for (let a = 0; a < 6.28; a += .3) for (let r = 8; r < 40; r += 4) { const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r; if (!inView(nx, nz, 4) && H(nx, nz) > 1.5 && !nearBridge(nx, nz)) return [nx, nz]; } return [x, z]; };
  const wall = flat(0xe8e0d0), roof = flat(0x9a4e3c), wood = flat(0x7a5a3e), stoneM = flat(0x9a96a8);
  function house(x, z, ry = 0, s = 1) {
    const y = H(x, z);
    add(new THREE.BoxGeometry(6 * s, 4 * s, 5 * s), wall, x, z, y + 2 * s, ry);
    const r = add(new THREE.ConeGeometry(4.6 * s, 3 * s, 4), roof, x, z, y + 5.5 * s, ry + Math.PI / 4); r.scale.z = .85;
    add(new THREE.BoxGeometry(1.2 * s, 2 * s, .2), wood, x + Math.sin(ry) * 2.55 * s, z + Math.cos(ry) * 2.55 * s, y + 1 * s, ry, false);
    add(new THREE.BoxGeometry(1, 1, .2), glow(0xffcf8a, 1.6), x + Math.sin(ry) * 2.55 * s + Math.cos(ry) * 1.8 * s, z + Math.cos(ry) * 2.55 * s - Math.sin(ry) * 1.8 * s, y + 2.4 * s, ry, false);
  }
  // spawn: cottage, campfire, signpost, spawn ring
  const A = ISLES.about;
  { const [hx, hz] = clearSpot(A.x - 12, A.z + 14); house(hx, hz, .6); }
  const [fireX, fireZ] = clearSpot(A.x + 10, A.z + 12), fireY = H(fireX, fireZ);
  for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(.25, .25, 2.6, 5), wood, fireX, fireZ, fireY + .25, i * .8).rotation.z = Math.PI / 2;
  add(new THREE.ConeGeometry(.9, 1.8, 5), glow(0xff8a3c, 2.8), fireX, fireZ, fireY + .9, 0, false);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; add(new THREE.DodecahedronGeometry(.45, 0), stoneM, fireX + Math.cos(a) * 1.8, fireZ + Math.sin(a) * 1.8, fireY + .2); }
  const fire = new THREE.PointLight(0xff8a3c, 80, 40, 2); fire.position.set(fireX, fireY + 2, fireZ); scene.add(fire);
  const spawnCell = regions.about.spot, [spx, spz] = gym.cellXZ(spawnCell);
  const spawnRing = add(new THREE.TorusGeometry(2.6, .14, 6, 32), glow(0xcfd8ff, 1.3), spx, spz, ground(spx, spz) + .15, 0, false); spawnRing.rotation.x = Math.PI / 2;
  // ridge: watchtower and obelisks
  const W = ISLES.work;
  { const [tx, tz] = clearSpot(W.x + 6, W.z - 4), ty = H(tx, tz);
    for (const [ox, oz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) add(new THREE.CylinderGeometry(.2, .28, 9, 5), wood, tx + ox, tz + oz, ty + 4.5);
    add(new THREE.BoxGeometry(4.6, .5, 4.6), wood, tx, tz, ty + 9); add(new THREE.ConeGeometry(3.6, 2.6, 4), roof, tx, tz, ty + 11, Math.PI / 4);
    add(new THREE.OctahedronGeometry(.7), glow(0x73d9ff, 2.6), tx, tz, ty + 13.2, 0, false); }
  for (let i = 0; i < 3; i++) { const a = -.9 + i * .9, [x, z] = clearSpot(W.x + Math.cos(a) * 22 + 14, W.z + Math.sin(a) * 22 + 18); add(new THREE.BoxGeometry(2, 12, 2), flat(0x34485e), x, z, H(x, z) + 5); add(new THREE.OctahedronGeometry(1), glow(0x73d9ff, 2), x, z, H(x, z) + 12.5, 0, false); }
  // workshop: shed with chimney, gear, pylons
  const Pj = ISLES.projects;
  const [wx, wz] = clearSpot(Pj.x - 6, Pj.z + 10), wy = H(wx, wz);
  add(new THREE.BoxGeometry(9, 5, 7), flat(0xc9a27c), wx, wz, wy + 2.5, .3); const sr = add(new THREE.BoxGeometry(10, .6, 8), flat(0x5b5f6e), wx, wz, wy + 5.6, .3); sr.rotation.z = .12;
  add(new THREE.CylinderGeometry(.6, .7, 4, 6), flat(0x7d6a5c), wx + 2.4, wz - 1.4, wy + 7.4);
  const chimney = new THREE.Vector3(wx + 2.4, wy + 9.6, wz - 1.4);
  const gear = add(new THREE.TorusGeometry(6, 1.1, 4, 12), glow(0xffa565, .6), Pj.x + 14, Pj.z + 14, H(Pj.x + 14, Pj.z + 14) + 12, 0, true); gear.rotation.x = Math.PI / 2.4;
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + .4, [x, z] = clearSpot(Pj.x + Math.cos(a) * 16, Pj.z + Math.sin(a) * 16); add(new THREE.CylinderGeometry(.8, 1.2, 9, 6), stoneM, x, z, H(x, z) + 4.5); add(new THREE.SphereGeometry(1.1, 8, 6), glow(0xffa565, 2.2), x, z, H(x, z) + 9.6, 0, false); }
  // grove: lanterns, a torii-like gate, fireflies
  const Lf = ISLES.life, lanterns = [];
  for (let i = 0; i < 10; i++) { const a = i * .65, r = 10 + (i % 3) * 5, [x, z] = clearSpot(Lf.x + 10 + Math.cos(a) * r, Lf.z - 6 + Math.sin(a) * r); lanterns.push(add(new THREE.SphereGeometry(.55, 8, 6), glow(0xff86b8, 2.5), x, z, Math.max(H(x, z), 0) + 3 + rand() * 2, 0, false)); }
  { const [gx, gz] = clearSpot(Lf.x - 14, Lf.z + 10), gy = H(gx, gz), red = flat(0xc0443a);
    add(new THREE.CylinderGeometry(.35, .4, 7, 6), red, gx - 3, gz, gy + 3.5); add(new THREE.CylinderGeometry(.35, .4, 7, 6), red, gx + 3, gz, gy + 3.5);
    add(new THREE.BoxGeometry(9, .6, .8), red, gx, gz, gy + 7); add(new THREE.BoxGeometry(7.4, .4, .6), flat(0x2c2c34), gx, gz, gy + 6); }
  // lighthouse with dock and boat
  const Io = ISLES.io, [lx, lz] = clearSpot(Io.x - 6, Io.z + 8), ly = H(lx, lz);
  add(new THREE.CylinderGeometry(2.2, 3.4, 18, 10), flat(0xe9e4dc), lx, lz, ly + 9);
  add(new THREE.CylinderGeometry(2.3, 2.3, 1.4, 10), roof, lx, lz, ly + 7); add(new THREE.CylinderGeometry(2.3, 2.3, 1.4, 10), roof, lx, lz, ly + 13);
  add(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 10), roof, lx, lz, ly + 18.4);
  add(new THREE.SphereGeometry(1.8, 10, 8), glow(0x8dffc4, 3), lx, lz, ly + 19.8, 0, false);
  const lamp = new THREE.PointLight(0x8dffc4, 60, 60, 2); lamp.position.set(lx, ly + 20, lz); scene.add(lamp);
  const beamGeo = new THREE.ConeGeometry(9, 80, 16, 1, true); beamGeo.translate(0, -40, 0); beamGeo.rotateZ(Math.PI / 2);
  const beam = add(beamGeo, new THREE.MeshBasicMaterial({ color: 0x8dffc4, transparent: true, opacity: .07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), lx, lz, ly + 19.8, 0, false);
  const dockDir = new THREE.Vector3(Io.x, 0, Io.z).normalize().applyAxisAngle(UP, -1.1);
  let dock = null;
  for (let s = Io.r * .7; s < Io.r * 1.7; s += 2.2) { const x = Io.x + dockDir.x * s, z = Io.z + dockDir.z * s; if (inView(x, z)) break; add(new THREE.BoxGeometry(2, .3, 5), wood, x, z, .8, Math.atan2(dockDir.x, dockDir.z) + Math.PI / 2); dock = [x, z]; }
  const boat = new THREE.Group();
  if (dock) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 5.6), flat(0x8a5a3a)); hull.position.y = .3; hull.castShadow = true; boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 5, 5), wood); mast.position.y = 2.8; boat.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), flat(0xf1ece2, { side: THREE.DoubleSide })); sail.position.set(0, 3, .6); sail.rotation.y = Math.PI / 2; boat.add(sail);
    boat.position.set(dock[0] - dockDir.z * 4.5, 0, dock[1] + dockDir.x * 4.5); boat.rotation.y = Math.atan2(dockDir.x, dockDir.z); scene.add(boat);
  }

  // ---------- particles: embers, smoke, fireflies ----------
  const FX = 40 + 40 + 70, fxGeo = pointsGeo(FX), fxPts = new THREE.Points(fxGeo, spriteMaterial(pix * 2)); fxPts.frustumCulled = false; scene.add(fxPts);
  const fx = Array.from({ length: FX }, (_, i) => ({ kind: i < 40 ? 'ember' : i < 80 ? 'smoke' : 'fly', t: rand(), a: rand() * 6.28, b: rand() }));

  // ---------- birds ----------
  const BIRDS = 18, birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BIRDS * 9 * 2), 3));
  const birds = new THREE.Mesh(birdGeo, new THREE.MeshBasicMaterial({ color: 0x1a1726, side: THREE.DoubleSide, fog: true })); birds.frustumCulled = false; scene.add(birds);
  const flocks = [0, 1, 2].map(f => ({ cx: (rand() - .5) * 220, cz: (rand() - .5) * 220, r: 60 + rand() * 60, y: 45 + rand() * 25, w: (.08 + rand() * .06) * (f % 2 ? 1 : -1), p: rand() * 6 }));

  // ---------- items: crystals and beacons ----------
  const crystalGeo = new THREE.OctahedronGeometry(.7), ringGeo = new THREE.TorusGeometry(1.25, .1, 5, 20);
  for (const it of items.values()) {
    const [x, z] = gym.cellXZ(it.cell), y = ground(x, z);
    it.base = y + 2.4;
    it.mesh = new THREE.Mesh(crystalGeo, new THREE.MeshStandardMaterial({ color: it.color, emissive: it.color, emissiveIntensity: .55, flatShading: true, roughness: .4 }));
    it.mesh.position.set(x, it.base, z); it.mesh.castShadow = true; scene.add(it.mesh);
    it.ring = new THREE.Mesh(ringGeo, glow(0xffd27a, 1.4)); it.ring.rotation.x = Math.PI / 2; it.ring.position.set(x, y + .2, z); it.ring.visible = false; scene.add(it.ring);
    it.phase = rand() * 6;
  }
  const beaconGeo = pointsGeo(items.size), beacons = new THREE.Points(beaconGeo, spriteMaterial(pix * 3.2)); beacons.frustumCulled = false; scene.add(beacons);

  // ---------- player ----------
  const player = new THREE.Group(), body = new THREE.Group(); player.add(body);
  const cloth = flat(0xece6da), skin = flat(0xf0cfae), scarfM = flat(0xff9a52, { side: THREE.DoubleSide }), boots = flat(0x3b3240);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.5, .72, 1.5, 8), cloth); torso.position.y = 1.55; body.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.48, 12, 10), skin); head.position.y = 2.65; body.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(.55, .8, 8), scarfM); hat.position.y = 3.1; body.add(hat);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(.8, .9, .4), flat(0x6b5038)); pack.position.set(0, 1.7, -.55); body.add(pack);
  const scarf = new THREE.Mesh(new THREE.PlaneGeometry(.5, 1.3), scarfM); scarf.position.set(.25, 2.1, -.45); body.add(scarf);
  const legs = [-.22, .22].map(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(.28, .8, .3), boots); l.geometry.translate(0, -.4, 0); l.position.set(x, .82, 0); body.add(l); return l; });
  body.traverse(o => { if (o.isMesh) o.castShadow = true; });
  body.scale.setScalar(1.15);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.1, .08, 5, 24), glow(0xffd27a, 2)); halo.rotation.x = Math.PI / 2; halo.position.y = .12; player.add(halo);
  scene.add(player);
  const youGeo = pointsGeo(1), you = new THREE.Points(youGeo, spriteMaterial(pix * 5)); you.frustumCulled = false; scene.add(you);
  youGeo.attributes.color.array.set([1, .82, .48]); youGeo.attributes.aS.array[0] = 2.4;

  // hint path
  const HINT = 160, hintGeo = pointsGeo(HINT), hintPts = new THREE.Points(hintGeo, spriteMaterial(pix * 2.2)); hintPts.frustumCulled = false; scene.add(hintPts);

  // ---------- par: nearest-neighbor tour over all items ----------
  const itemList = [...items.values()];
  const distFrom = new Map([[spawnCell, gym.bfs(spawnCell).dist]]);
  for (const it of itemList) distFrom.set(it.cell, gym.bfs(it.cell).dist);
  let par = 0;
  { let at = spawnCell; const left = new Set(itemList.map(it => it.cell));
    while (left.size) { let best = null, bd = 1e9; for (const c of left) { const d = distFrom.get(at)[c]; if (d >= 0 && d < bd) { bd = d; best = c; } } if (best === null) break; par += bd; left.delete(best); at = best; } }

  // ---------- episode state ----------
  const ep = { n: 1, steps: 0, ret: 0, found: new Set(), done: false, islands: new Set(), best: null };
  try { ep.best = JSON.parse(localStorage.getItem('game-best') || 'null'); } catch {}
  const pl = { cell: spawnCell, from: spawnCell, to: null, t: 0, path: [], target: null, heading: new THREE.Vector3(0, 0, -1), speed: 12, dist: null, bump: 0 };
  const api = { onArrive: null, onDiscover: null, onComplete: null, onStep: null };
  let hintOn = true;
  try { hintOn = localStorage.getItem('game-hint') !== 'off'; } catch {}

  function refreshGoals() { gym.setGoals(itemList.filter(it => !ep.found.has(it.id)).map(it => it.cell)); }
  refreshGoals();
  function placePlayer(c) { pl.cell = pl.from = c; pl.to = null; pl.t = 0; pl.path = []; pl.target = null; const [x, z] = gym.cellXZ(c); player.position.set(x, ground(x, z), z); pl.dist = null; }
  placePlayer(spawnCell);

  function discover(it) {
    ep.found.add(it.id); ep.ret += REWARD.item;
    it.ring.visible = true; it.mesh.material.emissiveIntensity = .3; it.mesh.material.color.set(0xf4ead6);
    const group = itemList.filter(x => x.group === it.group), islandDone = group.every(x => ep.found.has(x.id));
    let bonus = 0;
    if (islandDone && !ep.islands.has(it.group)) { ep.islands.add(it.group); ep.ret += REWARD.island; bonus = REWARD.island; }
    refreshGoals();
    let finish = 0;
    if (ep.found.size === itemList.length && !ep.done) {
      ep.done = true; finish = REWARD.finish * clamp(par / Math.max(1, ep.steps), 0, 1.5); ep.ret += finish;
      if (!ep.best || ep.ret > ep.best.ret) { ep.best = { ret: +ep.ret.toFixed(2), steps: ep.steps, ep: ep.n }; try { localStorage.setItem('game-best', JSON.stringify(ep.best)); } catch {} }
    }
    api.onDiscover?.(it.id, { reward: REWARD.item, island: islandDone && bonus ? it.group : null, bonus });
    if (finish) api.onComplete?.(stats(), finish);
  }
  function checkDiscover() {
    const [i, j] = gym.ij(pl.cell);
    for (const it of itemList) {
      if (ep.found.has(it.id)) continue;
      const [a, b] = gym.ij(it.cell);
      if (Math.max(Math.abs(a - i), Math.abs(b - j)) <= 1) discover(it);
    }
  }
  function walk(cells, target) { if (!cells.length) { pl.path = []; pl.target = target; if (pl.to === null) { checkDiscover(); arrive(); } return; } pl.path = cells; pl.target = target; }
  function arrive() { const t = pl.target; pl.target = null; pl.dist = null; api.onArrive?.(t || { type: 'manual' }); }

  // ---------- per frame ----------
  const birdArr = birdGeo.attributes.position.array, tmp = new THREE.Vector3();
  function update(s) {
    const { dt, t, musicOn, lit, camera } = s, rm = reduced.matches;
    sky.material.uniforms.uTime.value = t; waterMat.uniforms.uTime.value = rm ? 0 : t; waterMat.uniforms.uCam.value.copy(camera.position);
    // clouds fade when seen from above
    clouds.forEach((c, i) => { c.x += c.v * dt; if (c.x > 420) c.x = -420; dummy.position.set(c.x, c.y, c.z); dummy.scale.set(c.s * 1.8, c.s * .45, c.s); dummy.rotation.set(0, i, 0); dummy.updateMatrix(); cloudMesh.setMatrixAt(i, dummy.matrix); });
    cloudMesh.instanceMatrix.needsUpdate = true; cloudMesh.material.opacity = .5 * (1 - smooth(80, 210, camera.position.y)); cloudMesh.visible = cloudMesh.material.opacity > .01;
    spawnRing.rotation.z = t * .5; gear.rotation.z = t * .4; beam.rotation.y = t * (musicOn ? 1.6 : .8);
    fire.intensity = 70 + Math.sin(t * 13) * 12 + Math.sin(t * 7.3) * 10;
    if (boat.children.length) { boat.position.y = Math.sin(t * 1.2) * .25; boat.rotation.z = Math.sin(t * .9) * .05; }
    lanterns.forEach((l, i) => { l.position.y += Math.sin(t * 1.2 + i) * .008; });
    // particles
    const fa = fxGeo.attributes;
    fx.forEach((p, i) => {
      let x, y, z, c, sz;
      if (p.kind === 'ember') { p.t += dt * (.5 + p.b * .5); if (p.t > 1) p.t = 0; x = fireX + Math.sin(p.a + p.t * 6) * .6; z = fireZ + Math.cos(p.a + p.t * 5) * .6; y = fireY + 1 + p.t * 6; const b = (1 - p.t); c = [b, b * .5, b * .15]; sz = .7; }
      else if (p.kind === 'smoke') { p.t += dt * .12; if (p.t > 1) p.t = 0; x = chimney.x + p.t * 6 + Math.sin(p.a + t * .5) * .8; z = chimney.z + p.t * 3; y = chimney.y + p.t * 14; const b = .16 * (1 - p.t); c = [b, b, b * 1.1]; sz = 2 + p.t * 5; }
      else { x = Lf.x + Math.sin(p.a + t * .3 * (p.b + .3)) * 26; z = Lf.z + Math.cos(p.a * 1.7 + t * .25) * 26; y = ground(x, z) + 1.5 + Math.sin(t * 1.3 + p.a) * 1.2; const b = Math.max(0, Math.sin(t * 3 + p.a * 5)) * .9; c = [b, b * .95, b * .45]; sz = .8; }
      fa.position.array.set([x, y, z], i * 3); fa.color.array.set(c, i * 3); fa.aS.array[i] = sz;
    });
    fa.position.needsUpdate = fa.color.needsUpdate = fa.aS.needsUpdate = true;
    // birds
    let q = 0;
    for (const f of flocks) {
      const a0 = f.p + t * f.w;
      for (let b = 0; b < 6; b++) {
        const a = a0 - b * .04 * Math.sign(f.w), off = (b % 2 ? 1 : -1) * Math.ceil(b / 2) * 2.2;
        const cx = f.cx + Math.cos(a) * (f.r + off), cz = f.cz + Math.sin(a) * (f.r + off), cy = f.y + Math.sin(t + b) * 1.5;
        const dx = -Math.sin(a) * Math.sign(f.w), dz = Math.cos(a) * Math.sign(f.w), rx = -dz, rz = dx, flap = Math.sin(t * 9 + b) * 1.1;
        const v = [cx + dx * .8, cy, cz + dz * .8, cx + rx * 2.2, cy + flap, cz + rz * 2.2, cx - dx * .6, cy, cz - dz * .6,
          cx + dx * .8, cy, cz + dz * .8, cx - rx * 2.2, cy + flap, cz - rz * 2.2, cx - dx * .6, cy, cz - dz * .6];
        birdArr.set(v, q); q += 18;
      }
    }
    birdGeo.attributes.position.needsUpdate = true;

    // items
    const ba = beaconGeo.attributes;
    itemList.forEach((it, i) => {
      const f = ep.found.has(it.id), on = it.id === lit;
      it.mesh.rotation.y = f ? 0 : t * (on ? 2.4 : .9) + it.phase;
      it.mesh.position.y = it.base + (f || rm ? 0 : Math.sin(t * 1.4 + it.phase) * .35);
      it.mesh.scale.setScalar(lerp(it.mesh.scale.x, f ? .65 : on ? 1.5 : 1, .15));
      if (!f) it.mesh.material.emissiveIntensity = on ? 1.4 : .55;
      ba.position.array.set([it.mesh.position.x, it.base + 3.2, it.mesh.position.z], i * 3);
      const b = f ? 0 : .9 + Math.sin(t * 2 + it.phase) * .2; ba.color.array.set([it.color.r * b, it.color.g * b, it.color.b * b], i * 3); ba.aS.array[i] = 2.6;
    });
    ba.position.needsUpdate = ba.color.needsUpdate = ba.aS.needsUpdate = true;

    // player movement: one grid cell per step
    if (!pl.to && pl.path.length) { pl.from = pl.cell; pl.to = pl.path.shift(); pl.t = 0; }
    if (pl.to !== null) {
      pl.t += dt * (rm ? 60 : pl.speed);
      if (pl.t >= 1) {
        pl.cell = pl.to; pl.to = null; pl.t = 0; ep.steps++; ep.ret += REWARD.step;
        api.onStep?.(); checkDiscover();
        if (!pl.path.length) arrive();
      }
    }
    const [x0, z0] = gym.cellXZ(pl.from), [x1, z1] = gym.cellXZ(pl.to ?? pl.cell), k = pl.to !== null ? pl.t : 1;
    const px = lerp(x0, x1, k), pz = lerp(z0, z1, k), moving = pl.to !== null;
    if (moving) { tmp.set(x1 - x0, 0, z1 - z0); if (tmp.lengthSq() > 0) pl.heading.lerp(tmp.normalize(), .25).normalize(); }
    player.position.set(px, ground(px, pz) + (moving ? Math.abs(Math.sin(t * 16)) * .25 : 0), pz);
    player.rotation.y = Math.atan2(pl.heading.x, pl.heading.z);
    legs[0].rotation.x = moving ? Math.sin(t * 16) * .7 : 0; legs[1].rotation.x = -legs[0].rotation.x;
    scarf.rotation.x = .3 + Math.sin(t * 5) * .15 + (moving ? .4 : 0);
    if (pl.bump > 0) { pl.bump -= dt * 4; body.position.x = Math.sin(pl.bump * 20) * .15; } else body.position.x = 0;
    halo.scale.setScalar(1 + Math.sin(t * 3) * .08);
    you.position.set(px, player.position.y + 7, pz);
    youGeo.attributes.aS.array[0] = 2.2 + Math.sin(t * 3) * .4; youGeo.attributes.aS.needsUpdate = true;

    // value iteration toward unfound items; the greedy path is the hint
    if (gym.hasGoals) gym.sweep(rm ? 40 : 8);
    if (t - (pl.hintT || 0) > .2) {
      pl.hintT = t;
      const ha = hintGeo.attributes, path = hintOn && !ep.done ? gym.greedyPath(pl.to ?? pl.cell, HINT) : [];
      for (let i = 0; i < HINT; i++) {
        if (i < path.length && gym.V[path[i]] > 0) { const [hx, hz] = gym.cellXZ(path[i]); ha.position.array.set([hx, ground(hx, hz) + .6, hz], i * 3); ha.aS.array[i] = 1; }
        else { ha.position.array.set([0, -99, 0], i * 3); ha.aS.array[i] = 0; }
      }
      ha.position.needsUpdate = ha.aS.needsUpdate = true;
    }
    const ha = hintGeo.attributes;
    for (let i = 0; i < HINT; i++) { const b = ha.aS.array[i] ? (.25 + .55 * Math.max(0, Math.sin(i * .5 - t * 6))) * (1 - i / HINT) : 0; ha.color.array.set([b, b * .82, b * .5], i * 3); }
    ha.color.needsUpdate = true;
  }

  // ---------- game API ----------
  const playerRegion = () => { const [x, z] = gym.cellXZ(pl.to ?? pl.cell); return regionAt(x, z); };
  function stats() {
    const per = {};
    for (const k of Object.keys(ISLES)) { const g = itemList.filter(it => it.group === k); per[k] = { found: g.filter(it => ep.found.has(it.id)).length, n: g.length, name: ISLES[k].name }; }
    return { episode: ep.n, steps: ep.steps, ret: ep.ret, found: ep.found.size, total: itemList.length, islandsDone: ep.islands.size, islands: 5, par, best: ep.best, per, done: ep.done, hint: hintOn };
  }
  const raycaster = new THREE.Raycaster();
  const mob = innerWidth < 900;
  return {
    key: 'env', game: true, scene, regions, regionAt, update, gym, H,
    markerPos: id => items.get(id)?.mesh.position.clone() ?? null,
    ids: () => [...items.keys()],
    isleName: k => ISLES[k].name,
    overview: { target: mob ? new THREE.Vector3(0, 0, 50) : new THREE.Vector3(-104, 0, -10), dist: mob ? 860 : 480, minDist: 90, maxDist: 900, pitch: .9, bounds: 210 },
    labelLOD: 240,
    api, stats, playerRegion,
    playerPos: () => player.position.clone(),
    isWalking: () => pl.to !== null || pl.path.length > 0,
    isFound: id => ep.found.has(id),
    stepsTo(id) {
      const it = items.get(id); if (!it) return null;
      if (!pl.dist || pl.distCell !== pl.cell) { pl.dist = gym.bfs(pl.cell).dist; pl.distCell = pl.cell; }
      return pl.dist[it.cell];
    },
    travelTo(k) { walk(gym.path(pl.to ?? pl.cell, regions[k].spot).slice(pl.to !== null ? 0 : 0), { type: 'island', key: k }); },
    walkToItem(id) { const it = items.get(id); walk(gym.path(pl.to ?? pl.cell, it.cell), { type: 'item', id }); },
    walkToPoint(x, z) { const c = gym.nearestFree(x, z); walk(gym.path(pl.to ?? pl.cell, c), { type: 'cell' }); },
    stepDir(dx, dz) {
      const from = pl.to ?? pl.cell, [i, j] = gym.ij(from);
      const [di, dj] = Math.abs(dx) > Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)];
      const c = (i + di) * gym.n + j + dj;
      if (pl.path.length > 1) pl.path = [];
      if (pl.to !== null && pl.path.length) return false;
      if (!gym.free(c)) { pl.bump = 1; return false; }
      if (pl.to === null) { pl.path = [c]; pl.target = { type: 'manual' }; } else pl.path = [c];
      return true;
    },
    pickGround(ndc, camera) { raycaster.setFromCamera(ndc, camera); const hit = raycaster.intersectObjects([terrain, water], false)[0]; return hit ? hit.point : null; },
    followPose() {
      const h = pl.heading, p = player.position;
      return { pos: new THREE.Vector3(p.x - h.x * 22, p.y + 13, p.z - h.z * 22), look: new THREE.Vector3(p.x + h.x * 8, p.y + 2, p.z + h.z * 8) };
    },
    setHint(on) { hintOn = on; try { localStorage.setItem('game-hint', on ? 'on' : 'off'); } catch {} },
    reset() {
      ep.n++; ep.steps = 0; ep.ret = 0; ep.found.clear(); ep.islands.clear(); ep.done = false;
      for (const it of itemList) { it.ring.visible = false; it.mesh.material.color.copy(it.color); it.mesh.material.emissiveIntensity = .55; }
      refreshGoals(); placePlayer(spawnCell);
    },
  };
}
