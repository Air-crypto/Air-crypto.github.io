// World 2: a small open world that an RL agent plays through.
// Five islands, one per section, joined by causeways. The agent runs value
// iteration on a gridworld over the terrain and walks quest to quest.
import * as THREE from './three.module.min.js';
import { clamp, lerp, makeRand, makeNoise, PAL, spriteMaterial, pointsGeo } from './gfx.js?v=5';
import { Gym } from './rl.js?v=5';

const ISLES = {
  about: { x: 0, z: 0, r: 42, h: 5, kind: 'meadow', name: 'Spawn' },
  work: { x: -128, z: -88, r: 48, h: 30, kind: 'peaks', name: 'The Ridge' },
  projects: { x: 128, z: -86, r: 44, h: 10, kind: 'mesa', name: 'The Workshop' },
  life: { x: 122, z: 104, r: 48, h: 6, kind: 'forest', name: 'The Grove' },
  io: { x: -118, z: 104, r: 30, h: 8, kind: 'cape', name: 'The Lighthouse' },
};

export function createEnvWorld({ renderer, pix, GROUPS, inGroup, byId, reduced }) {
  const rand = makeRand(11), { fbm } = makeNoise(5);
  const scene = new THREE.Scene();
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // ---------- terrain height ----------
  function isle(I, x, z) {
    const dx = x - I.x, dz = z - I.z, d0 = Math.hypot(dx, dz) / I.r;
    if (d0 > 1.45) return -99;
    const d = d0 + (fbm(x * .03 + I.x, z * .03) - .5) * .38;
    const base = 1 - smooth(.5, 1.12, d);
    let h;
    if (I.kind === 'peaks') {
      const rid = 1 - Math.abs(2 * fbm(x * .03 + 9, z * .03 + 4, 5) - 1);
      h = 2.2 * base + I.h * Math.pow(1 - smooth(.1, .78, d), 1.25) * (.4 + .6 * rid);
    } else if (I.kind === 'mesa') {
      const v = base * I.h + fbm(x * .05, z * .05) * 4 * base;
      h = Math.floor(v / 2.6) * 2.6 + (v % 2.6) * .12;
    } else if (I.kind === 'forest') {
      h = I.h * base + fbm(x * .06, z * .06) * 2.4 * base;
      const dl = Math.hypot(x - (I.x + 10), z - (I.z - 6));
      h -= 8 * (1 - smooth(7, 15, dl));
    } else if (I.kind === 'cape') {
      h = I.h * Math.pow(base, .6) + fbm(x * .07, z * .07) * 1.5 * base;
    } else {
      h = I.h * base + fbm(x * .06, z * .06) * 1.8 * base;
    }
    return h - 2 + 3 * base;
  }
  const bridges = Object.entries(ISLES).filter(([k]) => k !== 'about').map(([, I]) => [ISLES.about, I]);
  function H(x, z) {
    let h = -6 + fbm(x * .02, z * .02) * 2.5;
    for (const I of Object.values(ISLES)) h = Math.max(h, isle(I, x, z));
    for (const [A, B] of bridges) {
      const vx = B.x - A.x, vz = B.z - A.z, t = clamp(((x - A.x) * vx + (z - A.z) * vz) / (vx * vx + vz * vz));
      const ds = Math.hypot(x - (A.x + vx * t), z - (A.z + vz * t));
      h = Math.max(h, 1.1 + Math.sin(t * Math.PI * 9) * .12 - 4 * smooth(2.4, 5.6, ds));
    }
    return h;
  }
  const bridgeDist = (x, z) => Math.min(...bridges.map(([A, B]) => { const vx = B.x - A.x, vz = B.z - A.z, t = clamp(((x - A.x) * vx + (z - A.z) * vz) / (vx * vx + vz * vz)); return Math.hypot(x - (A.x + vx * t), z - (A.z + vz * t)); }));
  const slope = (x, z) => Math.hypot(H(x + 1.4, z) - H(x - 1.4, z), H(x, z + 1.4) - H(x, z - 1.4)) / 2.8;
  const isleOf = (x, z) => { let best = null, bd = 1e9; for (const [k, I] of Object.entries(ISLES)) { const d = Math.hypot(x - I.x, z - I.z) / I.r; if (d < bd) { bd = d; best = k; } } return [best, bd]; };

  // ---------- sky, light, fog ----------
  const SUN = new THREE.Vector3(-.55, .16, -.82).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uSun: { value: SUN }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 uSun; uniform float uTime;
      float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){ float h=vP.y, s=max(dot(vP,uSun),0.0);
        vec3 zen=vec3(.035,.05,.12), mid=vec3(.12,.13,.27), hor=vec3(.86,.5,.36);
        vec3 c=mix(hor,mid,smoothstep(-.02,.22,h)); c=mix(c,zen,smoothstep(.2,.7,h));
        c+=vec3(1.0,.62,.38)*pow(s,10.0)*.55+vec3(1.0,.85,.65)*smoothstep(.9985,.9995,s);
        vec2 g=floor(vP.xz/(vP.y+.2)*180.0); float st=step(.996,h21(g))*smoothstep(.25,.6,h)*(.6+.4*sin(uTime*2.0+h21(g)*40.0));
        c+=vec3(st);
        if(h<0.0) c=mix(hor*.55,vec3(.05,.08,.14),smoothstep(0.0,-.15,h));
        gl_FragColor=vec4(c,1.0); }`,
  }));
  sky.renderOrder = -2; scene.add(sky);
  scene.fog = new THREE.Fog(0x2a2a48, 260, 1500);
  scene.add(new THREE.HemisphereLight(0x8fa6ff, 0x1b1626, .9));
  const sun = new THREE.DirectionalLight(0xffb48a, 2.4); sun.position.copy(SUN).multiplyScalar(400); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x6f86ff, .5); fill.position.set(200, 120, 260); scene.add(fill);

  // ---------- terrain mesh ----------
  const SIZE = 420, SEG = 200;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, H(tp.getX(i), tp.getZ(i)));
  const terrain = tg.toNonIndexed(); terrain.computeVertexNormals();
  const P = terrain.attributes.position, cols = new Float32Array(P.count * 3), col = new THREE.Color();
  const C = { sand: new THREE.Color('#c6a676'), wet: new THREE.Color('#7d6d55'), grass: new THREE.Color('#58875a'), forest: new THREE.Color('#3a6446'), rock: new THREE.Color('#6d6878'), snow: new THREE.Color('#eef1f7'), clay: new THREE.Color('#b8704f'), clay2: new THREE.Color('#d39466'), path: new THREE.Color('#a88f6a') };
  for (let f = 0; f < P.count; f += 3) {
    const x = (P.getX(f) + P.getX(f + 1) + P.getX(f + 2)) / 3, y = (P.getY(f) + P.getY(f + 1) + P.getY(f + 2)) / 3, z = (P.getZ(f) + P.getZ(f + 1) + P.getZ(f + 2)) / 3;
    const [k, d] = isleOf(x, z), kind = ISLES[k].kind, n = terrain.attributes.normal.getY(f), j = (rand() - .5) * .06;
    if (y < .3) col.copy(C.wet);
    else if (d > 1.05 && y < 1.6) col.copy(C.path);
    else if (y < 1.1) col.copy(C.sand);
    else if (kind === 'peaks') col.copy(y > 21 ? C.snow : n < .82 || y > 9 ? C.rock : C.grass);
    else if (kind === 'mesa') col.copy(n < .9 ? C.clay : Math.floor(y / 2.6) % 2 ? C.clay2 : C.sand).lerp(C.grass, y < 3 ? .5 : 0);
    else if (kind === 'forest') col.copy(C.forest);
    else col.copy(n < .8 ? C.rock : C.grass);
    col.offsetHSL(0, 0, j);
    for (let v = 0; v < 3; v++) col.toArray(cols, (f + v) * 3);
  }
  terrain.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  scene.add(new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95, metalness: 0 })));

  // ---------- water ----------
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x163450, roughness: .28, metalness: .35, transparent: true, opacity: .9 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = 0; scene.add(water);
  const SPK = 700, spkGeo = pointsGeo(SPK), spk = [];
  for (let i = 0; i < SPK; i++) { let x, z; do { x = (rand() - .5) * 600; z = (rand() - .5) * 600; } while (H(x, z) > -.5); spk.push([x, z, rand() * 6.28]); }
  const sparkles = new THREE.Points(spkGeo, spriteMaterial(pix * 1.6)); sparkles.frustumCulled = false; scene.add(sparkles);

  // ---------- props ----------
  const dummy = new THREE.Object3D();
  function scatter(n, ok) { const out = []; let guard = 0; while (out.length < n && guard++ < n * 60) { const x = (rand() - .5) * SIZE, z = (rand() - .5) * SIZE, y = H(x, z); if (ok(x, y, z)) out.push([x, y, z]); } return out; }
  const regions = {};
  for (const [k, I] of Object.entries(ISLES)) {
    const dir = k === 'about' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(I.x, 0, I.z).normalize();
    // Stand past the island center and look out over the far coast to the open sea.
    const k0 = k === 'about' ? .2 : .32, ex = I.x + dir.x * I.r * k0, ez = I.z + dir.z * I.r * k0;
    regions[k] = { center: new THREE.Vector3(I.x, Math.max(16, H(I.x, I.z) + 18), I.z), stand: { eye: new THREE.Vector3(ex, Math.max(1.2, H(ex, ez)) + 5, ez), dir } };
  }
  const nearEye = (x, z, r) => Object.values(regions).some(R => { const dx = x - R.stand.eye.x, dz = z - R.stand.eye.z, ahead = dx * R.stand.dir.x + dz * R.stand.dir.z; return Math.hypot(dx, dz) < r || (ahead > 0 && ahead < 46 && Math.abs(dx * R.stand.dir.z - dz * R.stand.dir.x) < 16); });

  const trees = scatter(520, (x, y, z) => { const [k, d] = isleOf(x, z); return d < .95 && y > 1.6 && y < 9 && slope(x, z) < .5 && (k === 'forest' ? 1 : k === 'meadow' ? rand() < .35 : k === 'cape' ? rand() < .25 : k === 'peaks' ? rand() < .5 : rand() < .08) && !nearEye(x, z, 9); });
  const treeGeo = new THREE.ConeGeometry(1.5, 4.6, 6); treeGeo.translate(0, 2.3, 0);
  const treeMesh = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: .9 }), trees.length);
  trees.forEach(([x, y, z], i) => {
    const s = .7 + rand() * .9; dummy.position.set(x, y - .2, z); dummy.scale.set(s, s * (.8 + rand() * .6), s); dummy.rotation.y = rand() * 6; dummy.updateMatrix();
    treeMesh.setMatrixAt(i, dummy.matrix); treeMesh.setColorAt(i, new THREE.Color().setHSL(.32 + rand() * .08, .32, .2 + rand() * .12));
  });
  scene.add(treeMesh);
  const rocks = scatter(160, (x, y, z) => { const [k, d] = isleOf(x, z); return d < 1 && y > .8 && (k === 'peaks' || k === 'mesa' || k === 'cape') && !nearEye(x, z, 8); });
  const rockMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1.3, 0), new THREE.MeshStandardMaterial({ color: 0x77738a, flatShading: true, roughness: 1 }), rocks.length);
  rocks.forEach(([x, y, z], i) => { const s = .5 + rand() * 1.4; dummy.position.set(x, y, z); dummy.scale.set(s, s * .7, s); dummy.rotation.set(rand(), rand() * 6, rand()); dummy.updateMatrix(); rockMesh.setMatrixAt(i, dummy.matrix); });
  scene.add(rockMesh);
  // clouds
  const cloudMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(10, 1), new THREE.MeshStandardMaterial({ color: 0xd8dcf0, flatShading: true, roughness: 1, transparent: true, opacity: .55 }), 18);
  const clouds = Array.from({ length: 18 }, () => ({ x: (rand() - .5) * 700, z: (rand() - .5) * 700, y: 70 + rand() * 40, s: .7 + rand() * 1.5, v: 2 + rand() * 3 }));
  scene.add(cloudMesh);

  // landmarks
  const glow = (c, i = 1.6) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, flatShading: true });
  const stone = new THREE.MeshStandardMaterial({ color: 0x9a96a8, flatShading: true, roughness: .9 });
  const add = (geo, mat, x, z, y = null, rot = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, (y ?? H(x, z)), z); m.rotation.y = rot; scene.add(m); return m; };
  // spawn ring
  const A = ISLES.about, spawn = add(new THREE.TorusGeometry(4.2, .35, 6, 24), glow(0xcfd8ff, 1.2), A.x, A.z, H(A.x, A.z) + 5.2);
  add(new THREE.CylinderGeometry(4.6, 5.2, .8, 8), stone, A.x, A.z, H(A.x, A.z) + .3);
  // ridge obelisks
  const W = ISLES.work, obelisks = [];
  for (let i = 0; i < 3; i++) { const a = -.9 + i * .9, x = W.x + Math.cos(a) * 22 + 14, z = W.z + Math.sin(a) * 22 + 18; const o = add(new THREE.BoxGeometry(2, 14, 2), glow(0x2c4c6a, .4), x, z, H(x, z) + 6); obelisks.push(o); add(new THREE.OctahedronGeometry(1.1), glow(0x73d9ff, 2), x, z, H(x, z) + 14.5); }
  // workshop pylons and a gear
  const Pj = ISLES.projects;
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + .4, x = Pj.x + Math.cos(a) * 16, z = Pj.z + Math.sin(a) * 16; add(new THREE.CylinderGeometry(.8, 1.2, 10, 6), stone, x, z, H(x, z) + 5); add(new THREE.SphereGeometry(1.1, 8, 6), glow(0xffa565, 2.2), x, z, H(x, z) + 10.6); }
  const gear = add(new THREE.TorusGeometry(6, 1.1, 4, 12), glow(0xffa565, .6), Pj.x, Pj.z, H(Pj.x, Pj.z) + 12); gear.rotation.x = Math.PI / 2.4;
  // grove lanterns
  const Lf = ISLES.life, lanterns = [];
  for (let i = 0; i < 9; i++) { const a = i * .7, r = 10 + (i % 3) * 5, x = Lf.x + 10 + Math.cos(a) * r, z = Lf.z - 6 + Math.sin(a) * r; lanterns.push(add(new THREE.SphereGeometry(.55, 8, 6), glow(0xff86b8, 2.5), x, z, Math.max(H(x, z), 0) + 3 + rand() * 2)); }
  // lighthouse
  const Io = ISLES.io, lx = Io.x - 6, lz = Io.z + 8, ly = H(lx, lz);
  add(new THREE.CylinderGeometry(2.2, 3.4, 18, 10), new THREE.MeshStandardMaterial({ color: 0xe9e4dc, flatShading: true }), lx, lz, ly + 9);
  add(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 10), new THREE.MeshStandardMaterial({ color: 0xb35a4a, flatShading: true }), lx, lz, ly + 12);
  add(new THREE.SphereGeometry(1.8, 10, 8), glow(0x8dffc4, 3), lx, lz, ly + 19.5);
  const beamGeo = new THREE.ConeGeometry(9, 70, 16, 1, true); beamGeo.translate(0, -35, 0); beamGeo.rotateZ(Math.PI / 2);
  const beam = add(beamGeo, new THREE.MeshBasicMaterial({ color: 0x8dffc4, transparent: true, opacity: .08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), lx, lz, ly + 19.5);

  // ---------- item crystals ----------
  const nodes = new Map(), crystalGeo = new THREE.OctahedronGeometry(.85);
  for (const [g, R] of Object.entries(regions)) {
    const items = inGroup(g), st = R.stand, f = st.dir, rgt = new THREE.Vector3(-f.z, 0, f.x), span = Math.min(1.1, .22 * items.length);
    items.forEach((it, i) => {
      const a = items.length === 1 ? 0 : -span / 2 + span * i / (items.length - 1), dist = 30 + (i % 2) * 9;
      let x = st.eye.x + (f.x * Math.cos(a) + rgt.x * Math.sin(a)) * dist, z = st.eye.z + (f.z * Math.cos(a) + rgt.z * Math.sin(a)) * dist;
      if (H(x, z) < .6) { x = lerp(x, st.eye.x, .5); z = lerp(z, st.eye.z, .5); }
      const y = Math.max(H(x, z), .4) + 2.2, color = new THREE.Color(GROUPS[g].hue);
      const m = new THREE.Mesh(crystalGeo, glow(color, 1.1)); m.position.set(x, y, z); scene.add(m);
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 3, 4), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .5 })); pil.position.set(x, y - 1.5, z); scene.add(pil);
      nodes.set(it.id, { id: it.id, group: g, pos: new THREE.Vector3(x, y, z), mesh: m, base: y, phase: rand() * 6, color });
    });
  }
  const regionAt = (x, z) => { const [k, d] = isleOf(x, z); return d < 1.05 ? k : null; };

  // ---------- agent and gridworld ----------
  const gym = new Gym({ n: 150, step: 2.8, x0: -210, z0: -210, walkable: (x, z) => bridgeDist(x, z) < 3.4 || (H(x, z) > .55 && slope(x, z) < 1.1), rand, agents: 4, eps: .06 });
  gym.agents.forEach((a, i) => gym.place(a, A.x + (i - 1.5) * 3, A.z + 6));
  const hero = new THREE.Group();
  const heroBody = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), glow(0xffa565, 2.4)); hero.add(heroBody);
  const heroRing = new THREE.Mesh(new THREE.TorusGeometry(2, .12, 4, 24), glow(0xffd27a, 2)); heroRing.rotation.x = Math.PI / 2; hero.add(heroRing);
  const heroLight = new THREE.PointLight(0xffa565, 60, 40, 2); hero.add(heroLight);
  scene.add(hero);
  const mates = new THREE.Points(pointsGeo(3), spriteMaterial(pix * 6)); mates.frustumCulled = false; scene.add(mates);
  const TR = 90, trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TR * 3), 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TR * 3), 3));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); trail.frustumCulled = false; scene.add(trail);
  const hist = [];
  // goal gem and light pillar
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.6), glow(0xffd27a, 2.6)); scene.add(gem);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 120, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: .13, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); scene.add(pillar);
  const BURST = 60, burstGeo = pointsGeo(BURST), burst = new THREE.Points(burstGeo, spriteMaterial(pix * 3)); burst.frustumCulled = false; scene.add(burst);
  const bp = Array.from({ length: BURST }, () => ({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, life: 0 }));

  const ORDER = ['about', 'work', 'projects', 'life', 'io'];
  const sim = { acc: 0, tick: 0, quest: 1, goalKey: null, goalPos: new THREE.Vector3(), wait: 0, rewards: 0, lastHit: -9, onReward: null };
  function questTarget(k) {
    const I = ISLES[k], R = regions[k];
    // Spawn ring for About; otherwise a point on the island facing the core.
    if (k === 'about') return [I.x, I.z + 6];
    return [lerp(R.stand.eye.x, I.x, .35), lerp(R.stand.eye.z, I.z, .35)];
  }
  function chooseGoal(s) {
    let key, xz;
    if (s.view === 'ground' && s.region) { key = s.region; const st = regions[key].stand; xz = [st.eye.x + st.dir.x * 12 - st.dir.z * 9, st.eye.z + st.dir.z * 12 + st.dir.x * 9]; }
    else if (s.hoverRegion) { key = s.hoverRegion; xz = questTarget(key); }
    else { key = ORDER[sim.quest % ORDER.length]; xz = questTarget(key); }
    if (gym.setGoal(xz[0], xz[1])) { sim.goalKey = key; const [gx, gz] = gym.xz(gym.gi, gym.gj); sim.goalPos.set(gx, Math.max(H(gx, gz), .4), gz); }
  }
  function reward(now) {
    sim.rewards++; sim.lastHit = now;
    for (const p of bp) { p.x = hero.position.x; p.y = hero.position.y; p.z = hero.position.z; const a = rand() * 6.28, b = rand() * 1.4; p.vx = Math.cos(a) * Math.cos(b) * 14; p.vz = Math.sin(a) * Math.cos(b) * 14; p.vy = Math.sin(b) * 16 + 4; p.life = 1; }
    sim.onReward?.();
  }

  // ---------- per frame ----------
  const heroPos = new THREE.Vector3();
  function update(s) {
    const { dt, t, now, musicOn, lit } = s, rm = reduced.matches;
    sky.material.uniforms.uTime.value = t;
    // sparkles
    const sa = spkGeo.attributes;
    spk.forEach(([x, z, ph], i) => { sa.position.array.set([x, .15, z], i * 3); const b = Math.max(0, Math.sin(t * 1.3 + ph * 3)) ** 6 * (musicOn ? 1 : .6); sa.color.array.set([b, b * .9, b * .8], i * 3); sa.aS.array[i] = 1; });
    sa.position.needsUpdate = sa.color.needsUpdate = sa.aS.needsUpdate = true;
    // clouds
    clouds.forEach((c, i) => { c.x += c.v * dt; if (c.x > 380) c.x = -380; dummy.position.set(c.x, c.y, c.z); dummy.scale.set(c.s * 1.8, c.s * .45, c.s); dummy.rotation.set(0, i, 0); dummy.updateMatrix(); cloudMesh.setMatrixAt(i, dummy.matrix); });
    cloudMesh.instanceMatrix.needsUpdate = true;
    cloudMesh.material.opacity = .5 * (1 - smooth(70, 190, s.camera.position.y));
    cloudMesh.visible = cloudMesh.material.opacity > .01;
    // landmarks
    spawn.rotation.y = t * .6; gear.rotation.z = t * .4; beam.rotation.y = t * (musicOn ? 1.6 : .8);
    lanterns.forEach((l, i) => { l.position.y += Math.sin(t * 1.2 + i) * .01; });
    for (const nd of nodes.values()) { const on = nd.id === lit; nd.mesh.rotation.y = t * (on ? 2.4 : .8) + nd.phase; nd.mesh.position.y = nd.base + Math.sin(t * 1.4 + nd.phase) * .35; nd.mesh.scale.setScalar(lerp(nd.mesh.scale.x, on ? 1.7 : 1, .15)); nd.mesh.material.emissiveIntensity = on ? 3 : 1.4; }

    // RL: pick goal, sweep, act
    chooseGoal(s);
    sim.acc += dt * (rm ? 4000 : 150);
    const k = Math.min(8, Math.floor(sim.acc)); sim.acc -= k; if (k) gym.sweep(k);
    const STEP = musicOn ? .06 : .085;
    sim.tick += dt;
    while (sim.tick > STEP) {
      sim.tick -= STEP;
      if (gym.act() && gym.agents[0].hit) {
        reward(now);
        if (!(s.view === 'ground' && s.region) && !s.hoverRegion) sim.quest++;
      }
      const a = gym.agents[0], [hx, hz] = gym.xz(a.i, a.j);
      hist.unshift([hx, Math.max(H(hx, hz), .4) + 1.6, hz]); if (hist.length > TR) hist.pop();
    }
    const f = sim.tick / STEP, a0 = gym.agents[0];
    const [x0, z0] = gym.xz(a0.pi, a0.pj), [x1, z1] = gym.xz(a0.i, a0.j), hx = lerp(x0, x1, f), hz = lerp(z0, z1, f);
    heroPos.set(hx, Math.max(H(hx, hz), .4) + 1.8 + Math.sin(t * 6) * .18, hz);
    hero.position.lerp(heroPos, rm ? 1 : .5);
    if (x1 !== x0 || z1 !== z0) hero.rotation.y = Math.atan2(x1 - x0, z1 - z0);
    heroBody.rotation.x = t * 2; heroRing.rotation.z = t * 3;
    heroLight.intensity = 60 + Math.max(0, 1 - (now - sim.lastHit) * 2) * 140;
    const mp = mates.geometry.attributes;
    for (let i = 1; i < 4; i++) { const a = gym.agents[i], [ax, az] = gym.xz(lerp(a.pi, a.i, f), lerp(a.pj, a.j, f)); mp.position.array.set([ax, Math.max(H(ax, az), .4) + 1.4, az], (i - 1) * 3); mp.color.array.set([.45, .85, 1], (i - 1) * 3); mp.aS.array[i - 1] = 1; }
    mp.position.needsUpdate = mp.color.needsUpdate = mp.aS.needsUpdate = true;
    const ta = trailGeo.attributes;
    for (let i = 0; i < TR; i++) { const h = hist[Math.min(i, hist.length - 1)] || [hero.position.x, hero.position.y, hero.position.z]; ta.position.array.set(h, i * 3); const b = (1 - i / TR) * .9; ta.color.array.set([b, b * .62, b * .38], i * 3); }
    ta.position.needsUpdate = ta.color.needsUpdate = true;
    gem.position.set(sim.goalPos.x, sim.goalPos.y + 3 + Math.sin(t * 2) * .4, sim.goalPos.z); gem.rotation.y = t * 1.5;
    pillar.position.set(sim.goalPos.x, sim.goalPos.y + 60, sim.goalPos.z);
    const pd = Math.hypot(s.camera.position.x - sim.goalPos.x, s.camera.position.z - sim.goalPos.z);
    pillar.material.opacity = (.1 + Math.max(0, 1 - (now - sim.lastHit) * 1.5) * .3) * smooth(30, 90, pd);
    const ba = burstGeo.attributes;
    bp.forEach((p, i) => { if (p.life > 0) { p.life -= dt * .9; p.vy -= 22 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; } ba.position.array.set([p.x, p.y, p.z], i * 3); const b = Math.max(0, p.life); ba.color.array.set([b, b * .82, b * .45], i * 3); ba.aS.array[i] = 1.4; });
    ba.position.needsUpdate = ba.color.needsUpdate = ba.aS.needsUpdate = true;
  }

  const label = k => ({ about: 'About', work: 'Work', projects: 'Projects', life: 'Life', io: 'Contact' }[k]);
  const mob = innerWidth < 900;
  return {
    key: 'env', scene, regions, regionAt, update, sim, gym, H,
    markerPos: id => nodes.get(id)?.mesh.position.clone() ?? null,
    ids: () => [...nodes.keys()],
    isleName: k => ISLES[k].name,
    overview: { target: mob ? new THREE.Vector3(0, 0, 70) : new THREE.Vector3(-78, 0, 18), dist: mob ? 860 : 450, minDist: 90, maxDist: 900, pitch: .9, bounds: 210 },
    labelLOD: 240,
    hud: () => `◆ Episode ${String(gym.episodes).padStart(3, '0')}  ·  R̄ ${gym.meanReturn().toFixed(2)}  ·  ε ${gym.eps}  ·  Quest → ${label(sim.goalKey) || '…'}`,
  };
}
