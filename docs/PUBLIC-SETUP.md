# Running TOPETOTTT as a public, view-only portfolio

Anyone can open and explore the site. Only you can change it.

## How it works
- Every page and every read endpoint is public. Visitors never see an edit button.
- The server refuses every write (`PUT /api/tracker/:appid`, `POST /api/refresh`) unless the request carries your `ADMIN_TOKEN`. The comparison is timing-safe, and 8 wrong tries from one address block it for 15 minutes.
- To edit, open the profile menu (top right), press **Owner login** and enter the token. It is kept for the browser tab only. **Log out of owner mode** clears it.
- Personal notes are hidden from visitors unless you set `PUBLIC_NOTES=true`. Reviews and ratings stay public.
- Security headers are sent on every response, including a Content-Security-Policy. If it ever blocks something, set `DISABLE_CSP=1` and tell me what broke.
- Requests are rate limited per address.

## Before you make the repo public
1. `.env` must be in `.gitignore`. Check with `git status` that it is not tracked. If it ever was, change your Steam API key and your `ADMIN_TOKEN`.
2. Add these lines to `.gitignore`:
   ```
   .env
   node_modules
   data/history.json
   ```
3. Look at `data/tracker.json`. Everything in it (reviews, notes) is visible in a public repo. Leave it out of the repo if you want it private.
4. Use a long random `ADMIN_TOKEN` (20+ characters). The server prints a warning if it is short.

## Hosting
The server writes `tracker.json` and `history.json`, so it needs a disk that survives restarts.
- **Works:** a small VPS, Render with a persistent disk, Railway or Fly.io with a volume, a home server. Set `DATA_DIR` to the persistent folder and copy your `tracker.json` there once.
- **Does not work:** hosts with a read-only or throwaway file system (Vercel, Netlify functions, free tiers without a disk). Edits and history would vanish.
- Behind a proxy or host, set `TRUST_PROXY=1`. Serve it over HTTPS.

## Playtime history
- Steam only gives lifetime minutes per game. The server saves a snapshot of every game's minutes whenever it loads your library, and also every 3 hours by itself.
- A day's playtime is the change since the previous snapshot. The history page starts empty and fills in from the day you deploy this.
- Set `TIMEZONE` (for example `Asia/Manila`) so days roll over at your midnight.
- If the server was off for days, the playtime in that gap is counted on the next snapshot.
- A game that newly appears in the library is treated as a starting point, not as playtime.
