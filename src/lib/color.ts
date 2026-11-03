// Color: conversión a CIELAB, familias de color y clasificación según la paleta de cada persona.
import { H_PAR, par } from "../data/constants.ts";
import type { ColorPaleta, Familia, Lab, Perfil, Rgb, TipoColor } from "./tipos.ts";

export function rgb(hex: string | undefined): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return [200, 190, 170];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lab(hex: string | undefined): Lab {
  const c = rgb(hex).map((v) => {
    v /= 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  });
  const x = (c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047;
  const y = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  const z = (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export function dist(a: string, b: string): number {
  const p = lab(a),
    q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** Familia de un color a partir de su luminosidad, croma y tono. */
export function familia(hex: string | undefined): Familia {
  const [L, A, B] = lab(hex),
    C = Math.hypot(A, B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  if (C < 9) return L > 90 ? "blanco" : L > 78 ? "claro" : L < 22 ? "negro" : "gris";
  if (L > 82 && C < 26 && h > 50 && h < 110) return "claro";
  if (C < 40 && h >= 30 && h < 95 && L < 72) return "marron";
  if (L < 22 && C < 20) return "negro";
  if (h >= 345 || h < 35) return L > 70 ? "rosa" : L < 40 ? "vino" : "rojizo";
  if (h < 75) return "rojizo";
  if (h < 105) return "amarillo";
  if (h < 200) return "verde";
  if (h < 285) return "azul";
  return L > 65 ? "rosa" : L < 40 ? "vino" : "morado";
}

export function harm(a: Familia, b: Familia): number {
  const v = par(H_PAR, a, b);
  return v === 0 || v === null ? 1 : v;
}

// Colores genéricos para clasificar lo que no está en la paleta personal.
const GENERICOS: [string, string][] = [
  ["Negro", "#141110"],
  ["Blanco óptico", "#FFFFFF"],
  ["Gris claro", "#C8CDD3"],
  ["Gris medio", "#7D7F82"],
  ["Gris oscuro", "#45474A"],
  ["Rosa palo", "#F3CFD6"],
  ["Rosa chicle", "#F29BC0"],
  ["Fucsia", "#E5399B"],
  ["Lila", "#C9B8E8"],
  ["Azul hielo", "#CFE0EE"],
  ["Azul eléctrico", "#1F4FFF"],
  ["Azul marino", "#1B2440"],
  ["Vaquero", "#5F7FA3"],
  ["Vaquero claro", "#9DB7D5"],
  ["Amarillo limón", "#F4F03B"],
  ["Verde neón", "#39FF14"],
  ["Rojo", "#D0103A"],
  ["Morado", "#6A3FA0"],
  ["Naranja", "#F08A2E"],
  ["Beige", "#D8C8A8"],
  ["Camel", "#C19A6B"],
  ["Chocolate", "#4E3326"],
  ["Crema", "#F3E9D4"],
  ["Verde oliva", "#7A7B45"],
  ["Granate", "#7B2D34"],
  ["Mostaza", "#C9A227"],
  ["Terracota", "#C4694A"]
];

/**
 * Construye la paleta de trabajo de una persona: sus colores (ok), sus neutros (neutro),
 * los que evita (evita) y los genéricos, que heredan la etiqueta del color suyo más cercano.
 */
export function construyePaleta(perfil: Pick<Perfil, "color"> | null): ColorPaleta[] {
  const c: Partial<Perfil["color"]> = (perfil && perfil.color) || {};
  const pal: Omit<ColorPaleta, "lab" | "fam">[] = [];
  (c.paleta || []).forEach((x) => pal.push({ n: x.n, hex: x.hex, tipo: "ok" }));
  (c.neutros || []).forEach((x) => pal.push({ n: x.n, hex: x.hex, tipo: "neutro" }));
  (c.evitar || []).forEach((x) => pal.push({ n: x.n, hex: x.hex, tipo: "evita" }));
  const propios = pal.filter((p) => p.tipo !== "evita");
  GENERICOS.forEach(([n, hex]) => {
    if (pal.some((p) => dist(p.hex, hex) < 6)) return;
    const cerca = propios.filter((p) => dist(p.hex, hex) < 14)[0];
    pal.push({ n, hex, tipo: propios.length ? (cerca ? cerca.tipo : "evita") : "neutro" });
  });
  return pal.map((p) => ({ ...p, lab: lab(p.hex), fam: familia(p.hex) }));
}

export function clasifica(
  hex: string | undefined,
  paleta: ColorPaleta[]
): { n: string; fam: Familia; tipo: TipoColor } {
  const l = lab(hex);
  let best: ColorPaleta | null = null,
    bd = 1e9;
  for (const p of paleta) {
    const d = Math.hypot(l[0] - p.lab[0], l[1] - p.lab[1], l[2] - p.lab[2]);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best
    ? { n: best.n, fam: familia(hex), tipo: best.tipo }
    : { n: hex ?? "", fam: familia(hex), tipo: "neutro" };
}

/** Color de tu paleta más claro, para sugerirlo en lugar del blanco. */
function clarisimo(paleta: ColorPaleta[]): string | null {
  const ok = paleta.filter((p) => p.tipo === "ok").sort((a, b) => b.lab[0] - a.lab[0]);
  return ok.length ? ok[0].n.toLowerCase() : null;
}

export function consejoColor(c: { tipo: TipoColor; fam?: Familia }, paleta: ColorPaleta[] = []): string {
  if (c.tipo === "ok") return "En tu paleta";
  if (c.tipo === "neutro") return "Neutro de tu paleta";
  if (c.fam === "negro") return "Fuera de paleta: mejor de cintura para abajo o en chaqueta abierta";
  if (c.fam === "blanco")
    return "Fuera de paleta: cerca de la cara, cámbialo por " + (clarisimo(paleta) ?? "un tono de tu paleta");
  return "Fuera de tu paleta: llévalo lejos de la cara";
}
