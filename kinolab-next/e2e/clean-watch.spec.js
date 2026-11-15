import { test, expect } from "@playwright/test";

const player = "https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef";
const title = "KinoLab clean player smoke test";

// A stable fixture exercises the exact site route and iframe request without
// counting test traffic or depending on availability of a third-party film.
test("a clean-mode film opens the player inside KinoLab", async ({ page }) => {
  await page.route("**/rest/v1/rpc/kinolab_record_event", route => route.fulfill({ status: 204 }));
  await page.route("**/rest/v1/movies?*", route => route.fulfill({ json: [] }));
  await page.route("**/rest/v1/kinolab_external_catalog?*", route => route.fulfill({ json: [{
    id: 123, title_en: title, media_type: "movie", is_published: true,
    release_date: "2026-01-01", genre_names: ["Adventure"], playback_mode: "clean",
    external_watch_url: player, terms_confirmed: true,
  }] }));
  await page.route(player, route => route.fulfill({
    contentType: "text/html", body: "<title>Player fixture</title><p>Loaded player frame</p>",
  }));

  await page.goto(process.env.KINOLAB_SMOKE_URL || "/");
  await page.locator('#catalogSection .movie[data-id="catalog:external:123"] .movie-title').click();
  const watch = page.getByRole("button", { name: "Watch movie", exact: true });
  await expect(watch).toBeVisible();
  await watch.click();
  await expect(page).toHaveURL(/#\/play\/catalog%3Aexternal%3A123$/);
  await expect(page).toHaveTitle(title);
  const frame = page.locator(`iframe[title="\${title}"]`);
  await expect(frame).toHaveAttribute("src", player);
  await expect(frame.contentFrame().getByText("Loaded player frame")).toBeVisible();
});
