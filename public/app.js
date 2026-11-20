const state = {
  profile: null,
  games: [],
  recent: [],
  tracker: {},
  visibleCount: 20,
  selectedGame: null,
  adminToken: sessionStorage.getItem("portfolioAdminToken") || ""
};

const $ = (selector) => document.querySelector(selector);
const number = (value) => new Intl.NumberFormat().format(value || 0);
const hours = (minutes) => `${((minutes || 0) / 60).toFixed(1)} hrs`;
const statusLabels = {
  backlog: "Backlog", playing: "Playing", completed: "Completed",
  paused: "Paused", dropped: "Dropped"
};

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (state.adminToken) headers["x-admin-token"] = state.adminToken;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 3000);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function gameImage(game) {
  // If you provided a custom image path in your JSON, use that first
  if (game.image) return game.image;
  
  // Otherwise, fallback to the standard Steam CDN
  return `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`;
}

function trackerStatus(appid) {
  return state.tracker[String(appid)]?.status || "untracked";
}

function cardHtml(game) {
  const entry = state.tracker[String(game.appid)];
  const status = entry?.status || "untracked";
  const recent = game.playtimeTwoWeeks > 0;
  const achievement = game.achievementSummary;
  const subline = statusLabels[status] || "Not tracked";
  const sourceLabel = game.source === "family"
  ? "Family Shared"
  : game.source === "owned"
    ? "Owned"
    : "";
  const progress = achievement?.total ? `<div class="progress"><span style="width:${achievement.percentage}%"></span></div>` : "";
  const achievementText = achievement?.total ? `${achievement.unlocked}/${achievement.total} achievements` : "";
  return `<article class="game-card" data-appid="${game.appid}" tabindex="0" role="button" aria-label="Open ${escapeHtml(game.name)}">
    <img class="game-art" loading="lazy" src="${gameImage(game)}" alt="" onerror="this.style.visibility='hidden'">
    <div class="game-card-body">
      <div class="game-title">${escapeHtml(game.name)}</div>
      <div class="game-meta">
        <span>${hours(game.playtimeForever)}</span>
        <span class="pill ${status}">${escapeHtml(subline)}</span>
        ${sourceLabel ? `<span class="pill">${escapeHtml(sourceLabel)}</span>` : ""}
      </div>
      ${achievementText ? `<div class="game-meta">${escapeHtml(achievementText)}</div>${progress}` : ""}
      ${recent ? `<div class="game-meta"><span>Recently played</span><span>${hours(game.playtimeTwoWeeks)} / 2 wk</span></div>` : ""}
    </div>
  </article>`;
}

function bindGameCards(container) {
  container.querySelectorAll(".game-card").forEach((card) => {
    const open = () => openGame(Number(card.dataset.appid));
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
  });
}

function renderRecent() {
  const grid = $("#recent-grid");
  if (!state.recent.length) {
    grid.innerHTML = '<p class="muted">No recently played games were returned by Steam.</p>';
    return;
  }
  grid.innerHTML = state.recent.map(cardHtml).join("");
  bindGameCards(grid);
  $("#stat-recent").textContent = state.recent.length;
}

function getFilteredGames() {
  const search = $("#search-input").value.trim().toLowerCase();
  const sort = $("#sort-select").value;
  const status = $("#status-filter").value;
  let games = state.games.filter((game) => {
    const matchesName = game.name.toLowerCase().includes(search);
    const currentStatus = trackerStatus(game.appid);
    const matchesStatus = status === "all" || currentStatus === status;
    return matchesName && matchesStatus;
  });
  if (sort === "name") games.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "recent") games.sort((a, b) => b.playtimeTwoWeeks - a.playtimeTwoWeeks);
  else games.sort((a, b) => b.playtimeForever - a.playtimeForever);
  return games;
}

function renderLibrary() {
  const games = getFilteredGames();
  $("#library-count").textContent = `${number(games.length)} games shown`;
  const visible = games.slice(0, state.visibleCount);
  const grid = $("#library-grid");
  grid.innerHTML = visible.length ? visible.map(cardHtml).join("") : '<p class="muted">No games match those filters.</p>';
  bindGameCards(grid);
  $("#load-more").classList.toggle("hidden", visible.length >= games.length);
}

function renderTracker() {
  const entries = Object.entries(state.tracker)
    .filter(([, entry]) => entry && entry.status)
    .sort((a, b) => (b[1].updatedAt || "").localeCompare(a[1].updatedAt || ""));
  const grid = $("#tracker-grid");
  if (!entries.length) {
    grid.innerHTML = '<p class="muted">Your tracker is empty. Open a game from your library and add its status, rating, review, or notes.</p>';
    $("#stat-completed").textContent = "0";
    return;
  }
  const gamesById = new Map(state.games.map((game) => [String(game.appid), game]));
  grid.innerHTML = entries.map(([appid, entry]) => {
    const game = gamesById.get(appid) || { appid, name: `Steam App ${appid}`, playtimeForever: 0 };
    const rating = entry.rating === null || entry.rating === undefined ? "Not rated" : `${entry.rating}/10`;
    return `<article class="tracker-item">
      <img class="tracker-thumb" loading="lazy" src="${gameImage(game)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="tracker-copy">
        <h3>${escapeHtml(game.name)}</h3>
        <div class="game-meta"><span class="pill ${entry.status}">${escapeHtml(statusLabels[entry.status] || entry.status)}</span><span>${hours(game.playtimeForever)}</span></div>
        <div class="tracker-rating">${escapeHtml(rating)}</div>
        ${entry.review ? `<p>${escapeHtml(entry.review)}</p>` : ""}
        ${entry.notes ? `<p><strong>Notes:</strong> ${escapeHtml(entry.notes)}</p>` : ""}
        <button class="button button-secondary edit-tracker" data-appid="${escapeHtml(appid)}" style="margin-top:10px">Edit entry</button>
      </div>
    </article>`;
  }).join("");
  grid.querySelectorAll(".edit-tracker").forEach((button) => button.addEventListener("click", () => openGame(Number(button.dataset.appid))));
  $("#stat-completed").textContent = entries.filter(([, entry]) => entry.status === "completed").length;
}

function renderStats() {
  $("#stat-games").textContent = number(state.games.length);
  const totalMinutes = state.games.reduce((sum, game) => sum + (game.playtimeForever || 0), 0);
  $("#stat-hours").textContent = `${Math.round(totalMinutes / 60).toLocaleString()}h`;
  $("#stat-completed").textContent = Object.values(state.tracker).filter((entry) => entry.status === "completed").length;
}

async function openGame(appid) {
  const game = state.games.find((item) => item.appid === appid)
    || state.recent.find((item) => item.appid === appid)
    || { appid, name: `Steam App ${appid}`, playtimeForever: 0, playtimeTwoWeeks: 0 };
  state.selectedGame = game;
  const entry = state.tracker[String(appid)] || { status: "backlog", rating: null, review: "", notes: "" };
  const dialog = $("#game-dialog");
  const content = $("#dialog-content");
  content.innerHTML = `
    <p class="eyebrow">GAME DETAILS</p>
    <h2>${escapeHtml(game.name)}</h2>
    <img class="dialog-hero" src="${gameImage(game)}" alt="" onerror="this.style.visibility='hidden'">
    <div class="dialog-stats"><span>${hours(game.playtimeForever)} total</span><span>${hours(game.playtimeTwoWeeks)} in the last two weeks</span><a href="https://store.steampowered.com/app/${appid}/" target="_blank" rel="noreferrer">Steam store ↗</a></div>
    <div id="achievement-panel"><p class="muted">Loading achievement data…</p></div>
    <form id="tracker-form" class="dialog-form">
      <p class="eyebrow">YOUR TRACKER ENTRY</p>
      <label>Status
        <select name="status">
          ${Object.entries(statusLabels).map(([key, label]) => `<option value="${key}" ${entry.status === key ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
      <div class="form-row">
        <label>Rating (0–10)
          <input name="rating" type="number" min="0" max="10" step="0.5" value="${entry.rating ?? ""}" placeholder="Not rated">
        </label>
        <label>Admin token
          <input name="adminToken" type="password" autocomplete="current-password" placeholder="Required to save" value="">
        </label>
      </div>
      <label>Review
        <textarea name="review" maxlength="3000" placeholder="What did you think of this game?">${escapeHtml(entry.review || "")}</textarea>
      </label>
      <label>Personal notes
        <textarea name="notes" maxlength="3000" placeholder="Progress, endings, DLC, things to remember…">${escapeHtml(entry.notes || "")}</textarea>
      </label>
      <button class="button button-primary" type="submit">Save tracker entry</button>
      <p class="muted">The admin token is sent only with the save request and is not saved to local storage. It is held in this browser tab's session only after a successful save.</p>
    </form>`;
  dialog.showModal();

  $("#tracker-form").addEventListener("submit", saveTrackerEntry);
  loadAchievements(appid);
}

async function loadAchievements(appid) {
  const panel = $("#achievement-panel");
  try {
    const data = await api(`/api/games/${appid}/achievements`);
    if (!state.selectedGame || state.selectedGame.appid !== appid) return;
    if (!data.supported) {
      panel.innerHTML = `<div class="notice">Achievement details are unavailable for this game, or the game does not expose achievements through Steam's API.</div>`;
      return;
    }
    const visibleAchievements = data.achievements.slice().sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).slice(0, 12);
    panel.innerHTML = `<div class="section-heading"><div><p class="eyebrow">STEAM ACHIEVEMENTS</p><h3>${data.unlocked} / ${data.total} unlocked (${data.percentage}%)</h3></div></div>
      <div class="progress"><span style="width:${data.percentage}%"></span></div>
      ${data.error ? `<div class="notice">${escapeHtml(data.error)}</div>` : ""}
      <div class="achievement-list">${visibleAchievements.map((achievement) => `
        <div class="achievement ${achievement.unlocked ? "" : "locked"}">
          ${achievement.icon ? `<img loading="lazy" src="${escapeHtml(achievement.icon)}" alt="">` : `<span>🏆</span>`}
          <div><strong>${escapeHtml(achievement.name)}</strong><small>${escapeHtml(achievement.description || (achievement.unlocked ? "Unlocked" : "Locked"))}</small></div>
          <span>${achievement.unlocked ? "✓" : "—"}</span>
        </div>`).join("")}</div>
      ${data.achievements.length > 12 ? `<p class="muted">Showing 12 of ${data.achievements.length} achievements.</p>` : ""}`;
  } catch (error) {
    panel.innerHTML = `<div class="notice">Couldn't load achievements: ${escapeHtml(error.message)}. Some games do not expose achievement data, or your game details may be private.</div>`;
  }
}

async function saveTrackerEntry(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const appid = state.selectedGame.appid;
  const formData = new FormData(form);
  const token = String(formData.get("adminToken") || "").trim();
  if (!token && !state.adminToken) {
    toast("Enter your admin token to save.");
    return;
  }
  const ratingRaw = String(formData.get("rating") || "").trim();
  const payload = {
    status: formData.get("status"),
    rating: ratingRaw === "" ? null : Number(ratingRaw),
    review: String(formData.get("review") || ""),
    notes: String(formData.get("notes") || "")
  };
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Saving…";
  try {
    const response = await fetch(`/api/tracker/${appid}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token || state.adminToken
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Could not save tracker entry.");
    state.adminToken = token || state.adminToken;
    if (state.adminToken) sessionStorage.setItem("portfolioAdminToken", state.adminToken);
    state.tracker[String(appid)] = result.entry;
    renderStats();
    renderLibrary();
    renderTracker();
    toast("Tracker entry saved.");
    $("#game-dialog").close();
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Save tracker entry";
  }
}

async function loadAll() {
  $("#last-updated").textContent = "Syncing with Steam…";
  try {
    const [profile, gamesResult, recent, tracker] = await Promise.all([
      api("/api/profile"), api("/api/games"), api("/api/recent"), api("/api/tracker")
    ]);
    state.profile = profile;
    state.games = gamesResult.games || [];
    state.recent = recent || [];
    state.tracker = tracker || {};

    $("#player-name").textContent = profile.name;
    $("#avatar").src = profile.avatar || "";
    $("#steam-link").href = profile.profileUrl || "https://steamcommunity.com/";
    $("#steam-link").textContent = "Steam profile ↗";
    renderRecent();
    renderStats();
    renderLibrary();
    renderTracker();
    $("#last-updated").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) {
    $("#player-name").textContent = "Steam connection unavailable";
    $("#last-updated").textContent = "Could not sync";
    const notice = `<div class="notice">${escapeHtml(error.message)}<br>Check your .env configuration and Steam profile privacy settings.</div>`;
    $("#recent-grid").innerHTML = notice;
    $("#library-grid").innerHTML = notice;
    $("#tracker-grid").innerHTML = notice;
    toast(error.message);
  }
}

$("#search-input").addEventListener("input", () => { state.visibleCount = 20; renderLibrary(); });
$("#sort-select").addEventListener("change", renderLibrary);
$("#status-filter").addEventListener("change", renderLibrary);
$("#load-more").addEventListener("click", () => { state.visibleCount += 20; renderLibrary(); });
$("#refresh-btn").addEventListener("click", async () => {
  try {
    const token = prompt("Enter your admin token to force-refresh Steam cache:");
    if (!token) return;
    const response = await fetch("/api/refresh", { method: "POST", headers: { "x-admin-token": token } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Refresh failed.");
    state.adminToken = token;
    sessionStorage.setItem("portfolioAdminToken", token);
    await loadAll();
    toast("Steam data refreshed.");
  } catch (error) { toast(error.message); }
});
$("#close-dialog").addEventListener("click", () => $("#game-dialog").close());

loadAll();