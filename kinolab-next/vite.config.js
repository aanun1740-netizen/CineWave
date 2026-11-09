import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    {
      name: "preserve-admin-csp",
      apply: "build",
      transformIndexHtml(html, context) {
        if (!context.filename.endsWith("/admin/index.html")) return html;
        return html.replace(
          "<head>",
          `<head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' https:; img-src 'self' https: blob: data:; media-src 'self' https: blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'">`,
        );
      },
    },
  ],
  build: {
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
