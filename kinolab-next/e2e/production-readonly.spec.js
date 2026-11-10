import { test, expect } from "@playwright/test";

// Live-read-only preflight: built candidate served by local Vite preview.
// GitHub Pages production and Supabase database records are never modified.
const prodOrigin = "https://ysecowknittmmmbixgtu.supabase.co";
test.setTimeout(60_000);

test("production catalog, real posters, language selection and responsive layout", async ({page, request}, info) => {
  const pageErrors = [];
  const unexpectedWrites = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (req) => {
    if (req.url().startsWith(prodOrigin + "/") &&
        !["GET", "HEAD", "OPTIONS"].includes(req.method())) {
      unexpectedWrites.push({method: req.method(), path: new URL(req.url()).pathname});
    }
  });

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const cards = page.locator("#catalogSection .movie");
  await expect(cards.first()).toBeVisible({timeout: 30_000});
  await expect.poll(() => cards.count(), {timeout: 15_000}).toBeGreaterThanOrEqual(47);
  await expect(page.locator("#heroTitle")).not.toBeEmpty();

  // The 47 external-title posters must resolve from the production bucket.
  const posters = page.locator("#catalogSection .movie img[src*='ysecowknittmmmbixgtu.supabase.co/storage/']");
  await expect.poll(() => posters.count()).toBeGreaterThanOrEqual(47);
  const url = await posters.first().getAttribute("src");
  expect(url).toMatch(/^https:\/\/ysecowknittmmmbixgtu\.supabase\.co\/storage\/v1\/object\/public\/cinewave-assets\//);
  const image = await request.get(url);
  expect(image.ok(), "Production Supabase poster is publicly readable").toBe(true);
  expect(image.headers()["content-type"]).toMatch(/^image\//);

  await page.locator("#language").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.locator("#language").selectOption("ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(pageErrors).toEqual([]);
  expect(unexpectedWrites).toEqual([]);
  await page.screenshot({path: info.outputPath("kinolab-catalog.png"), fullPage: true});
});

test("SEO sitemap lists individual crawlable film pages with canonical metadata", async ({page, request}) => {
  const mapResponse = await request.get("/sitemap.xml");
  expect(mapResponse.status()).toBe(200);
  const xml = await mapResponse.text();
  const filmUrls = [...xml.matchAll(/<loc>(https:\/\/kinolabmovies\.com\/film\/(\d+)\/)\<\/loc\>/g)];
  expect(filmUrls.length, "Every public film should have an indexable URL").toBeGreaterThanOrEqual(1);
  const [url, id] = [filmUrls[0][1], filmUrls[0][2]];
  const response = await page.goto("/film/" + id + "/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/KinoLab/);
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", url);
  await expect(page.locator("h1")).not.toBeEmpty();
  await expect(page.locator("script[type='application/ld+json']")).toHaveCount(1);
  await expect(page.getByRole("link", {name:"View film in KinoLab"}))
    .toHaveAttribute("href", "/#/movie/catalog%3Aexternal%3A" + id);
});

test("production admin entry stays protected and works at root/admin", async ({page}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/admin/");
  await expect(page.getByRole("button", {name: "Sign in securely"})).toBeVisible({timeout: 20_000});
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.getByRole("button", {name: "Sign in securely"})).toBeVisible({timeout: 20_000});
  expect(errors).toEqual([]);
});

test("KinoLab AI v2 requires a real signed-in session before any provider request", async ({ request }) => {
  // No Authorization header: this request cannot reach the AI provider or consume quotas.
  const response = await request.post(`${prodOrigin}/functions/v1/kinolab-ai-v2`, {
    headers: {
      Origin: "https://kinolabmovies.com",
      apikey: "sb_publishable_aTNkxAKz9OG-JJVO2X48Rw_9vnE_8Mj",
      "Content-Type": "application/json",
    },
    data: { message: "Security preflight: deny unauthenticated requests" },
  });
  expect(response.status(), "AI must reject unsigned user requests").toBe(401);
  const payload = await response.json();
  expect(payload.error).toBe("sign_in_required");
});
