import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    // Navegadores de los últimos ~4 años: iPhone con iOS 15+, Android con Chrome 90+, Firefox 90+, Edge 90+
    target: ["es2020", "safari15", "chrome90", "firefox94", "edge90"]
  },
  // En desarrollo, /api va al servidor local de Cloudflare (npm run dev:api)
  server: { proxy: { "/api": "http://localhost:8787" } }
});
