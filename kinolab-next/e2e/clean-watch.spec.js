import { test, expect } from "@playwright/test";

const player = "https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef";
const title = "KinoLab clean player smoke test";
const playerFrame = `<title>Player fixture</title>
  <button>Expand video</button>
  <script>
    const toggle = document.querySelector("button");
    toggle.onclick = () => document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    document.addEventListener("fullscreenchange", () => {
      toggle.textContent = document.fullscreenElement ? "Shrink video" : "Expand video";
    });
  </script>`;

// A stable fixture exercises the exact site route and iframe request without
// counting test traffic or depending on availability of a third-party film.
test("a clean-mode film opens the player inside KinoLab", async ({ page }) => {
  await page.route("**/rest/v1/rpc/kinolab_record_event", route => route.fulfill({ status: 204 }));
  await page.route("**/rest/v1/rpc/kinolab_movie_rating", route => route.fulfill({
    json: [{ average_stars: null, vote_count: 0, own_stars: null }],
  }));
  await page.route("**/rest/v1/movies?*", route => route.fulfill({ json: [] }));
  await page.route("**/rest/v1/kinolab_external_catalog?*", route => route.fulfill({ json: [{
    id: 123, title_en: title, media_type: "movie", is_published: true,
    release_date: "2026-01-01", genre_names: ["Adventure"], playback_mode: "clean",
    external_watch_url: player, terms_confirmed: true,
  }] }));
  await page.route(player, route => route.fulfill({
    contentType: "text/html", body: playerFrame,
  }));

  await page.goto(process.env.KINOLAB_SMOKE_URL || "/");
  await page.locator('#catalogSection .movie[data-id="catalog:external:123"] .play-overlay').press("Enter");
  const dialog = page.getByRole("dialog", { name: title });
  const watch = dialog.getByRole("button", { name: "Watch movie", exact: true });
  await expect(watch).toBeVisible();
  await expect(page).toHaveURL(/#\/movie\/catalog%3Aexternal%3A123$/);
  expect(await page.evaluate(() => localStorage.getItem("kinolab:guest-films-v1"))).toBeNull();
  await expect(dialog.locator("iframe")).toHaveCount(0);
  await watch.click();
  await expect(page).toHaveURL(/#\/movie\/catalog%3Aexternal%3A123$/);
  const frame = dialog.locator(`iframe[title="${title}"]`);
  await expect(frame).toHaveAttribute("src", player);
  await expect(dialog.locator(".video-wrap").locator(":scope > *")).toHaveCount(1);
  const embedded = frame.contentFrame();
  await embedded.getByRole("button", { name: "Expand video" }).press("Enter");
  await expect(dialog.locator("iframe:fullscreen")).toHaveCount(1);
  await embedded.getByRole("button", { name: "Shrink video" }).press("Enter");
  await expect(dialog.locator("iframe:fullscreen")).toHaveCount(0);
  await expect(embedded.getByRole("button", { name: "Expand video" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("kinolab:guest-films-v1"))))
    .toEqual(["catalog:external:123"]);
});

test("a clean-player series switches episodes and expands the video inside its details", async ({ page }) => {
  const episode2 = "https://rutube.ru/play/embed/123456789abcdef0123456789abcdef0";
  const episode3 = "https://rutube.ru/play/embed/23456789abcdef0123456789abcdef01";
  const series = "KinoLab clean series smoke test";
  await page.route("**/rest/v1/rpc/kinolab_record_event", route => route.fulfill({ status: 204 }));
  await page.route("**/rest/v1/movies?*", route => route.fulfill({ json: [] }));
  await page.route("**/rest/v1/kinolab_external_catalog?*", route => route.fulfill({ json: [{
    id: 124, title_en: series, media_type: "tv", is_published: true,
    release_date: "2026-01-01", genre_names: ["Adventure"], playback_mode: "clean",
    external_watch_url: player, terms_confirmed: true,
    episode_links: [
      { season: 1, episode: 1, url: player },
      { season: 2, episode: 1, url: episode2 },
      { season: 2, episode: 2, url: episode3 },
    ],
  }] }));
  await page.route("https://rutube.ru/play/embed/**", route => route.fulfill({
    contentType: "text/html", body: playerFrame,
  }));

  await page.goto((process.env.KINOLAB_SMOKE_URL || "/") + "#/tv");
  const card = page.locator('#catalogSection .movie[data-id="catalog:external:124"]');
  await card.locator(".movie-title").click();
  const dialog = page.getByRole("dialog", { name: series });
  const frame = dialog.locator("iframe");
  const season = dialog.getByLabel("Season", { exact: true });
  const episode = dialog.getByLabel("Episode", { exact: true });
  await expect(frame).toHaveCount(0);
  await dialog.getByRole("button", { name: "Watch Now", exact: true }).click();
  await expect(page).toHaveURL(/#\/movie\/catalog%3Aexternal%3A124$/);
  await expect(frame).toHaveAttribute("src", player);
  await season.selectOption("2");
  await expect(frame).toHaveAttribute("src", episode2);
  await expect(episode).toHaveValue("1");
  await episode.selectOption("2");
  await expect(frame).toHaveAttribute("src", episode3);
  await expect(dialog.locator(".video-wrap > *")).toHaveCount(1);
  const embedded = frame.contentFrame();
  await embedded.getByRole("button", { name: "Expand video" }).press("Enter");
  await expect(dialog.locator("iframe:fullscreen")).toHaveCount(1);
  await embedded.getByRole("button", { name: "Shrink video" }).press("Enter");
  await expect(dialog.locator("iframe:fullscreen")).toHaveCount(0);
  await expect(frame).toHaveAttribute("src", episode3);

  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).toHaveURL(/#\/tv$/);
  await card.locator(".play-overlay").press("Enter");
  await expect(page).toHaveURL(/#\/movie\/catalog%3Aexternal%3A124$/);
  await expect(frame).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Watch Now", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("kinolab:guest-films-v1"))))
    .toEqual(["catalog:external:124"]);
});
