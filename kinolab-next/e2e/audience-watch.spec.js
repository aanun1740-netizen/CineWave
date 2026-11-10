import { test, expect } from "@playwright/test";

// Real public KinoLab smoke test. NEVER load/watch the linked third-party media.
// The capture listener cancels native link navigation while still exercising
// KinoLab's own React click handler and guest allowance bookkeeping.
const site = "https://kinolabmovies.com/";

test("a first-time guest can select 5 distinct films, then gets a sign-up prompt on the sixth", async ({ page }, info) => {
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (req) => {
    if (!req.url().startsWith(site) && !req.url().includes("ysecowknittmmmbixgtu.supabase.co")
        && !req.url().startsWith("data:")) externalRequests.push(req.url());
  });

  const response = await page.goto(site);
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/KinoLab/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const cards = page.locator("#catalogSection .movie");
  await expect.poll(() => cards.count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(48);
  const entries = await cards.evaluateAll((nodes) =>
    nodes.map((node) => {
      const link = node.querySelector("a.play-overlay");
      return link ? {
        id: node.dataset.id,
        href: link.getAttribute("href"),
        target: link.getAttribute("target"),
        rel: link.getAttribute("rel"),
      } : null;
    }).filter(Boolean),
  );
  expect(entries.length).toBeGreaterThanOrEqual(6);
  const distinct = [...new Map(entries.map((entry) => [entry.id, entry])).values()].slice(0, 6);
  expect(distinct).toHaveLength(6);
  for (const film of distinct) {
    expect(film.href).toMatch(/^https:\/\//);
    expect(new URL(film.href).host).toBeTruthy();
    expect(film.target).toBe("_blank");
    expect(film.rel).toContain("noopener");
    expect(film.rel).toContain("noreferrer");
  }

  // Safely prevent browser default navigation, retaining the application's
  // onClick handler for the guest gate. No external video site is visited.
  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      if (event.target.closest("a.play-overlay")) event.preventDefault();
    }, true);
  });
  for (let i = 0; i < 5; i++) {
    await page.locator(`#catalogSection .movie[data-id="${distinct[i].id}"] a.play-overlay`).click();
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(localStorage.getItem("kinolab:guest-films-v1") || "[]").length
    )).toBe(i + 1);
  }
  const sixthCard = page.locator(`#catalogSection .movie[data-id="${distinct[5].id}"]`);
  await expect(sixthCard.locator("a.play-overlay")).toHaveCount(0);
  await sixthCard.locator("button.play-overlay").click();
  const gate = page.getByRole("dialog", { name: /Keep watching on KinoLab/ });
  await expect(gate).toBeVisible();
  await expect(gate.getByRole("button", { name: "Create a free account" })).toBeVisible();
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinolab:guest-films-v1") || "[]")
  )).toHaveLength(5);

  // Previously opened films must remain selectable for the same guest.
  await gate.getByRole("button", { name: "Keep browsing the catalog" }).click();
  await page.locator(`#catalogSection .movie[data-id="${distinct[0].id}"] a.play-overlay`).click();
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinolab:guest-films-v1") || "[]")
  )).toHaveLength(5);
  expect(errors).toEqual([]);
  // Third-party destinations are intentionally not loaded or guaranteed here.
  await page.screenshot({ path: info.outputPath("audience-guest-watch.png"), fullPage: false });
});

test("public film detail clearly opens its authorized external destination in a new tab", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(site);
  const first = page.locator("#catalogSection .movie").first();
  await expect(first).toBeVisible({ timeout: 30_000 });
  await first.locator(".movie-title").click();
  const detail = page.locator(".modal[role='dialog']");
  await expect(detail).toBeVisible();
  const watchLink = detail.locator(".movielab-external-watch a");
  await expect(watchLink).toHaveAttribute("target", "_blank");
  await expect(watchLink).toHaveAttribute("rel", /noopener/);
  expect(new URL(await watchLink.getAttribute("href")).protocol).toBe("https:");
  await expect(detail.locator("iframe")).toHaveCount(0);
  expect(errors).toEqual([]);
});
