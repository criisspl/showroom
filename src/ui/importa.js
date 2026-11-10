// Importar una copia de seguridad (.armario.json): la usan Ajustes y la bienvenida.
import { app, setPerfil, repinta } from "../state.js";
import { normaliza } from "../lib/analysis.ts";
import { ver } from "./comun.js";

/** Lee el archivo elegido, lo importa y avisa del resultado con `dice(texto)`. */
export async function importaArchivo(input, dice) {
  const file = input.files && input.files[0];
  if (!file) return;
  dice("Importando…");
  try {
    const data = JSON.parse(await file.text());
    await app.store.importa(data);
    const p = await app.store.kget("perfil");
    if (p) {
      setPerfil(normaliza(p, p.respuestas || {}, p.origen || "importado"));
    }
    app.ajustes = { ...app.ajustes, ...((await app.store.kget("ajustes")) || {}) };
    dice("Copia importada.");
    repinta();
    ver(app.perfil ? "hoy" : "bienvenida");
  } catch (e) {
    dice(e.message || "No he podido leer ese archivo.");
  }
  input.value = "";
}
