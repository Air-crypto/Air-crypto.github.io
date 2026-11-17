import * as THREE from './three.module.min.js';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export function makeRand(seed = 7) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const C = h => new THREE.Color(h);
export const PAL = { cyan: C('#73d9ff'), copper: C('#ffa565'), ink: C('#e9edf6'), rose: C('#ff86b8'), lilac: C('#cfd8ff'), mint: C('#8dffc4'), dim: C('#6c7a99'), gold: C('#ffd27a') };

const vertSprite = `
attribute vec3 color; attribute float aS; uniform float uPix; varying vec3 vC;
void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=uPix*aS*(200.0/-mv.z); gl_Position=projectionMatrix*mv; }`;
const fragSprite = `
varying vec3 vC; void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); if(d>.5) discard;
  float a=pow(smoothstep(.5,.0,d),1.6); gl_FragColor=vec4(vC*a,a); }`;

// Additive glowing points; each point has a color and a size.
export function spriteMaterial(pix, fog = false) {
  return new THREE.ShaderMaterial({
    vertexShader: vertSprite, fragmentShader: fragSprite, uniforms: { uPix: { value: pix } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog,
  });
}

export function pointsGeo(count) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(count), 1));
  return g;
}

// 2D value noise and fBm, used for terrain.
export function makeNoise(seed = 3) {
  const r = makeRand(seed), P = new Float32Array(512 * 512);
  for (let i = 0; i < P.length; i++) P[i] = r();
  const at = (x, z) => P[((x & 511) << 9) | (z & 511)];
  const n2 = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    return lerp(lerp(at(xi, zi), at(xi + 1, zi), u), lerp(at(xi, zi + 1), at(xi + 1, zi + 1), u), v);
  };
  const fbm = (x, z, o = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * n2(x * f, z * f); f *= 2.03; a *= .5; } return s; };
  return { n2, fbm };
}
