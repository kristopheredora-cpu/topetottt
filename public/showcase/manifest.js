// Which games are showcased, and the main photo for each one (from public/media/).
// To add a game: create games/<slug>.js, then add <slug> to SHOWCASE_MANIFEST.
const SHOWCASE_MANIFEST = [
  "cyberpunk-2077",
  "red-dead-redemption-2",
  "god-of-war",
  "ghost-of-tsushima",
  "detroit-become-human",
  "resident-evil-4",
  "resident-evil-3",
  "resident-evil-2",
  "batman-arkham-knight",
  "call-of-duty-modern-warfare",
  "grand-theft-auto-v"
];

// Main photo per game, by Steam appid. The Top 5 and the Showcase slices use these first.
// Photo order for each game: hero.jpg / cover.jpg in its media folder, then the photo below, then Steam's own art.
const GAME_PHOTOS = {
  1174180: "/media/red-dead-redemption-2/rdr2.jpg",
  1091500: "/media/cyberpunk-2077/cyberpunk.jpg",
  2215430: "/media/ghost-of-tsushima/got.jpg",
  1593500: "/media/god-of-war/gow.jpg",
  1222140: "/media/detroit-become-human/detroit.jpg",
  2050650: "/media/resident-evil-4/re4.jpg",
  952060: "/media/resident-evil-3/re3.jpg"
  // 883710: "/media/resident-evil-2/<file>.jpg",    Resident Evil 2
  // 208650: "/media/batman-arkham-knight/<file>.jpg", Batman: Arkham Knight
  // 271590: "/media/grand-theft-auto-v/<file>.jpg", Grand Theft Auto V
  // 2000950: "/media/call-of-duty-modern-warfare/<file>.jpg", Call of Duty: Modern Warfare
};

// Games Steam has no usable art for. These photos show everywhere the game appears
// (library, recently played, wall, insights, tracker). Not a showcase, just a photo.
const CARD_PHOTOS = {
  3513350: "/media/wuthering-waves/wuthering.jpg" // Wuthering Waves
};
