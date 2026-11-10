import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Pone en dist/sw.js el identificador del build (hash de los nombres de los ficheros, que ya llevan hash
// de su contenido): cada versión tiene su propia caché y el service worker borra las de versiones anteriores.
function versionaSw() {
  let id = "";
  let salida = "dist";
  return {
    name: "versiona-sw",
    apply: "build",
    configResolved(c) {
      salida = join(c.root, c.build.outDir);
    },
    generateBundle(_, bundle) {
      id = createHash("sha256").update(Object.keys(bundle).sort().join("\n")).digest("hex").slice(0, 10);
    },
    closeBundle() {
      const ruta = join(salida, "sw.js");
      writeFileSync(ruta, readFileSync(ruta, "utf8").replaceAll("__BUILD_ID__", id));
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [svelte(), versionaSw()],
  build: {
    // Navegadores de los últimos ~4 años: iPhone con iOS 15+, Android con Chrome 90+, Firefox 90+, Edge 90+
    target: ["es2020", "safari15", "chrome90", "firefox94", "edge90"]
  },
  // En desarrollo, /api va al servidor local de Cloudflare (npm run dev:api)
  server: { proxy: { "/api": "http://localhost:8787" } },
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "worker/**/*.ts"],
      thresholds: { lines: 93, statements: 90, functions: 89, branches: 79 }
    }
  }
});
