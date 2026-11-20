// Showcase page: a big index list with a live preview. Deliberately different from the Top 5 slices on the home page.
let sxCurrent = 0;
function renderShowcasePage() {
  const list = document.getElementById("sx-list"), preview = document.getElementById("sx-preview");
  if (!list || !preview) return;
  const entries = typeof SHOWCASES !== "undefined" ? Object.entries(SHOWCASES) : [];
  if (!entries.length) { list.innerHTML = '<p class="muted">No showcases yet. Add one in public/showcase/games/.</p>'; preview.innerHTML = ""; return; }
  const detail = (cfg, key) => (cfg.details.find(([k]) => k === key) || [])[1];
  const fb = (id) => `https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_hero.jpg`;
  const art = (cfg, id, cls) => `<img class="${cls}" loading="lazy" src="/media/${escapeHtml(cfg.folder)}/hero.jpg" data-fb="${fb(id)}" alt=""
    onerror="if(this.dataset.fb){this.src=this.dataset.fb;this.dataset.fb=''}else{this.style.visibility='hidden'}">`;
  sxCurrent = Math.min(sxCurrent, entries.length - 1);
  list.innerHTML = entries.map(([id, cfg], i) => {
    const game = state.games.find((g) => String(g.appid) === id);
    const s = game?.achievementSummary;
    const done = s?.total && s.percentage >= 100;
    const meta = [game ? hours(game.playtimeForever) : "Not in library", s?.total ? `${s.unlocked}/${s.total}` : "", done ? "★ 100%" : ""].filter(Boolean).join("<br>");
    return `<button class="sx-row ${i === sxCurrent ? "active" : ""} ${done ? "done" : ""}" data-i="${i}" data-appid="${id}" style="--sc:${escapeHtml(cfg.theme.accent)}">
      ${art(cfg, id, "sx-thumb")}
      <span class="sx-n">${String(i + 1).padStart(2, "0")}</span>
      <span class="sx-main"><span class="sx-title">${escapeHtml(cfg.title)}</span><span class="sx-tag">${escapeHtml(cfg.tagline)}</span></span>
      <span class="sx-meta">${meta}</span></button>`;
  }).join("");
  preview.innerHTML = entries.map(([id, cfg], i) => `<figure class="sx-layer ${i === sxCurrent ? "on" : ""}" data-i="${i}" style="--sc:${escapeHtml(cfg.theme.accent)}">
      ${art(cfg, id, "")}
      <figcaption><strong>${escapeHtml(cfg.title)}</strong><span>${[detail(cfg, "Developer"), detail(cfg, "PC release"), detail(cfg, "Genres")].filter(Boolean).map(escapeHtml).join(" · ")}</span></figcaption>
    </figure>`).join("");
  const rows = [...list.querySelectorAll(".sx-row")], layers = [...preview.querySelectorAll(".sx-layer")];
  const activate = (i) => { sxCurrent = i; rows.forEach((r, n) => r.classList.toggle("active", n === i)); layers.forEach((l, n) => l.classList.toggle("on", n === i)); };
  rows.forEach((row, i) => {
    row.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") activate(i); });
    row.addEventListener("focus", () => activate(i));
    row.addEventListener("click", () => openGame(Number(row.dataset.appid)));
  });
}
document.addEventListener("showcase:changed", renderShowcasePage);
const sxBaseRenderRecent = renderRecent;
renderRecent = function () { sxBaseRenderRecent(); renderShowcasePage(); }; // re-render with playtime once Steam data arrives
