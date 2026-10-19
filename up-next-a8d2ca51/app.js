const LABEL = { interview: "Interview", exam: "Exam / quiz", assignment: "Assignment", routine: "Attendance", event: "Event", personal: "Personal" };
const MAILCAT = { rejection: "Rejection", assessment: "Assessment", interview: "Interview", "action-needed": "Action needed",
  "application-ack": "Application received", newsletter: "Newsletter", school: "School", promo: "Promo", spam: "Spam", other: "Other" };
const $ = id => document.getElementById(id);
// Calendar arithmetic uses UTC date-only values; event instants use Chicago's IANA zone.
const T = UpNextTime;
const key = d => d.toISOString().slice(0, 10);
const todayKey = () => T.dateKey(new Date());
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const URL_RE = /https?:\/\/[^\s,)]+/g;
const safeUrl = u => { try { const p = new URL(u); return ["https:", "http:"].includes(p.protocol) ? esc(p.href) : "#"; } catch { return "#"; } };
const linkify = s => String(s).split(/(https?:\/\/[^\s,)]+)/g).map(t => /^https?:\/\//.test(t) ? `<a href="${safeUrl(t)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>` : esc(t)).join("");
const fmtTime = T.fmtTime;
const fmtDay = (k, o = { weekday: "short", month: "short", day: "numeric" }) => new Date(k + "T12:00:00Z").toLocaleDateString("en-US", { ...o, timeZone: "UTC" });
const fmtStamp = iso => new Date(iso).toLocaleString("en-US", { timeZone: T.ZONE, timeZoneName: "short", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const when = T.startOf;
const timeStr = T.timeStr;
const idOf = i => (i.date + "-" + (i.course || "") + "-" + i.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);

const until = T.relative;

// per-viewer "done" ticks, best effort
const store = { get() { try { const v = JSON.parse(localStorage.getItem("upnext-done") || "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return {}; } },
  set(v) { try { localStorage.setItem("upnext-done", JSON.stringify(v)); return true; } catch { return false; } } };
let ticked = store.get();
const isDone = i => i.done || !!ticked[i.id];

let items = [], mail = null, view = new Date(todayKey() + "T12:00:00Z"), selected = todayKey();
const filt = { kinds: new Set(), courses: new Set(), q: "" };

function passes(i) {
  if (filt.kinds.size && !filt.kinds.has(i.kind)) return false;
  if (filt.courses.size && !filt.courses.has(i.course || "Other")) return false;
  if (i.kind === "routine" && !$("showRoutine").checked && !filt.kinds.has("routine")) return false;
  if (isDone(i) && !$("showDone").checked) return false;
  if (filt.q) { const hay = `${i.title} ${i.course} ${i.note} ${i.desc || ""}`.toLowerCase(); if (!hay.includes(filt.q)) return false; }
  return true;
}
const filtering = () => filt.kinds.size || filt.courses.size || filt.q;

function sub(i) {
  return [i.course, i.pts != null ? `${i.pts} pts` : "", i.how || ""].filter(Boolean).join(" · ")
    || (i.note ? i.note.replace(URL_RE, "").replace(/\s+[;,.]?\s*$/, "").slice(0, 110) : "");
}

function renderHero() {
  const now = new Date();
  const priority = i => T.endOf(i) && when(i) <= now ? 0 : !i.start ? 2 : 1;
  const next = items.filter(i => !isDone(i) && !["routine", "personal"].includes(i.kind) && T.eligible(i, now)).sort((a, b) => priority(a) - priority(b) || when(a) - when(b))[0];
  if (!next) { $("hero").innerHTML = `<div class="hero empty-hero"><span class="eyebrow">A little breathing room</span><span class="big">You’re all caught up.</span><span class="muted">Browse the timeline or calendar for what’s ahead.</span></div>`; return; }
  const phase = T.endOf(next) && when(next) <= now ? "Happening now" : "Next up";
  if ($("hero").firstElementChild?.dataset.id === next.id && $("hero").firstElementChild?.dataset.phase === phase) return;
  $("hero").innerHTML = `<button data-phase="${phase}" class="hero k-${next.kind}" data-id="${next.id}">
    <span class="eyebrow">${phase} · ${LABEL[next.kind]}</span>
    <span class="big">${esc(next.title)}</span>
    <span class="muted">${esc(next.course ? next.course + " · " : "")}${fmtDay(next.date, { weekday: "long", month: "short", day: "numeric" })}, ${timeStr(next)}</span>
    <span class="cd" data-cd="${next.id}">${T.status(next)}</span><span class="hero-open">View details ↗</span></button>`;
}

function rowHtml(i) {
  return `<button class="row k-${i.kind} ${i.kind} ${isDone(i) ? "done" : ""}" data-id="${i.id}">
    <span class="tm">${i.start ? fmtTime(i.start) : "Time TBD"}</span>
    <span><span class="t">${esc(i.title)}</span><br><span class="s">${esc(sub(i))}</span></span>
    <span class="r"><span class="tag">${LABEL[i.kind]}</span><br><span data-cd="${i.id}">${T.status(i)}</span></span></button>`;
}

/* left pane: every day from today to the last item */
function renderDays() {
  const today = todayKey();
  const list = items.filter(i => (i.date >= today || (T.endOf(i) && T.endOf(i) > new Date())) && passes(i)).sort((a, b) => when(a) - when(b));
  $("resultCount").textContent = `${list.length} scheduled items`;
  if (!list.length && filtering()) { $("days").innerHTML = `<p class="empty">No events match these filters. Try another search or reset the filters.</p>`; spy?.disconnect(); return; }
  const byDay = {}; list.forEach(i => (byDay[i.date < today ? today : i.date] ||= []).push(i));
  const last = items.reduce((m, i) => i.date > m ? i.date : m, today);
  const showFree = $("showFree").checked && !filtering();
  let html = "", lastWk = "";
  for (let d = new Date(today + "T12:00:00Z"); key(d) <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    const k = key(d), its = byDay[k] || [];
    if (!its.length && !showFree && k !== today) continue;
    const s = new Date(d); s.setUTCDate(s.getUTCDate() - s.getUTCDay());
    const wk = `Week of ${fmtDay(key(s), { month: "short", day: "numeric" })}`;
    if (wk !== lastWk) { html += `<div class="wk">${wk}</div>`; lastWk = wk; }
    const diff = Math.round((new Date(k + "T12:00:00Z") - new Date(today + "T12:00:00Z")) / 864e5);
    const rel = diff === 1 ? "Tomorrow" : diff > 1 && diff < 7 ? `in ${diff} days` : "";
    html += `<div class="day ${k === today ? "today" : ""} ${its.length ? "" : "free"}" id="d-${k}" data-k="${k}">
      <div class="dh"><b>${fmtDay(k, { weekday: "long", month: "short", day: "numeric" })}</b>
      <span class="rel">${its.length ? rel : "Nothing scheduled"}</span></div>
      ${its.map(rowHtml).join("")}</div>`;
  }
  $("days").innerHTML = html || `<p class="empty">Nothing matches.</p>`;
  observeDays();
}

/* right pane: month calendar */
function renderCal() {
  const y = view.getUTCFullYear(), m = view.getUTCMonth(), today = todayKey();
  $("month").textContent = view.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
  $("calendarSummary").textContent = $("month").textContent;
  const start = new Date(Date.UTC(y, m, 1 - new Date(Date.UTC(y, m, 1)).getUTCDay()));
  const byDay = {}; items.filter(passes).forEach(i => (byDay[i.date] ||= []).push(i));
  let html = ["S", "M", "T", "W", "T", "F", "S"].map(d => `<div class="dow">${d}</div>`).join("");
  for (let n = 0; n < 42; n++) {
    const d = new Date(start); d.setUTCDate(start.getUTCDate() + n);
    const k = key(d), its = (byDay[k] || []).filter(i => i.kind !== "routine");
    const title = its.map(i => (i.course ? i.course + ": " : "") + i.title).join("\n");
    html += `<button aria-pressed="${k === selected}" class="cd-day ${d.getUTCMonth() !== m ? "other" : ""} ${k < today ? "past" : ""} ${k === today ? "today" : ""} ${k === selected ? "sel" : ""}"
      data-day="${k}" title="${esc(title)}" aria-label="${fmtDay(k, { weekday: "long", month: "long", day: "numeric" })}, ${its.length} items">
      <span class="num">${d.getUTCDate()}</span>
      <span class="dots">${its.slice(0, 6).map(i => `<span class="dot k-${i.kind}"></span>`).join("")}</span></button>`;
  }
  $("grid").innerHTML = html;
  const kinds = ["interview", "exam", "assignment", "event", "personal"].filter(k => items.some(i => i.kind === k));
  $("legend").innerHTML = kinds.map(k => `<span class="k-${k}">${LABEL[k]}</span>`).join("");
  renderSelectedDay();
}

function renderSelectedDay() {
  const list = items.filter(i => i.date === selected && passes(i)).sort((a, b) => when(a) - when(b));
  $("selectedDay").innerHTML = `<h2>${fmtDay(selected)}</h2>${list.map(i => `<button class="agenda-row k-${i.kind}" data-id="${i.id}"><span>${esc(i.title)}</span><small>${esc(timeStr(i))}</small></button>`).join("") || `<p class="empty">No matching events on this day.</p>`}`;
}

function renderMail() {
  $("mailCount").textContent = mail ? `${mail.important.length} highlights` : "";
  if (!mail) { $("mail").innerHTML = `<h2>Email</h2><p class="empty">No email review yet.</p>`; return; }
  const c = mail.counts, bits = Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${MAILCAT[k] ? MAILCAT[k].toLowerCase() : k}`);
  const junk = (mail.junk || []);
  const realJunk = junk.filter(j => j.junk_verdict !== "not junk").length;
  $("mail").innerHTML = `<h2>Email · read in full ${fmtDay(mail.date, { month: "short", day: "numeric" })}</h2>
    <div class="mail-stats">${mail.total} emails: ${bits.join(", ")}.${junk.length ? ` Junk checked: ${realJunk} of ${junk.length} really are junk.` : ""}</div>
    ${mail.important.map((e, n) => `<button class="mail-row k-${e.category}" data-mail="${n}">
      <span class="tag">${esc(MAILCAT[e.category] || e.category)}</span>
      <div class="t">${esc(e.subject)}</div></button>`).join("") || `<p class="empty">Nothing that needs you.</p>`}`;
}

function renderChips() {
  const kinds = ["interview", "exam", "assignment", "event", "personal", "routine"].filter(k => items.some(i => i.kind === k));
  $("kinds").innerHTML = kinds.map(k => `<button class="chip k-${k}" data-kind="${k}" aria-pressed="${filt.kinds.has(k)}"><span class="sw"></span>${LABEL[k]}</button>`).join("");
  const courses = [...new Set(items.map(i => i.course || "Other"))].sort((a, b) => a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b));
  $("courses").innerHTML = courses.map(c => `<button class="chip" data-course="${esc(c)}" aria-pressed="${filt.courses.has(c)}">${c === "Other" ? "Interviews & events" : esc(c)}</button>`).join("");
}

function renderAll() { renderHero(); renderChips(); renderDays(); renderCal(); renderMail();
  const count = filt.kinds.size + filt.courses.size + (filt.q ? 1 : 0) + ["showRoutine", "showFree", "showDone"].filter(id => $(id).checked).length;
  $("filterCount").textContent = count ? `${count} active` : "All events";
}

/* clicking a calendar day scrolls the left pane to it; scrolling the left pane moves the highlight */
let spy;
function observeDays() {
  spy?.disconnect();
  spy = new IntersectionObserver(es => {
    if (Date.now() < lockSpy) return;
    const top = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!top) return;
    const k = top.target.dataset.k;
    if (k !== selected) { selected = k; syncCal(); renderSelectedDay(); }
  }, { rootMargin: "0px 0px -70% 0px" });
  document.querySelectorAll(".day").forEach(el => spy.observe(el));
}
let lockSpy = 0;
function syncCal() {
  const d = new Date(selected + "T12:00:00Z");
  if (d.getUTCMonth() !== view.getUTCMonth() || d.getUTCFullYear() !== view.getUTCFullYear()) { view = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); renderCal(); return; }
  document.querySelectorAll(".cd-day").forEach(b => { b.classList.toggle("sel", b.dataset.day === selected); b.setAttribute("aria-pressed", b.dataset.day === selected); });
}
function goDay(k) {
  selected = k; syncCal(); renderSelectedDay();
  let el = $("d-" + k);
  if (!el) { $("selectedDay").classList.add("inspect"); return; }
  $("selectedDay").classList.remove("inspect");
  if (!el) return;
  lockSpy = Date.now() + 900;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
}

/* ---------- detail drawer ---------- */
function ics(i) { return "data:text/calendar;charset=utf-8," + encodeURIComponent(T.calendarText(i)); }

const askClaude = text => "https://claude.ai/new?q=" + encodeURIComponent(text.slice(0, 1800));
function itemPrompt(i) {
  const w = `${fmtDay(i.date, { weekday: "long", month: "long", day: "numeric" })}, ${timeStr(i)} (America/Chicago)`;
  const lines = [`I'm a UW–Madison student. Help me with this ${LABEL[i.kind].toLowerCase()}:`,
    `${i.course ? i.course + ": " : ""}${i.title}`, `When: ${w}`,
    i.pts != null && `Points: ${i.pts}`, i.how && `Submit via: ${i.how}`, i.note && `Notes: ${i.note}`, i.desc && `Details: ${i.desc}`, i.url && `Canvas: ${i.url}`];
  const ask = i.kind === "interview" ? "What should I prepare, and what questions are likely?"
    : i.kind === "assignment" || i.kind === "exam" ? "Help me plan how to get this done and what to focus on." : "What do I need to know or do for this?";
  return lines.filter(Boolean).join("\n") + "\n\n" + ask;
}

function windowState(i) {
  const now = new Date(), o = i.opens && new Date(i.opens), c = i.closes && new Date(i.closes);
  if (o && o > now) return `Opens ${until(o)}`;
  if (c && c < now) return "Closed";
  if (o || c) return "Open now";
  return "";
}

let returnFocus;
function showDrawer(kindCls, html, hash) {
  if (!$("drawer").open) returnFocus = document.activeElement;
  $("drawer").className = `drawer open ${kindCls}`;
  $("drawer").innerHTML = `<button class="dclose" id="dclose" aria-label="Close">Close</button>` + html;
  if (!$("drawer").open) $("drawer").showModal();
  document.body.style.overflow = "hidden";
  if (hash) history.replaceState(null, "", "#" + hash);
  $("dclose").onclick = closeItem;
  const cl = $("copylink"); if (cl) cl.onclick = e => { if (!navigator.clipboard) { e.target.textContent = "Copy unavailable"; return; } navigator.clipboard.writeText(location.href).then(() => e.target.textContent = "Copied").catch(() => e.target.textContent = "Copy unavailable"); };
  $("dclose").focus();
}

function openItem(id, push = true) {
  const i = items.find(x => x.id === id); if (!i) return;
  const links = ((i.note || "").match(URL_RE) || []);
  const meet = links.find(u => /zoom|meet\.google|teams|webex/i.test(u));
  const facts = [
    ["When", `${fmtDay(i.date, { weekday: "long", month: "long", day: "numeric" })}, ${esc(timeStr(i))} (America/Chicago)`],
    i.course && ["Course", i.courseUrl ? `<a href="${safeUrl(i.courseUrl)}" target="_blank" rel="noopener">${esc(i.course)}</a>` : esc(i.course)],
    i.pts != null && ["Points", esc(i.pts)],
    i.how && ["Submit via", esc(i.how)],
    i.ext && ["File types", esc(Array.isArray(i.ext) ? i.ext.join(", ") : i.ext)],
    i.opens && ["Opens", fmtStamp(i.opens)],
    i.closes && ["Closes", fmtStamp(i.closes)],
    windowState(i) && ["Window", windowState(i)],
    i.email && ["Email", `<a href="${safeUrl(i.email)}" target="_blank" rel="noopener">Open in Outlook</a>`],
  ].filter(Boolean);
  showDrawer(`k-${i.kind}`, `
    <span class="tag">${LABEL[i.kind]}</span>
    <h3 id="dtitle">${esc(i.title)}</h3>
    <div class="sub">${esc(i.course || "")}</div>
    <div class="cdbig" data-cd="${i.id}">${T.status(i)}</div>
    <dl class="facts">${facts.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>
    ${i.note ? `<div class="desc"><strong>Notes</strong><br>${linkify(i.note)}</div>` : ""}
    ${i.desc ? `<div class="desc"><strong>Details</strong><br>${linkify(i.desc)}</div>` : ""}
    <div class="actions">
      ${i.url ? `<a class="btn primary" href="${safeUrl(i.url)}" target="_blank" rel="noopener">Open assignment</a>` : ""}
      ${i.email ? `<a class="btn primary" href="${safeUrl(i.email)}" target="_blank" rel="noopener">Open email</a>` : ""}
      ${meet ? `<a class="btn primary" href="${safeUrl(meet)}" target="_blank" rel="noopener">Join meeting</a>` : ""}
      ${links.filter(u => u !== meet).map(u => `<a class="btn" href="${safeUrl(u)}" target="_blank" rel="noopener">${esc(new URL(u).hostname.replace(/^www\./, ""))}</a>`).join("")}
      <a class="btn claude" href="${askClaude(itemPrompt(i))}" target="_blank" rel="noopener">Ask Claude about this</a>
      <a class="btn" href="${ics(i)}" download="${i.id}.ics">Add to calendar</a>
      <button class="btn" id="copylink">Copy link</button>
    </div>
    ${i.done ? `<p class="muted">Marked done on Canvas.</p>` : `<label class="check"><input type="checkbox" id="tick" ${ticked[i.id] ? "checked" : ""}> Completed · saved on this device only</label>`}`,
    push ? i.id : null);
  $("drawer").insertAdjacentHTML("beforeend", `<p class="save-status muted" id="saveStatus" role="status"></p>`);
  const t = $("tick"); if (t) t.onchange = () => { if (t.checked) ticked[i.id] = 1; else delete ticked[i.id]; const saved = store.set(ticked); renderAll(); $("saveStatus").textContent = saved ? "Saved on this device. Other devices are not synced." : "Storage unavailable. This check lasts only while this page is open."; };
}

function openMail(n) {
  const e = mail.important[n]; if (!e) return;
  const prompt = `I got this email:\nFrom: ${e.from}\nSubject: ${e.subject}\nSummary: ${e.summary}${e.action ? "\nWhat it asks: " + e.action : ""}\n\nWhat should I do next?`;
  showDrawer(`k-${e.category}`, `
    <span class="tag">${esc(MAILCAT[e.category] || e.category)}</span>
    <h3 id="dtitle">${esc(e.subject)}</h3>
    <div class="sub">${esc(e.from)}</div>
    <div class="desc"><strong>What it says</strong><br>${esc(e.summary)}</div>
    ${e.action ? `<div class="desc"><strong>What to do</strong><br>${esc(e.action)}</div>` : ""}
    ${e.deadline ? `<dl class="facts"><dt>When</dt><dd>${fmtStamp(e.deadline)}</dd></dl>` : ""}
    <div class="actions">
      <a class="btn primary" href="${safeUrl(e.url)}" target="_blank" rel="noopener">Open email</a>
      <a class="btn claude" href="${askClaude(prompt)}" target="_blank" rel="noopener">Ask Claude about this</a>
    </div>`, null);
}

function closeItem() {
  if (!$("drawer").open) return;
  $("drawer").close(); $("drawer").classList.remove("open");
  document.body.style.overflow = "";
  if (returnFocus?.isConnected) returnFocus.focus();
  else $("q").focus();
  history.replaceState(null, "", location.pathname + location.search);
}

/* ---------- events ---------- */
document.addEventListener("click", e => {
  if (e.target.closest("#drawer")) return;
  const it = e.target.closest("[data-id]"); if (it) return openItem(it.dataset.id);
  const ml = e.target.closest("[data-mail]"); if (ml) return openMail(+ml.dataset.mail);
  const dy = e.target.closest("[data-day]"); if (dy) return goDay(dy.dataset.day);
  const k = e.target.closest("[data-kind]"); if (k) { const v = k.dataset.kind; filt.kinds.has(v) ? filt.kinds.delete(v) : filt.kinds.add(v); return renderAll(); }
  const c = e.target.closest("[data-course]"); if (c) { const v = c.dataset.course; filt.courses.has(v) ? filt.courses.delete(v) : filt.courses.add(v); return renderAll(); }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeItem();
});
$("drawer").addEventListener("cancel", e => { e.preventDefault(); closeItem(); });
$("drawer").addEventListener("click", e => { if (e.target === $("drawer")) { const r = $("drawer").getBoundingClientRect(); if (e.clientX < r.left || e.clientY < r.top) closeItem(); } });
const mobileLayout = matchMedia("(max-width:720px)");
$("calendar").open = !mobileLayout.matches;
mobileLayout.addEventListener("change", e => { $("calendar").open = !e.matches; });
document.querySelector(".calendar-shortcut").onclick = () => { $("calendar").open = true; };
$("today").onclick = () => { view = new Date(todayKey() + "T12:00:00Z"); renderCal(); goDay(todayKey()); };
$("resetFilters").onclick = () => { filt.kinds.clear(); filt.courses.clear(); filt.q = ""; $("q").value = ""; ["showRoutine", "showFree", "showDone"].forEach(id => $(id).checked = false); renderAll(); };
$("q").oninput = e => { filt.q = e.target.value.trim().toLowerCase(); renderAll(); };
$("showRoutine").onchange = $("showDone").onchange = $("showFree").onchange = renderAll;
$("prev").onclick = () => { view = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() - 1, 1)); renderCal(); };
$("next").onclick = () => { view = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth() + 1, 1)); renderCal(); };
let renderedDate = todayKey(), boundaryTimer;
function refreshClock() {
  renderHero();
  if (todayKey() !== renderedDate) { renderedDate = todayKey(); renderDays(); renderCal(); }
  document.querySelectorAll("[data-cd]").forEach(el => {
    const i = items.find(x => x.id === el.dataset.cd); if (i) el.textContent = T.status(i);
  });
}
function scheduleBoundary() {
  clearTimeout(boundaryTimer);
  const now = new Date();
  const boundaries = [T.zonedDate(T.addDays(todayKey(), 1), "00:00"), ...items.flatMap(i => [when(i), T.endOf(i)]).filter(Boolean)].filter(d => d > now);
  const delay = Math.min(...boundaries.map(d => d - now));
  boundaryTimer = setTimeout(() => { refreshClock(); scheduleBoundary(); }, Math.min(delay + 10, 2147483647));
}
setInterval(refreshClock, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) { refreshClock(); scheduleBoundary(); } });

fetch("data.json", { cache: "no-store" }).then(r => { if (!r.ok) throw new Error("Data unavailable"); return r.json(); }).then(d => {
  items = d.items.map(i => ({ ...i, id: idOf(i) }));
  items.forEach(i => { when(i); T.endOf(i); });
  mail = d.mail || null;
  $("stamp").textContent = "Updated " + fmtStamp(d.updated);
  renderAll(); scheduleBoundary();
  if (location.hash) openItem(decodeURIComponent(location.hash.slice(1)), false);
}).catch(() => { $("days").innerHTML = `<p class="empty">Couldn't load data.json.</p>`; });
