// Achievements overview: every game's achievement progress in one place.
// Steam has no bulk endpoint, so this asks the server for each game you've played (four at a time) and keeps
// the results in this browser for six hours. "Rescan" refreshes them. Nothing here changes any data.
const AC_KEY = "achievementsCacheV1", AC_TTL = 6 * 3600 * 1000;
const acState = { items: {}, tab: "all", sort: "pct", q: "", scanning: false, done: 0, total: 0, started: false, ready: false };
const acFallback = "const f=(this.dataset.fb||'').split('|').filter(Boolean);if(f.length){this.src=f.shift();this.dataset.fb=f.join('|')}else{this.style.visibility='hidden'}";
const acImg = (game, cls) => `<img class="${cls}" loading="lazy" src="https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg" data-fb="${escapeHtml(gameImage(game))}" alt="" onerror="${acFallback}">`;
const acDate = (iso) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
const acGame = (appid) => state.games.find((g) => g.appid === Number(appid)) || { appid: Number(appid), name: `Steam App ${appid}`, playtimeForever: 0 };

function acSummarize(game, data) {
  const list = data.achievements || [];
  const total = data.total || list.length;
  const unlocked = data.unlocked ?? list.filter((a) => a.unlocked).length;
  const recent = list.filter((a) => a.unlocked && a.unlockTime).sort((a, b) => b.unlockTime.localeCompare(a.unlockTime)).slice(0, 3).map((a) => [a.name, a.icon || "", a.unlockTime]);
  return { appid: game.appid, u: unlocked, t: total, p: total ? Math.round((unlocked / total) * 100) : 0, r: recent };
}

function acProgress() {
  const box = document.getElementById("ac-progress");
  if (!box) return;
  box.classList.toggle("hidden", !acState.scanning);
  document.getElementById("ac-progress-bar").style.width = `${acState.total ? (acState.done / acState.total) * 100 : 0}%`;
  document.getElementById("ac-progress-text").textContent = `Scanning achievements… ${acState.done} of ${acState.total} games`;
}

async function acScan() {
  const games = state.games.filter((g) => g.playtimeForever > 0).sort((a, b) => b.playtimeForever - a.playtimeForever);
  acState.items = {}; acState.total = games.length; acState.done = 0; acState.scanning = true; acState.ready = false;
  acProgress(); acRender();
  let next = 0;
  const worker = async () => {
    while (next < games.length) {
      const game = games[next++];
      try {
        const data = await api(`/api/games/${game.appid}/achievements`);
        if (data.supported && (data.total || (data.achievements || []).length)) acState.items[game.appid] = acSummarize(game, data);
      } catch (error) { /* a game without achievement data is simply skipped */ }
      acState.done++;
      acProgress();
      if (acState.done % 6 === 0) acRender();
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  acState.scanning = false; acState.ready = true;
  try { localStorage.setItem(AC_KEY, JSON.stringify({ time: Date.now(), items: acState.items })); } catch (error) { /* storage unavailable */ }
  acProgress(); acRender();
}

function acStart(force) {
  if (!state.games.length || (acState.started && !force)) return;
  acState.started = true;
  if (!force) {
    try {
      const cache = JSON.parse(localStorage.getItem(AC_KEY) || "null");
      if (cache && Date.now() - cache.time < AC_TTL && cache.items) { acState.items = cache.items; acState.ready = true; acRender(); return; }
    } catch (error) { /* ignore a broken cache */ }
  }
  acScan();
}

function acRender() {
  const items = Object.values(acState.items);
  const summary = document.getElementById("ac-summary");
  if (!summary) return;
  const unlocked = items.reduce((s, x) => s + x.u, 0), possible = items.reduce((s, x) => s + x.t, 0);
  const pct = possible ? Math.round((unlocked / possible) * 100) : 0;
  const perfect = items.filter((x) => x.t > 0 && x.u === x.t);
  const avg = items.length ? Math.round(items.reduce((s, x) => s + x.p, 0) / items.length) : 0;
  const circ = 2 * Math.PI * 40;
  summary.innerHTML = `<div class="ac-stats">
    <div class="ac-ring-cell"><div class="ac-ring"><svg viewBox="0 0 100 100"><circle class="t" cx="50" cy="50" r="40"/><circle class="v" cx="50" cy="50" r="40" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct / 100)}"/></svg><b>${pct}%</b></div></div>
    <div class="tr-stat"><span>Unlocked</span><strong>${unlocked.toLocaleString()}</strong><small>achievements</small></div>
    <div class="tr-stat"><span>Possible</span><strong>${possible.toLocaleString()}</strong><small>across ${items.length} games</small></div>
    <div class="tr-stat"><span>Perfect games</span><strong>${perfect.length}</strong><small>at 100%</small></div>
    <div class="tr-stat"><span>Average completion</span><strong>${avg}%</strong><small>per game</small></div>
    <div class="tr-stat"><span>Left to unlock</span><strong>${(possible - unlocked).toLocaleString()}</strong><small>achievements</small></div>
  </div>`;

  // Perfect shelf
  const shelf = document.getElementById("ac-perfect");
  document.getElementById("ac-perfect-note").textContent = perfect.length ? `${perfect.length} at 100%` : "";
  const byHours = (a, b) => acGame(b.appid).playtimeForever - acGame(a.appid).playtimeForever;
  if (perfect.length) {
    shelf.innerHTML = perfect.sort(byHours).map((x) => { const g = acGame(x.appid); return `<button class="pc done" data-appid="${x.appid}" aria-label="Open ${escapeHtml(g.name)}">
      <span class="pc-fallback">${escapeHtml(g.name)}</span>${acImg(g, "")}<span class="pc-badge">★ 100%</span>
      <span class="pc-over"><strong>${escapeHtml(g.name)}</strong><span>${x.u}/${x.t} achievements</span></span></button>`; }).join("");
  } else {
    const close = items.filter((x) => x.u < x.t).sort((a, b) => (a.t - a.u) - (b.t - b.u))[0];
    shelf.innerHTML = acState.scanning ? '<p class="muted">Scanning…</p>' : `<p class="muted">No perfect games yet.${close ? ` Closest: ${escapeHtml(acGame(close.appid).name)}, only ${close.t - close.u} left.` : ""}</p>`;
  }

  // Latest unlocks
  const recent = items.flatMap((x) => x.r.map(([name, icon, time]) => ({ name, icon, time, appid: x.appid }))).sort((a, b) => b.time.localeCompare(a.time)).slice(0, 10);
  document.getElementById("ac-latest").innerHTML = recent.length ? recent.map((r) => `<button class="ac-feed-row" data-appid="${r.appid}">
      ${r.icon ? `<img loading="lazy" src="${escapeHtml(r.icon)}" alt="">` : '<span class="ac-ico">🏆</span>'}
      <span><strong>${escapeHtml(r.name)}</strong><small>${escapeHtml(acGame(r.appid).name)}</small></span><time>${escapeHtml(acDate(r.time))}</time></button>`).join("")
    : `<p class="muted">${acState.scanning ? "Scanning…" : "No unlock dates available yet."}</p>`;

  // Every game
  const counts = { all: items.length, progress: items.filter((x) => x.u > 0 && x.u < x.t).length, perfect: perfect.length, none: items.filter((x) => x.u === 0).length };
  const tabs = [["all", "All"], ["progress", "In progress"], ["perfect", "Perfect"], ["none", "Not started"]];
  document.getElementById("ac-tabs").innerHTML = tabs.map(([k, label]) => `<button class="chip ${acState.tab === k ? "active" : ""}" data-tab="${k}">${label} <b>${counts[k]}</b></button>`).join("");
  const keep = { all: () => true, progress: (x) => x.u > 0 && x.u < x.t, perfect: (x) => x.u === x.t, none: (x) => x.u === 0 }[acState.tab];
  const sorters = {
    pct: (a, b) => b.p - a.p || b.u - a.u,
    left: (a, b) => ((a.t === a.u) - (b.t === b.u)) || (a.t - a.u) - (b.t - b.u),
    unlocked: (a, b) => b.u - a.u,
    name: (a, b) => acGame(a.appid).name.localeCompare(acGame(b.appid).name)
  };
  const rows = items.filter((x) => keep(x) && acGame(x.appid).name.toLowerCase().includes(acState.q)).sort(sorters[acState.sort]);
  const list = document.getElementById("ac-list");
  if (!items.length) { list.innerHTML = `<p class="muted">${acState.scanning ? "Scanning your library…" : acState.ready ? "No achievement data found. Make sure your Steam game details are public." : "Waiting for your library…"}</p>`; return; }
  list.innerHTML = rows.length ? rows.map((x) => { const g = acGame(x.appid), done = x.u === x.t; return `<button class="ac-row ${done ? "done" : ""}" data-appid="${x.appid}">
      ${acImg(g, "ac-thumb")}
      <span class="ac-main"><strong>${escapeHtml(g.name)}</strong><small>${done ? "Every achievement unlocked" : `${x.t - x.u} left`} · ${hours(g.playtimeForever)}</small><span class="bar"><span style="width:${x.p}%"></span></span></span>
      <span class="ac-count">${x.u}<i>/${x.t}</i></span><span class="ac-pct">${x.p}%</span></button>`; }).join("") : '<p class="muted">No games match.</p>';
}

(() => {
  const click = (event) => { const el = event.target.closest("[data-appid]"); if (el) openGame(Number(el.dataset.appid)); };
  ["ac-perfect", "ac-latest", "ac-list"].forEach((id) => document.getElementById(id)?.addEventListener("click", click));
  document.getElementById("ac-tabs")?.addEventListener("click", (event) => { const chip = event.target.closest("[data-tab]"); if (chip) { acState.tab = chip.dataset.tab; acRender(); } });
  document.getElementById("ac-sort")?.addEventListener("change", (event) => { acState.sort = event.target.value; acRender(); });
  document.getElementById("ac-search")?.addEventListener("input", (event) => { acState.q = event.target.value.trim().toLowerCase(); acRender(); });
  document.getElementById("ac-rescan")?.addEventListener("click", () => { if (!acState.scanning) acStart(true); });
  acRender();
})();

const acBaseRenderRecent = renderRecent;
renderRecent = function () { acBaseRenderRecent(); acStart(false); };
