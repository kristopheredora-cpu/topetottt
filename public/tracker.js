// Game tracker page: summary strip, status tabs, sort, search, star ratings, and a "pick my next game" roulette.
// Replaces app.js's renderTracker. Editing and saving still go through the same dialog and API.
const TR_FALLBACK = "const f=(this.dataset.fb||'').split('|').filter(Boolean);if(f.length){this.src=f.shift();this.dataset.fb=f.join('|')}else{this.style.visibility='hidden'}";
const trState = { tab: "all", sort: "updated", q: "" };
const trEdit = (appid) => (typeof baseOpenGame === "function" ? baseOpenGame : openGame)(appid);
const trPoster = (game) => [`https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg`, gameImage(game)];
const trImg = (urls, cls = "") => { const [first, ...rest] = urls; return `<img class="${cls}" loading="lazy" src="${escapeHtml(first)}" data-fb="${escapeHtml(rest.join("|"))}" alt="" onerror="${TR_FALLBACK}">`; };
const trRatingOf = (entry) => (typeof entry.rating === "number" ? entry.rating : null);

function trEntries() {
  const byId = new Map(state.games.map((g) => [String(g.appid), g]));
  return Object.entries(state.tracker).filter(([, entry]) => entry && entry.status).map(([appid, entry]) => ({
    appid: Number(appid), entry,
    game: byId.get(appid) || { appid: Number(appid), name: `Steam App ${appid}`, playtimeForever: 0, playtimeTwoWeeks: 0 }
  }));
}

function trAgo(iso) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 31) return `Updated ${days} days ago`;
  return `Updated ${new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
}

function trRenderSummary(all) {
  const box = document.getElementById("tr-summary");
  if (!box) return;
  const rated = all.map((x) => trRatingOf(x.entry)).filter((r) => r !== null);
  const avg = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : "—";
  const count = (s) => all.filter((x) => x.entry.status === s).length;
  const started = all.length - count("backlog");
  const rate = started ? `${Math.round((count("completed") / started) * 100)}%` : "—";
  const reviews = all.filter((x) => x.entry.review && x.entry.review.trim()).length;
  const hrs = Math.round(all.reduce((sum, x) => sum + (x.game.playtimeForever || 0), 0) / 60).toLocaleString();
  const buckets = Array.from({ length: 10 }, () => 0);
  rated.forEach((r) => { buckets[Math.min(10, Math.max(1, Math.round(r))) - 1]++; });
  const top = Math.max(1, ...buckets);
  box.innerHTML = `<div class="tr-stats">
    <div class="tr-stat"><span>Entries</span><strong>${all.length}</strong><small>games tracked</small></div>
    <div class="tr-stat"><span>Average rating</span><strong>${avg}</strong><small>${rated.length} rated</small></div>
    <div class="tr-stat"><span>Completion rate</span><strong>${rate}</strong><small>of games I've started</small></div>
    <div class="tr-stat"><span>Reviews</span><strong>${reviews}</strong><small>written</small></div>
    <div class="tr-stat"><span>Hours tracked</span><strong>${hrs}h</strong><small>across these games</small></div>
    <div class="tr-hist"><span>Rating spread</span><div>${buckets.map((n, i) => `<i style="height:${Math.max(4, (n / top) * 100)}%" title="${i + 1}/10: ${n} game${n === 1 ? "" : "s"}"></i>`).join("")}</div></div>
  </div>`;
}

function trRenderTabs(all) {
  const tabs = document.getElementById("tr-tabs");
  if (!tabs) return;
  const entries = [["all", "All", all.length], ...Object.entries(statusLabels).map(([k, label]) => [k, label, all.filter((x) => x.entry.status === k).length])];
  tabs.innerHTML = entries.map(([k, label, n]) => `<button class="chip ${trState.tab === k ? "active" : ""}" data-tab="${k}">${label} <b>${n}</b></button>`).join("");
}

function trItem({ appid, entry, game }) {
  const rating = trRatingOf(entry);
  const label = statusLabels[entry.status] || entry.status;
  return `<article class="tr-item st-${entry.status}" data-appid="${appid}">
    ${trImg(trPoster(game), "tr-poster")}
    <div class="tr-body">
      <div class="tr-top"><h3>${escapeHtml(game.name)}</h3><span class="pill ${entry.status}">${escapeHtml(label)}</span></div>
      <div class="tr-rate">
        ${rating !== null ? `<span class="tr-stars" style="--r:${rating / 10}" role="img" aria-label="Rated ${rating} out of 10">★★★★★</span><b>${rating}/10</b>` : '<span class="muted">Not rated</span>'}
        <span class="tr-dim">${hours(game.playtimeForever)}</span>
      </div>
      ${entry.review ? `<p class="tr-review">${escapeHtml(entry.review)}</p>` : ""}
      ${entry.notes ? `<p class="tr-notes"><strong>Notes</strong> ${escapeHtml(entry.notes)}</p>` : ""}
      <div class="tr-foot"><span class="tr-dim">${escapeHtml(trAgo(entry.updatedAt))}</span>
        <span class="tr-actions"><button class="button button-secondary" data-act="open" data-appid="${appid}">Details</button><button class="button button-secondary" data-act="edit" data-appid="${appid}">Edit entry</button></span></div>
    </div></article>`;
}

function trRenderList(all) {
  const grid = document.getElementById("tracker-grid");
  if (!grid) return;
  const q = trState.q;
  const sorters = {
    updated: (a, b) => (b.entry.updatedAt || "").localeCompare(a.entry.updatedAt || ""),
    rating: (a, b) => (trRatingOf(b.entry) ?? -1) - (trRatingOf(a.entry) ?? -1),
    hours: (a, b) => b.game.playtimeForever - a.game.playtimeForever,
    name: (a, b) => a.game.name.localeCompare(b.game.name)
  };
  const list = all.filter((x) => (trState.tab === "all" || x.entry.status === trState.tab) && x.game.name.toLowerCase().includes(q)).sort(sorters[trState.sort]);
  if (!all.length) { grid.innerHTML = '<p class="muted">Your tracker is empty. Open a game from the <a class="section-link" href="/library.html">library</a> and add its status, rating, review or notes.</p>'; return; }
  grid.innerHTML = list.length ? list.map(trItem).join("") : '<p class="muted">No entries match.</p>';
}

renderTracker = function () {
  const all = trEntries();
  $("#stat-completed").textContent = all.filter((x) => x.entry.status === "completed").length;
  trRenderSummary(all);
  trRenderTabs(all);
  trRenderList(all);
  trUpdatePickText();
};

(() => {
  const grid = document.getElementById("tracker-grid");
  if (!grid) return;
  grid.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-act]");
    if (!btn) return;
    const appid = Number(btn.dataset.appid);
    if (btn.dataset.act === "edit") trEdit(appid); else openGame(appid);
  });
  document.getElementById("tr-tabs").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-tab]");
    if (!chip) return;
    trState.tab = chip.dataset.tab;
    renderTracker();
  });
  document.getElementById("tr-sort").addEventListener("change", (event) => { trState.sort = event.target.value; trRenderList(trEntries()); });
  document.getElementById("tr-search").addEventListener("input", (event) => { trState.q = event.target.value.trim().toLowerCase(); trRenderList(trEntries()); });
})();

/* ---------- Pick my next game ---------- */
// The pool is everything marked Backlog; with an empty backlog it falls back to untracked games with almost no playtime.
function trPool() {
  const backlog = trEntries().filter((x) => x.entry.status === "backlog").map((x) => x.game);
  if (backlog.length) return { games: backlog, label: "backlog" };
  return { games: state.games.filter((g) => !state.tracker[String(g.appid)] && g.playtimeForever < 60), label: "unplayed games" };
}
function trUpdatePickText() {
  const sub = document.getElementById("tr-pick-sub");
  if (!sub) return;
  const { games, label } = trPool();
  sub.textContent = games.length ? `${games.length} game${games.length === 1 ? "" : "s"} waiting in my ${label}. Spin the dice and let it decide.` : "Nothing waiting right now. Track a game as Backlog to use this.";
}
let trSpinning = false;
(() => {
  const btn = document.getElementById("tr-pick-btn");
  if (!btn) return;
  const img = document.getElementById("tr-slot-img"), name = document.getElementById("tr-slot-name"), result = document.getElementById("tr-pick-result");
  const show = (game) => {
    const [first, ...rest] = trPoster(game);
    img.style.visibility = "visible"; img.dataset.fb = rest.join("|"); img.onerror = () => new Function(TR_FALLBACK).call(img); img.src = first;
    name.textContent = game.name;
  };
  btn.addEventListener("click", () => {
    if (trSpinning) return;
    const { games } = trPool();
    if (!games.length) { result.innerHTML = '<p class="muted">Nothing to pick from yet.</p>'; return; }
    const target = games[Math.floor(Math.random() * games.length)];
    const land = () => {
      show(target);
      document.querySelector(".tr-slot").classList.add("landed");
      result.innerHTML = `<p class="eyebrow">Tonight's pick</p><h3>${escapeHtml(target.name)}</h3><p class="muted">${hours(target.playtimeForever)} played so far</p>
        <div class="tr-actions"><button class="button button-primary" data-pick="open">View details</button><button class="button button-secondary" data-pick="edit">Edit entry</button></div>`;
      result.querySelector('[data-pick="open"]').onclick = () => openGame(target.appid);
      result.querySelector('[data-pick="edit"]').onclick = () => trEdit(target.appid);
      trSpinning = false; btn.disabled = false; btn.textContent = "🎲 Spin again";
    };
    trSpinning = true; btn.disabled = true; btn.textContent = "Spinning…";
    document.querySelector(".tr-slot").classList.remove("landed");
    result.innerHTML = "";
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || games.length === 1) { land(); return; }
    let delay = 60, last = null;
    const tick = () => {
      if (delay > 420) { land(); return; }
      let pick; do { pick = games[Math.floor(Math.random() * games.length)]; } while (pick === last && games.length > 1);
      last = pick; show(pick);
      delay *= 1.13;
      setTimeout(tick, delay);
    };
    tick();
  });
})();
