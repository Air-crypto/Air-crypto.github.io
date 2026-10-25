// Gameplay Lab episode viewer. Plain JS, no build step.
(() => {
  'use strict';
  const LAB = window.LAB;
  const INITIAL_HASH = location.hash;  // before the first render rewrites it
  const $ = id => document.getElementById(id);
  const finite = Number.isFinite;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const fmt = (v, p = 2) => finite(v) ? v.toLocaleString('en-US', {maximumFractionDigits: p}) : '–';
  const sec = (ms, p = 1) => finite(ms) ? (ms / 1000).toFixed(p) + ' s' : '–';
  const dur = ms => {
    if (!finite(ms)) return '–';
    const s = ms / 1000;
    return s < 60 ? s.toFixed(1) + ' s' : Math.floor(s / 60) + ' m ' + String(Math.round(s % 60)).padStart(2, '0') + ' s';
  };
  const usd = v => finite(v) ? '$' + (v < 0.01 ? v.toFixed(4) : v.toFixed(3)) : '–';
  const median = a => {
    const v = a.filter(finite).sort((x, y) => x - y);
    return v.length ? (v[(v.length - 1) >> 1] + v[v.length >> 1]) / 2 : null;
  };
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // BASE is '' when the data comes from the page's own server, or the live server URL when the hosted page shows live data.
  let BASE = '';
  const u = p => !p || /^(https?:|data:|blob:)/.test(p) ? p : BASE + p;
  const GAMES = LAB.games;
  const EPS = LAB.episodes;
  const cache = new Map();
  const waiting = new Map();
  // Static sites pack each episode's images into a few .bin files; cut them out once per episode.
  async function unpack(d) {
    if (!d.packs) return d;
    const bufs = new Map(), urls = new Map();
    for (const [name, [pack, off, len, type]] of Object.entries(d.packs)) {
      if (!bufs.has(pack)) bufs.set(pack, fetch(u(pack)).then(r => { if (!r.ok) throw new Error('Could not load ' + pack); return r.arrayBuffer(); }));
    }
    for (const [name, [pack, off, len, type]] of Object.entries(d.packs)) {
      urls.set(name, URL.createObjectURL(new Blob([(await bufs.get(pack)).slice(off, off + len)], {type})));
    }
    const walk = x => Array.isArray(x) ? x.map(walk)
      : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v)]))
      : typeof x === 'string' && urls.has(x) ? urls.get(x) : x;
    const out = walk(d);
    delete out.packs;
    return out;
  }
  window.LAB_EP = d => {
    const done = (ok, value) => { (waiting.get(d.i) || []).forEach(w => w[ok ? 0 : 1](value)); waiting.delete(d.i); };
    unpack(d).then(r => { cache.set(r.i, r); done(true, r); }, err => done(false, err));
  };
  function load(i) {
    if (cache.has(i)) return Promise.resolve(cache.get(i));
    if (LAB.live) {
      return fetch(u('live/ep/' + String(i).padStart(3, '0') + '.json'), {cache: 'no-store'})
        .then(r => { if (!r.ok) throw new Error('Could not load episode ' + i); return r.json(); })
        .then(unpack).then(d => { cache.set(i, d); return d; });
    }
    return new Promise((resolve, reject) => {
      const first = !waiting.has(i);
      waiting.set(i, [...(waiting.get(i) || []), [resolve, reject]]);
      if (!first) return;
      const s = document.createElement('script');
      s.src = 'data/ep/' + String(i).padStart(3, '0') + '.js';
      s.onerror = () => { (waiting.get(i) || []).forEach(w => w[1](new Error('Could not load episode ' + i))); waiting.delete(i); };
      document.body.appendChild(s);
    });
  }

  // ---------- vocabulary ----------
  const MARKS = {
    reward_up: {label: 'Reward gained', color: '--up', text: 'The selected reward version went up at this step.'},
    reward_down: {label: 'Reward lost', color: '--down', text: 'The selected reward version went down at this step.'},
    life_lost: {label: 'Life lost', color: '--down', text: 'The spare-lives counter went down between the input and returned observation.'},
    damage: {label: 'Damage', color: '--down', text: 'Hero HP went down between the input and returned observation.'},
    no_change: {label: 'No visible change', color: '--mark', text: 'The returned frame is byte-identical to the previous observation after an act or wait.'},
    repeat: {label: 'Repeated action', color: '--throttle', text: 'The same requested action ran at least ' + LAB.markers.repeat_run + ' times in a row.'},
    not_delivered: {label: 'Not delivered', color: '--down', text: 'The receipt says this input was not delivered to the game.'},
    slow: {label: 'Slow decision', color: '--api', text: 'Decision gap of ' + LAB.markers.slow_gap_ms / 1000 + ' s or more between observations.'},
    terminal: {label: 'Episode end', color: '--ink', text: 'The environment reported a terminal or truncated status here.'},
  };
  const MARK_ORDER = ['reward_up', 'reward_down', 'life_lost', 'damage', 'no_change', 'repeat', 'not_delivered', 'slow', 'terminal'];
  const TOOL_COLOR = {act: '--act', wait: '--wait', look: '--look', reset: '--reset'};
  const outcomeText = e => {
    if (e.live?.running) return 'running';
    const v = e.reviewed || e.outcome || 'unknown';
    return String(v).replaceAll('_', ' ');
  };
  const outcomeClass = e => {
    const v = String(e.reviewed || e.outcome || '');
    if (e.live?.running) return 'live';
    if (!e.complete) return 'warn';
    if (/loss|death/.test(v)) return 'bad';
    if (/timeout|time_limit/.test(v)) return '';
    return 'ok';
  };
  const modelName = e => String(e.model).split('/').pop();
  const runName = e => e.repeat ? 'run ' + e.repeat : e.label;
  const epLabel = e => `${modelName(e)}, ${e.effort}, ${runName(e)}`;
  const game = id => GAMES.find(g => g.id === id);
  const rewardDef = (g, id) => game(g).rewards.find(r => r.id === id);
  const gameClockLabel = d => d.game_clock?.field === 'game_ticks' ? 'turns' : 's';

  function actionText(s, long) {
    if (!s || s.tool === 'reset') return 'Reset';
    if (s.tool === 'look') return 'Look';
    const a = s.req || {};
    if (a.ui) return 'UI ' + (a.ui.click || (a.ui.drag_to ? 'drag' : 'hover'));
    const parts = [...(a.buttons || [])];
    const stick = (v, n) => v && (Math.abs(v[0]) > .01 || Math.abs(v[1]) > .01) ? `${n}(${fmt(v[0], 2)},${fmt(v[1], 2)})` : null;
    [stick(a.left_stick, 'L'), stick(a.right_stick, 'R')].forEach(x => x && parts.push(x));
    const what = parts.length ? parts.join('+') : (s.tool === 'wait' ? 'Wait' : 'Neutral');
    return long && a.duration_ms ? `${what} for ${a.duration_ms} ms` : what;
  }
  function delivery(s) {
    if (s.tool === 'reset') return {text: 'Reset observation', cls: ''};
    if (s.tool === 'look') return {text: 'Observation only, no input', cls: ''};
    if (s.executed === true) return {text: 'Delivered (receipt)', cls: 'good'};
    if (s.executed === false) return {text: 'Not delivered', cls: 'bad'};
    return {text: 'No delivery receipt in this recording', cls: ''};
  }

  // ---------- state + routing ----------
  if (!GAMES.length) {
    document.querySelector('.views').hidden = true;
    $('runs-view').hidden = false;
    $('runs-view').innerHTML = '<div class="waiting"><h1>Waiting for the first episode</h1><p>No recordings yet in the run folders this server watches. The page checks every two seconds.</p></div>';
    if (LAB.live) setInterval(() => fetch('live/index.json', {cache: 'no-store'}).then(r => r.json()).then(d => { if (d.games.length) location.reload(); }).catch(() => {}), LAB.poll_ms || 2000);
    return;
  }
  const firstGame = GAMES[0].id;
  const st = {
    view: 'home', game: firstGame, cohort: game(firstGame).default_cohort_id, reward: game(firstGame).default_reward_id,
    ep: null, step: 0, axis: 'wall', media: 'frame', tab: 'step', playing: null,
    cmp: [null, null], cmpAxis: 'wall', cmpPos: 0, cmpTimer: null,
  };
  function setGame(id) {
    if (st.game === id) return;
    st.game = id;
    st.cohort = game(id).default_cohort_id;
    st.reward = game(id).default_reward_id;
    st.showOld = false;
  }
  function writeHash() {
    let h = '#/runs/' + st.game + '/' + encodeURIComponent(st.cohort || '');
    if (st.view === 'episode' && st.ep != null) h = '#/ep/' + st.ep + '/' + st.step;
    if (st.view === 'compare' && st.cmp[0] != null) h = '#/cmp/' + st.cmp[0] + '/' + st.cmp[1];
    if (st.view === 'run') h = '#/run';
    if (st.view === 'home') h = '#/home';
    if (location.hash !== h) history.replaceState(null, '', h);
  }
  function readHash() {
    const p = location.hash.replace(/^#\/?/, '').split('/');
    if (p[0] === 'run') { st.view = 'run'; return; }
    if (p[0] === 'home' || p[0] === '') { st.view = 'home'; return; }
    if (p[0] === 'ep' && EPS[+p[1]]) {
      const e = EPS[+p[1]];
      setGame(e.game); st.cohort = e.cohort; st.view = 'episode'; st.ep = e.i; st.step = +p[2] || 0;
    } else if (p[0] === 'cmp' && EPS[+p[1]] && EPS[+p[2]]) {
      setGame(EPS[+p[1]].game); st.view = 'compare'; st.cmp = [+p[1], +p[2]];
    } else if (p[0] === 'runs' && game(p[1])) {
      setGame(p[1]); st.view = 'runs';
      const c = decodeURIComponent(p[2] || '');
      if (c && EPS.some(e => e.game === p[1] && e.cohort === c)) st.cohort = c;
    }
  }

  function gameEps() { return EPS.filter(e => e.game === st.game); }
  // cohort status comes from the export or live server (current, superseded, older, stopped, check)
  const STATUS_TEXT = {current: 'Latest run of this game', superseded: 'Superseded by a newer version', older: 'Older protocol',
    stopped: 'Stopped early; its note below says why.', check: 'Infrastructure check, not a model comparison.'};
  const cohortInfo = c => (LAB.cohorts || {})[c] || {status: 'current'};
  function orderedCohorts() {
    const all = [...new Set(gameEps().map(e => e.cohort))];
    const rank = {current: 0, superseded: 1, older: 2, check: 3, stopped: 4};
    return all.map((c, k) => [c, k]).sort((a, b) => (rank[cohortInfo(a[0]).status] ?? 5) - (rank[cohortInfo(b[0]).status] ?? 5)
      || (cohortInfo(b[0]).started_at || 0) - (cohortInfo(a[0]).started_at || 0) || a[1] - b[1]).map(x => x[0]);
  }
  function cohortEps() { return gameEps().filter(e => e.cohort === st.cohort); }

  function renderBar() {
    // no game row: the game is picked on Home; the crumb names it and leads back there
    const g = game(st.game), crumb = $('crumb');
    crumb.hidden = st.view === 'home' || st.view === 'run' || !g;
    if (g) crumb.innerHTML = `<span class="sep" aria-hidden="true">/</span>${esc(g.label)}`;
    document.querySelectorAll('.views button').forEach(b => b.classList.toggle('on', b.dataset.view === st.view));
  }
  function setView(v) {
    stopPlay(); stopCmp();
    st.view = v;
    if (v === 'episode' && st.ep == null) { st.ep = (cohortEps()[0] || gameEps()[0]).i; st.step = 0; }
    render();
  }
  document.querySelectorAll('.views button').forEach(b => b.onclick = () => setView(b.dataset.view));

  let shown = '';
  function render() {
    // a new view or game starts at the top of the page
    if (shown && shown !== st.view + '|' + st.game) window.scrollTo(0, 0);
    shown = st.view + '|' + st.game;
    renderBar();
    for (const v of ['home', 'runs', 'episode', 'compare', 'run']) $(v + '-view').hidden = st.view !== v;
    if (st.view === 'home') renderHome();
    if (st.view === 'runs') renderRuns();
    if (st.view === 'episode') openEpisode(st.ep, st.step);
    if (st.view === 'compare') renderCompare();
    if (st.view === 'run') renderRunView();
    writeHash();
  }

  // ---------- home ----------
  function bestOf(eps, g) {
    const id = g.default_reward_id;
    let best = null, values = [];
    for (const e of eps) {
      const r = e.returns?.[id] || e.returns?.raw || {};
      const v = finite(r.total) ? r.total : r.observed;
      if (!finite(v)) continue;
      values.push(v);
      if (!best || v > best.v) best = {e, v};
    }
    if (best) {
      best.tie = values.length > 1 && values.every(v => v === best.v) ? values.length : 0;
      best.shared = values.filter(v => v === best.v).length;
    }
    return best;
  }
  const day = t => finite(t) ? new Date(t * 1000).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : '';
  function renderHome() {
    const models = new Set(EPS.map(e => e.model));
    const spend = EPS.reduce((a, e) => a + (finite(e.cost) ? e.cost : 0), 0);
    const running = EPS.filter(e => e.live?.running);
    const stats = [[GAMES.length, 'games'], [EPS.length.toLocaleString('en-US'), 'episodes'], [models.size, 'models'],
      [EPS.reduce((a, e) => a + (e.steps || 0), 0).toLocaleString('en-US'), 'observations'], ['$' + fmt(spend, 0), 'model spend']];
    const current = new Set(EPS.filter(e => cohortInfo(e.cohort).status === 'current').map(e => e.cohort));
    stats.push(LAB.live ? [running.length, 'playing now'] : [current.size, 'latest runs']);
    $('home-stats').innerHTML = stats.map(([b, t]) => `<div class="stat"><b>${esc(b)}</b><span>${esc(t)}</span></div>`).join('');
    $('home-run').hidden = !LAB.live;
    const first = GAMES[0];
    $('home-browse').href = '#/runs/' + first.id + '/' + encodeURIComponent(first.default_cohort_id || '');
    $('home-compare').onclick = ev => { ev.preventDefault(); setGame(first.id); setView('compare'); };

    $('home-live').hidden = !running.length;
    $('home-live').innerHTML = running.length ? `<h2 class="home-h">Playing now <span class="chip live">${running.length}</span></h2><div class="live-strip">${
      running.slice(0, 12).map(e => `<a class="live-card" href="#/ep/${e.i}/0"><b>${esc(game(e.game)?.label || e.game)}</b><span>${esc(modelName(e))} <span class="chip">${esc(e.effort)}</span></span><span class="muted">${dur(e.duration_ms)} · ${e.steps} steps</span></a>`).join('')
    }${running.length > 12 ? `<span class="muted">and ${running.length - 12} more</span>` : ''}</div>` : '';

    $('home-games').innerHTML = GAMES.map(g => {
      const mine = EPS.filter(e => e.game === g.id), current = mine.filter(e => e.cohort === g.default_cohort_id);
      const best = bestOf(current, g), def = rewardDef(g.id, g.default_reward_id);
      const when = day(cohortInfo(g.default_cohort_id).started_at || current[0]?.started_at);
      const live = mine.filter(e => e.live?.running).length;
      const pic = g.thumb ? `<img src="${esc(u(g.thumb))}" alt="${esc(g.label)} screenshot" loading="lazy">` : `<span class="ph">${esc(g.label)}</span>`;
      return `<article class="game-card">
        <a class="pic ${g.id !== 'veloren' ? 'pixel' : ''}" href="#/runs/${esc(g.id)}/${encodeURIComponent(g.default_cohort_id || '')}" aria-label="${esc(g.label)} runs">${pic}</a>
        <div class="body">
          <div class="top"><h3><a href="#/runs/${esc(g.id)}/${encodeURIComponent(g.default_cohort_id || '')}">${esc(g.label)}</a></h3>${g.test ? `<span class="chip ${/strategy/i.test(g.test) ? 'ok' : ''}">${esc(g.test)}</span>` : ''}${live ? `<span class="chip live">${live} live</span>` : ''}</div>
          <p class="muted small">${mine.length} episodes · latest run ${esc(g.default_cohort_id || '–')}${when ? ' · ' + when : ''}</p>
          ${!best ? '<p class="muted small">No scored episodes yet.</p>'
            : best.tie ? `<p class="best">All ${best.tie} scored episodes in the latest run scored <b class="score">${fmt(best.v)}</b> <span class="muted small">${esc(def?.label || 'recorded reward')}</span></p>`
            : `<p class="best">Best in latest run: <b>${esc(modelName(best.e))}</b> <span class="chip">${esc(best.e.effort)}</span> <b class="score">${fmt(best.v)}</b> <span class="muted small">${esc(def?.label || 'recorded reward')}${best.shared > 1 ? `, shared by ${best.shared} episodes` : ''}</span></p>`}
          ${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
          <p class="links"><a href="#/runs/${esc(g.id)}/${encodeURIComponent(g.default_cohort_id || '')}">All runs</a>${best && !best.tie ? ` · <a href="#/ep/${best.e.i}/0">Watch the best episode</a>` : ''}</p>
        </div>
      </article>`;
    }).join('');

    const cohorts = new Map();
    for (const e of EPS) { if (!cohorts.has(e.cohort)) cohorts.set(e.cohort, []); cohorts.get(e.cohort).push(e); }
    const rows = [...cohorts].filter(([c]) => cohortInfo(c).status === 'current')
      .sort((a, b) => (cohortInfo(b[0]).started_at || b[1][0].started_at || 0) - (cohortInfo(a[0]).started_at || a[1][0].started_at || 0));
    $('home-cohorts').innerHTML = `<thead><tr><th>Run</th><th>Game</th><th>Started</th><th class="num">Episodes</th><th class="num">Models</th><th>Best</th><th class="num">Spend</th></tr></thead><tbody>${
      rows.map(([c, list]) => {
        const g = game(list[0].game), best = bestOf(list, g), cost = list.reduce((a, e) => a + (finite(e.cost) ? e.cost : 0), 0);
        const live = list.some(e => e.live?.running);
        return `<tr><td><a href="#/runs/${esc(g.id)}/${encodeURIComponent(c)}">${esc(c)}</a>${live ? ' <span class="chip live">live</span>' : ''}</td><td>${esc(g.label)}</td>
          <td>${day(cohortInfo(c).started_at || list[0].started_at)}</td><td class="num">${list.length}</td><td class="num">${new Set(list.map(e => e.model)).size}</td>
          <td>${!best ? '–' : best.tie ? `all ${fmt(best.v)}` : `${esc(modelName(best.e))} <span class="chip">${esc(best.e.effort)}</span> ${fmt(best.v)}`}</td><td class="num">${cost ? usd(cost) : '–'}</td></tr>`;
      }).join('')}</tbody>`;
  }

  // ---------- runs ----------
  function spark(values, w = 130, h = 30) {
    const pts = values.map((v, i) => [i, v]).filter(p => finite(p[1]));
    if (pts.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}"><line x1="2" x2="${w - 2}" y1="${h / 2}" y2="${h / 2}" stroke="${css('--line')}" stroke-dasharray="3 3"/></svg>`;
    const n = values.length - 1 || 1;
    const lo = Math.min(0, ...pts.map(p => p[1])), hi = Math.max(1e-9, ...pts.map(p => p[1]));
    const x = i => 2 + i / n * (w - 4), y = v => h - 3 - (v - lo) / (hi - lo || 1) * (h - 6);
    let d = '';
    pts.forEach((p, k) => { d += (k ? 'H' + x(p[0]).toFixed(1) + 'V' : 'M' + x(p[0]).toFixed(1) + ',') + y(p[1]).toFixed(1); });
    const zero = lo < 0 ? `<line x1="2" x2="${w - 2}" y1="${y(0)}" y2="${y(0)}" stroke="${css('--line')}"/>` : '';
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true">${zero}<path d="${d}" fill="none" stroke="${css('--accent')}" stroke-width="1.6"/><circle cx="${x(last[0])}" cy="${y(last[1])}" r="2.4" fill="${last[1] < 0 ? css('--down') : css('--accent')}"/></svg>`;
  }
  function markSummary(flags) {
    return MARK_ORDER.filter(k => flags[k] && k !== 'terminal').map(k => `<span class="mk" title="${esc(MARKS[k].label)}"><i style="background:${css(MARKS[k].color)}"></i>${flags[k]}</span>`).join('');
  }
  function renderRuns() {
    const g = game(st.game), list = cohortEps();
    // live-only cohorts carry just the recorded reward; switch to it instead of showing blanks
    const scored = id => list.some(e => finite(e.returns?.[id]?.total) || finite(e.returns?.[id]?.observed));
    if (st.reward && !scored(st.reward) && st.reward !== 'raw' && scored('raw') && rewardDef(st.game, 'raw')) st.reward = 'raw';
    const cohorts = orderedCohorts();
    $('runs-title').textContent = g.label;
    const def = rewardDef(st.game, st.reward);
    $('runs-scope').textContent = def
      ? `${def.label}: ${def.description || ''}`
      : 'No deterministic reward exists for this archive. Archived annotation scores are excluded, so trajectories, actions and timing are what you can inspect here.';
    const sel = $('reward-select');
    sel.innerHTML = g.rewards.length ? g.rewards.map(r => `<option value="${esc(r.id)}">${esc(r.label)}</option>`).join('') : '<option value="">None for this game</option>';
    sel.value = st.reward || '';
    sel.disabled = !g.rewards.length;
    const lead = cohorts.filter(c => cohortInfo(c).status === 'current'), rest = cohorts.filter(c => cohortInfo(c).status !== 'current');
    const showOld = st.showOld || rest.includes(st.cohort);
    const chip = c => `<button data-c="${esc(c)}" class="${c === st.cohort ? 'on' : ''}${cohortInfo(c).status !== 'current' ? ' old' : ''}" title="${esc(STATUS_TEXT[cohortInfo(c).status] || '')}">${esc(c)}<small>${gameEps().filter(e => e.cohort === c).length}</small></button>`;
    $('cohort-chips').innerHTML = lead.map(chip).join('')
      + (rest.length ? `<button class="more" data-more="1" aria-expanded="${showOld}">${showOld ? 'Hide' : 'Show'} older and stopped (${rest.length})</button>` : '')
      + (showOld ? rest.map(chip).join('') : '');
    $('cohort-chips').querySelectorAll('[data-c]').forEach(b => b.onclick = () => { st.cohort = b.dataset.c; st.cohortPicked = true; st.reward = g.default_reward_id; render(); });
    $('cohort-chips').querySelectorAll('[data-more]').forEach(b => b.onclick = () => { st.showOld = !showOld; if (!st.showOld && rest.includes(st.cohort)) st.cohort = lead[0] || st.cohort; render(); });
    const cohortNote = (LAB.cohort_notes || {})[st.cohort], info = cohortInfo(st.cohort);
    const warn = info.status === 'current' ? '' : (info.status === 'superseded' ? `Superseded by ${info.superseded_by}, a newer version of this sweep.`
      : info.status === 'older' ? `Older protocol, replaced by ${info.superseded_by}.` : STATUS_TEXT[info.status]) + ' Kept for reference; compare with care.';
    $('cohort-warn').hidden = !warn;
    $('cohort-warn').textContent = warn;
    $('cohort-note').textContent = (cohorts.length > 1 ? 'Each cohort ran under its own protocol, so returns are never pooled across cohorts. Pick one at a time.' : '') + (cohortNote ? ' This cohort: ' + cohortNote : '');

    const returns = list.filter(e => e.eligible && finite(e.returns[st.reward]?.total)).map(e => e.returns[st.reward].total);
    const best = returns.length ? Math.max(...returns) : null;
    const cost = list.reduce((a, e) => a + (e.cost || 0), 0);
    const anyCost = list.some(e => finite(e.cost));
    const stats = [
      [list.length, 'episodes in cohort'],
      [list.filter(e => e.complete).length, 'complete endpoints'],
      [st.reward ? fmt(median(returns)) : '–', st.reward ? `median return, n=${returns.length}` : 'no deterministic reward'],
      [st.reward ? fmt(best) : '–', 'best complete return'],
      [sec(median(list.map(e => e.api_median)), 2), 'median API response'],
      [anyCost ? usd(cost) : '–', anyCost ? 'model spend in episodes' : 'spend not recorded'],
    ];
    $('runs-stats').innerHTML = stats.map(([b, s]) => `<div class="stat"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('');

    const groups = new Map();
    for (const e of list) { const k = e.model + '\0' + e.effort; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
    const head = `<thead><tr><th>Run</th><th>Outcome</th><th class="r">Return</th><th>Cumulative reward by step</th><th class="r">Wall time</th><th class="r">Steps</th><th class="r">API median</th><th class="r">Spend</th><th>Markers</th><th></th></tr></thead>`;
    let body = '';
    for (const es of groups.values()) {
      const e0 = es[0];
      const gr = es.filter(e => e.eligible && finite(e.returns[st.reward]?.total)).map(e => e.returns[st.reward].total);
      body += `<tr class="group"><td colspan="10"><span class="gname">${esc(modelName(e0))}</span> <span class="chip">${esc(e0.effort)}</span> <span class="gstat">${es.length} run${es.length > 1 ? 's' : ''}${st.reward ? `, median return ${fmt(median(gr))} (n=${gr.length})` : ''}</span></td></tr>`;
      for (const e of es) {
        const ret = e.returns[st.reward];
        const retCell = !st.reward ? '–' : finite(ret?.total) ? fmt(ret.total) : `Unknown<small>${finite(ret?.observed) ? 'observed prefix ' + fmt(ret.observed) : 'incomplete'}</small>`;
        body += `<tr class="ep" data-i="${e.i}" tabindex="0"><td>${esc(runName(e))}${e.video ? ' <span class="chip" title="Continuous gameplay video recorded">video</span>' : ''}</td>
          <td><span class="chip ${outcomeClass(e)}">${esc(outcomeText(e))}</span>${!e.eligible && !e.live ? ' <span class="chip warn" title="Excluded from comparisons">excluded</span>' : ''}</td>
          <td class="r ret">${retCell}</td><td>${st.reward ? spark(e.spark[st.reward] || []) : '<span class="muted">No reward</span>'}</td>
          <td class="r">${dur(e.duration_ms)}</td><td class="r">${e.steps}</td><td class="r">${sec(e.api_median, 2)}</td><td class="r">${usd(e.cost)}</td>
          <td><div class="marks">${markSummary(e.flags)}</div></td>
          <td><div class="row-btns"><button data-cmp="0" data-i="${e.i}" title="Compare as A">A</button><button data-cmp="1" data-i="${e.i}" title="Compare as B">B</button></div></td></tr>`;
      }
    }
    $('runs-table').innerHTML = head + '<tbody>' + body + '</tbody>';
    $('runs-table').querySelectorAll('tr.ep').forEach(tr => {
      const open = () => { st.ep = +tr.dataset.i; st.step = 0; setView('episode'); };
      tr.onclick = ev => { if (!ev.target.closest('button')) open(); };
      tr.onkeydown = ev => { if (ev.key === 'Enter') open(); };
    });
    $('runs-table').querySelectorAll('[data-cmp]').forEach(b => b.onclick = () => {
      const side = +b.dataset.cmp;
      st.cmp[side] = +b.dataset.i;
      if (st.cmp[1 - side] == null) st.cmp[1 - side] = list.find(e => e.i !== +b.dataset.i)?.i ?? +b.dataset.i;
      setView('compare');
    });
    const legend = MARK_ORDER.filter(k => k !== 'terminal').map(k => `<li><b>${esc(MARKS[k].label)}</b>: ${esc(MARKS[k].text)}</li>`).join('');
    $('dataset-notes').innerHTML = `<p>Markers are heuristics that point at steps worth a look. They are not scores.</p><ul>${legend}</ul><p>Measurement notes from the export:</p><ul>${LAB.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul><p class="hash">Source analysis sha256 ${esc(LAB.source.analysis_sha256)}, exported ${esc(LAB.created_at)}</p>`;
  }
  $('reward-select').onchange = ev => { st.reward = ev.target.value || null; render(); };

  // ---------- episode ----------
  let D = null; // loaded episode detail
  const axisOf = (d, s, i, axis) => axis === 'step' ? i : axis === 'game'
    ? (d.game_clock?.field === 'game_ticks' ? s.ticks : finite(s.game) ? s.game / 1000 : null)
    : s.wall / 1000;
  const hasGameAxis = d => !!d.game_clock && d.steps_data.some((s, i) => finite(axisOf(d, s, i, 'game')));
  function axisName(d, axis) {
    if (axis === 'step') return 'Observation index';
    if (axis === 'game') return d.game_clock?.field === 'game_ticks' ? 'Game time (logical turns)' : 'Emulator time (s)';
    return 'Wall time (s)';
  }

  async function openEpisode(i, step) {
    if (i == null) return;
    const summary = EPS[i];
    renderEpisodeHead(summary);
    $('ep-loading').hidden = cache.has(i);
    let d;
    try { d = await load(i); } catch (err) { $('ep-loading').hidden = false; $('ep-loading').textContent = err.message + '. Check that the data folder sits next to index.html.'; return; }
    if (st.ep !== i || st.view !== 'episode') return;
    $('ep-loading').hidden = true;
    D = d;
    if (st.axis === 'game' && !hasGameAxis(d)) st.axis = 'wall';
    if (st.media === 'video' && !d.video_info) st.media = 'frame';
    $('stage').classList.toggle('pixel', d.game !== 'veloren');
    $('scrub').max = d.steps_data.length - 1;
    setupVideo(d);
    if (LAB.live && d.live?.running && !step) step = d.steps_data.length - 1;
    selectStep(Math.min(step || 0, d.steps_data.length - 1), {seekVideo: true});
  }

  function renderEpisodeHead(e) {
    const list = gameEps();
    const byCohort = [...new Set(list.map(x => x.cohort))];
    $('ep-select').innerHTML = byCohort.map(c => `<optgroup label="${esc(c)}">${list.filter(x => x.cohort === c).map(x => `<option value="${x.i}">${esc(epLabel(x))}</option>`).join('')}</optgroup>`).join('');
    $('ep-select').value = e.i;
    $('ep-title').innerHTML = `<h1>${esc(modelName(e))}</h1><span class="chip">${esc(e.effort)}</span><span class="chip">${esc(runName(e))}</span><span class="chip">${esc(e.cohort)}</span><span class="chip ${outcomeClass(e)}">${esc(outcomeText(e))}</span>${!e.complete && !e.live?.running ? '<span class="chip warn">incomplete endpoint</span>' : ''}${e.complete && !e.eligible ? '<span class="chip warn">excluded from comparison</span>' : ''}`;
    const ret = e.returns[st.reward];
    const facts = [
      ['Return', !st.reward ? 'no reward' : finite(ret?.total) ? fmt(ret.total) : 'unknown' + (finite(ret?.observed) ? ` (${fmt(ret.observed)} seen)` : '')],
      ['Wall time', dur(e.duration_ms)],
      ['Game time', finite(e.game_duration_ms) ? dur(e.game_duration_ms) : finite(e.game_turns) ? fmt(e.game_turns) + ' turns' : '–'],
      ['Steps', e.steps],
      ['API median', sec(e.api_median, 2)],
      ['Spend', usd(e.cost)],
    ];
    if (e.tokens) facts.push(['Tokens in / out', fmt(e.tokens.prompt, 0) + ' / ' + fmt(e.tokens.completion, 0)]);
    $('ep-facts').innerHTML = facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    const pos = list.findIndex(x => x.i === e.i);
    $('ep-prev').disabled = pos <= 0;
    $('ep-next').disabled = pos >= list.length - 1;
  }
  function stepEpisode(delta) {
    const list = gameEps(), pos = list.findIndex(x => x.i === st.ep), next = list[pos + delta];
    if (!next) return;
    stopPlay(); st.ep = next.i; st.cohort = next.cohort; st.step = 0; render();
  }
  $('ep-select').onchange = ev => { stopPlay(); st.ep = +ev.target.value; st.cohort = EPS[st.ep].cohort; st.step = 0; render(); };
  $('ep-prev').onclick = () => stepEpisode(-1);
  $('ep-next').onclick = () => stepEpisode(1);

  function stepAt(seq) { return D.steps_data.findIndex(s => s.seq === seq); }
  function inputStep(s) { return s.input_seq == null ? null : D.steps_data[stepAt(s.input_seq)]; }

  function selectStep(i, opts = {}) {
    if (!D) return;
    i = Math.max(0, Math.min(i, D.steps_data.length - 1));
    st.step = i;
    const s = D.steps_data[i];
    $('scrub').value = i;
    updateClock(i);
    renderMedia();
    renderInspector();
    drawWave();
    if (opts.seekVideo && st.media === 'video' && D.video_info && finite(s.game)) seekVideo(s.game);
    liveNote();
    writeHash();
  }

  function updateClock(i) {
    const s = D.steps_data[i];
    const gameClock = D.game_clock?.field === 'game_ticks' ? (finite(s.ticks) ? `, turn ${fmt(s.ticks)}` : '') : finite(s.game) ? `, game ${sec(s.game, 2)}` : '';
    $('clock').textContent = `Step ${i} of ${D.steps_data.length - 1}, wall ${sec(s.wall, 1)}${gameClock}`;
  }

  // media
  const frame = $('frame'), diff = $('diff'), video = $('video');
  function setMediaButtons() {
    document.querySelectorAll('#media-seg button').forEach(b => {
      b.classList.toggle('on', b.dataset.media === st.media);
      if (b.dataset.media === 'video') { b.disabled = !D?.video_info; b.title = D?.video_info ? 'Continuous emulator capture (4)' : 'No continuous capture for this episode'; }
    });
  }
  document.querySelectorAll('#media-seg button').forEach(b => b.onclick = () => setMedia(b.dataset.media));
  function setMedia(m) {
    if (m === 'video' && !D?.video_info) return;
    if (st.media === 'video' && m !== 'video') video.pause();
    st.media = m;
    renderMedia();
    if (m === 'video') { const s = D.steps_data[st.step]; if (finite(s.game)) seekVideo(s.game); }
  }
  function renderMedia() {
    setMediaButtons();
    const s = D.steps_data[st.step];
    const inputs = s.model?.inputs || [];
    const prev = inputStep(s);
    $('stage-empty').hidden = true; frame.hidden = false; diff.hidden = true; video.hidden = true;
    let meta = '';
    if (st.media === 'frame') {
      frame.src = u(s.obs.img); frame.alt = `Returned observation ${s.seq}`;
      meta = `Observation #${s.seq}, lossless capture`;
    } else if (st.media === 'input') {
      const last = inputs[inputs.length - 1];
      if (last) { frame.src = u(last.img); frame.alt = `Exact JPEG model input, observation ${last.seq}`; meta = `Exact JPEG sent to the model, observation #${last.seq}` + (inputs.length > 1 ? ` (${inputs.length} images in request)` : ''); }
      else if (prev) { frame.src = u(prev.obs.img); frame.alt = `Input observation ${prev.seq}`; meta = `Input observation #${prev.seq}. Exact request bytes were not saved for this episode.`; }
      else { frame.hidden = true; $('stage-empty').hidden = false; $('stage-empty').textContent = 'This is the reset observation. Nothing came before it.'; }
    } else if (st.media === 'diff') {
      frame.hidden = true; diff.hidden = false;
      meta = prev ? `Pixels that changed from #${prev.seq} to #${s.seq}` : 'Reset observation has no earlier frame';
      drawDiff(prev, s);
    } else if (st.media === 'video') {
      frame.hidden = true; video.hidden = false;
      meta = 'Continuous capture on the emulator clock. Model thinking time is not shown as gameplay.';
    }
    $('frame-meta').textContent = meta;
  }
  const imgCache = new Map();
  function getImg(src) {
    if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }));
    return imgCache.get(src);
  }
  let diffToken = 0;
  async function drawDiff(prev, s) {
    const token = ++diffToken;
    const ctx = diff.getContext('2d', {willReadFrequently: true});
    try {
      const cur = await getImg(u(s.obs.img));
      if (token !== diffToken) return;
      diff.width = cur.naturalWidth; diff.height = cur.naturalHeight;
      if (!prev) { ctx.drawImage(cur, 0, 0); return; }
      const old = await getImg(u(prev.obs.img));
      if (token !== diffToken) return;
      ctx.drawImage(old, 0, 0, diff.width, diff.height);
      const a = ctx.getImageData(0, 0, diff.width, diff.height);
      ctx.drawImage(cur, 0, 0);
      const b = ctx.getImageData(0, 0, diff.width, diff.height);
      let changed = 0;
      for (let p = 0; p < b.data.length; p += 4) {
        const dlt = Math.abs(a.data[p] - b.data[p]) + Math.abs(a.data[p + 1] - b.data[p + 1]) + Math.abs(a.data[p + 2] - b.data[p + 2]);
        const g = (b.data[p] * .3 + b.data[p + 1] * .59 + b.data[p + 2] * .11) * .35;
        if (dlt > 24) { changed++; b.data[p] = 255; b.data[p + 1] = 150; b.data[p + 2] = 30; }
        else { b.data[p] = b.data[p + 1] = b.data[p + 2] = g; }
      }
      ctx.putImageData(b, 0, 0);
      $('frame-meta').textContent = `Changed pixels from #${prev.seq} to #${s.seq}: ${(changed / (b.data.length / 4) * 100).toFixed(1)}% of the frame`;
    } catch (err) {
      diff.hidden = true; $('stage-empty').hidden = false;
      $('stage-empty').textContent = 'The change view needs the page served over http(s). Opened from a local file, the browser blocks pixel reads.';
    }
  }

  function setupVideo(d) {
    if (d.video_info) {
      if (video.getAttribute('src') !== u(d.video_info.src)) { video.src = u(d.video_info.src); video.load(); }
    } else { video.pause(); video.removeAttribute('src'); video.load(); }
  }
  function seekVideo(gameMs) {
    const t = gameMs / 1000;
    const go = () => { video.currentTime = Math.min(t, finite(video.duration) ? video.duration : t); };
    if (video.readyState >= 1) go(); else video.addEventListener('loadedmetadata', go, {once: true});
  }
  let videoSync = false;
  video.addEventListener('timeupdate', () => {
    if (!D?.frames || st.media !== 'video' || videoSync) return;
    const t = video.currentTime * 1000, f = D.frames;
    let k = 0;
    while (k + 1 < f.game_ms.length && f.game_ms[k + 1] <= t + .5) k++;
    const seq = f.seq[k];
    // while playing, follow the latest observation at or before the video time
    let idx = 0;
    D.steps_data.forEach((s, i) => { if (finite(s.game) && s.game <= t + .5) idx = i; });
    if (!video.paused && idx !== st.step) { st.step = idx; $('scrub').value = idx; updateClock(idx); renderInspector(); writeHash(); }
    videoCursor = {k, seq};
    drawWave();
    const sc = f.score[k], lv = f.lives[k], tot = st.reward && f.totals[st.reward] ? f.totals[st.reward][k] : null;
    $('frame-meta').textContent = `Frame ${k}, game ${sec(f.game_ms[k], 2)}, score ${fmt(sc)}, spare lives ${fmt(lv)}${finite(tot) ? ', reward ' + fmt(tot) : ''}${f.eligible[k] ? '' : ', late frame excluded from reward'}`;
  });
  let videoCursor = null;

  // transport
  $('scrub').oninput = ev => { stopPlay(); selectStep(+ev.target.value, {seekVideo: true}); };
  $('back').onclick = () => { stopPlay(); selectStep(st.step - 1, {seekVideo: true}); };
  $('fwd').onclick = () => { stopPlay(); selectStep(st.step + 1, {seekVideo: true}); };
  $('first').onclick = () => { stopPlay(); selectStep(0, {seekVideo: true}); };
  $('last').onclick = () => { stopPlay(); selectStep(1e9, {seekVideo: true}); };
  $('play').onclick = () => st.playing ? stopPlay() : startPlay();
  $('speed').onchange = () => { if (st.playing) { stopPlay(); startPlay(); } };
  function startPlay() {
    if (!D) return;
    if (st.media === 'video') { video.play(); $('play').textContent = 'Pause'; st.playing = 'video'; video.onpause = () => { if (st.playing === 'video') stopPlay(); }; return; }
    if (st.step >= D.steps_data.length - 1) selectStep(0);
    $('play').textContent = 'Pause';
    st.playing = setInterval(() => {
      if (st.step >= D.steps_data.length - 1) return stopPlay();
      selectStep(st.step + 1);
    }, 1000 / +$('speed').value);
  }
  function stopPlay() {
    if (st.playing === 'video') video.pause();
    else if (st.playing) clearInterval(st.playing);
    st.playing = null;
    $('play').textContent = 'Play';
  }
  function jumpMark(dir) {
    if (!D) return;
    const has = s => s.flags.some(f => f !== 'terminal');
    for (let i = st.step + dir; i >= 0 && i < D.steps_data.length; i += dir) if (has(D.steps_data[i])) { stopPlay(); selectStep(i, {seekVideo: true}); return; }
  }
  $('next-mark').onclick = () => jumpMark(1);

  // inspector
  document.querySelectorAll('#insp-tabs button').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; renderInspector(); });
  function renderInspector() {
    const s = D.steps_data[st.step];
    document.querySelectorAll('#insp-tabs button').forEach(b => {
      b.classList.toggle('on', b.dataset.tab === st.tab);
      b.setAttribute('aria-selected', b.dataset.tab === st.tab);
      const dot = (b.dataset.tab === 'review' && s.review) || (b.dataset.tab === 'model' && s.model && (s.model.response?.content || s.model.response?.reasoning || s.note));
      b.innerHTML = b.textContent + (dot ? '<span class="dot" aria-label="has notes"></span>' : '');
    });
    const body = $('insp-body');
    body.innerHTML = ({step: stepTab, model: modelTab, review: reviewTab, episode: episodeTab, raw: rawTab})[st.tab](s);
    body.querySelectorAll('[data-input]').forEach(b => b.onclick = () => { setMedia('input'); frame.src = b.dataset.input; $('frame-meta').textContent = 'Exact JPEG model input, observation #' + b.dataset.seq; });
    body.querySelectorAll('[data-verify]').forEach(b => b.onclick = () => verify(b));
    body.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => selectStep(+b.dataset.goto, {seekVideo: true}));
    const on = body.querySelector('.log li.on');
    if (on) body.scrollTop = Math.max(0, on.offsetTop - body.clientHeight / 2);
  }
  async function verify(btn) {
    btn.disabled = true; btn.textContent = 'Checking';
    try {
      const buf = await (await fetch(u(btn.dataset.verify))).arrayBuffer();
      const hex = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(x => x.toString(16).padStart(2, '0')).join('');
      btn.textContent = hex === btn.dataset.sha ? 'Hash matches' : 'Hash differs';
      btn.style.color = hex === btn.dataset.sha ? css('--up') : css('--down');
    } catch (e) { btn.textContent = 'Needs http(s)'; }
  }
  function timeBar(t) {
    const parts = [['throttle', '--throttle', 'Throttle'], ['api', '--api', 'API response'], ['tool', '--tool', 'Tool HTTP']];
    const known = parts.reduce((a, [k]) => a + (finite(t[k]) ? t[k] : 0), 0);
    const total = Math.max(known, finite(t.gap) ? t.gap : 0) || 1;
    const bar = parts.filter(([k]) => finite(t[k]) && t[k] > 0).map(([k, c, n]) => `<span title="${n} ${sec(t[k], 2)}" style="width:${t[k] / total * 100}%;background:${css(c)}"></span>`).join('');
    return `<div class="timebar">${bar}</div><div class="legend">${parts.map(([k, c, n]) => `<span><i style="background:${css(c)}"></i>${n} ${sec(t[k], 2)}</span>`).join('')}</div>
      <dl class="kv" style="margin-top:8px"><dt>Decision gap</dt><dd>${sec(t.gap, 2)} <span class="muted">(includes the above plus orchestration; do not add them)</span></dd><dt>Requested hold</dt><dd>${finite(t.req) ? t.req + ' ms' : '–'}</dd>${finite(t.frame_age) ? `<dt>Frame age at response</dt><dd>${fmt(t.frame_age, 0)} ms</dd>` : ''}</dl>`;
  }
  function stateDiff(prev, s) {
    const keys = [...new Set([...Object.keys(prev?.state || {}), ...Object.keys(s.state || {})])].filter(k => k !== 'maxHp');
    if (!keys.length) return '<p class="muted">No game state telemetry for this game.</p>';
    const names = {score: 'Score', lives: 'Spare lives', stage: 'Stage', gameover: 'Game-over flag', depth: 'Floor', kills: 'Kills', goldCollected: 'Gold collected', logicalTime: 'Game turns', hp: 'Hero HP'};
    return `<table class="diff-table">${keys.map(k => {
      const a = prev?.state?.[k], b = s.state?.[k], ch = prev && a !== b;
      return `<tr><td>${esc(names[k] || k)}</td><td class="r ${ch ? 'ch' : ''}">${prev ? fmt(a) + ' → ' : ''}${fmt(b)}${k === 'hp' && finite(s.state.maxHp) ? ' / ' + s.state.maxHp : ''}</td></tr>`;
    }).join('')}</table><p class="muted" style="font-size:13px;margin:6px 0 0">Diagnostics from game state. They are not part of the reward unless the reward version says so.</p>`;
  }
  function stepTab(s) {
    const prev = inputStep(s);
    const dl = delivery(s);
    const a = s.req || {};
    let h = `<div class="blk"><h3>Action ${prev ? `chosen from observation #${prev.seq}` : ''}</h3>`;
    if (s.tool === 'reset') h += '<p class="big">Reset</p><p class="muted">Initial observation from the harness. No policy decision came before it.</p>';
    else {
      h += `<div class="btn-chips"><span class="big" style="color:${css(TOOL_COLOR[s.tool] || '--ink')}">${esc(s.tool)}</span>${(a.buttons || []).map(b => `<span class="key">${esc(b)}</span>`).join('')}${a.duration_ms ? `<span class="muted">${a.duration_ms} ms</span>` : ''}</div>`;
      const sticks = ['left_stick', 'right_stick'].filter(k => a[k] && (Math.abs(a[k][0]) > .01 || Math.abs(a[k][1]) > .01));
      if (sticks.length) h += `<p>${sticks.map(k => `${k.replace('_', ' ')} (${fmt(a[k][0])}, ${fmt(a[k][1])})`).join(', ')}</p>`;
      if (a.ui) h += `<pre class="json">${esc(JSON.stringify(a.ui, null, 1))}</pre>`;
      if (s.note) h += `<div class="callout good">Model note: ${esc(s.note)}</div>`;
      h += `<div class="callout ${dl.cls}">${esc(dl.text)}${receiptLine(s.receipt)}</div>`;
    }
    h += '</div>';
    if (prev && (s.tool === 'act' || s.tool === 'wait')) {
      const same = prev.obs.sha === s.obs.sha;
      h += `<div class="blk"><h3>Effect on the screen</h3>${same ? '<div class="callout">Returned frame is identical to the input frame.</div>' : '<p>Returned frame differs from the input frame. Use <b>Changes</b> to see where.</p>'}</div>`;
    }
    const rid = st.reward, rw = rid ? s.rewards[rid] : null;
    h += `<div class="blk"><h3>Reward${rid ? ', ' + esc(rewardDef(D.game, rid)?.label || rid) : ''}</h3>`;
    if (!rid) h += `<p class="muted">${esc(D.reward_unavailable_reason || 'No deterministic reward version for this game.')}</p>`;
    else if (!rw) h += '<p class="muted">Not scored at this step.</p>';
    else {
      h += `<p class="big" style="color:${rw.v > 0 ? css('--up') : rw.v < 0 ? css('--down') : 'inherit'}">${rw.v > 0 ? '+' : ''}${fmt(rw.v, 3)} <span class="muted" style="font-size:15px;font-weight:400">cumulative ${fmt(rw.c, 3)}${!D.complete ? ', observed prefix' : ''}</span></p>`;
      if (rw.parts.length) h += `<dl class="kv">${rw.parts.map(p => `<dt>${esc(String(p.type).replaceAll('_', ' '))}</dt><dd>${p.v > 0 ? '+' : ''}${fmt(p.v, 3)}</dd>`).join('')}</dl>`;
      const others = Object.entries(s.rewards).filter(([k]) => k !== rid && k !== 'raw');
      if (others.length || s.rewards.raw) h += `<p class="muted" style="font-size:13px">${others.map(([k, v]) => `${esc(rewardDef(D.game, k)?.label || k)} ${fmt(v.v, 3)} (cum ${fmt(v.c, 3)})`).join('; ')}${s.rewards.raw ? `${others.length ? '; ' : ''}environment reward ${fmt(s.rewards.raw.v, 3)}` : ''}</p>`;
    }
    h += '</div>';
    h += `<div class="blk"><h3>Game state</h3>${stateDiff(prev, s)}</div>`;
    if (s.tool !== 'reset') h += `<div class="blk"><h3>Where the time went</h3>${timeBar(s.timing)}</div>`;
    const marks = s.flags.filter(f => MARKS[f]);
    if (marks.length) h += `<div class="blk"><h3>Markers</h3>${marks.map(f => `<p><b style="color:${css(MARKS[f].color)}">${esc(MARKS[f].label)}.</b> ${esc(MARKS[f].text)}</p>`).join('')}</div>`;
    h += `<div class="blk"><h3>Frame</h3><p class="hash">sha256 ${esc(s.obs.sha)}<button class="verify ghost" data-verify="${esc(s.obs.img)}" data-sha="${esc(s.obs.sha)}">Verify</button></p></div>`;
    return h;
  }
  function receiptLine(r) {
    if (!r) return '';
    if (finite(r.emulator_frames_executed)) return `: ${r.emulator_frames_executed} of ${r.emulator_frames_requested} emulator frames ran${r.emulator_frames_executed < r.emulator_frames_requested ? ' (cut short)' : ''}.`;
    if (r.native_receipt) return r.native_receipt.deadline_expired ? ': native input hit the deadline.' : ': native input sent.';
    return '.';
  }
  function modelTab(s) {
    const m = s.model;
    if (!m) {
      if (s.tool === 'reset') return '<p class="muted">The reset observation has no model call.</p>';
      return `<p class="muted">${D.game === 'veloren' ? 'This archived episode did not save exact model requests and responses. The action and timing on the Step tab come from the recording.' : 'No saved model request maps to this step.'}</p>`;
    }
    const r = m.response || {};
    let h = `<div class="blk"><h3>Response</h3><dl class="kv">
      <dt>Model</dt><dd>${esc(r.model || D.model)}${r.model && D.model && !String(r.model).startsWith(D.model) ? ` <span class="muted">(picked by ${esc(D.model)})</span>` : ''}</dd><dt>Provider</dt><dd>${esc(r.provider || '–')}</dd>
      <dt>Finish</dt><dd>${esc(r.finish || '–')}</dd><dt>API time</dt><dd>${sec(s.timing.api, 2)}</dd>
      <dt>Tokens</dt><dd>${fmt(r.prompt_tokens, 0)} in, ${fmt(r.completion_tokens, 0)} out${finite(r.reasoning_tokens) && r.reasoning_tokens ? `, ${fmt(r.reasoning_tokens, 0)} reasoning` : ''}</dd>
      <dt>Cost</dt><dd>${usd(r.cost)}</dd></dl>`;
    if (r.error || m.provider_error) h += `<div class="callout bad">Provider error: ${esc(JSON.stringify(r.error || m.provider_error))}</div>`;
    if (r.reasoning) h += `<h3 style="margin-top:10px">Reasoning text</h3><p class="prose">${esc(r.reasoning)}</p>`;
    if (r.content) h += `<h3 style="margin-top:10px">Message text</h3><p class="prose">${esc(r.content)}</p>`;
    if (r.decision) h += `<h3 style="margin-top:10px">Decision probabilities</h3>${Object.entries(r.decision).map(([q, a]) => `<p class="muted" style="margin:6px 0 2px">${esc(q)}${finite(a.confidence) ? `, confidence ${fmt(a.confidence, 2)}` : ''}</p><div class="probs">${Object.entries(a.probabilities || {}).sort((x, y) => y[1] - x[1]).map(([k, v]) => `<div class="prob${k === a.choice ? ' on' : ''}"><span>${esc(k)}</span><i style="width:${Math.round(100 * v)}%"></i><b>${fmt(v, 2)}</b></div>`).join('')}</div>`).join('')}<p class="muted" style="font-size:13px">A decision model picks options instead of calling tools; <code>examples/decision_policy.py</code> turns the pick into the act or wait call shown on the Step tab.</p>`;
    if (!r.reasoning && !r.content) h += '<p class="muted" style="margin-top:8px">The model returned a tool call with no visible text.</p>';
    if (r.tool_calls?.length) h += `<h3 style="margin-top:10px">Tool call</h3>${r.tool_calls.map(c => `<pre class="json">${esc(c.name)} ${esc(c.arguments)}</pre>`).join('')}`;
    h += '</div>';
    if (m.inputs.length) h += `<div class="blk"><h3>Images in the request</h3><div class="thumbs">${m.inputs.map(x => `<button data-input="${esc(u(x.img))}" data-seq="${x.seq}" title="Show on stage"><img src="${esc(u(x.img))}" alt="Model input ${x.seq}" loading="lazy"><span>#${x.seq}</span></button>`).join('')}</div><p class="muted" style="font-size:13px">Exact JPEG bytes the model received, oldest first.</p></div>`;
    if (m.prompt) h += `<div class="blk"><h3>Prompt text for this call</h3><details class="sub"><summary>Show ${fmt(m.prompt.length, 0)} characters</summary><pre class="json">${esc(m.prompt)}</pre></details>${D.system_prompt ? `<details class="sub"><summary>System prompt (same for the episode)</summary><pre class="json">${esc(D.system_prompt)}</pre></details>` : ''}</div>`;
    if (m.request) h += `<div class="blk"><h3>Request settings</h3><details class="sub"><summary>Tools, limits and routing</summary><pre class="json">${esc(JSON.stringify(m.request, null, 1))}</pre></details></div>`;
    h += `<div class="blk"><p class="hash">request sha256 ${esc(m.request_sha256)}<br>response sha256 ${esc(m.response_sha256 || '–')}</p><p class="muted" style="font-size:13px">Hashes refer to the exact saved files. Image bytes inside the request are replaced by their hashes on this page.</p></div>`;
    return h;
  }
  function reviewTab(s) {
    let h = '';
    h += s.review ? `<div class="blk"><h3>Reviewer note for observation #${s.seq}</h3><p class="prose">${esc(s.review)}</p></div>` : `<div class="blk"><p class="muted">No per-frame review note for this step.</p></div>`;
    const withNotes = D.steps_data.map((x, i) => [x, i]).filter(([x]) => x.review);
    if (withNotes.length) h += `<div class="blk"><h3>Review log, ${withNotes.length} of ${D.steps_data.length} observations</h3><ol class="log">${withNotes.map(([x, i]) => `<li class="${i === st.step ? 'on' : ''}"><button class="ghost" data-goto="${i}">#${x.seq}</button><span>${esc(x.review)}</span></li>`).join('')}</ol></div>`;
    const r = D.review_summary;
    if (r) h += `<div class="blk"><h3>Episode review</h3><dl class="kv"><dt>Method</dt><dd>${esc(r.method || '–')}</dd><dt>Classification</dt><dd>${esc(String(r.classification || '–').replaceAll('_', ' '))}</dd></dl>${r.conclusion ? `<p class="prose" style="margin-top:8px">${esc(r.conclusion)}</p>` : ''}${r.exclusion ? `<div class="callout">${esc(r.exclusion)}</div>` : ''}</div>`;
    if (!r && !withNotes.length) h += '<div class="blk"><p class="muted">This episode has no independent review attached.</p></div>';
    return h;
  }
  function episodeTab() {
    const e = D;
    let h = `<div class="blk"><h3>Outcome</h3><dl class="kv"><dt>Recorded</dt><dd>${esc(String(e.outcome || '–').replaceAll('_', ' '))}</dd><dt>Reviewed</dt><dd>${esc(String(e.reviewed || '–').replaceAll('_', ' '))}</dd><dt>Complete</dt><dd>${e.complete ? 'yes' : 'no'}</dd><dt>In comparisons</dt><dd>${e.eligible ? 'yes' : 'no'}</dd>${finite(e.time_limit_ms) ? `<dt>Time limit</dt><dd>${dur(e.time_limit_ms)}</dd>` : ''}${finite(e.pre_reset_cooldown_ms) ? `<dt>Cooldown before reset</dt><dd>${sec(e.pre_reset_cooldown_ms)} (outside the episode clock)</dd>` : ''}</dl>${e.reason ? `<p class="prose" style="margin-top:8px">${esc(e.reason)}</p>` : ''}</div>`;
    if (e.unreturned_requests.length) {
      h += `<div class="blk"><h3>Requests with no returned observation</h3>${e.unreturned_requests.map(r => {
        const why = r.dispatch_state !== 'committed' ? 'Prepared, not dispatched' + (r.not_dispatched_reason ? ': ' + r.not_dispatched_reason : '') : r.provider_error ? 'Provider error' : r.response ? 'Model answered, no game step followed' : 'Dispatched, no response saved';
        const calls = (r.response?.tool_calls || []).map(c => c.name + ' ' + c.arguments).join('; ');
        return `<div class="callout"><b>After observation #${esc(r.input_seq)}</b>: ${esc(why)}. API ${sec(r.api_ms, 2)}.${calls ? `<br>Tool call: <code>${esc(calls)}</code>` : ''}${r.response?.content ? `<br>${esc(r.response.content)}` : ''}${r.provider_error ? `<br>${esc(JSON.stringify(r.provider_error))}` : ''}</div>`;
      }).join('')}</div>`;
    }
    const defs = game(e.game).rewards;
    if (defs.length) h += `<div class="blk"><h3>Reward versions</h3>${defs.map(d => `<p><b>${esc(d.label)}</b>: ${esc(d.description || '')}${d.limitation ? ` <span class="muted">Limit: ${esc(d.limitation)}</span>` : ''}</p>`).join('')}</div>`;
    if (e.video_info) h += `<div class="blk"><h3>Video</h3><p>${esc(e.video_info.coverage || '')}. ${esc(e.video_info.derivation || '')}</p><p class="hash">mp4 sha256 ${esc(e.video_info.sha)}</p></div>`;
    if (e.conditions && Object.keys(e.conditions).length) h += `<div class="blk"><h3>Cohort conditions</h3><dl class="kv">${Object.entries(e.conditions).map(([k, v]) => `<dt>${esc(k.replaceAll('_', ' '))}</dt><dd>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</dd>`).join('')}</dl></div>`;
    h += `<div class="blk"><h3>Provenance</h3><details class="sub"><summary>Source files and hashes</summary><pre class="json">${esc(JSON.stringify(e.source, null, 1))}</pre></details><p class="hash">episode ${esc(e.id)}</p></div>`;
    return h;
  }
  function rawTab(s) {
    const copy = {...s};
    if (copy.model) copy.model = {...copy.model, response_raw: copy.model.response_raw, messages: '[see Model call tab]'};
    return `<pre class="json" style="max-height:none">${esc(JSON.stringify(copy, null, 1))}</pre>`;
  }

  // ---------- timeline ----------
  const LANES = [
    {id: 'obs', label: 'Observations', h: 18},
    {id: 'act', label: 'Actions', h: 26},
    {id: 'time', label: 'Decision time', h: 34},
    {id: 'reward', label: 'Reward', h: 56},
    {id: 'state', label: 'Game state', h: 42},
    {id: 'marks', label: 'Markers', h: 20},
  ];
  function svgEl(markup, w, h, label) { return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">${markup}</svg>`; }
  function drawWave() {
    if (!D || st.view !== 'episode') return;
    document.querySelectorAll('#axis-seg button').forEach(b => {
      b.classList.toggle('on', b.dataset.axis === st.axis);
      if (b.dataset.axis === 'game') b.disabled = !hasGameAxis(D);
    });
    const host = $('wave'), W = Math.max(320, host.clientWidth), LW = W < 600 ? 74 : 112, R = 12, x0 = LW + 6, pw = W - x0 - R;
    const steps = D.steps_data, axis = st.axis;
    const xs = steps.map((s, i) => axisOf(D, s, i, axis));
    const max = Math.max(1e-9, ...xs.filter(finite));
    const X = v => x0 + (finite(v) ? v : 0) / max * pw;
    let y = 4, out = '';
    const tops = {};
    for (const L of LANES) { tops[L.id] = y; y += L.h + 6; }
    const H = y + 18;
    // lane backgrounds and labels
    for (const L of LANES) {
      const t = tops[L.id];
      out += `<rect x="${x0}" y="${t}" width="${pw}" height="${L.h}" fill="${css('--panel-2')}" rx="3"/>`;
      out += `<text class="lane-label" x="${LW - 4}" y="${t + L.h / 2 + 4}" text-anchor="end">${L.label}</text>`;
    }
    // grid
    const ticks = niceTicks(max, Math.max(3, Math.floor(pw / 90)));
    for (const t of ticks) {
      out += `<line x1="${X(t)}" x2="${X(t)}" y1="4" y2="${y - 6}" stroke="${css('--grid')}"/>`;
      out += `<text class="axis-text" x="${X(t)}" y="${y + 8}" text-anchor="middle">${fmt(t, 1)}</text>`;
    }
    out += `<text class="axis-text" x="${W - R}" y="${y + 8}" text-anchor="end" opacity="0">.</text>`;
    // observations
    const to = tops.obs;
    steps.forEach((s, i) => {
      if (!finite(xs[i])) return;
      const end = s.status && s.status !== 'running';
      out += `<line x1="${X(xs[i])}" x2="${X(xs[i])}" y1="${to + 3}" y2="${to + 15}" stroke="${end ? css('--down') : css('--muted')}" stroke-width="${end ? 2.5 : 1}"/>`;
    });
    // actions
    const ta = tops.act;
    steps.forEach((s, i) => {
      if (!i || !finite(xs[i])) return;
      const pi = steps.findIndex(p => p.seq === s.input_seq);
      const xa = X(finite(xs[pi]) ? xs[pi] : xs[i - 1]), xb = X(xs[i]);
      const w = Math.max(1.5, xb - xa - 1);
      const color = css(TOOL_COLOR[s.tool] || '--wait');
      const op = s.executed === false ? .35 : 1;
      out += `<rect x="${xb - w}" y="${ta + 2}" width="${w}" height="${22}" fill="${color}" opacity="${op}" rx="2"/>`;
      const label = actionText(s);
      if (w > label.length * 5.6 + 6) out += `<text class="act-text" x="${xb - w + 4}" y="${ta + 17}">${esc(label)}</text>`;
    });
    // decision time
    const tt = tops.time, th = 34;
    if (axis === 'wall') {
      steps.forEach((s, i) => {
        if (!i) return;
        const pi = steps.findIndex(p => p.seq === s.input_seq);
        let cur = (pi >= 0 ? steps[pi].wall : steps[i - 1].wall) / 1000;
        for (const [k, c] of [['throttle', '--throttle'], ['api', '--api'], ['tool', '--tool']]) {
          const v = s.timing[k];
          if (!finite(v) || v <= 0) continue;
          const w = Math.max(.8, v / 1000 / max * pw);
          out += `<rect x="${X(cur)}" y="${tt + 6}" width="${w}" height="${22}" fill="${css(c)}" opacity=".9"/>`;
          cur += v / 1000;
        }
      });
    } else {
      const gaps = steps.map(s => s.timing.gap).filter(finite);
      const gmax = Math.max(1, ...gaps);
      const bw = Math.max(1.5, Math.min(8, pw / steps.length * .6));
      steps.forEach((s, i) => {
        if (!i || !finite(xs[i])) return;
        let base = tt + th - 2;
        for (const [k, c] of [['throttle', '--throttle'], ['api', '--api'], ['tool', '--tool']]) {
          const v = s.timing[k];
          if (!finite(v) || v <= 0) continue;
          const hh = v / gmax * (th - 6);
          out += `<rect x="${X(xs[i]) - bw / 2}" y="${base - hh}" width="${bw}" height="${hh}" fill="${css(c)}"/>`;
          base -= hh;
        }
        if (finite(s.timing.gap)) out += `<line x1="${X(xs[i]) - bw}" x2="${X(xs[i]) + bw}" y1="${tt + th - 2 - s.timing.gap / gmax * (th - 6)}" y2="${tt + th - 2 - s.timing.gap / gmax * (th - 6)}" stroke="${css('--ink')}" stroke-width="1"/>`;
      });
      out += `<text class="lane-sub" x="${LW - 4}" y="${tt + th - 2}" text-anchor="end">max ${sec(gmax, 0)}</text>`;
    }
    // reward
    const tr = tops.reward, rh = 56, rid = st.reward;
    if (!rid) out += `<text class="lane-sub" x="${x0 + 8}" y="${tr + rh / 2 + 4}">No deterministic reward for this game</text>`;
    else {
      const vals = steps.map(s => s.rewards[rid]?.c);
      const fin = vals.filter(finite);
      if (!fin.length) out += `<text class="lane-sub" x="${x0 + 8}" y="${tr + rh / 2 + 4}">Not scored</text>`;
      else {
        const lo = Math.min(0, ...fin), hi = Math.max(lo + 1, ...fin);
        const Y = v => tr + rh - 5 - (v - lo) / (hi - lo) * (rh - 10);
        if (lo < 0) out += `<line x1="${x0}" x2="${x0 + pw}" y1="${Y(0)}" y2="${Y(0)}" stroke="${css('--line')}" stroke-dasharray="3 3"/>`;
        let d = '';
        steps.forEach((s, i) => { if (finite(vals[i]) && finite(xs[i])) d += (d ? 'H' + X(xs[i]) + 'V' : 'M' + X(xs[i]) + ',') + Y(vals[i]); });
        out += `<path d="${d}" fill="none" stroke="${css('--accent')}" stroke-width="2"/>`;
        steps.forEach((s, i) => {
          const v = s.rewards[rid]?.v;
          if (!finite(v) || !v || !finite(xs[i])) return;
          const cx = X(xs[i]), cy = Y(vals[i]);
          out += v > 0 ? `<path d="M${cx},${cy - 7}l5,8h-10z" fill="${css('--up')}"/>` : `<path d="M${cx},${cy + 7}l5,-8h-10z" fill="${css('--down')}"/>`;
        });
        out += `<text class="lane-sub" x="${LW - 4}" y="${tr + 12}" text-anchor="end">${fmt(hi)}</text><text class="lane-sub" x="${LW - 4}" y="${tr + rh - 2}" text-anchor="end">${fmt(lo)}</text>`;
      }
    }
    // game state
    out += stateLane(tops.state, 42, steps, xs, X);
    // markers
    const tm = tops.marks;
    steps.forEach((s, i) => {
      const f = s.flags.filter(k => k !== 'terminal');
      if (!f.length || !finite(xs[i])) return;
      f.slice(0, 3).forEach((k, j) => { out += `<circle cx="${X(xs[i])}" cy="${tm + 5 + j * 5}" r="3" fill="${css(MARKS[k].color)}"/>`; });
    });
    // cursor
    const sx = X(xs[st.step]);
    let vx = null;
    if (st.media === 'video' && videoCursor && D.frames) {
      const k = videoCursor.k, f = D.frames;
      vx = axis === 'game' && D.game_clock?.field !== 'game_ticks' ? X(f.game_ms[k] / 1000) : axis === 'wall' ? X(f.wall_ms[k] / 1000) : null;
    }
    out += `<line x1="${sx}" x2="${sx}" y1="2" y2="${y - 4}" stroke="${css('--ink')}" stroke-width="1.5"/>`;
    out += `<rect x="${sx - 3}" y="0" width="6" height="5" fill="${css('--ink')}"/>`;
    if (finite(vx)) out += `<line x1="${vx}" x2="${vx}" y1="2" y2="${y - 4}" stroke="${css('--mark')}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    out += `<text class="axis-text" x="${x0}" y="${y + 8}" text-anchor="start" opacity="0">.</text>`;
    out += `<text class="lane-sub" x="${LW - 4}" y="${y + 8}" text-anchor="end">${esc(axisName(D, axis))}</text>`;
    out += `<rect class="hit" x="${x0}" y="0" width="${pw}" height="${y}" fill="transparent"/>`;
    host.innerHTML = svgEl(out, W, H, 'Episode timeline');
    $('wave-legend').innerHTML = [['--act', 'act'], ['--wait', 'wait'], ['--look', 'look'], ['--throttle', 'throttle'], ['--api', 'API'], ['--tool', 'tool HTTP'], ['--up', 'reward up'], ['--down', 'reward down or loss'], ['--mark', 'no visible change']].map(([c, n]) => `<span><i style="background:${css(c)}"></i>${n}</span>`).join('');
    wireWave(host.querySelector('svg'), xs, X, x0, pw, max);
  }
  function stateLane(t, h, steps, xs, X) {
    let out = '';
    const key = steps.some(s => finite(s.state?.score)) ? 'score' : steps.some(s => finite(s.state?.hp)) ? 'hp' : null;
    if (!key || !steps.some(s => finite(s.state?.[key]))) return `<text class="lane-sub" x="${X(0) + 8}" y="${t + h / 2 + 4}">No game state telemetry recorded</text>`;
    const vals = steps.map(s => s.state?.[key]);
    const fin = vals.filter(finite);
    const lo = key === 'hp' ? 0 : Math.min(...fin), hi = key === 'hp' ? Math.max(...steps.map(s => s.state?.maxHp).filter(finite), ...fin) : Math.max(lo + 1, ...fin);
    const Y = v => t + h - 5 - (v - lo) / (hi - lo || 1) * (h - 18);
    let d = '';
    steps.forEach((s, i) => { if (finite(vals[i]) && finite(xs[i])) d += (d ? 'H' + X(xs[i]) + 'V' : 'M' + X(xs[i]) + ',') + Y(vals[i]); });
    out += `<path d="${d}" fill="none" stroke="${css('--muted')}" stroke-width="1.5"/>`;
    const second = key === 'score' ? 'lives' : 'depth';
    let last = null;
    steps.forEach((s, i) => {
      const v = s.state?.[second];
      if (!finite(v) || v === last || !finite(xs[i])) return;
      out += `<text class="state-text" x="${X(xs[i]) + 2}" y="${t + 11}">${second === 'lives' ? 'lives ' : 'floor '}${v}</text>`;
      last = v;
    });
    out += `<text class="lane-sub" x="${X(0) - 10}" y="${t + h - 2}" text-anchor="end">${key === 'hp' ? 'HP' : 'score'}</text>`;
    return out;
  }
  function niceTicks(max, n) {
    const raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
    const out = [];
    for (let v = 0; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
    return out;
  }
  function nearest(xs, X, px) {
    let best = 0, bd = Infinity;
    xs.forEach((v, i) => { if (!finite(v)) return; const d = Math.abs(X(v) - px); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function wireWave(svg, xs, X) {
    const tip = $('wave-tip');
    const toLocal = ev => { const r = svg.getBoundingClientRect(); return (ev.clientX - r.left) * (svg.viewBox.baseVal.width / r.width); };
    svg.addEventListener('pointermove', ev => {
      const i = nearest(xs, X, toLocal(ev)), s = D.steps_data[i];
      const rw = st.reward ? s.rewards[st.reward] : null;
      tip.hidden = false;
      tip.innerHTML = `<b>#${s.seq} ${esc(actionText(s, true))}</b>wall ${sec(s.wall)}${finite(s.game) ? ', game ' + sec(s.game, 2) : ''}${rw ? `<br>reward ${fmt(rw.v, 3)}, cumulative ${fmt(rw.c, 3)}` : ''}${s.tool !== 'reset' ? `<br>API ${sec(s.timing.api, 2)}, gap ${sec(s.timing.gap, 2)}` : ''}${s.flags.filter(f => MARKS[f]).map(f => '<br>' + esc(MARKS[f].label)).join('')}`;
      const wr = $('wave').parentElement.getBoundingClientRect();
      let left = ev.clientX - wr.left + 14;
      if (left + 300 > wr.width) left = ev.clientX - wr.left - 300;
      tip.style.left = Math.max(4, left) + 'px';
      tip.style.top = (ev.clientY - wr.top + 14) + 'px';
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; });
    svg.addEventListener('click', ev => { stopPlay(); selectStep(nearest(xs, X, toLocal(ev)), {seekVideo: true}); });
  }
  document.querySelectorAll('#axis-seg button').forEach(b => b.onclick = () => { st.axis = b.dataset.axis; drawWave(); });

  // ---------- compare ----------
  const cmpD = [null, null];
  async function renderCompare() {
    const list = gameEps();
    if (!list.length) return;
    const pool = cohortEps().length > 1 ? cohortEps() : list;
    for (let k = 0; k < 2; k++) if (st.cmp[k] == null || EPS[st.cmp[k]].game !== st.game) st.cmp[k] = pool[Math.min(k, pool.length - 1)].i;
    const opts = [...new Set(list.map(e => e.cohort))].map(c => `<optgroup label="${esc(c)}">${list.filter(e => e.cohort === c).map(e => `<option value="${e.i}">${esc(epLabel(e))}</option>`).join('')}</optgroup>`).join('');
    $('cmp-a').innerHTML = opts; $('cmp-b').innerHTML = opts;
    $('cmp-a').value = st.cmp[0]; $('cmp-b').value = st.cmp[1];
    const [a, b] = await Promise.all(st.cmp.map(load));
    if (st.view !== 'compare') return;
    cmpD[0] = a; cmpD[1] = b;
    const gameOK = hasGameAxis(a) && hasGameAxis(b) && a.game_clock?.field === b.game_clock?.field;
    document.querySelectorAll('#cmp-axis button').forEach(x => { x.classList.toggle('on', x.dataset.axis === st.cmpAxis); if (x.dataset.axis === 'game') x.disabled = !gameOK; });
    if (st.cmpAxis === 'game' && !gameOK) { st.cmpAxis = 'wall'; return renderCompare(); }
    const warn = [];
    if (a.cohort !== b.cohort) warn.push('These episodes come from different cohorts, so timing and protocol conditions can differ.');
    if (a.i === b.i) warn.push('Both sides show the same episode.');
    $('cmp-warn').hidden = !warn.length; $('cmp-warn').textContent = warn.join(' ');
    const max = Math.max(...[a, b].map(d => Math.max(0, ...d.steps_data.map((s, i) => axisOf(d, s, i, st.cmpAxis)).filter(finite))));
    $('cmp-scrub').max = max; $('cmp-scrub').step = st.cmpAxis === 'step' ? 1 : .01;
    st.cmpPos = Math.min(st.cmpPos, max);
    renderCmpTable(a, b);
    setCmpPos(st.cmpPos);
    writeHash();
  }
  function cmpIndex(d, pos) {
    let k = 0;
    d.steps_data.forEach((s, i) => { const v = axisOf(d, s, i, st.cmpAxis); if (finite(v) && v <= pos + 1e-9) k = i; });
    return k;
  }
  function setCmpPos(pos) {
    st.cmpPos = pos;
    $('cmp-scrub').value = pos;
    $('cmp-clock').textContent = st.cmpAxis === 'step' ? `Observation ${Math.round(pos)}` : `${fmt(pos, 1)} ${st.cmpAxis === 'game' ? gameClockLabel(cmpD[0]) : 's'} ${st.cmpAxis === 'game' ? 'game time' : 'wall time'}`;
    cmpD.forEach((d, k) => {
      if (!d) return;
      const i = cmpIndex(d, pos), s = d.steps_data[i], rw = st.reward ? s.rewards[st.reward] : null;
      const after = pos > Math.max(...d.steps_data.map((x, j) => axisOf(d, x, j, st.cmpAxis)).filter(finite));
      $('cmp-panel-' + k).innerHTML = `<h2>${esc(modelName(d))} <span class="chip">${esc(d.effort)}</span> <span class="chip">${esc(runName(d))}</span></h2>
        <div class="stage ${d.game !== 'veloren' ? 'pixel' : ''}" style="margin-top:8px"><img src="${esc(u(s.obs.img))}" alt="${esc(epLabel(d))} observation ${s.seq}"></div>
        <div class="cap"><span><b>#${s.seq}</b> ${esc(actionText(s, true))}${after ? ' <span class="chip">episode ended</span>' : ''}</span>
        <span class="muted">${rw ? `cumulative reward ${fmt(rw.c, 3)}` : 'no reward'}, wall ${sec(s.wall)}${finite(s.game) ? ', game ' + sec(s.game, 2) : ''}</span>
        <span><a href="#/ep/${d.i}/${i}">Open this step in Episode view</a></span></div>`;
    });
    drawCmpWave();
  }
  function drawCmpWave() {
    const host = $('cmp-wave'), W = Math.max(320, host.clientWidth), LW = W < 600 ? 40 : 60, x0 = LW + 6, R = 12, pw = W - x0 - R;
    const [a, b] = cmpD; if (!a || !b) return;
    const ax = st.cmpAxis, rid = st.reward;
    const sets = [a, b].map(d => d.steps_data.map((s, i) => axisOf(d, s, i, ax)));
    const max = Math.max(1e-9, ...sets.flat().filter(finite));
    const X = v => x0 + v / max * pw;
    const rh = 150, mh = 14;
    let out = '';
    out += `<rect x="${x0}" y="4" width="${pw}" height="${rh}" fill="${css('--panel-2')}" rx="3"/>`;
    for (const t of niceTicks(max, Math.max(3, Math.floor(pw / 90)))) out += `<line x1="${X(t)}" x2="${X(t)}" y1="4" y2="${4 + rh + 2 * (mh + 4)}" stroke="${css('--grid')}"/><text class="axis-text" x="${X(t)}" y="${rh + 2 * (mh + 4) + 18}" text-anchor="middle">${fmt(t, 1)}</text>`;
    if (rid) {
      const all = [a, b].flatMap(d => d.steps_data.map(s => s.rewards[rid]?.c)).filter(finite);
      const lo = Math.min(0, ...all), hi = Math.max(lo + 1, ...all);
      const Y = v => 4 + rh - 6 - (v - lo) / (hi - lo) * (rh - 14);
      if (lo < 0) out += `<line x1="${x0}" x2="${x0 + pw}" y1="${Y(0)}" y2="${Y(0)}" stroke="${css('--line')}" stroke-dasharray="3 3"/>`;
      out += `<text class="lane-sub" x="${LW}" y="16" text-anchor="end">${fmt(hi)}</text><text class="lane-sub" x="${LW}" y="${rh}" text-anchor="end">${fmt(lo)}</text>`;
      [a, b].forEach((d, k) => {
        let p = '';
        d.steps_data.forEach((s, i) => { const v = s.rewards[rid]?.c, x = sets[k][i]; if (finite(v) && finite(x)) p += (p ? 'H' + X(x) + 'V' : 'M' + X(x) + ',') + Y(v); });
        out += `<path d="${p}" fill="none" stroke="${css(k ? '--b' : '--a')}" stroke-width="2.2"/>`;
        const endI = d.steps_data.length - 1, ev = d.steps_data[endI].rewards[rid]?.c;
        if (finite(ev) && finite(sets[k][endI])) out += `<circle cx="${X(sets[k][endI])}" cy="${Y(ev)}" r="4" fill="${css(k ? '--b' : '--a')}"/>`;
      });
    } else out += `<text class="lane-sub" x="${x0 + 8}" y="${rh / 2}">No deterministic reward for this game</text>`;
    [a, b].forEach((d, k) => {
      const ty = 4 + rh + 4 + k * (mh + 4);
      out += `<rect x="${x0}" y="${ty}" width="${pw}" height="${mh}" fill="${css('--panel-2')}" rx="3"/><text class="lane-label" x="${LW}" y="${ty + 11}" text-anchor="end" fill="${css(k ? '--b' : '--a')}">${k ? 'B' : 'A'}</text>`;
      d.steps_data.forEach((s, i) => {
        const f = s.flags.filter(x => x !== 'terminal');
        if (f.length && finite(sets[k][i])) out += `<circle cx="${X(sets[k][i])}" cy="${ty + mh / 2}" r="3" fill="${css(MARKS[f[0]].color)}"/>`;
        if (s.status && s.status !== 'running' && finite(sets[k][i])) out += `<line x1="${X(sets[k][i])}" x2="${X(sets[k][i])}" y1="${ty}" y2="${ty + mh}" stroke="${css('--down')}" stroke-width="2.5"/>`;
      });
    });
    const H = rh + 2 * (mh + 4) + 26;
    out += `<line x1="${X(st.cmpPos)}" x2="${X(st.cmpPos)}" y1="2" y2="${H - 22}" stroke="${css('--ink')}" stroke-width="1.5"/>`;
    out += `<rect x="${x0}" y="0" width="${pw}" height="${H - 20}" fill="transparent"/>`;
    host.innerHTML = svgEl(out, W, H, 'Cumulative reward for both episodes');
    const svg = host.querySelector('svg');
    svg.addEventListener('click', ev => { const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) * (W / r.width); stopCmp(); setCmpPos(Math.max(0, Math.min(max, (px - x0) / pw * max))); });
    $('cmp-legend').innerHTML = [a, b].map((d, k) => `<span><i style="background:${css(k ? '--b' : '--a')}"></i>${k ? 'B' : 'A'}: ${esc(epLabel(d))}</span>`).join('') + (rid ? `<span>${esc(rewardDef(a.game, rid)?.label || '')}</span>` : '') + `<span>x axis: ${esc(axisName(a, ax))}</span>`;
  }
  function renderCmpTable(a, b) {
    const ret = d => { const r = d.returns[st.reward]; return !st.reward ? '–' : finite(r?.total) ? fmt(r.total) : 'unknown'; };
    const rows = [
      ['Outcome', d => outcomeText(d)], ['Return', ret], ['Wall time', d => dur(d.duration_ms)], ['Game time', d => finite(d.game_duration_ms) ? dur(d.game_duration_ms) : finite(d.game_turns) ? fmt(d.game_turns) + ' turns' : '–'],
      ['Steps', d => d.steps], ['API median', d => sec(d.api_median, 2)], ['Decision gap median', d => sec(d.gap_median, 2)], ['Spend', d => usd(d.cost)],
      ...MARK_ORDER.filter(k => k !== 'terminal' && (a.flags[k] || b.flags[k])).map(k => [MARKS[k].label, d => d.flags[k] || 0]),
    ];
    $('cmp-table').innerHTML = `<thead><tr><th></th><th>A</th><th>B</th></tr></thead><tbody>${rows.map(([n, f]) => `<tr><td>${esc(n)}</td><td>${esc(f(a))}</td><td>${esc(f(b))}</td></tr>`).join('')}</tbody>`;
  }
  $('cmp-a').onchange = ev => { stopCmp(); st.cmp[0] = +ev.target.value; renderCompare(); };
  $('cmp-b').onchange = ev => { stopCmp(); st.cmp[1] = +ev.target.value; renderCompare(); };
  document.querySelectorAll('#cmp-axis button').forEach(b => b.onclick = () => { stopCmp(); st.cmpAxis = b.dataset.axis; st.cmpPos = 0; renderCompare(); });
  $('cmp-scrub').oninput = ev => { stopCmp(); setCmpPos(+ev.target.value); };
  $('cmp-play').onclick = () => {
    if (st.cmpTimer) return stopCmp();
    const max = +$('cmp-scrub').max;
    if (st.cmpPos >= max) setCmpPos(0);
    $('cmp-play').textContent = 'Pause';
    const inc = st.cmpAxis === 'step' ? 1 : st.cmpAxis === 'wall' ? 2 : (cmpD[0]?.game_clock?.field === 'game_ticks' ? 1 : .5);
    st.cmpTimer = setInterval(() => { const n = Math.min(max, st.cmpPos + inc); setCmpPos(n); if (n >= max) stopCmp(); }, 250);
  };
  function stopCmp() { if (st.cmpTimer) clearInterval(st.cmpTimer); st.cmpTimer = null; $('cmp-play').textContent = 'Play'; }

  // ---------- live mode ----------
  function liveNote() {
    const note = $('live-note');
    const e = st.ep != null ? EPS[st.ep] : null;
    if (!LAB.live || !D || !e?.live) { note.hidden = true; return; }
    note.hidden = false;
    if (!e.live.running) { note.innerHTML = 'Episode finished. Export the run to add offline rewards, reviews and video.'; return; }
    const p = (D.pending || [])[0];
    let text = '<b>Running.</b> ';
    if (p && !p.answered) text += `Model call in flight after observation #${esc(p.input_seq)}` + (finite(p.age_s) ? ` (sent ${p.age_s.toFixed(1)} s ago)` : '') + '.';
    else if (p) text += `Model answered after observation #${esc(p.input_seq)}; waiting for the game step.`;
    else text += 'Waiting for the next step.';
    const following = st.step >= D.steps_data.length - 1;
    const html = text + (following ? ' The view follows new steps.' : ` <button class="ghost small" data-follow>Jump to latest (#${D.steps_data[D.steps_data.length - 1].seq})</button>`);
    if (note.innerHTML !== html) note.innerHTML = html;
  }
  $('live-note').addEventListener('click', ev => { if (ev.target.closest('[data-follow]') && D) selectStep(D.steps_data.length - 1); });
  async function refreshEpisode() {
    const i = st.ep, follow = !D || D.i !== i || st.step >= D.steps_data.length - 1;
    cache.delete(i);
    const d = await load(i);
    if (st.ep !== i || st.view !== 'episode') return;
    D = d;
    renderEpisodeHead(EPS[i]);
    $('scrub').max = d.steps_data.length - 1;
    selectStep(follow ? d.steps_data.length - 1 : Math.min(st.step, d.steps_data.length - 1));
  }
  let polling = false;
  async function poll() {
    if (polling) return;
    polling = true;
    try {
      const idx = await (await fetch(u('live/index.json'), {cache: 'no-store'})).json();
      const before = new Map(EPS.map(e => [e.i, e.live?.version]));
      GAMES.splice(0, GAMES.length, ...idx.games);
      EPS.splice(0, EPS.length, ...idx.episodes);
      LAB.cohort_notes = idx.cohort_notes || LAB.cohort_notes;
      LAB.cohorts = idx.cohorts || LAB.cohorts;
      if (!game(st.game)) setGame(GAMES[0].id);
      if (!gameEps().some(e => e.cohort === st.cohort)) st.cohort = game(st.game).default_cohort_id;
      const changed = i => i != null && before.get(i) !== EPS[i]?.live?.version;
      $('live-badge').hidden = false;
      $('live-badge').classList.remove('stale');
      $('live-badge').textContent = 'Live, ' + EPS.filter(e => e.live?.running).length + ' running';
      renderBar();
      renderLivePanel();
      if (st.view === 'runs') renderRuns();
      if (st.view === 'home') renderHome();
      if (st.view === 'episode' && changed(st.ep)) await refreshEpisode();
      if (st.view === 'compare' && st.cmp.some(changed)) { st.cmp.forEach(i => cache.delete(i)); await renderCompare(); }
      if (st.view === 'run' && !runState.busy) { try { runState.status = await api('api/status'); renderQueue(); } catch (e) { /* keep last */ } }
      liveNote();
    } catch (err) {
      $('live-badge').hidden = false;
      $('live-badge').classList.add('stale');
      $('live-badge').textContent = 'Live server not reachable';
    }
    polling = false;
  }
  let pollTimer = null;
  function startLive() {
    $('live-badge').hidden = false;
    $('live-badge').classList.remove('stale');
    $('live-badge').textContent = 'Live';
    $('run-tab').hidden = false;
    if (!pollTimer) pollTimer = setInterval(poll, LAB.poll_ms || 2000);
  }
  if (LAB.live) startLive();

  // ---------- running-now panel (opened from the live badge) ----------
  function renderLivePanel() {
    const panel = $('live-panel');
    if (panel.hidden) return;
    const running = EPS.filter(e => e.live?.running).sort((a, b) => (game(a.game)?.label || '').localeCompare(game(b.game)?.label || '') || modelName(a).localeCompare(modelName(b)));
    panel.innerHTML = `<h3>Playing now (${running.length})</h3>` + (running.length ? `<ul>${running.map(e => {
      const r = e.returns?.[game(e.game)?.default_reward_id] || e.returns?.raw || {};
      const score = finite(r.observed) ? `, reward so far ${fmt(r.observed)}` : '';
      return `<li><button class="live-row" data-i="${e.i}"><span><b>${esc(game(e.game)?.label || e.game)}</b> · ${esc(modelName(e))} <span class="chip">${esc(e.effort)}</span></span>
        <span class="when">${dur(e.duration_ms)}</span><span class="meta">${esc(e.cohort)} · ${e.steps} steps${score}</span></button></li>`;
    }).join('')}</ul>` : '<p class="muted">Nothing is playing right now. Finished runs stay under each game.</p>');
    panel.querySelectorAll('.live-row').forEach(b => b.onclick = () => {
      const e = EPS[+b.dataset.i];
      closeLivePanel();
      setGame(e.game); st.cohort = e.cohort; st.ep = e.i; st.step = 0;
      setView('episode');
    });
  }
  function closeLivePanel() { $('live-panel').hidden = true; $('live-badge').setAttribute('aria-expanded', 'false'); }
  $('live-badge').onclick = ev => {
    ev.stopPropagation();
    const open = $('live-panel').hidden;
    $('live-panel').hidden = !open;
    $('live-badge').setAttribute('aria-expanded', String(open));
    renderLivePanel();
  };
  document.addEventListener('click', ev => { if (!$('live-panel').hidden && !ev.target.closest('#live-panel')) closeLivePanel(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('live-panel').hidden) closeLivePanel(); });

  // The hosted page shows live data when live.json names a reachable live server.
  async function tryRemoteLive() {
    if (LAB.live) return;
    try {
      const cfg = await (await fetch('live.json', {cache: 'no-store'})).json();
      if (!cfg.url) return;
      const base = cfg.url.replace(/\/?$/, '/');
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 15000);   // the live index takes longer while many runs play
      const idx = await (await fetch(base + 'live/index.json', {cache: 'no-store', signal: ctl.signal})).json();
      clearTimeout(timer);
      const key = i => i != null && EPS[i] ? EPS[i].game + '|' + EPS[i].id : null;
      const keep = [st.ep, st.cmp[0], st.cmp[1]].map(key);
      BASE = base;
      Object.assign(LAB, {live: true, poll_ms: idx.poll_ms, notes: idx.notes, cohort_notes: idx.cohort_notes, cohorts: idx.cohorts || LAB.cohorts, markers: idx.markers || LAB.markers});
      GAMES.splice(0, GAMES.length, ...idx.games);
      EPS.splice(0, EPS.length, ...idx.episodes);
      cache.clear(); D = null;
      const find = k => k ? (EPS.find(e => e.game + '|' + e.id === k) || {}).i ?? null : null;
      st.ep = find(keep[0]); st.cmp = [find(keep[1]), find(keep[2])];
      if (!game(st.game)) setGame(GAMES[0].id);
      // a link to a cohort that only the live server has (or the live default) wins over the archive's choice
      const asked = (INITIAL_HASH.match(/^#\/runs\/([^/]+)\/([^/]+)/) || []).map(decodeURIComponent);
      if (asked[1] === st.game && gameEps().some(e => e.cohort === asked[2])) st.cohort = asked[2];
      else if (!st.cohortPicked || !gameEps().some(e => e.cohort === st.cohort)) st.cohort = game(st.game).default_cohort_id;
      startLive();
      render();
    } catch (err) {
      $('live-badge').hidden = false;
      $('live-badge').classList.add('stale');
      $('live-badge').textContent = 'Archive; live server offline';
    }
  }

  // ---------- run requests ----------
  const runState = {models: [], modelsAt: 0, status: null, busy: false, integrations: null, gamesKey: ''};
  const tokenKey = 'gameplay-lab-token';
  function savedToken() { try { return localStorage.getItem(tokenKey) || ''; } catch (e) { return ''; } }
  function saveToken(v) { try { v ? localStorage.setItem(tokenKey, v) : localStorage.removeItem(tokenKey); } catch (e) { /* private mode */ } }
  if (location.hash.startsWith('#token=')) {
    saveToken(decodeURIComponent(location.hash.slice(7)));
    history.replaceState(null, '', '#/run');
  }
  async function api(path, body) {
    const opts = body === undefined ? {cache: 'no-store'} : {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Lab-Token': $('run-token').value.trim()}, body: JSON.stringify(body)};
    const r = await fetch(u(path), opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
    return data;
  }
  async function renderRunView() {
    const off = $('run-offline');
    if (!$('run-token').value) $('run-token').value = savedToken();
    if (!LAB.live) {
      off.hidden = false; off.textContent = 'The live server is offline, so runs cannot be requested right now. The archive stays browsable.';
      $('run-form').hidden = true; $('add-form').hidden = true; return;
    }
    try {
      runState.status = await api('api/status');
      if (!runState.status.enabled) throw new Error('Run requests are turned off on the live server.');
      if (!runState.models.length || Date.now() - runState.modelsAt > 600000) {
        runState.models = (await api('api/models')).models; runState.modelsAt = Date.now();
        fillModels();
      }
      off.hidden = true; $('run-form').hidden = false; $('add-form').hidden = false;
      renderQueue();
      loadIntegrations();
    } catch (err) {
      off.hidden = false; off.textContent = err.message; $('run-form').hidden = true; $('add-form').hidden = true;
    }
  }
  function fillGames() {
    const games = runState.status.games, key = games.map(x => x.id).join(',');
    if (key === runState.gamesKey) return;
    const g = $('run-game'), keep = g.value;
    g.innerHTML = games.map(x => `<option value="${esc(x.id)}">${esc(x.label)}</option>`).join('');
    if (games.some(x => x.id === keep)) g.value = keep;
    runState.gamesKey = key;
  }
  function fillModels() {
    const q = $('run-filter').value.trim().toLowerCase(), sel = $('run-model'), keep = sel.value;
    const rows = runState.models.filter(m => !q || (m.id + ' ' + m.name).toLowerCase().includes(q));
    sel.innerHTML = rows.map(m => `<option value="${esc(m.id)}"${m.allowed ? '' : ' disabled'}>${esc(m.name)}${m.kind === 'router' ? '  (router: picks the model per call)' : m.kind === 'decision' ? `  (decision model, $${fmt(m.prompt_per_m, 3)} per M in)` : `  ($${fmt(m.prompt_per_m, 3)} / $${fmt(m.completion_per_m, 3)} per M)`}${m.allowed ? '' : ', too costly per call'}</option>`).join('');
    if (rows.some(m => m.id === keep)) sel.value = keep;
    else { const first = rows.find(m => m.allowed); if (first) sel.value = first.id; }
    fillEffort();
  }
  function fillEffort() {
    const m = runState.models.find(x => x.id === $('run-model').value);
    const efforts = (m?.efforts || []).filter(e => e !== 'none');
    const keep = $('run-effort').value;
    $('run-effort').innerHTML = '<option value="">default</option>' + efforts.map(e => `<option value="${esc(e)}">${esc(e)}</option>`).join('');
    $('run-effort').value = efforts.includes(keep) ? keep : (efforts.includes('low') ? 'low' : '');
    estimate();
  }
  function estimate() {
    const m = runState.models.find(x => x.id === $('run-model').value);
    if (!m) { $('run-estimate').textContent = 'Pick a model.'; return; }
    const n = +$('run-repeats').value;
    // rough: about 60 calls per five-minute episode, about 4,000 prompt and 300 completion tokens each
    // routers bill the model they pick; use the ceiling they are held to
    const typical = n * 60 * (m.kind === 'router' ? 4000 * 4 + 300 * 20 : 4000 * m.prompt_per_m + 300 * m.completion_per_m) / 1e6;
    const cap = Math.ceil(m.worst_case_call_usd + 2);
    $('run-estimate').textContent = `About $${typical.toFixed(2)} for ${n} episode${n > 1 ? 's' : ''} (rough). Hard cap for this request: $${cap}, because each call first reserves its worst case of $${m.worst_case_call_usd.toFixed(2)}.`;
  }
  function renderQueue() {
    const st2 = runState.status;
    if (!st2) return;
    const acct = st2.account || {};
    $('run-budget').innerHTML = [
      ['$' + fmt(+st2.committed_usd, 2), 'spent or held by requested runs'],
      ['$' + fmt(+st2.total_cap_usd, 0), 'total cap for requested runs'],
      [finite(acct.limit_remaining) ? '$' + fmt(acct.limit_remaining, 2) : (finite(acct.usage) ? '$' + fmt(acct.usage, 2) + ' used' : '–'), finite(acct.limit_remaining) ? 'left on the OpenRouter key' : 'OpenRouter key usage'],
      [st2.queue.filter(i => ['queued', 'planning', 'running'].includes(i.status)).length, 'open requests'],
    ].map(([b, t]) => `<div class="stat"><b>${esc(b)}</b><span>${esc(t)}</span></div>`).join('');
    fillGames();
    const rows = [...st2.queue].reverse();
    const chip = s => `<span class="chip ${s === 'running' || s === 'planning' ? 'live' : s === 'finished' ? 'ok' : s === 'queued' ? '' : 'warn'}">${esc(s)}</span>`;
    $('run-queue').innerHTML = `<thead><tr><th>#</th><th>Game</th><th>Model</th><th>Effort</th><th class="r">Episodes</th><th>Status</th><th class="r">Cap</th><th class="r">Spent or held</th><th></th></tr></thead><tbody>${rows.length ? rows.map(i => {
      if (i.kind === 'add_game') {
        const name = i.result ? i.result.label : (i.expect ? prettyGame(i.expect) : i.rom_name);
        const detail = i.status === 'finished' ? `Matched ${esc(i.result.game)}; ${i.result.smoke_run.distinct_frames} distinct frames in the check run` : i.error ? esc(i.error) : (i.status === 'running' ? 'Matching the ROM and checking it on the emulator' : '');
        return `<tr><td>${i.id}</td><td>${esc(name)}</td><td>Add game</td><td>–</td><td class="r">–</td>
          <td>${chip(i.status)}${detail ? `<span class="muted small err-line">${detail}</span>` : ''}</td><td class="r">–</td><td class="r">$0</td>
          <td><div class="row-btns">${i.status === 'finished' && runState.status.games.some(g => g.id === i.result.id) ? `<button data-runit="${esc(i.result.id)}">Run it</button>` : ''}${i.status === 'queued' ? `<button data-cancel="${i.id}">Cancel</button>` : ''}</div></td></tr>`;
      }
      const open = ['queued', 'planning', 'running'].includes(i.status);
      const cls = i.status === 'running' || i.status === 'planning' ? 'live' : i.status === 'finished' ? 'ok' : i.status === 'queued' ? '' : 'warn';
      return `<tr><td>${i.id}</td><td>${esc((runState.status.games.find(g => g.id === i.game) || {}).label || i.game)}</td><td>${esc(i.model.split('/').pop())}</td><td>${esc(i.effort || 'default')}</td><td class="r">${i.repeats}</td>
        <td><span class="chip ${cls}">${esc(i.status)}</span>${i.stop_requested ? ' <span class="chip warn">stop requested</span>' : ''}</td><td class="r">$${esc(i.budget_usd)}</td><td class="r">${i.spent_or_held_usd ? '$' + fmt(+i.spent_or_held_usd, 4) : '–'}</td>
        <td><div class="row-btns">${i.status !== 'queued' ? `<button data-cohort="${esc(i.cohort)}" data-game="${esc(i.game)}">Episodes</button>` : ''}${open ? `<button data-cancel="${i.id}">${i.status === 'queued' ? 'Cancel' : 'Stop after episode'}</button>` : ''}</div></td></tr>`;
    }).join('') : '<tr><td colspan="9" class="muted">No requests yet.</td></tr>'}</tbody>`;
    $('run-queue').querySelectorAll('[data-runit]').forEach(b => b.onclick = () => { $('run-game').value = b.dataset.runit; $('run-form').scrollIntoView({behavior: 'smooth'}); });
    $('run-queue').querySelectorAll('[data-cohort]').forEach(b => b.onclick = () => { setGame(b.dataset.game); st.cohort = b.dataset.cohort; setView('runs'); });
    $('run-queue').querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { await api('api/runs/' + b.dataset.cancel + '/cancel', {}); } catch (err) { $('run-message').textContent = err.message; $('run-message').className = 'bad'; }
      renderRunView();
    });
  }
  // ---------- adding games ----------
  const prettyGame = g => { const p = g.split('-'); return p.length >= 3 ? p.slice(0, -2).join('-').replace(/(?<=[a-z0-9])(?=[A-Z])/g, ' ') + ' (' + p[p.length - 2] + ')' : g; };
  async function loadIntegrations() {
    if (runState.integrations && Date.now() - runState.integrationsAt < 600000) return;
    try {
      runState.integrations = (await api('api/integrations')).integrations; runState.integrationsAt = Date.now();
      $('add-games').innerHTML = runState.integrations.map(x => `<option value="${esc(x.game)}">${esc(prettyGame(x.game))}${x.registered ? ', already added' : x.core === false ? ', no working emulator here' : ''}</option>`).join('');
      $('add-game').placeholder = `Search ${runState.integrations.length.toLocaleString()} supported games`;
      addHint();
    } catch (err) { $('add-hint').textContent = 'Could not load the supported games list; adding still works by ROM hash.'; }
  }
  function addHint() {
    const v = $('add-game').value.trim(), list = runState.integrations || [];
    const hit = list.find(x => x.game === v);
    $('add-hint').textContent = !v ? 'Leave blank to identify the game from the ROM alone.'
      : hit ? (hit.registered ? `Already in the Game list as ${hit.registered}.` : hit.core === false ? `The ${hit.system} emulator core does not load on this machine, so this game cannot be added yet.` : `${prettyGame(hit.game)} is supported. The ROM must be this game.`)
      : 'Pick a name from the list, or leave blank.';
  }
  async function uploadRom(file, expect) {
    const q = new URLSearchParams({name: file.name});
    if (expect) q.set('expect', expect);
    const r = await fetch(u('api/games/upload?' + q), {method: 'POST', headers: {'Content-Type': 'application/octet-stream', 'X-Lab-Token': $('run-token').value.trim()}, body: file});
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
    return data;
  }
  $('add-game').oninput = addHint;
  $('add-form').onsubmit = async ev => {
    ev.preventDefault();
    const msg = $('add-message'), file = $('add-file').files[0], path = $('add-path').value.trim(), g = $('add-game').value.trim();
    const expect = (runState.integrations || []).some(x => x.game === g) ? g : null;
    if (!file && !path) { msg.className = 'bad'; msg.textContent = 'Choose a ROM file or type its path.'; return; }
    if (g && runState.integrations && !expect) { msg.className = 'bad'; msg.textContent = 'Pick the game from the list, or leave it blank.'; return; }
    if (!$('run-token').value.trim()) { msg.className = 'bad'; msg.textContent = 'Enter the access token above first.'; return; }
    $('add-submit').disabled = true; msg.className = ''; msg.textContent = file ? 'Uploading…' : 'Sending…';
    try {
      saveToken($('run-token').value.trim());
      const item = file ? await uploadRom(file, expect) : await api('api/games', {path, expect});
      msg.className = 'good';
      msg.textContent = `Adding as job #${item.id}. The checks take about a minute; the game then appears in the Game list above.`;
      $('add-file').value = ''; $('add-path').value = '';
      runState.integrationsAt = 0;
      renderRunView();
    } catch (err) { msg.className = 'bad'; msg.textContent = err.message; }
    $('add-submit').disabled = false;
  };

  $('run-filter').oninput = fillModels;
  $('run-model').onchange = fillEffort;
  $('run-repeats').onchange = estimate;
  $('run-token').onchange = () => saveToken($('run-token').value.trim());
  $('run-form').onsubmit = async ev => {
    ev.preventDefault();
    if (runState.busy) return;
    runState.busy = true; $('run-submit').disabled = true;
    const msg = $('run-message');
    try {
      saveToken($('run-token').value.trim());
      const item = await api('api/runs', {game: $('run-game').value, model: $('run-model').value, effort: $('run-effort').value || null, repeats: +$('run-repeats').value});
      msg.className = 'good';
      msg.textContent = `Queued as request #${item.id} with a $${item.budget_usd} cap. Its episodes will appear under ${item.cohort}.`;
      renderRunView();
    } catch (err) { msg.className = 'bad'; msg.textContent = err.message; }
    runState.busy = false; $('run-submit').disabled = false;
  };

  // ---------- keyboard + resize ----------
  document.addEventListener('keydown', ev => {
    if (ev.target.closest('input, select, textarea') && !(ev.target.type === 'range' && st.view === 'episode')) return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === '?') { $('keys').showModal(); return; }
    if (st.view !== 'episode' || !D) return;
    const k = ev.key;
    if (k === 'ArrowRight' || k === 'ArrowLeft') { ev.preventDefault(); const dir = k === 'ArrowRight' ? 1 : -1; if (ev.shiftKey) jumpMark(dir); else { stopPlay(); selectStep(st.step + dir, {seekVideo: true}); } }
    else if (k === ' ') { ev.preventDefault(); st.playing ? stopPlay() : startPlay(); }
    else if (k === 'Home') { ev.preventDefault(); selectStep(0, {seekVideo: true}); }
    else if (k === 'End') { ev.preventDefault(); selectStep(1e9, {seekVideo: true}); }
    else if (k === '[') stepEpisode(-1);
    else if (k === ']') stepEpisode(1);
    else if (k >= '1' && k <= '4') setMedia(['frame', 'input', 'diff', 'video'][+k - 1]);
    else if ('wgs'.includes(k.toLowerCase())) { const a = {w: 'wall', g: 'game', s: 'step'}[k.toLowerCase()]; if (a !== 'game' || hasGameAxis(D)) { st.axis = a; drawWave(); } }
  });
  $('keys-btn').onclick = () => $('keys').showModal();
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (st.view === 'episode') drawWave(); if (st.view === 'compare') drawCmpWave(); }, 120); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => render());
  window.addEventListener('hashchange', () => { const before = location.hash; readHash(); if (location.hash === before) render(); });

  readHash();
  render();
  tryRemoteLive();
})();
