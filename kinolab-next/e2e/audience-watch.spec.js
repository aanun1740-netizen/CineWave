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
  const externalCards = cards.filter({ has: page.locator(".poster-badge.external") });
  const ids = await externalCards.evaluateAll(nodes =>
    [...new Set(nodes.map(node => node.dataset.id))].slice(0, 6)
  );
  expect(ids).toHaveLength(6);
  const openCard = (id) =>
    cards.and(page.locator(`[data-id="${id}"]`)).locator("button.play-overlay").press("Enter");
  const detail = page.locator(".modal[role='dialog']");
  const watchLink = detail.locator(".movielab-external-watch a");
  const count = () => page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinolab:guest-films-v1") || "[]").length);
  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      if (event.target.closest(".movielab-external-watch a")) event.preventDefault();
    }, true);
  });
  for (let i = 0; i < 5; i++) {
    await openCard(ids[i]);
    await expect(detail).toBeVisible();
    await expect(watchLink).toHaveAttribute("href", /^https:\/\//);
    await expect(watchLink).toHaveAttribute("target", "_blank");
    await expect(watchLink).toHaveAttribute("rel", /noopener noreferrer/);
    expect(await count()).toBe(i);
    await watchLink.click();
    await expect.poll(count).toBe(i + 1);
    await detail.getByRole("button", { name: "Close", exact: true }).click();
  }
  await openCard(ids[5]);
  await detail.locator(".movielab-external-watch button").click();
  const gate = page.getByRole("dialog", { name: /Keep watching on KinoLab/ });
  await expect(gate).toBeVisible();
  await expect(gate.getByRole("button", { name: "Create a free account" })).toBeVisible();
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinolab:guest-films-v1") || "[]")
  )).toHaveLength(5);

  // Previously opened films must remain selectable for the same guest.
  await gate.getByRole("button", { name: "Keep browsing the catalog" }).click();
  await openCard(ids[0]);
  await watchLink.click();
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
  const first = page.locator("#catalogSection .movie").filter({
    has: page.locator(".poster-badge.external"),
  }).first();
  await expect(first).toBeVisible({ timeout: 30_000 });
  await first.locator("button.play-overlay").press("Enter");
  const detail = page.locator(".modal[role='dialog']");
  await expect(detail).toBeVisible();
  const watchLink = detail.locator(".movielab-external-watch a");
  await expect(watchLink).toHaveAttribute("target", "_blank");
  await expect(watchLink).toHaveAttribute("rel", /noopener/);
  expect(new URL(await watchLink.getAttribute("href")).protocol).toBe("https:");
  await expect(detail.locator("iframe")).toHaveCount(0);
  expect(errors).toEqual([]);
});
