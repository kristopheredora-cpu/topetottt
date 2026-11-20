# Steam Gaming Portfolio

A public, single-owner Steam portfolio built with HTML, CSS, vanilla JavaScript, Node.js, and Express. No database is required for the starter version.

## Features

- Steam profile name, avatar, and profile link
- Owned games and total/recent playtime
- Recently played games
- Per-game achievement progress where Steam exposes the data
- Personal tracker: backlog / playing / completed / paused / dropped, rating, review, notes
- Search, sort, status filters, and load-more
- Server-side cache to avoid calling Steam on every browser request
- Tracker write operations protected by an admin token

## Requirements

- Node.js 18 or newer
- A Steam Web API key: https://steamcommunity.com/dev
- Your 64-bit SteamID (SteamID64)

## Setup

1. Extract the ZIP and open the project folder in a terminal.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`.
4. Fill in:
   - `STEAM_API_KEY`: your Steam Web API key
   - `STEAM_ID`: your 64-bit Steam ID
   - `ADMIN_TOKEN`: a long, random secret used to edit tracker entries
5. In Steam's privacy settings, make your **Game details** public. Profile visibility should also be public if you want the profile endpoint to return all details.
6. Start the site:

   ```bash
   npm run dev
   ```

7. Visit http://localhost:3000

## Where to find your SteamID64

Open your Steam profile. If the URL is `https://steamcommunity.com/profiles/7656119.../`, the long number is your SteamID64. If your profile URL uses a custom vanity name, use a reputable SteamID lookup or add vanity resolution as a future feature. Never provide your Steam password to this site.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Configuration health check |
| GET | `/api/profile` | Steam profile summary |
| GET | `/api/games` | Owned games and playtime |
| GET | `/api/recent` | Recently played games |
| GET | `/api/games/:appid/achievements` | Achievement progress for a game |
| GET | `/api/tracker` | Public personal tracker entries |
| PUT | `/api/tracker/:appid` | Create/update a tracker entry (admin token required) |
| POST | `/api/refresh` | Clear Steam cache (admin token required) |

## Tracker storage

Personal entries are stored in `data/tracker.json`, which is intentionally ignored by Git. The app creates this file on the first save.

This is suitable for local development or a server with persistent disk. Many serverless hosts have ephemeral filesystems; your tracker edits may disappear after redeploy/restart. For production hosting, use a persistent volume or migrate tracker data to a database.

## Security notes

- Never put the Steam API key in `public/app.js` or any browser-side file.
- Do not commit `.env`.
- Use a long random `ADMIN_TOKEN`, keep it private, and do not use your Steam password as the token.
- The public portfolio exposes only the Steam data you choose to display and the tracker entries.
- The refresh button requires the admin token. The site prompts for it when you click refresh or save a tracker entry.
- This starter app is designed for one owner's portfolio. Do not use it as a multi-user service without proper authentication, authorization, rate limiting, and per-user data separation.
- Steam API availability and the fields returned depend on Valve's API and the profile's privacy settings.

## Notes on achievements

The server asks Steam for the player's achievement unlocks and the game's achievement schema. Not every game exposes these through the Web API, and some responses can be empty or fail when details are private. In those cases the UI explains that data is unavailable.

## Deployment

Deploy the Node app to a host that runs persistent Node.js services and preserves the project `data/` directory, or use a persistent volume. Configure the environment variables in the host dashboard instead of uploading `.env`. Test `/api/health` and `/api/profile` after deployment.

## Official references

- Steam Web API: https://steamcommunity.com/dev
- Player service: https://partner.steamgames.com/doc/webapi/IPlayerService
- Player summaries: https://partner.steamgames.com/doc/webapi/ISteamUser
- Express static files: https://expressjs.com/en/5x/starter/static-files/
