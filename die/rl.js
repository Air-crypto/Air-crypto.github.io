// A gridworld over any walkable mask.
// Value iteration spreads value out from one or more goals, one cell per sweep.
// BFS gives exact shortest paths for the player.

const ACT = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class Gym {
  constructor({ n, step, x0, z0, walkable, gamma = 0.99, cost = 0.001 }) {
    Object.assign(this, { n, step, x0, z0, gamma, cost });
    this.N = n * n;
    this.V = new Float32Array(this.N);
    this.V2 = new Float32Array(this.N);
    this.wall = new Uint8Array(this.N);
    this.isGoal = new Uint8Array(this.N);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const [x, z] = this.xz(i, j);
      this.wall[i * n + j] = i === 0 || j === 0 || i === n - 1 || j === n - 1 || !walkable(x, z) ? 1 : 0;
    }
    this.keepLargestComponent();
    this.sweeps = 0; this.delta = 0;
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
  ij(c) { return [(c / this.n) | 0, c % this.n]; }
  xz(i, j) { return [this.x0 + i * this.step, this.z0 + j * this.step]; }
  cellXZ(c) { const [i, j] = this.ij(c); return this.xz(i, j); }
  cellOf(x, z) {
    const c = v => Math.max(0, Math.min(this.n - 1, v));
    return [c(Math.round((x - this.x0) / this.step)), c(Math.round((z - this.z0) / this.step))];
  }
  free(c) { return c >= 0 && c < this.N && !this.wall[c]; }
  // Nearest walkable cell to a point, skipping any cells in `avoid`.
  nearestFree(x, z, avoid) {
    const [i0, j0] = this.cellOf(x, z);
    for (let r = 0; r < 40; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = i0 + di, j = j0 + dj, c = i * this.n + j;
      if (i > 0 && j > 0 && i < this.n - 1 && j < this.n - 1 && !this.wall[c] && !avoid?.has(c)) return c;
    }
    return i0 * this.n + j0;
  }

  // Breadth-first search from one cell: distance to every cell, and parents for paths.
  bfs(from) {
    const { n, N, wall } = this, dist = new Int32Array(N).fill(-1), prev = new Int32Array(N).fill(-1), q = new Int32Array(N);
    let h = 0, t = 0; q[t++] = from; dist[from] = 0;
    while (h < t) {
      const c = q[h++];
      for (const d of [c + n, c - n, c + 1, c - 1]) if (!wall[d] && dist[d] < 0) { dist[d] = dist[c] + 1; prev[d] = c; q[t++] = d; }
    }
    return { dist, prev };
  }
  path(from, to) {
    if (from === to) return [];
    const { prev } = this.bfs(from);
    if (prev[to] < 0) return [];
    const out = [];
    for (let c = to; c !== from; c = prev[c]) out.push(c);
    return out.reverse();
  }

  // Value iteration toward any of several goals.
  setGoals(cells) {
    this.isGoal.fill(0); this.V.fill(0);
    for (const c of cells) { this.isGoal[c] = 1; this.V[c] = 1; }
    this.sweeps = 0; this.delta = 1; this.hasGoals = cells.length > 0;
  }
  sweep(k = 1) {
    const { n, V, V2, wall, gamma, cost, isGoal } = this;
    for (let s = 0; s < k; s++) {
      let delta = 0;
      for (let i = 1; i < n - 1; i++) for (let j = 1; j < n - 1; j++) {
        const c = i * n + j;
        if (wall[c]) { V2[c] = 0; continue; }
        if (isGoal[c]) { V2[c] = 1; continue; }
        let best = 0;
        for (let a = 0; a < 4; a++) { const v = V[(i + ACT[a][0]) * n + j + ACT[a][1]]; if (v > best) best = v; }
        const nv = best > 0 ? Math.max(0, gamma * best - cost) : 0;
        if (Math.abs(nv - V[c]) > delta) delta = Math.abs(nv - V[c]);
        V2[c] = nv;
      }
      V.set(V2); this.sweeps++; this.delta = delta;
    }
  }
  // Follow the greedy policy on V from a cell.
  greedyPath(from, max = 200) {
    const { n, V, wall } = this, out = [];
    let c = from;
    for (let k = 0; k < max && !this.isGoal[c]; k++) {
      let bv = V[c], bc = c;
      for (const d of [c + n, c - n, c + 1, c - 1]) if (!wall[d] && V[d] > bv) { bv = V[d]; bc = d; }
      if (bc === c) break;
      c = bc; out.push(c);
    }
    return out;
  }
}
