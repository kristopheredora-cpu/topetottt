// Featured hero + sidebar behavior. Loads after app.js and leaves its API/sync logic untouched.
function renderFeatured() {
  const game = state.recent[0]
    || [...state.games].sort((a, b) => b.playtimeForever - a.playtimeForever)[0];
  const art = $("#featured-art");
  const open = $("#featured-open");
  $("#steam-link-m").href = $("#steam-link").href;
  if (!game) {
    $("#featured-title").textContent = "No games found";
    $("#featured-kicker").textContent = "Your library";
    return;
  }
  const recent = game.playtimeTwoWeeks > 0;
  const status = trackerStatus(game.appid);
  const base = `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}`;
  art.onerror = () => { art.onerror = () => { art.style.visibility = "hidden"; }; art.src = gameImage(game); };
  art.style.visibility = "visible";
  art.src = `${base}/library_hero.jpg`;
  $("#featured-kicker").textContent = recent ? "Now playing" : "Most played";
  $("#featured-title").textContent = game.name;
  $("#featured-meta").innerHTML = [
    `<span>${hours(game.playtimeForever)} total</span>`,
    recent ? `<span>${hours(game.playtimeTwoWeeks)} in the last 2 weeks</span>` : "",
    `<span class="pill ${status}">${escapeHtml(statusLabels[status] || "Not tracked")}</span>`
  ].join("");
  open.disabled = false;
  open.onclick = () => openGame(game.appid);
}

// Re-render the hero whenever app.js renders its recent section (after every Steam sync/refresh).
const baseRenderRecent = renderRecent;
renderRecent = function () { baseRenderRecent(); renderFeatured(); };

// Keep the hero's status pill current after a tracker save.
const baseRenderTracker = renderTracker;
renderTracker = function () { baseRenderTracker(); if (state.games.length) renderFeatured(); };

$("#refresh-btn-m").addEventListener("click", () => $("#refresh-btn").click());

// Highlight the sidebar link for the section in view.
const navLinks = [...document.querySelectorAll(".side-nav a")];
const targets = navLinks.map((a) => document.querySelector(a.getAttribute("href")));
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
  });
}, { rootMargin: "-35% 0px -55% 0px" });
targets.forEach((t) => t && observer.observe(t));
