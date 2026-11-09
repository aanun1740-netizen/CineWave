import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173/CineWave-Test-/",
    browserName: "chromium",
    // H.264 (MP4 and our HLS segments) needs a browser with proprietary codecs.
    // Use the same branded Chrome channel locally and in CI; never silently
    // switch between a distribution Chromium and Playwright's headless shell.
    channel: "chrome",
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/CineWave-Test-/",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
