import { defineConfig } from "vite";

// base relativo para que funcione en GitHub Pages (usuario.github.io/nombre-del-repo/)
export default defineConfig({
  base: "./",
  build: { target: "es2020" }
});
