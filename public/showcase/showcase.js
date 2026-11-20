// Showcase engine. Game configs live in public/showcase/games/*.js and call registerShowcase().
const SHOWCASES = {};
const loadedThemes = new Set();
const showcaseEntries = () => Object.entries(SHOWCASES);

function loadThemeCss(href) {
  if (!href || loadedThemes.has(href)) return;
  loadedThemes.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = href;
  document.head.append(link);
}

function registerShowcase(appid, cfg) {
  SHOWCASES[appid] = cfg;
  loadThemeCss(cfg.css ? `${cfg.css}?v=17` : cfg.css); // ?v= makes browsers pick up redesigned themes
  document.dispatchEvent(new CustomEvent("showcase:changed"));
}

const steamArt = (id, file) => `https://cdn.akamai.steamstatic.com/steam/apps/${id}/${file}`;
const artImg = (cls, primary, fallback) =>
  `<img class="${cls}" src="${escapeHtml(primary)}" ${fallback ? `data-fb="${escapeHtml(fallback)}"` : ""} alt=""
    onerror="if(this.dataset.fb){this.src=this.dataset.fb;this.dataset.fb=''}else{this.style.visibility='hidden';this.parentElement.classList.add('no-art')}">`;

// Photos for a game, best first. kind "wide" is for banners and slices, "tall" for portrait spots like the Top 5 preview.
// Order: hero.jpg / cover.jpg in the game's media folder, the main photo from manifest.js (GAME_PHOTOS),
// a custom image from family-games.json, then Steam's own art.
function gamePhotos(appid, kind) {
  const cfg = SHOWCASES[appid];
  const game = state.games.find((g) => g.appid === Number(appid));
  const main = typeof GAME_PHOTOS !== "undefined" ? GAME_PHOTOS[appid] : null;
  const steam = steamArt(appid, kind === "tall" ? "library_600x900.jpg" : "library_hero.jpg");
  return [cfg ? `/media/${cfg.folder}/${kind === "tall" ? "cover" : "hero"}.jpg` : null, main, game?.image, steam]
    .filter(Boolean)
    .filter((url, i, all) => all.indexOf(url) === i);
}
// Shows the first photo and falls through the rest if one fails to load. Hidden only if all of them fail.
const PHOTO_FALLBACK = "const f=(this.dataset.fb||'').split('|').filter(Boolean);if(f.length){this.src=f.shift();this.dataset.fb=f.join('|')}else{this.style.visibility='hidden'}";
function photoImg(urls, cls = "") {
  const [first, ...rest] = urls;
  return `<img class="${cls}" loading="lazy" src="${escapeHtml(first)}" data-fb="${escapeHtml(rest.join("|"))}" alt="" onerror="${PHOTO_FALLBACK}">`;
}

// Games listed in CARD_PHOTOS (manifest.js) use that photo wherever app.js shows a game image.
const baseGameImage = gameImage;
gameImage = function (game) {
  const photo = typeof CARD_PHOTOS !== "undefined" ? CARD_PHOTOS[game.appid] : null;
  return photo || baseGameImage(game);
};

const scLink = document.createElement("link");
scLink.rel = "stylesheet"; scLink.href = "/showcase/showcase.css";
document.head.append(scLink);
loadThemeCss("/showcase/intros.css?v=17"); // opening animations for each game page
document.body.insertAdjacentHTML("beforeend", '<dialog id="showcase-dialog" class="showcase" aria-label="Game showcase"></dialog>');

// Renders the Showcase section on the home page as expanding slices
function renderShowcase() {
  const grid = $("#showcase-grid");
  if (!grid) return;

  const entries = showcaseEntries();
  const countEl = $("#showcase-count");
  if (countEl) countEl.textContent = entries.length ? `${entries.length} featured` : "";

  if (!entries.length) {
    grid.innerHTML = '<p class="muted">No showcases yet. Add one in public/showcase/games/.</p>';
    return;
  }

  grid.innerHTML = entries.map(([id, cfg], index) => {
    const game = state.games.find((g) => String(g.appid) === id);
    const ach = game?.achievementSummary;
    const done = ach?.total && ach.percentage >= 100;
    const active = index === 0 ? "active" : "";

    return `
      <button class="slice ${active} ${done ? "done" : ""}" data-appid="${id}" style="--sc:${escapeHtml(cfg.theme.accent)}" aria-label="Open ${escapeHtml(cfg.title)} showcase">
        ${photoImg(gamePhotos(id, "wide"))}
        ${done ? '<span class="slice-badge">★ 100%</span>' : ""}
        <span class="s-vert">${escapeHtml(cfg.title)}</span>
        <div class="s-info">
          <h3>${escapeHtml(cfg.title)}</h3>
          <p>${escapeHtml(cfg.tagline)}</p>
          <div class="chips">
            ${game ? `<span>${hours(game.playtimeForever)}</span>` : "<span>Not in library</span>"}
            ${ach?.total ? `<span>${ach.unlocked}/${ach.total} achievements</span>` : ""}
            <span class="s-open">Open showcase →</span>
          </div>
        </div>
      </button>`;
  }).join("");

  const slices = grid.querySelectorAll(".slice");
  slices.forEach((slice) => {
    const activate = () => {
      slices.forEach((s) => s.classList.remove("active"));
      slice.classList.add("active");
    };
    slice.addEventListener("mouseenter", activate);
    slice.addEventListener("focus", activate);
    slice.addEventListener("click", () => openGame(Number(slice.dataset.appid)));
  });
}

function showcaseAchievements(data, panel) {
  if (!data.supported) {
    panel.innerHTML = '<div class="notice">Steam does not expose achievements for this game, or your game details are private.</div>';
    return;
  }
  const done = data.total > 0 && data.unlocked === data.total;
  const circ = 2 * Math.PI * 50;
  const list = data.achievements.slice().sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  let filter = "all";
  const tile = (a) => `<div class="sc-ach-tile ${a.unlocked ? "unlocked" : "locked"}">
      ${a.icon ? `<img loading="lazy" src="${escapeHtml(a.icon)}" alt="">` : '<span class="noicon">🏆</span>'}
      <div><strong>${escapeHtml(a.name)}</strong><small>${escapeHtml(a.description || (a.unlocked ? "Unlocked" : "Hidden achievement"))}</small></div>
      <span class="mark">${a.unlocked ? "✓" : ""}</span></div>`;
  const draw = () => {
    panel.querySelector(".sc-ach-grid").innerHTML = list.filter((a) => filter === "all" || (filter === "unlocked") === a.unlocked).map(tile).join("");
    panel.querySelectorAll(".sc-chip").forEach((c) => c.classList.toggle("active", c.dataset.f === filter));
  };
  panel.innerHTML = `<div class="sc-ach-head">
      <div class="sc-ring-wrap"><svg class="sc-ring" viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="50"/><circle class="val" cx="60" cy="60" r="50" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - data.percentage / 100)}"/></svg><div class="sc-ring-num">${data.percentage}%</div></div>
      <div><h3>${data.unlocked} of ${data.total} achievements</h3><p>${done ? "Every achievement unlocked." : `${data.total - data.unlocked} left to unlock.`}</p></div>
    </div>
    ${done ? '<div class="sc-complete">100% complete. Every achievement in this game is unlocked.</div>' : ""}
    <div class="sc-chips"><button class="sc-chip" data-f="all">All ${data.total}</button><button class="sc-chip" data-f="unlocked">Unlocked ${data.unlocked}</button><button class="sc-chip" data-f="locked">Locked ${data.total - data.unlocked}</button></div>
    <div class="sc-ach-grid"></div>`;
  panel.querySelectorAll(".sc-chip").forEach((c) => c.addEventListener("click", () => { filter = c.dataset.f; draw(); }));
  draw();
  if (done) {
    $("#showcase-dialog").classList.add("done");
    $("#sc-done-slot").innerHTML = '<span class="sc-done-pill">★ 100% complete</span>';
  }
}

async function openShowcase(appid) {
  const cfg = SHOWCASES[appid];
  const game = state.games.find((g) => g.appid === appid) || state.recent.find((g) => g.appid === appid)
    || { appid, name: cfg.title, playtimeForever: 0, playtimeTwoWeeks: 0 };
  state.selectedGame = game;
  const entry = state.tracker[String(appid)];
  const dlg = $("#showcase-dialog");
  const media = (f) => `/media/${cfg.folder}/${f}`;
  dlg.className = `showcase theme-${cfg.folder}`;
  dlg.style.setProperty("--sc", cfg.theme.accent);
  dlg.style.setProperty("--sc2", cfg.theme.accent2);
  dlg.style.setProperty("--gold", cfg.theme.gold);
  const rating = entry && entry.rating !== null && entry.rating !== undefined ? `${entry.rating}/10` : "Not rated";
  dlg.innerHTML = `
    <section class="sc-hero">
      ${artImg("sc-hero-art", media("hero.jpg"), steamArt(appid, "library_hero.jpg"))}
      <div class="sc-top"><button class="sc-back" id="sc-close">← Back to library</button></div>
      <div class="sc-hero-body">
        <div class="sc-brand">${artImg("sc-logo", media("logo.png"), steamArt(appid, "logo.png"))}<h2 class="sc-title">${escapeHtml(cfg.title)}</h2></div>
        <p class="sc-tagline">${escapeHtml(cfg.tagline)}</p>
        <div class="sc-actions">
          <button class="sc-btn" id="sc-edit">Edit tracker entry</button>
          <a class="sc-btn ghost" href="https://store.steampowered.com/app/${appid}/" target="_blank" rel="noreferrer">Steam store ↗</a>
          <span id="sc-done-slot"></span>
        </div>
      </div>
    </section>
    <div class="sc-body">
      <div>
        <h3>About</h3>
        <p class="sc-desc">${escapeHtml(cfg.description)}</p>
        <div class="sc-stats">
          <div class="sc-stat"><span>Total playtime</span><strong>${hours(game.playtimeForever)}</strong></div>
          <div class="sc-stat"><span>Last two weeks</span><strong>${hours(game.playtimeTwoWeeks)}</strong></div>
          <div class="sc-stat"><span>Status</span><strong>${escapeHtml(statusLabels[entry?.status] || "Not tracked")}</strong></div>
          <div class="sc-stat"><span>My rating</span><strong>${escapeHtml(rating)}</strong></div>
        </div>
        ${entry?.review ? `<div class="sc-review">${escapeHtml(entry.review)}<small>My review</small></div>` : ""}
        <div class="sc-ach" id="sc-ach"><p class="muted">Loading achievements…</p></div>
        <div class="sc-gallery"><h3>Screenshots</h3><div class="sc-gallery-grid">
          ${(cfg.photos || []).map((p) => `<figure>${artImg("", media(p), "")}</figure>`).join("")}
        </div></div>
      </div>
      <aside class="sc-aside">
        ${artImg("sc-cover", media("cover.jpg"), steamArt(appid, "library_600x900.jpg"))}
        <dl class="sc-details">${cfg.details.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>
      </aside>
    </div>`;
  dlg.querySelectorAll(".sc-gallery figure").forEach((f) => f.addEventListener("click", () => f.classList.toggle("zoom")));
  $("#sc-close").addEventListener("click", () => dlg.close());
  $("#sc-edit").addEventListener("click", () => { dlg.close(); baseOpenGame(appid); });
  dlg.showModal();
  dlg.scrollTop = 0;
  try {
    const data = await api(`/api/games/${appid}/achievements`);
    if (state.selectedGame?.appid !== appid || !dlg.open) return;
    showcaseAchievements(data, $("#sc-ach"));
  } catch (error) {
    $("#sc-ach").innerHTML = `<div class="notice">Couldn't load achievements: ${escapeHtml(error.message)}</div>`;
  }
}

const baseOpenGame = openGame;
openGame = function (appid) { return SHOWCASES[appid] ? openShowcase(appid) : baseOpenGame(appid); };

const baseCardHtml = cardHtml;
cardHtml = function (game) {
  const cfg = SHOWCASES[game.appid];
  const html = baseCardHtml(game);
  if (!cfg) return html;
  const s = game.achievementSummary;
  const done = s?.total && s.percentage >= 100;
  return html
    .replace('class="game-card"', `class="game-card showcase-card theme-${cfg.folder}${done ? " done" : ""}" style="--sc:${cfg.theme.accent}"`)
    .replace('<div class="game-card-body">', `<span class="card-badge">${done ? "100%" : "Showcase"}</span><div class="game-card-body">`);
};

// Re-render showcase when games or showcases change
let showcaseRefreshTimer;
document.addEventListener("showcase:changed", () => {
  clearTimeout(showcaseRefreshTimer);
  showcaseRefreshTimer = setTimeout(() => {
    if (state.games.length) { renderLibrary(); renderRecent(); }
  }, 60);
});

// The critical hook to trigger the render on page load
const baseRenderRecentShowcase = renderRecent;
renderRecent = function () { baseRenderRecentShowcase(); renderShowcase(); };

// The missing loader that registers your custom games
(typeof SHOWCASE_MANIFEST !== "undefined" ? SHOWCASE_MANIFEST : []).forEach((slug) => {
  const script = document.createElement("script");
  script.src = `/showcase/games/${slug}.js`;
  script.async = false;
  document.head.append(script);
});
