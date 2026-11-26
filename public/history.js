// Playtime history: charts built from the daily snapshots the server saves (see /api/history).
const hs = { data: null, range: "month", failed: false };
const HS_RANGES = { week: 7, month: 30, quarter: 90, all: Infinity };
const hsParse = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); };
const hsKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const hsShort = (key) => hsParse(key).toLocaleDateString([], { month: "short", day: "numeric" });
const hsLong = (key) => hsParse(key).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const hsTime = (minutes) => (minutes >= 60 ? `${(minutes / 60).toFixed(1)} h` : `${Math.round(minutes)} min`);
const hsGame = (id) => state.games.find((g) => String(g.appid) === String(id)) || { appid: Number(id), name: `Steam App ${id}`, playtimeForever: 0 };
const hsPoster = (game) => `<img class="ac-thumb" loading="lazy" src="https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg" data-fb="${escapeHtml(gameImage(game))}" alt="" onerror="const f=(this.dataset.fb||'').split('|').filter(Boolean);if(f.length){this.src=f.shift();this.dataset.fb=f.join('|')}else{this.style.visibility='hidden'}">`;

// One entry per calendar day from the first snapshot until today (days with no change are 0).
function hsSeries() {
  const days = hs.data.days;
  if (!days.length) return [];
  const byDate = new Map(days.map((d) => [d.date, d]));
  const out = [];
  for (const date = hsParse(days[0].date); hsKey(date) <= hs.data.today; date.setDate(date.getDate() + 1)) {
    const key = hsKey(date);
    out.push(byDate.get(key) || { date: key, minutes: 0, games: {}, span: 1 });
  }
  return out;
}
const hsSum = (list) => list.reduce((sum, d) => sum + d.minutes, 0);
const hsTopGames = (list, limit) => {
  const totals = {};
  list.forEach((d) => Object.entries(d.games).forEach(([id, m]) => { totals[id] = (totals[id] || 0) + m; }));
  return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, limit);
};

function hsRender() {
  const empty = document.getElementById("hs-empty"), body = document.getElementById("hs-body");
  if (!hs.data) {
    empty.classList.remove("hidden"); body.classList.add("hidden");
    empty.innerHTML = hs.failed ? "<h2>History isn't available right now</h2><p class='muted'>The server couldn't be reached. Try again in a moment.</p>" : "<p class='muted'>Loading history…</p>";
    return;
  }
  const all = hsSeries();
  if (hs.data.snapshots < 2 || !all.length) {
    empty.classList.remove("hidden"); body.classList.add("hidden");
    empty.innerHTML = `<h2>History has just started</h2><p class="muted">${hs.data.since ? `The first snapshot was saved on ${escapeHtml(hsLong(hs.data.since))}. ` : ""}Charts appear after the next snapshot, once some playtime has changed. The server saves one every few hours.</p>`;
    return;
  }
  empty.classList.add("hidden"); body.classList.remove("hidden");
  const range = all.slice(-Math.min(HS_RANGES[hs.range], all.length));

  // Summary
  const week = all.slice(-7), before = all.slice(-14, -7);
  const weekMin = hsSum(week), beforeMin = hsSum(before);
  const change = beforeMin ? Math.round(((weekMin - beforeMin) / beforeMin) * 100) : null;
  const month = hsSum(all.slice(-30));
  const active = range.filter((d) => d.minutes > 0).length;
  const best = range.reduce((a, b) => (b.minutes > a.minutes ? b : a), range[0]);
  let streak = 0, longest = 0;
  all.forEach((d) => { streak = d.minutes > 0 ? streak + 1 : 0; longest = Math.max(longest, streak); });
  document.getElementById("hs-summary").innerHTML = `<div class="tr-stats hs-stats">
    <div class="tr-stat"><span>This week</span><strong>${hsTime(weekMin)}</strong><small>${change === null ? "last 7 days" : `${change >= 0 ? "+" : ""}${change}% vs the week before`}</small></div>
    <div class="tr-stat"><span>Last 30 days</span><strong>${hsTime(month)}</strong><small>${hsTime(month / 30)} a day</small></div>
    <div class="tr-stat"><span>Days played</span><strong>${active}</strong><small>of ${range.length} in this range</small></div>
    <div class="tr-stat"><span>Best day</span><strong>${best && best.minutes ? hsTime(best.minutes) : "—"}</strong><small>${best && best.minutes ? escapeHtml(hsShort(best.date)) : "no playtime yet"}</small></div>
    <div class="tr-stat"><span>Longest streak</span><strong>${longest}</strong><small>days in a row</small></div>
  </div>`;

  // Daily (or weekly, for long ranges) bars
  const chunk = range.length > 120;
  const bars = chunk ? Array.from({ length: Math.ceil(range.length / 7) }, (_, i) => {
    const part = range.slice(i * 7, i * 7 + 7), games = {};
    part.forEach((d) => Object.entries(d.games).forEach(([id, m]) => { games[id] = (games[id] || 0) + m; }));
    return { date: part[0].date, end: part[part.length - 1].date, minutes: hsSum(part), games };
  }) : range;
  document.getElementById("hs-bars-title").textContent = chunk ? "Weekly hours" : "Daily hours";
  const max = Math.max(1, ...bars.map((b) => b.minutes));
  document.getElementById("hs-bars-note").textContent = `Tallest bar: ${hsTime(max)}`;
  const barsEl = document.getElementById("hs-bars");
  barsEl.innerHTML = bars.map((b, i) => `<button class="hs-bar ${b.date === hs.data.today ? "today" : ""}" role="listitem" data-i="${i}" style="--h:${(b.minutes / max) * 100}%" aria-label="${escapeHtml(hsShort(b.date))}: ${hsTime(b.minutes)}"><i></i></button>`).join("");
  document.getElementById("hs-axis").innerHTML = `<span>${escapeHtml(hsShort(bars[0].date))}</span><span>${escapeHtml(hsShort(bars[Math.floor(bars.length / 2)].date))}</span><span>${escapeHtml(hsShort(bars[bars.length - 1].end || bars[bars.length - 1].date))}</span>`;
  const detail = document.getElementById("hs-detail");
  const showDetail = (i) => {
    const b = bars[i];
    const top = hsTopGames([b], 3).map(([id, m]) => `${escapeHtml(hsGame(id).name)} ${hsTime(m)}`).join(", ");
    detail.innerHTML = `<strong>${escapeHtml(b.end ? `${hsShort(b.date)} – ${hsShort(b.end)}` : hsLong(b.date))}</strong> · ${b.minutes ? hsTime(b.minutes) : "no playtime"}${top ? ` · ${top}` : ""}`;
  };
  barsEl.querySelectorAll(".hs-bar").forEach((el) => {
    el.addEventListener("mouseenter", () => showDetail(Number(el.dataset.i)));
    el.addEventListener("focus", () => showDetail(Number(el.dataset.i)));
  });

  // Activity calendar: 26 weeks, Monday at the top
  const byDate = new Map(all.map((d) => [d.date, d.minutes]));
  const today = hsParse(hs.data.today);
  const start = new Date(today); start.setDate(start.getDate() - 26 * 7 + 1);
  const offset = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - offset);
  const cells = [], months = [];
  let col = 0, lastMonth = -1;
  for (const date = new Date(start); date <= today; date.setDate(date.getDate() + 1)) {
    const row = (date.getDay() + 6) % 7;
    if (row === 0 && cells.length) col++;
    if (row === 0 && date.getMonth() !== lastMonth) { lastMonth = date.getMonth(); months.push(`<span style="left:${col * 18}px">${date.toLocaleDateString([], { month: "short" })}</span>`); }
    const key = hsKey(date), minutes = byDate.get(key);
    const level = minutes === undefined ? "pre" : minutes === 0 ? "l0" : minutes < 60 ? "l1" : minutes < 120 ? "l2" : minutes < 240 ? "l3" : "l4";
    cells.push(`<i class="${level}" title="${escapeHtml(hsShort(key))}: ${minutes ? hsTime(minutes) : "no playtime"}"></i>`);
  }
  document.getElementById("hs-heat").innerHTML = cells.join("");
  document.getElementById("hs-months").innerHTML = months.join("");

  // Last 12 weeks
  const weeks = Array.from({ length: 12 }, (_, w) => {
    const end = all.length - w * 7, part = all.slice(Math.max(0, end - 7), Math.max(0, end));
    return { label: part.length ? hsShort(part[0].date) : "", minutes: hsSum(part) };
  }).reverse();
  const wmax = Math.max(1, ...weeks.map((w) => w.minutes));
  document.getElementById("hs-weeks").innerHTML = weeks.map((w, i) => `<div class="hs-bar ${i === weeks.length - 1 ? "today" : ""}" style="--h:${(w.minutes / wmax) * 100}%" title="Week of ${escapeHtml(w.label)}: ${hsTime(w.minutes)}"><i></i><b>${w.minutes ? hsTime(w.minutes).replace(" h", "h").replace(" min", "m") : ""}</b></div>`).join("");
  document.getElementById("hs-weeks-axis").innerHTML = `<span>${escapeHtml(weeks[0].label)}</span><span>This week</span>`;

  // Top games in the selected range
  const top = hsTopGames(range, 8);
  const topMax = top.length ? top[0][1] : 1;
  document.getElementById("hs-top-note").textContent = `${hsTime(hsSum(range))} in this range`;
  document.getElementById("hs-top").innerHTML = top.length ? top.map(([id, m]) => { const g = hsGame(id); return `<button class="ac-row" data-appid="${g.appid}">
      ${hsPoster(g)}
      <span class="ac-main"><strong>${escapeHtml(g.name)}</strong><small>${hs.range === "all" ? "all time" : "in this range"}</small><span class="bar"><span style="width:${(m / topMax) * 100}%"></span></span></span>
      <span class="ac-count">${hsTime(m)}</span><span class="ac-pct"></span></button>`; }).join("") : '<p class="muted">No playtime in this range.</p>';

  document.getElementById("hs-foot").textContent = `History started ${hsLong(hs.data.since)} (${hs.data.timezone}). Steam reports lifetime minutes, so days when the server wasn't running are counted together on the next snapshot.`;
  document.querySelectorAll("#hs-range .chip").forEach((c) => c.classList.toggle("active", c.dataset.range === hs.range));
}

(() => {
  document.getElementById("hs-range")?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-range]");
    if (chip) { hs.range = chip.dataset.range; hsRender(); }
  });
  document.getElementById("hs-top")?.addEventListener("click", (event) => { const el = event.target.closest("[data-appid]"); if (el) openGame(Number(el.dataset.appid)); });
  hsRender();
  api("/api/history").then((data) => { hs.data = data; hsRender(); }).catch(() => { hs.failed = true; hsRender(); });
})();

// Game names and posters come from the library, which loads a moment later.
const hsBaseRenderRecent = renderRecent;
renderRecent = function () { hsBaseRenderRecent(); if (hs.data) hsRender(); };
