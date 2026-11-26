// Shared page shell for every page: top bar (search + profile menu), slide-out menu, footer and dialog.
// Loads first (before app.js) so app.js finds the elements it binds to.
(() => {
  const page = document.body.dataset.page || "home";
  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    library: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    showcase: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5l-5.4 3 1.2-6L3.3 9.3l6.1-.7z"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    tracker: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 12l2 2 4-4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pad: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5M16 11h.01M18.5 14h.01"/>',
    achievements: '<circle cx="12" cy="14" r="5"/><path d="M9 3h6l-1.5 5M9 3l1.5 5M9.5 17.5 8 22l4-2 4 2-1.5-4.5"/>',
    history: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>'
  };
  const icon = (name, cls = "") => `<svg class="ico-svg ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  const mark = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 3 27 16 5 29z" fill="#a855f7"/><path d="M5 11l11 5-11 5z" fill="#07050f" opacity=".5"/></svg>';

  const NAV = [
    ["home", "/index.html", "Home"],
    ["library", "/library.html", "Library"],
    ["showcase", "/index.html#showcase", "Showcase"],
    ["top5", "/top5.html", "Top 5"],
    ["achievements", "/achievements.html", "Achievements"],
    ["history", "/history.html", "History"],
    ["tracker", "/tracker.html", "Tracker"]
  ];
  const navLinks = NAV.map(([id, href, label]) =>
    `<a href="${href}" data-nav="${id}"${id === page ? ' class="active" aria-current="page"' : ""}>${icon(id === "top5" ? "trophy" : id)}<span>${label}</span></a>`).join("");
  const filterLink = (href, count, label, left) =>
    `<a class="fl" href="${href}"><span class="fl-name">${left}${label}</span><b data-count="${count}">–</b></a>`;
  const statusLinks = ["backlog", "playing", "completed", "paused", "dropped"].map((k) =>
    filterLink(`/library.html?status=${k}`, k, k[0].toUpperCase() + k.slice(1), `<i class="dot s-${k}"></i>`)).join("");

  document.body.insertAdjacentHTML("afterbegin", `
    <header class="topbar">
      <button id="menu-btn" class="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button>
      <a class="brand" href="/index.html">${mark}<span class="brand-text">TOPETOTTT</span></a>
      <form id="gsearch" class="gsearch" role="search" autocomplete="off">
        ${icon("search")}
        <input id="gs-input" type="search" placeholder="Search your games…   ( / )" aria-label="Search your games">
        <div id="gs-results" class="gs-results"></div>
      </form>
      <div class="top-actions">
        <button id="refresh-top" class="round-btn owner-only" title="Refresh Steam data" aria-label="Refresh Steam data">${icon("refresh")}</button>
        <div class="profile-wrap">
          <button id="pt-btn" class="profile-trigger" aria-expanded="false" aria-controls="pp-panel" aria-haspopup="true">
            <img id="pt-avatar" src="" alt="">
            <span class="pt-text"><strong id="pt-name">Loading…</strong><small><i id="pt-dot" class="pt-dot"></i><span id="pt-status">Steam</span></small></span>
            ${icon("chev", "chev")}
          </button>
          <div id="pp-panel" class="profile-panel" aria-label="Profile and stats">
            <div class="pp-card">
              <img id="avatar" src="" alt="Steam avatar">
              <div><strong id="player-name">Loading…</strong><small id="pp-id">Steam ID</small>
                <a id="steam-link" href="https://steamcommunity.com/" target="_blank" rel="noreferrer">Steam profile ↗</a></div>
            </div>
            <div class="pp-stats">
              <div class="pp-stat">${icon("clock")}<div><span>Total playtime</span><strong id="stat-hours">—</strong><small id="st-hours-sub"></small></div></div>
              <div class="pp-stat">${icon("pad")}<div><span>Games in library</span><strong id="stat-games">—</strong></div></div>
              <div class="pp-stat">${icon("trophy")}<div><span>Achievements</span><strong id="st-ach">—</strong><small id="st-ach-sub">Across my showcased games</small><div class="bar"><span id="st-ach-bar" style="width:0"></span></div></div></div>
              <div class="pp-stat">${icon("check")}<div><span>Games completed</span><strong id="stat-completed">—</strong></div></div>
              <div class="pp-stat">${icon("pen")}<div><span>Reviews written</span><strong id="st-reviews">—</strong></div></div>
            </div>
            <div class="pp-actions">
              <button id="refresh-btn" class="pp-action owner-only">${icon("refresh")}Refresh Steam Data</button>
              <a class="pp-action" href="/library.html">${icon("pad")}Browse Library</a>
              <button id="owner-login" class="pp-action visitor-only" type="button">${icon("lock")}Owner login</button>
              <button id="owner-logout" class="pp-action owner-only" type="button">${icon("lock")}Log out of owner mode</button>
            </div>
            <div class="pp-foot">Last updated <b id="pp-updated">—</b></div>
          </div>
        </div>
      </div>
    </header>
    <div id="scrim" class="scrim"></div>
    <aside id="drawer" class="drawer" aria-label="Menu">
      <div class="drawer-brand"><a class="brand" href="/index.html">${mark}<span class="brand-text">TOPETOTTT</span></a><button id="drawer-close" class="drawer-close" aria-label="Close menu">×</button></div>
      <nav class="drawer-nav" aria-label="Pages">${navLinks}</nav>
      <p class="drawer-title">Filters</p>
      ${filterLink("/library.html", "all", "All Games", icon("pad"))}
      ${filterLink("/library.html?source=owned", "owned", "Owned", icon("pad"))}
      ${filterLink("/library.html?source=family", "family", "Family Shared", icon("pad"))}
      <div class="drawer-sep"></div>
      ${statusLinks}
    </aside>`);

  const main = document.querySelector("main");
  if (main) main.insertAdjacentHTML("beforeend",
    '<footer><span>TOPETOTTT</span><span>Fan-made portfolio · Not affiliated with Valve</span><span id="last-updated">Waiting for data</span></footer>');
  document.body.insertAdjacentHTML("beforeend", `
    <dialog id="game-dialog" class="game-dialog"><button id="close-dialog" class="dialog-close" aria-label="Close">×</button><div id="dialog-content"></div></dialog>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <button id="to-top" class="to-top" aria-label="Back to top">↑</button>`);

  // app.js is shared by every page: ids that don't exist on this page resolve to a detached stand-in instead of null.
  const realQuery = document.querySelector.bind(document);
  document.querySelector = (selector) => realQuery(selector) || (/^#[\w-]+$/.test(selector) ? document.createElement("input") : null);

  const $id = (id) => document.getElementById(id);

  // ---- Slide-out menu
  const drawer = $id("drawer"), scrim = $id("scrim"), menuBtn = $id("menu-btn");
  function setDrawer(open) {
    drawer.classList.toggle("open", open);
    scrim.classList.toggle("show", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    drawer.inert = !open;
    document.body.classList.toggle("no-scroll", open);
    if (open) { setPanel(false); drawer.querySelector(".drawer-nav a")?.focus(); }
    else if (drawer.contains(document.activeElement)) menuBtn.focus();
  }
  drawer.inert = true;
  menuBtn.addEventListener("click", () => setDrawer(!drawer.classList.contains("open")));
  $id("drawer-close").addEventListener("click", () => setDrawer(false));
  scrim.addEventListener("click", () => setDrawer(false));
  drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setDrawer(false)));

  // ---- Profile menu (pops down from the top bar)
  const ppBtn = $id("pt-btn"), ppPanel = $id("pp-panel");
  let achLoaded = false;
  function setPanel(open) {
    ppPanel.classList.toggle("open", open);
    ppBtn.setAttribute("aria-expanded", String(open));
    ppPanel.inert = !open;
    if (open) loadAchievementTotals();
  }
  ppPanel.inert = true;
  ppBtn.addEventListener("click", (event) => { event.stopPropagation(); setPanel(!ppPanel.classList.contains("open")); });
  $id("refresh-btn").addEventListener("click", () => setPanel(false));
  $id("refresh-top").addEventListener("click", () => $id("refresh-btn").click());

  // Achievements are only fetched for the showcased games (one request each, cached by the server).
  async function loadAchievementTotals() {
    const ids = typeof SHOWCASES !== "undefined" ? Object.keys(SHOWCASES) : [];
    if (achLoaded || !ids.length) return;
    achLoaded = true;
    $id("st-ach").textContent = "…";
    const results = await Promise.all(ids.map((id) => api(`/api/games/${id}/achievements`).catch(() => null)));
    let unlocked = 0, total = 0;
    results.forEach((r) => { if (r?.supported && r.total) { unlocked += r.unlocked; total += r.total; } });
    if (!total) { $id("st-ach").textContent = "—"; achLoaded = false; return; }
    const pct = Math.round((unlocked / total) * 100);
    $id("st-ach").textContent = unlocked.toLocaleString();
    $id("st-ach-sub").textContent = `${pct}% of ${total.toLocaleString()} in my showcased games`;
    $id("st-ach-bar").style.width = `${pct}%`;
  }

  // ---- Owner mode. Everyone can browse; only the owner (who knows ADMIN_TOKEN) can change anything.
  // The class below only shows or hides the edit buttons. The server is what actually refuses changes without the token.
  $id("owner-login").addEventListener("click", async () => {
    const token = (prompt("Owner token:") || "").trim();
    if (!token) return;
    try {
      const response = await fetch("/api/auth", { headers: { "x-admin-token": token } });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "That token isn't right.");
      sessionStorage.setItem("portfolioAdminToken", token);
      location.reload();
    } catch (error) { toast(error.message); }
  });
  $id("owner-logout").addEventListener("click", () => { sessionStorage.removeItem("portfolioAdminToken"); location.reload(); });

  // ---- Global search
  const gs = $id("gsearch"), gsInput = $id("gs-input"), gsResults = $id("gs-results");
  const closeResults = () => gsResults.classList.remove("open");
  function updateResults() {
    const q = gsInput.value.trim().toLowerCase();
    if (!q) { closeResults(); return; }
    const hits = state.games.filter((g) => g.name.toLowerCase().includes(q)).sort((a, b) => b.playtimeForever - a.playtimeForever).slice(0, 8);
    gsResults.innerHTML = !state.games.length ? '<p class="gs-empty">Loading your library…</p>'
      : hits.length ? hits.map((g) => `<button type="button" class="gs-item" data-appid="${g.appid}">
          <img src="${escapeHtml(gameImage(g))}" alt="" onerror="this.style.visibility='hidden'">
          <span>${escapeHtml(g.name)}</span><small>${hours(g.playtimeForever)}</small></button>`).join("")
      : '<p class="gs-empty">No games match.</p>';
    gsResults.classList.add("open");
  }
  gsInput.addEventListener("input", updateResults);
  gsInput.addEventListener("focus", updateResults);
  gsResults.addEventListener("click", (event) => {
    const item = event.target.closest(".gs-item");
    if (!item) return;
    closeResults(); gsInput.value = "";
    openGame(Number(item.dataset.appid));
  });
  gs.addEventListener("submit", (event) => {
    event.preventDefault();
    const q = gsInput.value.trim();
    if (q) location.href = `/library.html?q=${encodeURIComponent(q)}`;
  });

  // ---- Motion: sections fade up as they scroll into view; the top bar firms up once you scroll.
  const topbar = document.querySelector(".topbar");
  const toTop = document.getElementById("to-top");
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  const onScroll = () => { topbar.classList.toggle("scrolled", window.scrollY > 8); toTop.classList.toggle("show", window.scrollY > 700); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const startReveal = () => {
    if (!document.documentElement.classList.contains("reveal-on")) return;
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
    }), { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    // Safety net: never leave something on screen hidden.
    setTimeout(() => document.querySelectorAll(".reveal:not(.in)").forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in"); }), 2500);
  };

  // ---- Cursor glow: a soft light that trails the mouse. Skipped on touch screens and for reduced motion.
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.append(glow);
    let tx = 0, ty = 0, x = 0, y = 0, frame = 0, seen = false;
    const tick = () => {
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      glow.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      frame = Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    window.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      tx = event.clientX; ty = event.clientY;
      if (!seen) { seen = true; x = tx; y = ty; glow.classList.add("on"); }
      if (!frame) frame = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener("mouseleave", () => glow.classList.remove("on"));
    document.addEventListener("mouseenter", () => { if (seen) glow.classList.add("on"); });
  }

  // Press "/" anywhere to jump to the search box.
  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName;
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || document.activeElement?.isContentEditable) return;
    event.preventDefault();
    gsInput.focus();
  });

  // Click outside closes pop-downs; Esc closes everything.
  document.addEventListener("click", (event) => {
    if (!ppPanel.contains(event.target) && !ppBtn.contains(event.target)) setPanel(false);
    if (!gs.contains(event.target)) closeResults();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    setDrawer(false); setPanel(false); closeResults();
  });

  // ---- Fill the shared chrome from the loaded Steam data
  function syncChrome() {
    const p = state.profile || {}, games = state.games, entries = Object.values(state.tracker);
    $id("pt-avatar").src = p.avatar || "";
    $id("pt-name").textContent = p.name || "Steam";
    const online = Number(p.personaState) > 0;
    $id("pt-status").textContent = p.name ? (online ? "Online" : "Offline") : "Steam";
    $id("pt-dot").classList.toggle("on", online);
    const sid = String(p.steamId || "");
    $id("pp-id").textContent = sid ? `Steam ID: ${sid.slice(0, 7)}${"*".repeat(Math.max(0, sid.length - 7))}` : "Steam ID";
    const twoWeeks = games.reduce((sum, g) => sum + (g.playtimeTwoWeeks || 0), 0);
    $id("st-hours-sub").textContent = twoWeeks ? `+${(twoWeeks / 60).toFixed(1)}h in the last 2 weeks` : "";
    $id("st-reviews").textContent = entries.filter((e) => e?.review && e.review.trim()).length;
    const counts = {
      all: games.length,
      owned: games.filter((g) => g.source === "owned").length,
      family: games.filter((g) => g.source === "family").length
    };
    Object.keys(statusLabels).forEach((k) => { counts[k] = entries.filter((e) => e?.status === k).length; });
    document.querySelectorAll("[data-count]").forEach((el) => { el.textContent = counts[el.dataset.count] ?? "–"; });
  }

  // Mirror app.js's "Updated 12:42 PM" footer text into the profile menu.
  const lastUpdated = $id("last-updated"), ppUpdated = $id("pp-updated");
  if (lastUpdated) {
    const copy = () => {
      const t = lastUpdated.textContent.trim();
      ppUpdated.textContent = t.replace(/^Updated\s*/, "") || "—";
      // app.js writes "Updated …" once a sync has finished rendering, so this is a reliable moment to fill the chrome.
      if (/^Updated/.test(t) && typeof state !== "undefined" && state.profile) { try { syncChrome(); } catch (error) { console.error("[TOPETOTTT] syncChrome", error); } }
    };
    new MutationObserver(copy).observe(lastUpdated, { childList: true, characterData: true, subtree: true });
    copy();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof renderStats === "undefined") return;
    const baseRenderStats = renderStats;
    renderStats = function () { baseRenderStats(); try { syncChrome(); } catch (error) { console.error("[TOPETOTTT] syncChrome", error); } };
  });

  // ---- Intro: the name is spelled out letter by letter, then flies to its place in the top bar.
  // Plays once per browser session. Add ?intro to the address to see it again. Skipped for "reduce motion".
  const root = document.documentElement;
  async function runIntro() {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const brand = document.querySelector(".topbar .brand");
    const overlay = document.createElement("div");
    let skipped = false;
    const finish = () => {
      root.classList.remove("intro-pending", "intro-flying");
      overlay.remove();
      try { sessionStorage.setItem("introSeen", "1"); } catch (error) { /* storage unavailable */ }
    };
    try {
      const letters = "TOPETOTTT".split("");
      const colors = ["#ffffff", "#fbf8ff", "#f0e6ff", "#e4d0ff", "#d6b8ff", "#d0a8ff", "#dc96ee", "#e784d8", "#f472b6"];
      overlay.className = "intro-overlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML = `<div class="intro-bg"></div><div class="intro-glow"></div>
        <div class="intro-group">${mark}<span class="intro-word">${letters.map((ch, i) => `<span class="intro-letter" style="color:${colors[i]}">${ch}</span>`).join("")}</span></div>
        <p class="intro-sub">Gaming portfolio</p><p class="intro-hint">Click or press any key to skip</p>`;
      document.body.append(overlay);
      const skip = () => { skipped = true; };
      overlay.addEventListener("click", skip);
      window.addEventListener("keydown", skip, { once: true });

      // Wait for the heading font so the sizes below are exact.
      if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load("800 18px Sora"), sleep(1500)]);
      const group = overlay.querySelector(".intro-group");
      const brandRect = brand.getBoundingClientRect();
      const k = Math.max(1.6, Math.min(6.5, (innerWidth * 0.82) / brandRect.width));
      overlay.style.setProperty("--k", k);
      const sub = overlay.querySelector(".intro-sub");
      const groupRect = group.getBoundingClientRect();
      sub.style.top = `${groupRect.bottom + 14}px`;

      // Spell it out.
      group.querySelector(".brand-mark").animate([{ transform: "scale(.3) rotate(-90deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 520, easing: "cubic-bezier(.2,1.4,.4,1)", fill: "both" });
      const spelled = [...overlay.querySelectorAll(".intro-letter")].map((el, i) => el.animate(
        [{ opacity: 0, transform: "translateY(.4em) scale(1.6)", filter: "blur(12px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
        { duration: 460, delay: 380 + i * 115, easing: "cubic-bezier(.2,.9,.2,1)", fill: "both" }));
      sub.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: 380 + letters.length * 115, fill: "both" });
      const holdUntil = 380 + (letters.length - 1) * 115 + 460 + 650;
      for (let t = 0; t < holdUntil && !skipped; t += 40) await sleep(40);
      if (skipped) spelled.forEach((a) => a.finish());

      // Fly to the top bar while the page appears underneath.
      const from = group.getBoundingClientRect();
      const to = brand.getBoundingClientRect();
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const scale = to.width / from.width;
      const duration = skipped ? 520 : 1000;
      root.classList.add("intro-flying");
      root.classList.remove("intro-pending");
      startReveal();
      [".intro-glow", ".intro-sub", ".intro-hint"].forEach((sel) => overlay.querySelector(sel).animate([{ opacity: getComputedStyle(overlay.querySelector(sel)).opacity }, { opacity: 0 }], { duration: 260, fill: "forwards" }));
      overlay.querySelector(".intro-bg").animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration * 0.75, delay: duration * 0.25, easing: "ease-in", fill: "forwards" });
      const flight = group.animate(
        [{ transform: "translate(0,0) scale(1)", filter: "drop-shadow(0 0 26px rgba(168,85,247,.9))" }, { transform: `translate(${dx}px,${dy}px) scale(${scale})`, filter: "drop-shadow(0 0 0 rgba(168,85,247,0))" }],
        { duration, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" });
      await (flight.finished || sleep(duration));
    } catch (error) {
      console.error("[TOPETOTTT] intro", error);
    } finally {
      if (!root.classList.contains("intro-flying")) startReveal();
      finish();
    }
  }
  if (root.classList.contains("intro-pending")) runIntro(); else startReveal();
})();
