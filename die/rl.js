// A gridworld over any walkable mask.
// Value iteration spreads value out from the goal, one cell per sweep.
// Agents act epsilon-greedy on the current values.

const ACT = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class Gym {
  constructor({ n, step, x0, z0, walkable, rand, agents = 1, eps = 0.08, gamma = 0.99, cost = 0.001 }) {
    Object.assign(this, { n, step, x0, z0, rand, eps, gamma, cost });
    this.N = n * n;
    this.V = new Float32Array(this.N);
    this.V2 = new Float32Array(this.N);
    this.wall = new Uint8Array(this.N);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const [x, z] = this.xz(i, j);
      this.wall[i * n + j] = i === 0 || j === 0 || i === n - 1 || j === n - 1 || !walkable(x, z) ? 1 : 0;
    }
    this.keepLargestComponent();
    this.goal = -1; this.sweeps = 0; this.delta = 0; this.episodes = 0; this.returns = [];
    this.agents = Array.from({ length: agents }, () => ({ i: 0, j: 0, pi: 0, pj: 0, ret: 0, steps: 0, hit: false }));
  }
  // Walls off small pockets so every free cell can reach every other.
  keepLargestComponent() {
    const { n, wall, N } = this, comp = new Int32Array(N).fill(-1), sizes = [];
    for (let s = 0; s < N; s++) {
      if (wall[s] || comp[s] >= 0) continue;
      const id = sizes.length, q = [s]; comp[s] = id; let size = 0;
      while (q.length) {
        const c = q.pop(); size++;
        for (const d of [c + n, c - n, c + 1, c - 1]) if (!wall[d] && comp[d] < 0) { comp[d] = id; q.push(d); }
      }
      sizes.push(size);
    }
    const best = sizes.indexOf(Math.max(...sizes));
    for (let c = 0; c < N; c++) if (!wall[c] && comp[c] !== best) wall[c] = 1;
  }
  idx(i, j) { return i * this.n + j; }
  xz(i, j) { return [this.x0 + i * this.step, this.z0 + j * this.step]; }
  cellOf(x, z) {
    const c = v => Math.max(0, Math.min(this.n - 1, v));
    return [c(Math.round((x - this.x0) / this.step)), c(Math.round((z - this.z0) / this.step))];
  }
  // Nearest walkable cell to a point.
  nearestFree(x, z) {
    const [i0, j0] = this.cellOf(x, z);
    for (let r = 0; r < 30; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = i0 + di, j = j0 + dj;
      if (i > 0 && j > 0 && i < this.n - 1 && j < this.n - 1 && !this.wall[i * this.n + j]) return [i, j];
    }
    return [i0, j0];
  }
  place(a, x, z) { const [i, j] = this.nearestFree(x, z); a.i = a.pi = i; a.j = a.pj = j; a.ret = 0; a.steps = 0; }

  setGoal(x, z) {
    const [i, j] = this.nearestFree(x, z), g = i * this.n + j;
    if (g === this.goal) return false;
    this.goal = g; this.gi = i; this.gj = j;
    this.V.fill(0); this.V[g] = 1; this.sweeps = 0; this.delta = 1;
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
        for (let a = 0; a < 4; a++) { const v = V[(i + ACT[a][0]) * n + j + ACT[a][1]]; if (v > best) best = v; }
        const nv = best > 0 ? Math.max(0, gamma * best - cost) : 0;
        if (Math.abs(nv - V[c]) > delta) delta = Math.abs(nv - V[c]);
        V2[c] = nv;
      }
      V.set(V2); this.sweeps++; this.delta = delta;
    }
  }
  // One step for every agent. Returns true if any agent reached the goal.
  act() {
    const { n, V, wall } = this;
    let any = false;
    for (const a of this.agents) {
      a.pi = a.i; a.pj = a.j; a.hit = false;
      if (a.i * n + a.j === this.goal) continue; // waits at the goal
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
      a.i = bi; a.j = bj; a.steps++; a.ret -= this.cost;
      if (a.i * n + a.j === this.goal) {
        a.ret += 1; a.hit = true; any = true; this.episodes++;
        this.returns.push(a.ret); if (this.returns.length > 30) this.returns.shift();
        a.ret = 0; a.steps = 0;
      }
    }
    return any;
  }
  meanReturn() { return this.returns.length ? this.returns.reduce((s, x) => s + x, 0) / this.returns.length : 0; }
}
