// Cliente de IA. Por defecto usa la IA integrada de la web (/api/ia, ver worker/), que no
// necesita clave. Opcionalmente, cada persona puede usar su propia clave de cualquier proveedor
// compatible con la API de OpenAI (chat/completions); esa clave se guarda solo en su navegador.

import { creaIntegrada } from "./ia/integrada.ts";
import { creaOpenAICompatible } from "./ia/openai-compatible.ts";
import type { Pregunta, ProveedorIA } from "./ia/proveedor.ts";
import { SUGERENCIAS } from "./ia/sugerencias.ts";
import type { Crudo } from "./tipos.ts";

export type { Pregunta, ProveedorIA } from "./ia/proveedor.ts";

/** Ajustes de IA de la persona (se guardan solo en su navegador). */
export interface Ajustes {
  proveedor?: string;
  modelo?: string;
  url?: string;
  clave?: string;
  /** Hay una clave cifrada que aún no se ha desbloqueado con la contraseña (solo en memoria). */
  bloqueada?: boolean;
}

export function config(ajustes: Ajustes | null | undefined) {
  let id = (ajustes && ajustes.proveedor) || "integrada";
  // Sin clave propia, siempre la integrada (una clave bloqueada cuenta como propia: no se cambia de destino en silencio)
  if (
    !SUGERENCIAS[id] ||
    (SUGERENCIAS[id].tipo !== "integrada" && !(ajustes && (ajustes.clave || ajustes.bloqueada)))
  )
    id = "integrada";
  const p = SUGERENCIAS[id];
  if (p.tipo === "integrada")
    return { id, url: p.url, modelo: "", clave: "", imagen: p.imagen, sinClave: true };
  return {
    id,
    url: (ajustes && ajustes.url) || p.url,
    modelo: (ajustes && ajustes.modelo) || p.modelo,
    clave: (ajustes && ajustes.clave) || "",
    imagen: p.imagen
  };
}
export const hayIA = (ajustes: Ajustes | null | undefined) => !!config(ajustes).url;

/** Adaptador que toca con estos ajustes. */
export function proveedorDe(ajustes: Ajustes | null | undefined): ProveedorIA {
  const cfg = config(ajustes);
  return SUGERENCIAS[cfg.id].tipo === "integrada" ? creaIntegrada() : creaOpenAICompatible(cfg);
}

/** Reduce una imagen (Blob o File) a JPEG de como mucho `max` px y la devuelve como data URL. */
export async function imagenParaIA(blob: Blob, max = 1024): Promise<string> {
  const img = await abreImagen(blob);
  const w = ("naturalWidth" in img && img.naturalWidth) || img.width,
    h = ("naturalHeight" in img && img.naturalHeight) || img.height;
  const r = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * r));
  c.height = Math.max(1, Math.round(h * r));
  c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
  if ("close" in img) img.close();
  return c.toDataURL("image/jpeg", 0.85);
}

/** Abre una foto respetando la orientación EXIF. Usa <img> como respaldo (Safari antiguo). */
export async function abreImagen(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch (e) {
      /* probamos con <img> */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await (img.decode
      ? img.decode()
      : new Promise((ok, ko) => {
          img.onload = ok;
          img.onerror = ko;
        }));
    return img;
  } catch (e) {
    throw new Error(
      "No he podido abrir esa foto. Prueba con una en JPG o PNG (en iPhone: Ajustes → Cámara → Formatos → Más compatible).",
      { cause: e }
    );
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Llama al modelo con el proveedor que tocan los ajustes. `imagenes` son data URLs.
 * Devuelve el texto de la respuesta. Lanza Error con un mensaje en español si algo falla.
 */
export function pregunta(ajustes: Ajustes | null | undefined, p: Pregunta): Promise<string> {
  if (ajustes?.bloqueada && !ajustes.clave)
    return Promise.reject(
      new Error("Tu clave de IA está bloqueada. Desbloquéala con tu contraseña en Ajustes.")
    );
  return proveedorDe(ajustes).pregunta(p);
}

/** Extrae el primer objeto JSON de un texto (quita ``` y texto alrededor). */
export function sacaJSON(t: unknown): Crudo {
  const s = String(t).replace(/```(?:json)?/gi, "");
  const a = s.indexOf("{"),
    b = s.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("La IA no ha devuelto datos con el formato esperado.");
  return JSON.parse(s.slice(a, b + 1));
}

export async function preguntaJSON(ajustes: Ajustes | null | undefined, opts: Pregunta): Promise<Crudo> {
  const t = await pregunta(ajustes, opts);
  try {
    return sacaJSON(t);
  } catch (e) {
    // Un segundo intento pidiendo solo JSON
    const t2 = await pregunta(ajustes, {
      ...opts,
      texto:
        opts.texto +
        "\n\nIMPORTANTE: responde únicamente con un objeto JSON válido, sin texto antes ni después."
    });
    return sacaJSON(t2);
  }
}
