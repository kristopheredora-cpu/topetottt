require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const STEAM_BASE = "https://api.steampowered.com";
const PUBLIC_DIR = path.join(__dirname, "public");
const CONTENT_DIR = path.join(__dirname, "data"); // content that lives in the repo (family-games.json)
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : CONTENT_DIR; // files the server writes
const TRACKER_FILE = path.join(DATA_DIR, "tracker.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const FAMILY_GAMES_FILE = path.join(CONTENT_DIR, "family-games.json");
const PUBLIC_NOTES = /^(1|true|yes)$/i.test(process.env.PUBLIC_NOTES || "");

// Playtime history uses this time zone for "what day is it". Example: TIMEZONE=Asia/Manila
let TIMEZONE = process.env.TIMEZONE || "UTC";
try { new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }); } catch (error) {
  console.warn(`Unknown TIMEZONE "${TIMEZONE}", using UTC.`);
  TIMEZONE = "UTC";
}
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const dateKey = (date = new Date()) => dayFormatter.format(date); // YYYY-MM-DD

app.disable("x-powered-by");
// Behind a reverse proxy (Render, Railway, nginx...) set TRUST_PROXY=1 so rate limits see each visitor's real address.
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

// ---------- Security headers ----------
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin"
  });
  if (!/^(1|true|yes)$/i.test(process.env.DISABLE_CSP || "")) res.set("Content-Security-Policy", CSP);
  if (req.secure) res.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  next();
});

app.use(express.json({ limit: "30kb" }));
app.use(express.static(PUBLIC_DIR));

// ---------- Small in-memory rate limiting ----------
function windowCounter(windowMs) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, windowMs);
  timer.unref();
  return {
    add(key) {
      const now = Date.now();
      let entry = hits.get(key);
      if (!entry || entry.reset <= now) { entry = { count: 0, reset: now + windowMs }; hits.set(key, entry); }
      return ++entry.count;
    },
    count(key) {
      const entry = hits.get(key);
      return entry && entry.reset > Date.now() ? entry.count : 0;
    }
  };
}
const apiHits = windowCounter(60 * 1000);          // every /api request
const achievementHits = windowCounter(60 * 1000);  // the Steam-heavy achievements endpoint
const authFailures = windowCounter(15 * 60 * 1000); // wrong owner tokens

app.use("/api", (req, res, next) => {
  if (apiHits.add(req.ip) > 600) return res.status(429).json({ error: "Too many requests. Slow down a little." });
  next();
});

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cached(key, loader, ttl = CACHE_TTL_MS) {
  const existing = cache.get(key);
  if (existing && Date.now() - existing.time < ttl) return Promise.resolve(existing.value);

  return loader().then((value) => {
    cache.set(key, { time: Date.now(), value });
    return value;
  });
}

async function steamGet(pathname, params = {}) {
  if (!STEAM_API_KEY || !STEAM_ID) {
    const error = new Error("Steam API is not configured. Set STEAM_API_KEY and STEAM_ID in .env.");
    error.status = 503;
    throw error;
  }

  const url = new URL(`${STEAM_BASE}${pathname}`);
  url.searchParams.set("key", STEAM_API_KEY);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    const error = new Error(`Steam API returned HTTP ${response.status}. Check your Steam ID, API key, and profile privacy settings.`);
    error.status = 502;
    throw error;
  }

  const body = await response.json();
  return body;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${file}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempFile, file);
}

const readTracker = () => readJson(TRACKER_FILE, {});
const writeTracker = (tracker) => writeJson(TRACKER_FILE, tracker);

async function readFamilyGames() {
  try {
    const data = JSON.parse(
      await fs.readFile(FAMILY_GAMES_FILE, "utf8")
    );

    if (!Array.isArray(data)) {
      throw new Error("family-games.json must contain an array.");
    }

    return data
      .filter((game) =>
        Number.isInteger(Number(game.appid)) &&
        Number(game.appid) > 0 &&
        typeof game.name === "string" &&
        game.name.trim().length > 0
      )
      .map((game) => ({
        appid: Number(game.appid),
        name: game.name.trim(),
        playtimeForever: 0,
        playtimeTwoWeeks: 0,
        imgIconUrl: null,
        storeUrl: `https://store.steampowered.com/app/${Number(game.appid)}/`,
        source: "family"
      }));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

// ---------- Owner access ----------
// Everyone can read the site. Only someone with ADMIN_TOKEN can change anything.
function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) { crypto.timingSafeEqual(left, left); return false; }
  return crypto.timingSafeEqual(left, right);
}
const isAdmin = (req) => Boolean(ADMIN_TOKEN) && safeEqual(req.get("x-admin-token") || "", ADMIN_TOKEN);

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ error: "Editing is disabled until ADMIN_TOKEN is set in .env." });
  }
  if (authFailures.count(req.ip) >= 8) {
    return res.status(429).json({ error: "Too many wrong tokens. Try again in 15 minutes." });
  }
  if (!isAdmin(req)) {
    authFailures.add(req.ip);
    return res.status(401).json({ error: "Admin token is missing or incorrect." });
  }
  next();
}

function safeInt(value, min, max) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

// ---------- Playtime history ----------
// Steam only reports lifetime minutes per game. Saving a snapshot every few hours lets the site work out
// how much was played each day: today's minutes minus the previous snapshot's minutes.
let historyQueue = Promise.resolve();
function recordSnapshot(games) {
  historyQueue = historyQueue.then(async () => {
    const history = await readJson(HISTORY_FILE, { version: 1, snapshots: {} });
    const today = dateKey();
    const snapshot = {};
    for (const game of games) snapshot[game.appid] = game.playtimeForever || 0;
    const existing = history.snapshots[today];
    if (existing && JSON.stringify(existing) === JSON.stringify(snapshot)) return;
    history.snapshots[today] = snapshot;
    history.updatedAt = new Date().toISOString();
    await writeJson(HISTORY_FILE, history);
  }).catch((error) => console.warn("[history] could not save a snapshot:", error.message));
}

const daysBetween = (a, b) => Math.max(1, Math.round((Date.UTC(...b.split("-").map((v, i) => (i === 1 ? v - 1 : +v))) - Date.UTC(...a.split("-").map((v, i) => (i === 1 ? v - 1 : +v)))) / 86400000));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, steamConfigured: Boolean(STEAM_API_KEY && STEAM_ID) });
});

// Used by "Owner login" in the site: 200 when the token is right.
app.get("/api/auth", requireAdmin, (req, res) => res.json({ ok: true }));

app.get("/api/profile", async (req, res, next) => {
  try {
    const profile = await cached("profile", async () => {
      const data = await steamGet("/ISteamUser/GetPlayerSummaries/v2/", { steamids: STEAM_ID });
      const player = data?.response?.players?.[0];
      if (!player) {
        const error = new Error("Steam did not return a profile. Verify STEAM_ID and profile visibility.");
        error.status = 404;
        throw error;
      }
      return {
        steamId: player.steamid,
        name: player.personaname,
        avatar: player.avatarfull || player.avatarmedium || player.avatar,
        profileUrl: player.profileurl,
        personaState: player.personastate,
        visibility: player.communityvisibilitystate
      };
    });
    res.json(profile);
  } catch (error) { next(error); }
});

async function loadGames() {
  const data = await steamGet(
    "/IPlayerService/GetOwnedGames/v1/",
    {
      steamid: STEAM_ID,
      include_appinfo: true,
      include_played_free_games: true,
      include_family_licenses: true
    }
  );

  const list = data?.response?.games;

  if (!Array.isArray(list)) {
    const error = new Error(
      "Steam did not return your games. Set Game details to Public in Steam privacy settings."
    );
    error.status = 403;
    throw error;
  }

  const ownedGames = list.map((game) => ({
    appid: game.appid,
    name: game.name || `App ${game.appid}`,
    playtimeForever: game.playtime_forever || 0,
    playtimeTwoWeeks: game.playtime_2weeks || 0,
    imgIconUrl: game.img_icon_url
      ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
      : null,
    storeUrl: `https://store.steampowered.com/app/${game.appid}/`,
    source: game.family_shared ? "family" : "owned"
  }));

  const familyGames = await readFamilyGames();

  // Keep the owned version if a game appears in both lists, but preserve custom images.
  const mergedGames = new Map();

  for (const game of familyGames) {
    mergedGames.set(game.appid, game);
  }

  for (const game of ownedGames) {
    const existing = mergedGames.get(game.appid);
    if (existing && existing.image) {
      game.image = existing.image; // Transfer the custom image to the Steam version
    }
    mergedGames.set(game.appid, game);
  }

  const games = [...mergedGames.values()].sort(
    (a, b) =>
      b.playtimeForever - a.playtimeForever ||
      a.name.localeCompare(b.name)
  );
  recordSnapshot(games);
  return games;
}

app.get("/api/games", async (req, res, next) => {
  try {
    const games = await cached("games", loadGames);
    res.json({ count: games.length, games });
  } catch (error) {
    next(error);
  }
});

// Refresh the game list in the background every few hours so history keeps filling in even when nobody visits.
async function scheduledSnapshot() {
  if (!STEAM_API_KEY || !STEAM_ID) return;
  try {
    cache.delete("games");
    await cached("games", loadGames);
  } catch (error) {
    console.warn("[history] scheduled refresh failed:", error.message);
  }
}
setTimeout(scheduledSnapshot, 15 * 1000).unref();
setInterval(scheduledSnapshot, 3 * 60 * 60 * 1000).unref();

app.get("/api/history", async (req, res, next) => {
  try {
    const history = await readJson(HISTORY_FILE, { version: 1, snapshots: {} });
    const dates = Object.keys(history.snapshots).sort();
    const days = [];
    for (let i = 1; i < dates.length; i++) {
      const previous = history.snapshots[dates[i - 1]];
      const current = history.snapshots[dates[i]];
      const games = {};
      let minutes = 0;
      for (const [appid, value] of Object.entries(current)) {
        if (!(appid in previous)) continue; // a game that just appeared in the library is a baseline, not playtime
        const delta = value - previous[appid];
        if (delta > 0) { games[appid] = delta; minutes += delta; }
      }
      days.push({ date: dates[i], minutes, games, span: daysBetween(dates[i - 1], dates[i]) });
    }
    res.json({ since: dates[0] || null, snapshots: dates.length, today: dateKey(), timezone: TIMEZONE, days });
  } catch (error) { next(error); }
});

app.get("/api/recent", async (req, res, next) => {
  try {
    const recent = await cached("recent", async () => {
      const data = await steamGet("/IPlayerService/GetRecentlyPlayedGames/v1/", {
        steamid: STEAM_ID,
        count: 10
      });
      return (data?.response?.games || []).map((game) => ({
        appid: game.appid,
        name: game.name || `App ${game.appid}`,
        playtimeForever: game.playtime_forever || 0,
        playtimeTwoWeeks: game.playtime_2weeks || 0,
        imgIconUrl: game.img_icon_url
          ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
          : null,
        storeUrl: `https://store.steampowered.com/app/${game.appid}/`
      }));
    });
    res.json(recent);
  } catch (error) { next(error); }
});

app.get("/api/games/:appid/achievements", async (req, res, next) => {
  try {
    if (achievementHits.add(req.ip) > 240) return res.status(429).json({ error: "Too many achievement requests. Try again in a minute." });
    const appid = safeInt(req.params.appid, 1, 2147483647);
    if (!appid) return res.status(400).json({ error: "Invalid app ID." });

    const achievements = await cached(`achievements:${appid}`, async () => {
      const [playerResult, schemaResult] = await Promise.allSettled([
        steamGet("/ISteamUserStats/GetPlayerAchievements/v1/", { steamid: STEAM_ID, appid }),
        steamGet("/ISteamUserStats/GetSchemaForGame/v2/", { appid })
      ]);

      let unlocked = [];
      let playerError = null;
      if (playerResult.status === "fulfilled") {
        const stats = playerResult.value?.playerstats;
        if (stats?.success === false) playerError = stats.error || "Achievements are unavailable for this game.";
        else unlocked = stats?.achievements || [];
      } else {
        playerError = playerResult.reason.message;
      }

      const schema = schemaResult.status === "fulfilled"
        ? schemaResult.value?.game?.availableGameStats?.achievements || []
        : [];

      const schemaByApiName = new Map(schema.map((a) => [a.name, a]));
      const items = unlocked.map((a) => {
        const definition = schemaByApiName.get(a.apiname) || {};
        return {
          apiName: a.apiname,
          name: definition.displayName || a.apiname,
          description: definition.description || "",
          icon: a.achieved ? (definition.icon || null) : (definition.icongray || definition.icon || null),
          unlocked: Number(a.achieved) === 1,
          unlockTime: a.unlocktime ? new Date(Number(a.unlocktime) * 1000).toISOString() : null
        };
      });

      const unlockedCount = items.filter((a) => a.unlocked).length;
      return {
        appid,
        supported: items.length > 0 || schema.length > 0,
        error: playerError,
        unlocked: unlockedCount,
        total: schema.length || items.length,
        percentage: (schema.length || items.length) > 0
          ? Math.round((unlockedCount / (schema.length || items.length)) * 100)
          : null,
        achievements: items
      };
    }, 10 * 60 * 1000);

    res.json(achievements);
  } catch (error) { next(error); }
});

// Everyone can read the tracker. Personal notes are private unless PUBLIC_NOTES=true, or the request carries the owner token.
app.get("/api/tracker", async (req, res, next) => {
  try {
    const tracker = await readTracker();
    if (PUBLIC_NOTES || isAdmin(req)) return res.json(tracker);
    const visible = {};
    for (const [appid, entry] of Object.entries(tracker)) visible[appid] = { ...entry, notes: "" };
    res.json(visible);
  } catch (error) { next(error); }
});

app.put("/api/tracker/:appid", requireAdmin, async (req, res, next) => {
  try {
    const appid = safeInt(req.params.appid, 1, 2147483647);
    if (!appid) return res.status(400).json({ error: "Invalid app ID." });

    const allowedStatuses = new Set(["backlog", "playing", "completed", "paused", "dropped"]);
    const status = req.body?.status;
    const rating = req.body?.rating;
    const review = req.body?.review;
    const notes = req.body?.notes;

    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ error: "Status must be backlog, playing, completed, paused, or dropped." });
    }
    if (rating !== null && rating !== undefined && (typeof rating !== "number" || rating < 0 || rating > 10)) {
      return res.status(400).json({ error: "Rating must be a number from 0 to 10, or null." });
    }
    if (typeof review !== "string" || review.length > 3000 || typeof notes !== "string" || notes.length > 3000) {
      return res.status(400).json({ error: "Review and notes must be strings up to 3000 characters." });
    }

    const tracker = await readTracker();
    tracker[String(appid)] = {
      status,
      rating: rating ?? null,
      review,
      notes,
      updatedAt: new Date().toISOString()
    };
    await writeTracker(tracker);
    res.json({ ok: true, entry: tracker[String(appid)] });
  } catch (error) { next(error); }
});

app.post("/api/refresh", requireAdmin, (req, res) => {
  cache.clear();
  res.json({ ok: true, message: "Steam API cache cleared. Data will be fetched again on the next request." });
});

// Anything else: unknown API paths and missing files are 404s, other pages fall back to the home page.
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
  if (path.extname(req.path)) return res.status(404).end(); // a missing image, script or stylesheet
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use((error, req, res, next) => {
  console.error(`[${new Date().toISOString()}]`, error.message);
  res.status(error.status || 500).json({
    error: error.message || "Unexpected server error."
  });
});

app.listen(PORT, () => {
  console.log(`Steam Gaming Portfolio running at http://localhost:${PORT}`);
  console.log(ADMIN_TOKEN ? "Owner editing is enabled (visitors are read-only)." : "ADMIN_TOKEN is not set: nobody can edit.");
  if (ADMIN_TOKEN && ADMIN_TOKEN.length < 16) console.warn("ADMIN_TOKEN is short. Use a long random value (20+ characters).");
  if (!STEAM_API_KEY || !STEAM_ID) {
    console.warn("Set STEAM_API_KEY and STEAM_ID in .env before using Steam endpoints.");
  }
});
