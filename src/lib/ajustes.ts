// Lógica de la pantalla Ajustes y de la configuración inicial (sin DOM): qué campos enseña cada proveedor y cómo se guardan.
import { config } from "./ai.ts";
import { errorContrasena } from "./claveia.ts";
import { ALMACENES, errorConfig, iaDeProveedor } from "./config.ts";
import type { Config, TipoAlmacen } from "./config.ts";
import { SUGERENCIAS } from "./ia/sugerencias.ts";
import type { Ajustes } from "./ai.ts";

/** Lo que cambia en el formulario según el proveedor elegido. */
export interface VistaProveedor {
  nota: string;
  placeholderModelo: string;
  placeholderUrl: string;
  /** Modelo, URL y clave propios: no se enseñan con la IA de la app. */
  propia: boolean;
  /** Cualquier proveedor con clave propia deja editar la URL de la API (siempre https). */
  pideUrl: boolean;
  /** Dónde sacar la clave (vacío si no hace falta). */
  enlaceClave: string;
}

/** Campos editables del formulario. */
export interface Campos {
  almacen: TipoAlmacen;
  proveedor: string;
  modelo: string;
  url: string;
  /** Clave nueva escrita (nunca se rellena con la guardada). */
  clave: string;
  /** Contraseña que protege la clave: para cifrarla o desbloquearla. */
  contrasena: string;
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
    pideUrl: p.tipo !== "integrada",
    enlaceClave: p.clave
  };
}

/** Almacenamientos para el desplegable: id y nombre. */
export const opcionesAlmacen = (): { id: TipoAlmacen; n: string }[] =>
  (Object.keys(ALMACENES) as TipoAlmacen[]).map((id) => ({ id, n: ALMACENES[id].n }));

/** Estado de la clave de IA: decide qué campos enseña el formulario. */
export type EstadoClave = "ninguna" | "sin-cifrar" | "bloqueada" | "desbloqueada";

export function estadoClave(a: Ajustes, cifrada: boolean): EstadoClave {
  if (cifrada) return a.bloqueada ? "bloqueada" : "desbloqueada";
  return a.clave ? "sin-cifrar" : "ninguna";
}

/** Valores de los campos tal como están guardados (la clave nunca vuelve al formulario). */
export function camposDeConfig(c: Config): Campos {
  return {
    almacen: c.almacenamiento.tipo,
    proveedor: c.ia.proveedor,
    modelo: c.ia.modelo,
    url: c.ia.tipo === "integrada" ? "" : c.ia.url,
    clave: "",
    contrasena: ""
  };
}

/** Al elegir otro proveedor se rellenan modelo y URL con sus datos de partida, editables. */
export function alElegirProveedor(id: string): Pick<Campos, "proveedor" | "modelo" | "url"> {
  const ia = iaDeProveedor(id);
  return { proveedor: ia.proveedor, modelo: ia.modelo, url: ia.tipo === "integrada" ? "" : ia.url };
}

/** Configuración a guardar a partir de lo escrito: recorta espacios; la IA de la app no lleva URL propia. */
export function configDeCampos(c: Campos): Config {
  const ia = iaDeProveedor(c.proveedor);
  return {
    version: 1,
    almacenamiento: { tipo: c.almacen },
    ia:
      ia.tipo === "integrada"
        ? ia
        : { ...ia, url: c.url.trim() || ia.url, modelo: c.modelo.trim() || ia.modelo }
  };
}

/**
 * Mensaje si no se puede guardar, o "". `clave` es la que se va a cifrar (la escrita o la antigua en claro)
 * y exige contraseña; sin clave nueva, solo se pide contraseña si ya hay una cifrada que cambiar.
 */
export function errorCampos(c: Campos, claveACifrar: string): string {
  const e = errorConfig(configDeCampos(c));
  if (e) return e;
  return claveACifrar ? errorContrasena(c.contrasena) : "";
}

/** Mensaje tras guardar: sin clave propia se usa la IA de la app. */
export const mensajeGuardado = (a: Ajustes): string =>
  a.proveedor !== "integrada" && !a.clave && !a.bloqueada ? "Sin clave se usa la IA de la app." : "Guardado.";

/** Mensaje tras probar la conexión con éxito. */
export function mensajeConexion(a: Ajustes): string {
  const cfg = config(a);
  return "Conexión correcta" + (cfg.modelo ? " con " + cfg.modelo : "") + ".";
}

/** Nombre del archivo de la copia de seguridad. */
export const nombreCopia = (hoy: Date = new Date()): string =>
  "copia-" + hoy.toISOString().slice(0, 10) + ".armario.json";
