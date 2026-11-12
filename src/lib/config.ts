// Configuración de cada persona: dónde se guardan sus datos y qué IA usa. El instalador solo sugiere
// un valor de partida (`sugerida()`); la persona puede elegir otro. Se guarda en el kv 'config' de
// IndexedDB local (es el arranque: ahí se lee antes de saber qué almacenamiento toca).
// La clave de la IA nunca va aquí: está cifrada aparte (claveia.ts).

import type { Ajustes } from "./ai.ts";
import type { Almacen } from "./almacen.ts";
import { URL_INTEGRADA } from "./ia/integrada.ts";
import type { TipoProveedor } from "./ia/proveedor.ts";
import { SUGERENCIAS } from "./ia/sugerencias.ts";
import { esUrlHttps } from "./url.ts";

export { esUrlHttps };

/** Adaptadores de almacenamiento que existen (hoy solo IndexedDB local; la nube vendrá después). */
export type TipoAlmacen = "indexeddb";

export const ALMACENES: Record<TipoAlmacen, { n: string; nota: string }> = {
  indexeddb: {
    n: "En este dispositivo (IndexedDB)",
    nota: "Tus datos se quedan en este navegador. Haz copias de vez en cuando."
  }
};

export interface ConfigAlmacenamiento {
  tipo: TipoAlmacen;
}

export interface ConfigIA {
  tipo: TipoProveedor;
  /** Id de la sugerencia elegida (decide el formato de imágenes); la URL y el modelo se pueden editar. */
  proveedor: string;
  url: string;
  modelo: string;
}

export interface Config {
  version: 1;
  almacenamiento: ConfigAlmacenamiento;
  ia: ConfigIA;
}

export const CLAVE_CONFIG = "config";

/** Datos de partida de un proveedor de las sugerencias (editables después). */
export function iaDeProveedor(id: string): ConfigIA {
  const s = SUGERENCIAS[id] ?? SUGERENCIAS.integrada;
  const proveedor = SUGERENCIAS[id] ? id : "integrada";
  return { tipo: s.tipo, proveedor, url: s.url, modelo: s.modelo };
}

/** Lo que sugiere la app: datos en este dispositivo e IA integrada. */
export function sugerida(): Config {
  return { version: 1, almacenamiento: { tipo: "indexeddb" }, ia: iaDeProveedor("integrada") };
}

/** Mensaje si la configuración no se puede usar, o "" si está bien. */
export function errorConfig(c: Config): string {
  if (!ALMACENES[c.almacenamiento.tipo]) return "Ese tipo de almacenamiento no existe.";
  if (c.ia.tipo === "integrada") return "";
  if (!c.ia.url.trim()) return "Falta la URL de la API de la IA.";
  if (!esUrlHttps(c.ia.url)) return "La URL de la IA tiene que empezar por https://";
  return "";
}

const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const objeto = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Lee lo guardado con tolerancia: lo que no vale (tipo desconocido, URL no https) vuelve a lo sugerido. */
export function normalizaConfig(x: unknown): Config {
  const o = objeto(x);
  const tipoAlm = objeto(o.almacenamiento).tipo;
  const almacenamiento: ConfigAlmacenamiento = {
    tipo: typeof tipoAlm === "string" && tipoAlm in ALMACENES ? (tipoAlm as TipoAlmacen) : "indexeddb"
  };
  const ia = objeto(o.ia);
  const id = texto(ia.proveedor);
  const base = iaDeProveedor(id);
  if (base.tipo === "integrada") return { version: 1, almacenamiento, ia: base };
  const url = texto(ia.url);
  return {
    version: 1,
    almacenamiento,
    ia: { ...base, url: esUrlHttps(url) ? url : base.url, modelo: texto(ia.modelo) || base.modelo }
  };
}

/** Migración: quien ya usaba la app conserva su proveedor, modelo y URL (kv 'ajustes'). */
export function configDeAjustes(a: Ajustes | null | undefined): Config {
  const id = a?.proveedor && SUGERENCIAS[a.proveedor] ? a.proveedor : "integrada";
  const base = iaDeProveedor(id);
  if (base.tipo === "integrada") return sugerida();
  return normalizaConfig({
    almacenamiento: { tipo: "indexeddb" },
    ia: { proveedor: id, url: a?.url || base.url, modelo: a?.modelo || base.modelo }
  });
}

/** Ajustes de IA en el formato que usa el resto de la app (`ai.ts`); la clave llega aparte. */
export function ajustesDeConfig(c: Config, extra: { clave?: string; bloqueada?: boolean } = {}): Ajustes {
  return {
    proveedor: c.ia.proveedor,
    modelo: c.ia.modelo,
    url: c.ia.tipo === "integrada" ? URL_INTEGRADA : c.ia.url,
    clave: extra.clave ?? "",
    ...(extra.bloqueada ? { bloqueada: true } : {})
  };
}

type Kv = Pick<Almacen, "kget" | "kset">;

export async function guardaConfig(kv: Kv, c: Config): Promise<void> {
  await kv.kset(CLAVE_CONFIG, c);
}

/**
 * Carga la configuración. `elegida` es false solo en una instalación nueva (sin config, perfil ni ajustes):
 * ahí la app enseña la pantalla de configuración inicial. Quien ya usaba la app se migra sin pasos.
 */
export async function cargaConfig(kv: Kv): Promise<{ config: Config; elegida: boolean }> {
  const guardada = await kv.kget(CLAVE_CONFIG);
  if (guardada != null) return { config: normalizaConfig(guardada), elegida: true };
  const [perfil, ajustes] = await Promise.all([kv.kget("perfil"), kv.kget<Ajustes>("ajustes")]);
  if (perfil == null && ajustes == null) return { config: sugerida(), elegida: false };
  const config = configDeAjustes(ajustes);
  await guardaConfig(kv, config);
  return { config, elegida: true };
}
