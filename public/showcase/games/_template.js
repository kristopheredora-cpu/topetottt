// Copy this file to games/<slug>.js, fill it in, then add a <script> tag for it in index.html
// (after /showcase/showcase.js). This template itself is not loaded.
registerShowcase(0 /* Steam appid */, {
  title: "Game name",
  folder: "game-slug", // images live in public/media/game-slug/
  // css: "/showcase/themes/game-slug.css", // optional: fully custom look, scope rules to .theme-game-slug
  theme: { accent: "#8b5cf6", accent2: "#c4b5fd", gold: "#f3c969" }, // gold is used for the 100% state
  tagline: "One line that sets the mood.",
  description: "Two or three sentences in your own words.",
  details: [["Developer", ""], ["Publisher", ""], ["PC release", ""], ["Genres", ""]],
  photos: ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg"]
});
