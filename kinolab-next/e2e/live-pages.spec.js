import { test, expect } from "@playwright/test";
const live = "https://aanun1740-netizen.github.io/CineWave/";

test("publicly deployed KinoLab shows the real catalog and languages", async ({page}, info) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto(live, {waitUntil:"domcontentloaded"});
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/KinoLab/);
  await expect(page.locator("#catalogSection .movie").first()).toBeVisible({timeout:30000});
  await expect.poll(() => page.locator("#catalogSection .movie").count(), {timeout:30000}).toBeGreaterThanOrEqual(47);
  const artwork = page.locator(".poster img[src*='ysecowknittmmmbixgtu.supabase.co/storage/']").first();
  await expect(artwork).toBeVisible();
  await expect.poll(() => artwork.evaluate(el => el.naturalWidth),{timeout:15000}).toBeGreaterThan(0);
  await page.locator("#language").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang","en");
  await page.locator("#language").selectOption("hy");
  await expect(page.locator("html")).toHaveAttribute("lang","hy");
  expect(errors).toEqual([]);
  await page.screenshot({path:info.outputPath("live-storefront.png")});
});

test("publicly deployed admin panel is available but locked until login", async ({page}) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto(live+"admin/",{waitUntil:"domcontentloaded"});
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("button",{name:"Մուտք գործել"})).toBeVisible({timeout:20000});
  expect(errors).toEqual([]);
});
