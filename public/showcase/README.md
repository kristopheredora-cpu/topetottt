# Showcases

One custom page per game. Open this file to see what exists and what is still missing.

## Tracker

| Game | AppID | Config | Theme | Photos in `public/media/` | Status |
|---|---|---|---|---|---|
| God of War | 1593500 | `games/god-of-war.js` | `themes/god-of-war.css` | `god-of-war/` | Live. Add photos. |
| Cyberpunk 2077 | 1091500 | `games/cyberpunk-2077.js` | `themes/cyberpunk-2077.css` | `cyberpunk-2077/` | Live. Add photos. |
| Red Dead Redemption 2 | 1174180 | `games/red-dead-redemption-2.js` | `themes/red-dead-redemption-2.css` | `red-dead-redemption-2/` | Live. Add photos. |
| Ghost of Tsushima | 2215430 | `games/ghost-of-tsushima.js` | `themes/ghost-of-tsushima.css` | `ghost-of-tsushima/` | Live. Add photos. |
| Detroit: Become Human | 1222140 | `games/detroit-become-human.js` | `themes/detroit-become-human.css` | `detroit-become-human/` | Live. Add photos. |
| Resident Evil 4 | 2050650 | `games/resident-evil-4.js` | `themes/resident-evil-4.css` | `resident-evil-4/` | Live. Add photos. |
| Resident Evil 3 | 952060 | `games/resident-evil-3.js` | `themes/resident-evil-3.css` | `resident-evil-3/` | Live. Add photos. |
| Resident Evil 2 | 883710 | `games/resident-evil-2.js` | `themes/resident-evil-2.css` | `resident-evil-2/` | Live. Add photos. |
| Batman: Arkham Knight | 208650 | `games/batman-arkham-knight.js` | `themes/batman-arkham-knight.css` | `batman-arkham-knight/` | Live. Add photos. |
| Call of Duty: Modern Warfare | 2000950 | `games/call-of-duty-modern-warfare.js` | `themes/call-of-duty-modern-warfare.css` | `call-of-duty-modern-warfare/` | Live. Add photos. |
| Grand Theft Auto V | 271590 | `games/grand-theft-auto-v.js` | `themes/grand-theft-auto-v.css` | `grand-theft-auto-v/` | Live. Add photos. |
| Wuthering Waves | 3513350 | - | - | `wuthering-waves/` | Photo only (no showcase). Set in `CARD_PHOTOS`. |

Status values: Idea, In progress, Live, Live + photos, Photo only.

## Pages

| Page | File | What's on it |
|---|---|---|
| Home | `index.html` | Hero carousel of the games I'm playing, Recently played, Your library strip, Showcase (slices) |
| Library | `library.html` | Search, sort, filters, full library (also opens from the menu filters) |
| Top 5 | `top5.html` | Top 5 list with a live preview |
| Tracker | `tracker.html` | Summary, tabs, star ratings, reviews, "pick my next game" |
| Achievements | `achievements.html` | Achievement progress across every game, perfect games, latest unlocks |

The top bar (search + profile pop-down), slide-out menu, footer and game dialog come from `shell.js`. Edit it once and every page updates.

The hero carousel shows every game with the status "Playing" in the tracker. With none, it falls back to recently played games.

## Layout

```
public/
  index.html  library.html  top5.html  tracker.html
  shell.js        shared top bar, profile pop-down, menu, footer, dialog (loads first)
  app.js          Steam sync, cards, achievements, tracker
  home.js         home page: hero carousel, recent cards, library strip
  library.js      library page: Owned / Family chips and URL filters
  top5.js         the Top 5 appids, in order, and the Top 5 list
  styles.css
  dialog.js       the game details card (also used by "Edit tracker entry")
  showcase/
    manifest.js    list of showcased games + their main photos (GAME_PHOTOS, CARD_PHOTOS)
    showcase.js    engine: Showcase slices, game pages, achievements, 100% state
    showcase.css   base styles shared by every showcase
    games/         one config file per game (_template.js is not loaded)
    themes/        per-game CSS for a fully custom look
  media/
    <game-folder>/ hero.jpg, logo.png, cover.jpg, 1.jpg ... 6.jpg
data/
  family-games.json   family-shared games
```

## Photos

Each game's folder in `public/media/<game-folder>/` can hold:

- `hero.jpg`: wide banner, about 1920x1080 (Showcase slices)
- `cover.jpg`: portrait 2:3 cover (Top 5 preview)
- `logo.png`: transparent title logo (falls back to Steam logo, then plain text)
- `1.jpg` to `6.jpg`: screenshots for the game page (skipped if missing)

The Top 5 and the Showcase slices pick photos in this order, and use the first one that loads:

1. `hero.jpg` (slices) or `cover.jpg` (Top 5) in the game's media folder
2. The game's main photo listed in `GAME_PHOTOS` in `showcase/manifest.js`
3. A custom `image` from `data/family-games.json`
4. Steam's own art

`CARD_PHOTOS` in `manifest.js` is separate: it gives a game that Steam has no art for (like Wuthering Waves) a photo everywhere it appears.

To use a new photo for a game, drop it in its media folder and point `GAME_PHOTOS` at it, or name it `hero.jpg` / `cover.jpg`.

## Add a new game

1. Find the Steam appid in the store URL (`store.steampowered.com/app/<appid>`).
2. Copy `games/_template.js` to `games/<slug>.js` and fill it in.
3. Create `public/media/<slug>/` and drop in your photos.
4. Add `"<slug>"` to the list in `manifest.js`. No page edits are needed.
5. Optional: add `themes/<slug>.css`, scope every rule to `.theme-<slug>`, and set `css` in the config.
6. Add a row to the tracker above.

## Change the Top 5

Edit the appids in the `TOP5` list at the top of `public/top5.js`.
