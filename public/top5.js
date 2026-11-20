// The five games shown in the Top 5 list on the home page, in this order.
const TOP5 = [1174180, 1091500, 2215430, 1593500, 1222140];

function renderTop5() {
  const listEl = $("#top5-list");
  const previewEl = $("#top5-preview");
  if (!listEl || !previewEl || !state.games.length) return;

  const validGames = TOP5.map((id) => state.games.find((g) => g.appid === id)).filter(Boolean);

  if (!validGames.length) {
    listEl.innerHTML = '<p class="muted">Top 5 games not found in your library.</p>';
    previewEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = validGames.map((game, index) => {
    const num = String(index + 1).padStart(2, "0");
    const ach = game.achievementSummary;
    const done = ach?.total && ach.percentage >= 100;

    return `
      <button class="sx-row ${index === 0 ? "active" : ""} ${done ? "done" : ""}" data-appid="${game.appid}" data-idx="${index}" aria-label="Open ${escapeHtml(game.name)}">
        ${photoImg(gamePhotos(game.appid, "tall"), "sx-thumb")}
        <span class="sx-n">${num}</span>
        <div class="sx-main">
          <span class="sx-title">${escapeHtml(game.name)}</span>
          <span class="sx-tag">${hours(game.playtimeForever)} total playtime</span>
        </div>
        <div class="sx-meta">
          ${done ? `<div>★ 100%</div>` : `<div>${hours(game.playtimeForever)}</div>`}
        </div>
      </button>`;
  }).join("");

  previewEl.innerHTML = validGames.map((game, index) => {
    const accent = (typeof SHOWCASES !== "undefined" && SHOWCASES[game.appid]?.theme.accent) || "#a855f7";
    return `
      <figure class="sx-layer ${index === 0 ? "on" : ""}" id="top5-layer-${index}" style="--sc:${escapeHtml(accent)}">
        ${photoImg(gamePhotos(game.appid, "tall"))}
        <figcaption style="padding-top:120px;background:linear-gradient(0deg,#07050f 0,#07050fe8 38%,#07050f00 100%);text-shadow:0 2px 14px #000">
          <strong>${escapeHtml(game.name)}</strong>
          <span>${hours(game.playtimeForever)} logged on Steam</span>
        </figcaption>
      </figure>`;
  }).join("");

  const rows = listEl.querySelectorAll(".sx-row");
  const layers = previewEl.querySelectorAll(".sx-layer");

  rows.forEach((row) => {
    const activate = () => {
      rows.forEach((r) => r.classList.remove("active"));
      layers.forEach((l) => l.classList.remove("on"));
      row.classList.add("active");
      const targetLayer = previewEl.querySelector(`#top5-layer-${row.dataset.idx}`);
      if (targetLayer) targetLayer.classList.add("on");
    };

    row.addEventListener("mouseenter", activate);
    row.addEventListener("focus", activate);
    row.addEventListener("click", () => openGame(Number(row.dataset.appid)));
  });
}

// Re-render when Steam syncs
const baseRenderRecentTop5 = renderRecent;
renderRecent = function () { baseRenderRecentTop5(); renderTop5(); };
