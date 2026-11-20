// Library page: a Steam-style grid of portrait posters, Owned / Family chips, a poster-size slider,
// and filters from the address (?q= ?sort= ?status= ?source=).
let sourceFilter = "all";
(() => {
  const params = new URLSearchParams(location.search);
  const setSelect = (id, value) => {
    const el = document.getElementById(id);
    if (el && value && [...el.options].some((o) => o.value === value)) el.value = value;
  };
  const search = document.getElementById("search-input");
  if (search && params.get("q")) search.value = params.get("q");
  setSelect("sort-select", params.get("sort"));
  setSelect("status-filter", params.get("status"));
  const source = params.get("source");
  if (source === "owned" || source === "family" || source === "showcase") sourceFilter = source;

  const chips = document.getElementById("lib-chips");
  if (!chips) return;
  chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.dataset.source === sourceFilter));
  chips.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    sourceFilter = chip.dataset.source;
    chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
    state.visibleCount = 60;
    renderLibrary();
  });
})();

const baseGetFilteredGames = getFilteredGames;
getFilteredGames = function () {
  const games = baseGetFilteredGames();
  if (sourceFilter === "all") return games;
  if (sourceFilter === "showcase") return games.filter((g) => typeof SHOWCASES !== "undefined" && SHOWCASES[g.appid]);
  return games.filter((g) => g.source === sourceFilter);
};

/* ---------- Poster grid ---------- */
const LIB_FALLBACK = "const f=(this.dataset.fb||'').split('|').filter(Boolean);if(f.length){this.src=f.shift();this.dataset.fb=f.join('|')}else{this.style.visibility='hidden'}";

function posterHtml(game) {
  const id = game.appid;
  const cfg = typeof SHOWCASES !== "undefined" ? SHOWCASES[id] : null;
  const status = trackerStatus(id);
  const s = game.achievementSummary;
  const done = Boolean(s?.total && s.percentage >= 100);
  const [first, ...rest] = [`https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900.jpg`, gameImage(game)];
  return `<button class="pc ${cfg ? "has-showcase" : ""} ${done ? "done" : ""}" data-appid="${id}"${cfg ? ` style="--sc:${escapeHtml(cfg.theme.accent)}"` : ""} aria-label="Open ${escapeHtml(game.name)}">
    <span class="pc-fallback">${escapeHtml(game.name)}</span>
    <img loading="lazy" src="${escapeHtml(first)}" data-fb="${escapeHtml(rest.join("|"))}" alt="" onerror="${LIB_FALLBACK}">
    ${cfg ? `<span class="pc-badge">${done ? "★ 100%" : "Showcase"}</span>` : ""}
    <i class="pc-dot s-${status}" title="${escapeHtml(statusLabels[status] || "Not tracked")}"></i>
    <span class="pc-over">
      <strong>${escapeHtml(game.name)}</strong>
      <span>${hours(game.playtimeForever)} total${game.playtimeTwoWeeks > 0 ? ` · ${hours(game.playtimeTwoWeeks)} recent` : ""}</span>
      <span class="pc-status"><i class="dot s-${status}"></i>${escapeHtml(statusLabels[status] || "Not tracked")}</span>
    </span></button>`;
}

const loadMoreBtn = document.getElementById("load-more");
const loadMoreWatcher = "IntersectionObserver" in window && loadMoreBtn
  ? new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadMoreBtn.classList.contains("hidden")) { state.visibleCount += 48; renderLibrary(); }
    }, { rootMargin: "700px 0px" })
  : null;

// Replaces app.js's row layout with posters. Everything else (filters, search, sort, tracker) is unchanged.
renderLibrary = function () {
  state.visibleCount = Math.max(state.visibleCount, 60);
  const games = getFilteredGames();
  $("#library-count").textContent = `${number(games.length)} games shown`;
  const visible = games.slice(0, state.visibleCount);
  const grid = $("#library-grid");
  grid.innerHTML = visible.length ? visible.map(posterHtml).join("") : '<p class="muted">No games match those filters.</p>';
  grid.querySelectorAll(".pc").forEach((card) => card.addEventListener("click", () => openGame(Number(card.dataset.appid))));
  loadMoreBtn.classList.toggle("hidden", visible.length >= games.length);
  if (loadMoreWatcher) { loadMoreWatcher.unobserve(loadMoreBtn); loadMoreWatcher.observe(loadMoreBtn); } // keep loading while the button is still on screen
};

// app.js registered the sort and status dropdowns with its own row renderer. Re-render as posters straight after it.
["sort-select", "status-filter"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("change", () => { state.visibleCount = 60; renderLibrary(); });
});
// Showcased games load a moment after the page, so refresh when the "Showcased" chip is active.
document.addEventListener("showcase:changed", () => { if (sourceFilter === "showcase" && state.games.length) renderLibrary(); });

// Poster size slider (remembered between visits)
(() => {
  const grid = document.getElementById("library-grid");
  const slider = document.getElementById("poster-size");
  if (!grid || !slider) return;
  try { const saved = localStorage.getItem("posterSize"); if (saved) slider.value = saved; } catch (error) { /* storage unavailable */ }
  const apply = () => { grid.style.setProperty("--pw", `${slider.value}px`); try { localStorage.setItem("posterSize", slider.value); } catch (error) { /* ignore */ } };
  slider.addEventListener("input", apply);
  apply();
})();
