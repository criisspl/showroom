import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// public/_headers es lo que sirve Cloudflare; el preview (y los e2e) usan las mismas cabeceras.
const cabeceras = Object.fromEntries(
  readFileSync("public/_headers", "utf8")
    .split("\n")
    .filter((l) => /^\s+[\w-]+:/.test(l))
    .map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

export default defineConfig({
  base: "./",
  plugins: [svelte()],
  build: {
    // Navegadores de los últimos ~4 años: iPhone con iOS 15+, Android con Chrome 90+, Firefox 90+, Edge 90+
    target: ["es2020", "safari15", "chrome90", "firefox94", "edge90"]
  },
  // En desarrollo, /api va al servidor local de Cloudflare (npm run dev:api)
  server: { proxy: { "/api": "http://localhost:8787" } },
  preview: { headers: cabeceras },
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "worker/**/*.ts"],
      thresholds: { lines: 82 }
    }
  }
});
