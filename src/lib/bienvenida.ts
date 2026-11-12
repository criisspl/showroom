// Lógica de la pantalla Bienvenida (sin DOM): pasos del marcado del selfie, color de una zona, preguntas y avisos.
import { ESTACIONES, CUERPOS } from "../data/presets.ts";
import type { PreguntaAnalisis } from "./analysis.ts";
import type { Muestras } from "./local.ts";

/** Paso del marcado de colores sobre el selfie. */
export interface Paso {
  id: keyof Muestras;
  t: string;
  /** Radio de la zona medida, como fracción del lado menor de la foto. */
  r: number;
  n: string;
  opc?: boolean;
}

/** Foto extra para el análisis con IA. */
export interface FotoIA {
  id: string;
  t: string;
}

/** Zona circular de la foto de la que se saca un color (en píxeles). */
export interface Zona {
  x0: number;
  y0: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  rad: number;
}

export const FOTOS_IA: FotoIA[] = [
  { id: "cuerpo", t: "Cuerpo entero (opcional)" },
  { id: "insp1", t: "Inspiración 1 (opcional)" },
  { id: "insp2", t: "Inspiración 2 (opcional)" },
  { id: "insp3", t: "Inspiración 3 (opcional)" }
];

export const PASOS: Paso[] = [
  { id: "piel", t: "Toca tu mejilla, donde no haya sombra ni brillo", r: 0.025, n: "Piel" },
  { id: "ojos", t: "Ahora toca el color de tu ojo (el iris)", r: 0.006, n: "Ojos" },
  { id: "pelo", t: "Ahora toca tu pelo", r: 0.02, n: "Pelo" },
  {
    id: "blanco",
    t: "Por último, toca algo blanco si sale en la foto (una pared, un folio, tu camiseta). Sirve para corregir la luz.",
    r: 0.015,
    n: "Blanco",
    opc: true
  }
];

/** Instrucción del paso actual, o el cierre cuando ya no quedan pasos. */
export const textoPaso = (paso: number): string =>
  PASOS[paso]?.t ?? "¡Listo! Si algún punto no ha caído bien, vuelve a marcar.";

/** Tamaño al que se reduce el selfie (lado mayor de 900 px como mucho) para medir sobre lo que se ve. */
export function tamanoSelfie(w: number, h: number): { w: number; h: number } {
  const k = Math.min(1, 900 / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/** Zona a medir alrededor del punto (x, y) (0-1) de una foto de `ancho` × `alto`, con radio `r` relativo. */
export function zonaDe(ancho: number, alto: number, x: number, y: number, r: number): Zona {
  const rad = Math.max(2, Math.round(Math.min(ancho, alto) * r)),
    cx = Math.round(x * ancho),
    cy = Math.round(y * alto);
  const x0 = Math.max(0, cx - rad),
    y0 = Math.max(0, cy - rad);
  return {
    x0,
    y0,
    w: Math.max(1, Math.min(ancho, cx + rad) - x0),
    h: Math.max(1, Math.min(alto, cy + rad) - y0),
    cx,
    cy,
    rad
  };
}

/** Color de una zona: mediana de cada canal (ignora brillos y pelos sueltos). `datos` son los píxeles RGBA de la zona. */
export function medianaRgb(datos: ArrayLike<number>, z: Zona): [number, number, number] {
  const canales: number[][] = [[], [], []];
  for (let i = 0; i < datos.length; i += 4) {
    const dx = z.x0 + ((i / 4) % z.w) - z.cx,
      dy = z.y0 + Math.floor(i / 4 / z.w) - z.cy;
    if (dx * dx + dy * dy <= z.rad * z.rad) {
      canales[0].push(datos[i]);
      canales[1].push(datos[i + 1]);
      canales[2].push(datos[i + 2]);
    }
  }
  const [r, g, b] = canales.map((a) => {
    a.sort((m, n) => m - n);
    return a[Math.floor(a.length / 2)] || 0;
  });
  return [r, g, b];
}

/** Color CSS de una muestra. */
export const colorCss = (m: number[]): string => "rgb(" + m.join(",") + ")";

/** Opciones de una pregunta de elegir (texto sin más). */
export const opcionesElige = (p: PreguntaAnalisis): string[] => (p.ops as string[] | undefined) ?? [];

/** Opciones de una pregunta de varias respuestas: id y texto. */
export const opcionesVarias = (p: PreguntaAnalisis): [string, string][] =>
  (p.ops as [string, string][] | undefined) ?? [];

/** Respuestas con valor: las de texto sin espacios sobrantes; las de varias, en el orden de sus opciones. */
export function respuestasDe(
  preguntas: PreguntaAnalisis[],
  texto: Record<string, string>,
  varias: Record<string, string[]>
): Record<string, string | string[]> {
  const r: Record<string, string | string[]> = {};
  for (const p of preguntas) {
    if (p.tipo === "varias") {
      const marcadas = opcionesVarias(p)
        .map((o) => o[0])
        .filter((id) => (varias[p.id] || []).includes(id));
      if (marcadas.length) r[p.id] = marcadas;
      continue;
    }
    const v = (texto[p.id] || "").trim();
    if (v) r[p.id] = v;
  }
  return r;
}

/** Qué falta para el análisis en el móvil: mensaje listo para enseñar, o cadena vacía si está todo. */
export function mensajeFalta(muestras: Muestras, r: Record<string, unknown>): string {
  const faltan: string[] = [];
  if (!muestras.piel && !(r.venas && r.joyas)) faltan.push("tu selfie (o al menos las venas y las joyas)");
  if (!r.ojos_color || !r.pelo_color) faltan.push("el color de tus ojos y de tu pelo");
  if (!r.estructura) faltan.push("cómo es tu cuerpo");
  return faltan.length ? "Me falta " + faltan.join(", ") + "." : "";
}

/** Estaciones de color para el perfil a mano: id y nombre. */
export const opcionesEstacion = (): { id: string; n: string }[] =>
  Object.entries(ESTACIONES).map(([id, e]) => ({ id, n: e.n }));

/** Tipos de cuerpo para el perfil a mano: id y nombre. */
export const opcionesCuerpo = (): { id: string; n: string }[] =>
  Object.entries(CUERPOS).map(([id, b]) => ({ id, n: b.n }));

/** Cómo se describe cada foto al mandarla a la IA. */
export const queFotoIA = (id: string): string =>
  id === "cuerpo" ? "2) foto de cuerpo entero" : "foto de inspiración de estilo";
