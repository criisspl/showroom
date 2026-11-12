// Estado compartido de la interfaz.
import { estado, setEstado } from "./lib/engine.ts";
import { construyePaleta } from "./lib/color.ts";

export const app = {
  store: /** @type {import("./lib/store.ts").Store} */ (null), // lo abre main.js al arrancar
  ajustes: { proveedor: "integrada", modelo: "", url: "", clave: "" },
  perfil: /** @type {import("./lib/tipos.ts").Perfil | null} */ (null),
  refs: [], // referencias de gusto guardadas
  D: /** @type {Record<string, import("./lib/store.ts").DeseoGuardado>} */ ({}), // deseos guardados por id (estado de cada prenda deseada)
  ui: {
    wfil: "top",
    wcol: /** @type {Record<string, number>} */ ({}),
    seed: 0,
    last: [],
    preg: {},
    anclas: [], // prendas fijas de «Con estas prendas»
    ideaSeed: 0,
    noIdea: {},
    pendiente:
      /** @type {{ wid?: string | null, dest?: string | number, ancla?: boolean, virtId?: string | null } | null} */ (
        null
      ), // prenda de Hoy que se está añadiendo al armario
    vuelveA: /** @type {string | null} */ (null) // pantalla a la que volver tras guardar una prenda
  },
  pinta: {} // funciones de repintado que registra cada pantalla
};

export function setPerfil(p) {
  app.perfil = p;
  setEstado({ perfil: p, PAL: construyePaleta(p) });
}

export function repinta(...cuales) {
  // Un fallo al pintar una pantalla no deja a las demás sin pintar; se avisa al final
  let error = null;
  (cuales.length ? cuales : Object.keys(app.pinta)).forEach((k) => {
    try {
      if (app.pinta[k]) app.pinta[k]();
    } catch (e) {
      error = error || e;
    }
  });
  if (error) throw error;
}

export { estado };
