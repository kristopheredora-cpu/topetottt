// Game details dialog: a launcher-style card for every game without a showcase page,
// and for "Edit tracker entry" on showcase pages. Loads right after app.js.
// Saving still goes through app.js's saveTrackerEntry, so the tracker API is untouched.
const DLG_FALLBACK = "const f=(this.dataset.fb||'').split('|').filter(Boolean);if(f.length){this.src=f.shift();this.dataset.fb=f.join('|')}else{this.style.visibility='hidden'}";
const dlgChain = (urls, cls = "") => {
  const [first, ...rest] = urls;
  return `<img class="${cls}" src="${escapeHtml(first)}" data-fb="${escapeHtml(rest.join("|"))}" alt="" onerror="${DLG_FALLBACK}">`;
};

function dialogAchievements(data, panel) {
  if (!data.supported) {
    panel.innerHTML = '<div class="notice">Achievement details are unavailable for this game, or Steam does not expose them.</div>';
    return;
  }
  const list = data.achievements.slice().sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const total = data.total || list.length;
  const unlocked = data.unlocked ?? list.filter((a) => a.unlocked).length;
  const pct = data.percentage ?? (total ? Math.round((unlocked / total) * 100) : 0);
  const circ = 2 * Math.PI * 44;
  const done = total > 0 && unlocked === total;
  let filter = "all";
  const row = (a) => `<div class="gd-ach-row ${a.unlocked ? "on" : "off"}">
      ${a.icon ? `<img loading="lazy" src="${escapeHtml(a.icon)}" alt="">` : '<span class="gd-ach-ico">🏆</span>'}
      <div><strong>${escapeHtml(a.name)}</strong><small>${escapeHtml(a.description || (a.unlocked ? "Unlocked" : "Hidden achievement"))}</small></div>
      <span class="gd-ach-state">${a.unlocked ? "✓" : ""}</span></div>`;
  panel.classList.toggle("done", done);
  panel.innerHTML = `
    <div class="gd-ach-head">
      <div class="gd-ring-wrap"><svg class="gd-ring" viewBox="0 0 100 100"><circle class="t" cx="50" cy="50" r="44"/><circle class="v" cx="50" cy="50" r="44" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct / 100)}"/></svg><b>${pct}%</b></div>
      <div><h3>${unlocked} of ${total} achievements</h3><p>${done ? "Every achievement unlocked." : `${total - unlocked} left to unlock.`}</p></div>
      ${done ? '<span class="gd-done">★ 100% complete</span>' : ""}
    </div>
    ${data.error ? `<div class="notice">${escapeHtml(data.error)}</div>` : ""}
    <div class="gd-filter"><button type="button" data-f="all">All ${total}</button><button type="button" data-f="unlocked">Unlocked ${unlocked}</button><button type="button" data-f="locked">Locked ${total - unlocked}</button></div>
    <div class="gd-ach-list"></div>`;
  const draw = () => {
    panel.querySelector(".gd-ach-list").innerHTML = list.filter((a) => filter === "all" || (filter === "unlocked") === a.unlocked).map(row).join("") || '<p class="muted">Nothing here yet.</p>';
    panel.querySelectorAll(".gd-filter button").forEach((b) => b.classList.toggle("active", b.dataset.f === filter));
  };
  panel.querySelectorAll(".gd-filter button").forEach((b) => b.addEventListener("click", () => { filter = b.dataset.f; draw(); }));
  draw();
}

openGame = async function (appid) {
  const game = state.games.find((item) => item.appid === appid)
    || state.recent.find((item) => item.appid === appid)
    || { appid, name: `Steam App ${appid}`, playtimeForever: 0, playtimeTwoWeeks: 0 };
  state.selectedGame = game;
  const entry = state.tracker[String(appid)] || { status: "backlog", rating: null, review: "", notes: "" };
  const dialog = $("#game-dialog");
  const cdn = `https://cdn.akamai.steamstatic.com/steam/apps/${appid}`;
  const status = trackerStatus(appid);
  $("#dialog-content").innerHTML = `
    <div class="gd">
      <header class="gd-hero">
        ${dlgChain([`${cdn}/library_hero.jpg`, gameImage(game)], "gd-art")}
        <div class="gd-head">
          ${dlgChain([`${cdn}/library_600x900.jpg`, gameImage(game)], "gd-poster")}
          <div class="gd-title">
            <p class="gd-kicker">Game details</p>
            <h2>${escapeHtml(game.name)}</h2>
            <div class="gd-chips">
              <span>${hours(game.playtimeForever)} total</span>
              ${game.playtimeTwoWeeks > 0 ? `<span>${hours(game.playtimeTwoWeeks)} in 2 weeks</span>` : ""}
              <span class="pill ${status}">${escapeHtml(statusLabels[status] || "Not tracked")}</span>
              <a href="https://store.steampowered.com/app/${appid}/" target="_blank" rel="noreferrer">Steam store ↗</a>
              <a class="gd-play" href="steam://run/${appid}">▶ Play</a>
            </div>
          </div>
        </div>
      </header>
      <div class="gd-body">
        <section class="gd-main"><div id="achievement-panel" class="gd-ach"><p class="muted">Loading achievement data…</p></div></section>
        <form id="tracker-form" class="dialog-form gd-form">
          <h3>Your tracker entry</h3>
          <div class="gd-seg" role="radiogroup" aria-label="Status">
            ${Object.entries(statusLabels).map(([key, label]) => `<label class="gd-opt"><input type="radio" name="status" value="${key}" ${entry.status === key ? "checked" : ""}><span><i class="dot s-${key}"></i>${label}</span></label>`).join("")}
          </div>
          <div class="form-row">
            <label>Rating (0–10)<input name="rating" type="number" min="0" max="10" step="0.5" value="${entry.rating ?? ""}" placeholder="Not rated"></label>
            <label>Admin token<input name="adminToken" type="password" autocomplete="current-password" placeholder="Required to save" value=""></label>
          </div>
          <label>Review<textarea name="review" maxlength="3000" placeholder="What did you think of this game?">${escapeHtml(entry.review || "")}</textarea></label>
          <label>Personal notes<textarea name="notes" maxlength="3000" placeholder="Progress, endings, DLC, things to remember…">${escapeHtml(entry.notes || "")}</textarea></label>
          <button class="button button-primary" type="submit">Save tracker entry</button>
          <p class="muted">The admin token is only sent with the save request. It is held in this tab's session after a successful save.</p>
        </form>
      </div>
    </div>`;
  dialog.showModal();
  dialog.scrollTop = 0;
  $("#tracker-form").addEventListener("submit", saveTrackerEntry);
  try {
    const data = await api(`/api/games/${appid}/achievements`);
    if (state.selectedGame?.appid !== appid) return;
    dialogAchievements(data, $("#achievement-panel"));
  } catch (error) {
    $("#achievement-panel").innerHTML = `<div class="notice">Couldn't load achievements: ${escapeHtml(error.message)}. Some games do not expose achievement data, or your game details may be private.</div>`;
  }
};
