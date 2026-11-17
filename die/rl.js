// A small gridworld on the die's dot grid.
// States are grid dots. Walls follow the block outlines, with doors.
// Value iteration (synchronous sweeps) spreads value out from the goal,
// and a few agents act epsilon-greedy on the current values.

const ACT = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class Gym {
  constructor({ n, step, die, blocks, rand }) {
    this.n = n; this.step = step; this.die = die; this.rand = rand;
    this.N = n * n;
    this.V = new Float32Array(this.N);
    this.V2 = new Float32Array(this.N);
    this.shown = new Float32Array(this.N); // eased copy for drawing
    this.wall = new Uint8Array(this.N);
    this.gamma = 0.97; this.cost = 0.002; this.eps = 0.08;
    this.goal = -1; this.sweeps = 0; this.delta = 0; this.episodes = 0; this.returns = [];
    this.buildWalls(blocks);
    this.starts = this.findStarts(blocks.core);
    this.agents = Array.from({ length: 28 }, () => this.spawn({}));
  }
  idx(i, j) { return i * this.n + j; }
  cellOf(x, z) {
    const i = Math.round((x + this.die) / this.step), j = Math.round((z + this.die) / this.step);
    return [Math.max(0, Math.min(this.n - 1, i)), Math.max(0, Math.min(this.n - 1, j))];
  }
  xz(i, j) { return [-this.die + i * this.step, -this.die + j * this.step]; }

  buildWalls(blocks) {
    const n = this.n;
    const mark = (i, j) => { if (i >= 0 && j >= 0 && i < n && j < n) this.wall[this.idx(i, j)] = 1; };
    for (let k = 0; k < n; k++) { mark(k, 0); mark(k, n - 1); mark(0, k); mark(n - 1, k); }
    for (const [key, b] of Object.entries(blocks)) {
      const [i0, j0] = this.cellOf(b.x - b.w / 2, b.z - b.d / 2), [i1, j1] = this.cellOf(b.x + b.w / 2, b.z + b.d / 2);
      const mi = (i0 + i1) >> 1, mj = (j0 + j1) >> 1;
      // Doors: the core opens on all sides; outer blocks open toward the core and toward the die edge.
      const door = (side, k) => {
        if (key === 'core') return Math.abs(k - ((side === 'top' || side === 'bot') ? mi : mj)) <= 1;
        const towardCore = { top: b.z > 0, bot: b.z < 0, left: b.x > 0, right: b.x < 0 }[side];
        const c = (side === 'top' || side === 'bot') ? mi : mj;
        return towardCore ? Math.abs(k - c) <= 1 : (side === 'top' || side === 'bot') && Math.abs(k - c) <= 1;
      };
      for (let i = i0; i <= i1; i++) { if (!door('top', i)) mark(i, j0); if (!door('bot', i)) mark(i, j1); }
      for (let j = j0; j <= j1; j++) { if (!door('left', j)) mark(i0, j); if (!door('right', j)) mark(i1, j); }
    }
  }
  findStarts(core) {
    const out = [];
    const [i0, j0] = this.cellOf(core.x - core.w / 2 - 4, core.z - core.d / 2 - 4), [i1, j1] = this.cellOf(core.x + core.w / 2 + 4, core.z + core.d / 2 + 4);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const inner = i > i0 + 1 && i < i1 - 1 && j > j0 + 1 && j < j1 - 1;
      if (inner && !this.wall[this.idx(i, j)]) out.push([i, j]);
    }
    return out;
  }
  spawn(a) {
    const s = this.starts[Math.floor(this.rand() * this.starts.length)];
    a.i = s[0]; a.j = s[1]; a.pi = a.i; a.pj = a.j; a.t = this.rand(); a.ret = 0; a.steps = 0;
    a.trail = Array.from({ length: 6 }, () => [a.i, a.j]);
    return a;
  }

  setGoal(x, z) {
    let [i, j] = this.cellOf(x, z);
    if (this.wall[this.idx(i, j)]) { // nudge off a wall
      for (const [di, dj] of ACT) if (!this.wall[this.idx(i + di, j + dj)]) { i += di; j += dj; break; }
    }
    const g = this.idx(i, j);
    if (g === this.goal) return false;
    this.goal = g; this.gi = i; this.gj = j;
    this.V.fill(0); this.V2.fill(0); this.sweeps = 0; this.delta = 1;
    this.V[g] = 1;
    return true;
  }

  sweep(k = 1) {
    const { n, V, V2, wall, gamma, cost, goal } = this;
    for (let s = 0; s < k; s++) {
      let delta = 0;
      for (let i = 1; i < n - 1; i++) for (let j = 1; j < n - 1; j++) {
        const c = i * n + j;
        if (wall[c]) { V2[c] = 0; continue; }
        if (c === goal) { V2[c] = 1; continue; }
        let best = 0;
        for (let a = 0; a < 4; a++) {
          const d = (i + ACT[a][0]) * n + (j + ACT[a][1]);
          const v = wall[d] ? V[c] : V[d];
          if (v > best) best = v;
        }
        const nv = best > 0 ? Math.max(0, gamma * best - cost) : 0;
        delta = Math.max(delta, Math.abs(nv - V[c]));
        V2[c] = nv;
      }
      V.set(V2); this.sweeps++; this.delta = delta;
    }
  }

  // One environment step for every agent.
  act() {
    const { n, V, wall } = this;
    for (const a of this.agents) {
      a.pi = a.i; a.pj = a.j;
      let bi = a.i, bj = a.j;
      if (this.rand() < this.eps || V[a.i * n + a.j] === 0) {
        const [di, dj] = ACT[Math.floor(this.rand() * 4)];
        if (!wall[(a.i + di) * n + a.j + dj]) { bi = a.i + di; bj = a.j + dj; }
      } else {
        let bv = -1;
        for (const [di, dj] of ACT) {
          const d = (a.i + di) * n + a.j + dj;
          if (!wall[d] && V[d] > bv) { bv = V[d]; bi = a.i + di; bj = a.j + dj; }
        }
      }
      a.i = bi; a.j = bj; a.steps++; a.ret += -this.cost;
      a.trail.pop(); a.trail.unshift([a.pi, a.pj]);
      a.hit = false;
      if (a.i * n + a.j === this.goal || a.steps > 900) {
        if (a.i * n + a.j === this.goal) {
          a.ret += 1; this.episodes++; a.hit = true;
          this.returns.push(a.ret); if (this.returns.length > 40) this.returns.shift();
        }
        this.spawn(a);
      }
    }
  }
  // Follow the greedy policy from the core to the goal.
  greedyPath(maxSteps = 260) {
    const { n, V, wall } = this, s = this.starts[(this.starts.length / 2) | 0];
    let i = s[0], j = s[1]; const out = [[i, j]];
    for (let k = 0; k < maxSteps && i * n + j !== this.goal; k++) {
      let bv = V[i * n + j], bi = i, bj = j;
      for (const [di, dj] of ACT) { const d = (i + di) * n + j + dj; if (!wall[d] && V[d] > bv) { bv = V[d]; bi = i + di; bj = j + dj; } }
      if (bi === i && bj === j) break;
      i = bi; j = bj; out.push([i, j]);
    }
    return out;
  }
  meanReturn() { return this.returns.length ? this.returns.reduce((s, x) => s + x, 0) / this.returns.length : 0; }

  // Eased values for drawing, so the wavefront glides.
  ease(k) {
    const { V, shown } = this;
    for (let c = 0; c < this.N; c++) shown[c] += (V[c] - shown[c]) * k;
  }
}
