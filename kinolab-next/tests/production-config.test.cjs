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
  assert.match(config, /analyticsEnabled: true/);
});
test("Vite uses relative assets for root domain and GitHub Pages project path", () => {
  const vite = read("vite.config.js");
  assert.ok(vite.includes('base: "./"'));
  assert.doesNotMatch(vite, /CineWave-Test-/);
});
test("KinoLab frontend and admin remain distinct entries", () => {
  assert.match(read("index.html"), /src\/main\.jsx/);
  assert.match(read("admin/index.html"), /src\/admin-main\.jsx/);
  assert.match(read("src/components/GuestSignupPrompt.jsx"), /KinoLab AI/);
});

test("published root and admin HTML never reference missing local assets", () => {
  const siteRoot = path.resolve(root, "..");
  for (const documentPath of ["index.html", "admin/index.html"]) {
    const html = fs.readFileSync(path.join(siteRoot, documentPath), "utf8");
    const links = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
      .filter(ref => /^(?:\.\.\/|\.\/|\/)assets\//.test(ref));
    assert.ok(links.length >= 4, documentPath + " must reference a compiled build");
    for (const ref of links) {
      const publicUrl = new URL(ref, "https://kinolabmovies.com/" + documentPath);
      const localAsset = path.join(siteRoot, decodeURIComponent(publicUrl.pathname).replace(/^\//, ""));
      assert.ok(fs.existsSync(localAsset), documentPath + " references missing file: " + ref);
      assert.ok(fs.statSync(localAsset).size > 100, "Empty published asset: " + ref);
    }
  }
});
