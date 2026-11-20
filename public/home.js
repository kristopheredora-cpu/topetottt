// Home page: hero carousel of the games I'm playing, recently played, library strip, insights.
// Loads after app.js and leaves its API/sync logic untouched.
const safe = (fn) => { try { fn(); } catch (error) { console.error("[TOPETOTTT]", fn.name, error); } };
const hideBroken = "this.style.visibility='hidden'";
const homeEl = (id) => document.getElementById(id);
const sortedByPlaytime = () => [...state.games].sort((a, b) => b.playtimeForever - a.playtimeForever);

// Shows the first image and falls through the rest if one fails (PHOTO_FALLBACK comes from showcase.js).
const chainImg = (urls, cls = "", onfail = PHOTO_FALLBACK) => {
  const [first, ...rest] = urls;
  return `<img class="${cls}" src="${escapeHtml(first)}" data-fb="${escapeHtml(rest.join("|"))}" alt="" onerror="${onfail}">`;
};

/* ---------- Hero: games I'm currently playing ---------- */
let heroIndex = 0, heroSig = "", heroTimer = null, heroPaused = false;

function heroGames() {
  const byId = new Map(state.games.map((g) => [String(g.appid), g]));
  const playing = Object.entries(state.tracker)
    .filter(([, entry]) => entry?.status === "playing")
    .map(([id]) => byId.get(id)).filter(Boolean)
    .sort((a, b) => (b.playtimeTwoWeeks - a.playtimeTwoWeeks) || (b.playtimeForever - a.playtimeForever));
  if (playing.length) return { games: playing.slice(0, 6), kicker: "Now playing" };
  if (state.recent.length) return { games: state.recent.slice(0, 5).map((r) => byId.get(String(r.appid)) || r), kicker: "Recently played" };
  return { games: sortedByPlaytime().slice(0, 1), kicker: "Most played" };
}

function heroSlide(game, kicker, i) {
  const id = game.appid;
  const cfg = typeof SHOWCASES !== "undefined" ? SHOWCASES[id] : null;
  const status = trackerStatus(id);
  const art = [`https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_hero.jpg`, gameImage(game)];
  const logo = [cfg ? `/media/${cfg.folder}/logo.png` : null, `https://cdn.akamai.steamstatic.com/steam/apps/${id}/logo.png`].filter(Boolean);
  const logoFail = PHOTO_FALLBACK.replace("this.style.visibility='hidden'", "this.style.display='none';this.parentElement.classList.add('no-logo')");
  return `<article class="hslide" data-appid="${id}">
    ${chainImg(art, "h-art")}
    <div class="h-body">
      <p class="h-kicker"><span class="live-dot"></span>${kicker}</p>
      <div class="h-brand">${chainImg(logo, "h-logo", logoFail)}<h2 class="h-title">${escapeHtml(game.name)}</h2></div>
      <div class="h-meta"><span>${hours(game.playtimeForever)} total</span>${game.playtimeTwoWeeks > 0 ? `<span>${hours(game.playtimeTwoWeeks)} in 2 weeks</span>` : ""}<span class="pill ${status}">${escapeHtml(statusLabels[status] || "Not tracked")}</span></div>
      <div class="h-actions">
        <a class="button button-primary" href="steam://run/${id}">▶ Play Now</a>
        <button class="button button-secondary" data-act="open" data-appid="${id}">View Details</button>
        <span class="h-menu-wrap">
          <button class="button button-secondary h-more" data-act="more" aria-label="More options" aria-expanded="false">⋯</button>
          <div class="h-menu"><a href="https://store.steampowered.com/app/${id}/" target="_blank" rel="noreferrer">Steam store ↗</a><button data-act="edit" data-appid="${id}">Edit tracker entry</button></div>
        </span>
      </div>
    </div>
  </article>`;
}

function closeHeroMenus() {
  document.querySelectorAll(".h-menu-wrap.open").forEach((w) => { w.classList.remove("open"); w.querySelector(".h-more")?.setAttribute("aria-expanded", "false"); });
}

function showHero(i) {
  const slides = [...document.querySelectorAll("#hero-slides .hslide")];
  if (!slides.length) return;
  heroIndex = (i + slides.length) % slides.length;
  slides.forEach((s, n) => { const on = n === heroIndex; s.classList.toggle("on", on); s.inert = !on; s.setAttribute("aria-hidden", String(!on)); });
  document.querySelectorAll("#hero-dots button").forEach((b, n) => b.classList.toggle("active", n === heroIndex));
  closeHeroMenus();
}

function startHeroTimer() {
  clearInterval(heroTimer);
  const count = document.querySelectorAll("#hero-slides .hslide").length;
  if (count < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  heroTimer = setInterval(() => { if (!document.hidden && !heroPaused) showHero(heroIndex + 1); }, 8000);
}

function renderHero() {
  const slidesEl = homeEl("hero-slides");
  if (!slidesEl) return;
  const { games, kicker } = heroGames();
  if (!games.length) { slidesEl.innerHTML = '<div class="h-empty"><p>No games to show yet.</p></div>'; return; }
  const sig = kicker + "|" + games.map((g) => [g.appid, g.playtimeForever, g.playtimeTwoWeeks, trackerStatus(g.appid)].join(":")).join(",")
    + "|" + (typeof SHOWCASES !== "undefined" ? Object.keys(SHOWCASES).length : 0);
  if (sig === heroSig) return;
  heroSig = sig;
  heroIndex = Math.min(heroIndex, games.length - 1);
  slidesEl.innerHTML = games.map((g, i) => heroSlide(g, kicker, i)).join("");
  homeEl("hero-dots").innerHTML = games.map((g, i) => `<button aria-label="Show ${escapeHtml(g.name)}" data-go="${i}"></button>`).join("");
  homeEl("hero").classList.toggle("single", games.length < 2);
  showHero(heroIndex);
  startHeroTimer();
}

const heroEl = homeEl("hero");
if (heroEl) {
  heroEl.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-go]");
    if (dot) { showHero(Number(dot.dataset.go)); startHeroTimer(); return; }
    if (event.target.closest("#hero-prev")) { showHero(heroIndex - 1); startHeroTimer(); return; }
    if (event.target.closest("#hero-next")) { showHero(heroIndex + 1); startHeroTimer(); return; }
    const btn = event.target.closest("[data-act]");
    if (!btn) return;
    const appid = Number(btn.dataset.appid);
    if (btn.dataset.act === "open") openGame(appid);
    else if (btn.dataset.act === "edit") (typeof baseOpenGame === "function" ? baseOpenGame : openGame)(appid);
    else if (btn.dataset.act === "more") {
      const wrap = btn.closest(".h-menu-wrap");
      const open = !wrap.classList.contains("open");
      closeHeroMenus();
      wrap.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    }
  });
  ["mouseenter", "focusin"].forEach((name) => heroEl.addEventListener(name, () => { heroPaused = true; }));
  ["mouseleave", "focusout"].forEach((name) => heroEl.addEventListener(name, () => { heroPaused = false; }));
  document.addEventListener("click", (event) => { if (!event.target.closest(".h-menu-wrap")) closeHeroMenus(); });
}

/* ---------- Recently played ---------- */
function renderRecentCards() {
  const grid = homeEl("recent-grid");
  if (!grid) return;
  const list = state.recent.slice(0, 5);
  if (!list.length) { grid.innerHTML = '<p class="muted">No recently played games were returned by Steam.</p>'; return; }
  grid.innerHTML = list.map((g) => {
    const status = trackerStatus(g.appid);
    const recent = g.playtimeTwoWeeks > 0;
    return `<button class="rc-card" data-appid="${g.appid}">
      <img loading="lazy" src="${escapeHtml(gameImage(g))}" alt="" onerror="${hideBroken}">
      <span class="rc-body">
        <span class="rc-title">${escapeHtml(g.name)}</span>
        <span class="rc-hrs">${recent ? `${hours(g.playtimeTwoWeeks)} (2 wk)` : `${hours(g.playtimeForever)} total`}</span>
        <span class="rc-status"><i class="dot s-${status}"></i>${escapeHtml(statusLabels[status] || "Not tracked")}</span>
      </span></button>`;
  }).join("");
  grid.querySelectorAll(".rc-card").forEach((card) => card.addEventListener("click", () => openGame(Number(card.dataset.appid))));
}

/* ---------- Your library: filter chips, sort, search, cover strip ---------- */
const hl = { source: "all", sort: "playtime", q: "" };
const hlSorters = {
  playtime: (a, b) => b.playtimeForever - a.playtimeForever,
  name: (a, b) => a.name.localeCompare(b.name),
  recent: (a, b) => (b.playtimeTwoWeeks - a.playtimeTwoWeeks) || (b.playtimeForever - a.playtimeForever)
};

function libraryLink() {
  const params = new URLSearchParams();
  if (hl.source !== "all") params.set("source", hl.source);
  if (hl.sort !== "playtime") params.set("sort", hl.sort);
  if (hl.q) params.set("q", hl.q);
  const query = params.toString();
  return `/library.html${query ? `?${query}` : ""}`;
}

function renderHomeLibrary() {
  const strip = homeEl("hl-strip");
  if (!strip) return;
  const games = state.games.filter((g) => (hl.source === "all" || g.source === hl.source) && g.name.toLowerCase().includes(hl.q)).sort(hlSorters[hl.sort]);
  if (!games.length) { strip.innerHTML = `<p class="muted">${state.games.length ? "No games match." : "Loading your library…"}</p>`; return; }
  const shown = games.slice(0, 10), rest = games.length - shown.length;
  strip.innerHTML = shown.map((g) => `<button class="hl-tile" data-appid="${g.appid}" title="${escapeHtml(g.name)}">
      ${chainImg([steamArt(g.appid, "library_600x900.jpg"), gameImage(g)])}<span class="hl-name">${escapeHtml(g.name)}</span></button>`).join("")
    + (rest > 0 ? `<a class="hl-tile more" href="${libraryLink()}"><span class="plus">+</span><span>View ${rest} more</span></a>` : "");
  strip.querySelectorAll(".hl-tile[data-appid]").forEach((tile) => tile.addEventListener("click", () => openGame(Number(tile.dataset.appid))));
}

const hlChips = homeEl("hl-chips");
if (hlChips) {
  hlChips.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    hl.source = chip.dataset.source;
    hlChips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
    renderHomeLibrary();
  });
  homeEl("hl-sort").addEventListener("change", (event) => { hl.sort = event.target.value; renderHomeLibrary(); });
  homeEl("hl-search").addEventListener("input", (event) => { hl.q = event.target.value.trim().toLowerCase(); renderHomeLibrary(); });
}

/* ---------- Insights ---------- */
function renderInsights() {
  const grid = homeEl("insights-grid");
  if (!grid) return;
  if (!state.games.length) { grid.innerHTML = '<p class="muted">Insights appear once your library loads.</p>'; return; }

  const top = sortedByPlaytime().slice(0, 6);
  const max = top[0]?.playtimeForever || 1;
  const rank = top.map((g, i) => `<button class="rank-row" data-appid="${g.appid}">
      <span class="n">${i + 1}</span><img loading="lazy" src="${escapeHtml(gameImage(g))}" alt="" onerror="${hideBroken}">
      <div><div class="name">${escapeHtml(g.name)}</div><div class="bar"><span style="width:${Math.max(4, (g.playtimeForever / max) * 100)}%"></span></div></div>
      <span class="hrs">${hours(g.playtimeForever)}</span></button>`).join("");

  const counts = Object.fromEntries(Object.keys(statusLabels).map((k) => [k, 0]));
  Object.values(state.tracker).forEach((e) => { if (e && counts[e.status] !== undefined) counts[e.status]++; });
  counts.untracked = Math.max(0, state.games.length - Object.values(counts).reduce((a, b) => a + b, 0));
  const labels = { ...statusLabels, untracked: "Not tracked" };
  const total = state.games.length || 1;
  const seg = Object.entries(counts).filter(([, n]) => n).map(([k, n]) => `<i class="s-${k}" style="width:${(n / total) * 100}%" title="${labels[k]}: ${n}"></i>`).join("");
  const legend = Object.entries(counts).map(([k, n]) => `<div><span class="dot s-${k}"></span>${labels[k]}<b>${n}</b></div>`).join("");

  // 100% club: games marked Completed in the tracker, or with every achievement unlocked.
  const done = state.games.filter((g) => state.tracker[String(g.appid)]?.status === "completed" || (g.achievementSummary?.total && g.achievementSummary.percentage >= 100))
    .sort((a, b) => b.playtimeForever - a.playtimeForever);
  const playing = state.games.filter((g) => state.tracker[String(g.appid)]?.status === "playing")
    .sort((a, b) => b.playtimeForever - a.playtimeForever).slice(0, done.length ? 3 : 4);
  const clubRow = (g, gold) => `<button class="club-row ${gold ? "gold" : ""}" data-appid="${g.appid}">
      <img loading="lazy" src="${escapeHtml(gameImage(g))}" alt="" onerror="${hideBroken}">
      <div><div class="name">${escapeHtml(g.name)}</div><div class="bar"><span style="width:${gold ? 100 : 50}%"></span></div></div>
      <span class="pct">${gold ? "★ 100%" : "Playing"}</span></button>`;
  const club = (done.length ? `<p class="club-sub">Finished / 100% games</p>${done.slice(0, 4).map((g) => clubRow(g, true)).join("")}` : '<p class="club-sub">No finished games yet.</p>')
    + (playing.length ? `<p class="club-sub">Currently playing</p>${playing.map((g) => clubRow(g, false)).join("")}` : "");

  grid.innerHTML = `
    <article class="panel"><h3>Most played</h3><div class="rank-list">${rank}</div></article>
    <article class="panel"><h3>Tracker breakdown</h3><div class="seg">${seg}</div><div class="legend">${legend}</div></article>
    <article class="panel"><h3>100% club</h3><div class="club-list">${club}</div></article>`;
  grid.querySelectorAll(".rank-row, .club-row").forEach((row) => row.addEventListener("click", () => openGame(Number(row.dataset.appid))));
}

/* ---------- Wiring ---------- */
// Scroll to #showcase etc. once after the first render, because content height changes as data loads.
let hashHandled = false;
function scrollToHash() {
  if (hashHandled || !location.hash) return;
  hashHandled = true;
  setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView(), 60);
}

const baseRenderRecentHome = renderRecent;
renderRecent = function () { baseRenderRecentHome(); [renderHero, renderRecentCards, renderHomeLibrary, renderInsights, scrollToHash].forEach(safe); };
const baseRenderTrackerHome = renderTracker;
renderTracker = function () { baseRenderTrackerHome(); if (state.games.length) { safe(renderHero); safe(renderRecentCards); safe(renderInsights); } };

// Menu highlight: "Showcase" while that section is on screen, otherwise "Home".
const showcaseSection = homeEl("showcase");
if (showcaseSection && "IntersectionObserver" in window) {
  const setNav = (id) => document.querySelectorAll(".drawer-nav a[data-nav]").forEach((a) => {
    const on = a.dataset.nav === id;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  new IntersectionObserver(([entry]) => setNav(entry.isIntersecting ? "showcase" : "home"), { rootMargin: "-40% 0px -50% 0px" }).observe(showcaseSection);
}
