const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("production candidate points only at the existing public production Supabase origin", () => {
  const config = read("config.js");
  assert.match(config, /https:\/\/ysecowknittmmmbixgtu\.supabase\.co/);
  assert.doesNotMatch(config, /zayssiouqexwdicudalc/);
  assert.match(config, /sb_publishable_/);
  assert.doesNotMatch(config, /sb_secret_|service_role/i);
  assert.match(config, /analyticsEnabled: false/);
});
test("Vite is configured for eventual root domain, not staging path", () => {
  const vite = read("vite.config.js");
  assert.match(vite, /base:\s*[\"']\/[\"']/);
  assert.doesNotMatch(vite, /CineWave-Test-/);
});
test("KinoLab frontend and admin remain distinct entries", () => {
  assert.match(read("index.html"), /src\/main\.jsx/);
  assert.match(read("admin/index.html"), /src\/admin-main\.jsx/);
  assert.match(read("src/components/GuestSignupPrompt.jsx"), /KinoLab AI/);
});
