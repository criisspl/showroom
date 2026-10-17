// Estado compartido de la interfaz.
import { estado, setEstado } from "./lib/engine.js";
import { construyePaleta } from "./lib/color.js";

export const app = {
  store: null,
  ajustes: { proveedor: "integrada", modelo: "", url: "", clave: "" },
  perfil: null,
  D: {},                // deseos guardados por id (estado de cada prenda deseada)
  ui: { filter: "todo", wfil: "top", wcol: {}, seed: 0, last: [], preg: {}, editing: null, photo: null, prefoto: null, modo: null },
  pinta: {}             // funciones de repintado que registra cada pantalla
};

export function setPerfil(p) {
  app.perfil = p;
  setEstado({ perfil: p, PAL: construyePaleta(p) });
}

export function repinta(...cuales) {
  // Un fallo al pintar una pantalla no deja a las demás sin pintar; se avisa al final
  let error = null;
  (cuales.length ? cuales : Object.keys(app.pinta)).forEach((k) => { try { if (app.pinta[k]) app.pinta[k](); } catch (e) { error = error || e; } });
  if (error) throw error;
}

export { estado };
