// Lógica de la pantalla Ajustes (sin DOM): qué campos enseña cada proveedor y cómo se guardan.
import { config } from "./ai.ts";
import { SUGERENCIAS } from "./ia/sugerencias.ts";
import type { Ajustes } from "./ai.ts";

/** Lo que cambia en el formulario según el proveedor elegido. */
export interface VistaProveedor {
  nota: string;
  placeholderModelo: string;
  placeholderUrl: string;
  /** Modelo, URL y clave propios: no se enseñan con la IA de la app. */
  propia: boolean;
  /** Solo el proveedor «otro» pide la URL de la API. */
  pideUrl: boolean;
  /** Dónde sacar la clave (vacío si no hace falta). */
  enlaceClave: string;
}

/** Campos editables del formulario. */
export interface Campos {
  proveedor: string;
  modelo: string;
  url: string;
  clave: string;
}

/** Proveedores para el desplegable: id y nombre. */
export const opcionesProveedor = (): { id: string; n: string }[] =>
  Object.entries(SUGERENCIAS).map(([id, p]) => ({ id, n: p.n }));

export function vistaProveedor(id: string): VistaProveedor {
  const p = SUGERENCIAS[id];
  return {
    nota: p.nota,
    placeholderModelo: p.modelo || "nombre-del-modelo",
    placeholderUrl: p.url || "https://…/v1/chat/completions",
    propia: p.tipo !== "integrada",
    pideUrl: id === "otro",
    enlaceClave: p.clave
  };
}

/** Valores de los campos tal como están guardados. */
export function camposDeAjustes(a: Ajustes): Campos {
  return { proveedor: config(a).id, modelo: a.modelo || "", url: a.url || "", clave: a.clave || "" };
}

/** Ajustes a guardar a partir de lo escrito: recorta espacios y solo «otro» conserva la URL. */
export function ajustesDeCampos(c: Campos): Required<Ajustes> {
  return {
    proveedor: c.proveedor,
    modelo: c.modelo.trim(),
    url: c.proveedor === "otro" ? c.url.trim() : "",
    clave: c.clave.trim()
  };
}

/** Mensaje tras guardar: sin clave propia se usa la IA de la app. */
export const mensajeGuardado = (a: Ajustes): string =>
  a.proveedor !== "integrada" && !a.clave ? "Sin clave se usa la IA de la app." : "Guardado.";

/** Mensaje tras probar la conexión con éxito. */
export function mensajeConexion(a: Ajustes): string {
  const cfg = config(a);
  return "Conexión correcta" + (cfg.modelo ? " con " + cfg.modelo : "") + ".";
}

/** Nombre del archivo de la copia de seguridad. */
export const nombreCopia = (hoy: Date = new Date()): string =>
  "copia-" + hoy.toISOString().slice(0, 10) + ".armario.json";
