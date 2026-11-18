import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    legacy({
      // Smart TV browsers often predate native ES modules.
      targets: ["chrome >= 49", "safari >= 10", "firefox >= 52"],
      modernTargets: ["chrome >= 107", "edge >= 107", "firefox >= 104", "safari >= 16"],
      modernPolyfills: true,
    }),
    {
      name: "preserve-admin-csp",
      apply: "build",
      async closeBundle() {
        const path = fileURLToPath(new URL("./dist/admin/index.html", import.meta.url));
        const html = await readFile(path, "utf8");
        const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
          .map((match) => match[1])
          .filter((script) => script.trim())
          .map((script) => "'sha256-" + createHash("sha256").update(script).digest("base64") + "'");
        const policy = "default-src 'self'; script-src 'self' " + hashes.join(" ") +
          "; style-src 'self'; connect-src 'self' https:; img-src 'self' https: blob: data:; " +
          "media-src 'self' https: blob:; worker-src 'self' blob:; object-src 'none'; " +
          "base-uri 'self'; form-action 'self'";
        const updated = html.replace("<head>",
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}">`);
        await writeFile(path, updated);
      },
    },
  ],
  build: {
    cssTarget: "chrome49",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
          hls: ["hls.js/dist/hls.light.mjs"],
        },
      },
      input: {
        storefront: fileURLToPath(new URL("./index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin/index.html", import.meta.url)),
      },
    },
  },
  test: {
    env: { BASE_URL: "/" },
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: ["./src/test-setup.js"],
    restoreMocks: true,
  },
});
