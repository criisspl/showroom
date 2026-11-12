// Lo que enseña la pantalla Armario (sin DOM): resumen, filtro y textos de cada prenda.
import { lab } from "./color.ts";

/** Colores de las prendas ordenados de oscuro a claro, para la tira del resumen. */
export const tiraDeColores = (prendas: { color?: string }[]): string[] =>
  prendas
    .slice()
    .sort((a, b) => lab(a.color)[0] - lab(b.color)[0])
    .map((p) => p.color ?? "");

/** «3 prendas · 2 en tu paleta · 1 fuera». */
export const textoResumen = (total: number, enPaleta: number) =>
  total +
  (total === 1 ? " prenda" : " prendas") +
  " · " +
  enPaleta +
  " en tu paleta · " +
  (total - enPaleta) +
  " fuera";

export const textoUsos = (n: number | undefined) => (n ? n + (n === 1 ? " uso" : " usos") : "sin estrenar");

/** Prendas de la categoría elegida (o todas), las últimas añadidas primero. */
export function prendasDelFiltro<T extends { cat: string; creada?: string }>(
  prendas: T[],
  filtro: string
): T[] {
  return prendas
    .filter((p) => filtro === "todo" || p.cat === filtro)
    .sort((a, b) => ((b.creada || "") < (a.creada || "") ? -1 : 1));
}

export const textoVacio = (hayPrendas: boolean) =>
  hayPrendas
    ? "No tienes prendas en esta categoría todavía."
    : "Tu armario está vacío. Pulsa «Añadir prenda» y sube la primera: una foto, dos toques y listo.";
