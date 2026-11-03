// Avisos del armario sobre lo que le falta a la paleta de la persona.
import type { Cat, ColorPaleta } from "./tipos.ts";

interface PiezaAviso {
  cat: Cat;
  /** Cómo encaja su color en la paleta (ok, neutro o evita). */
  pal: ColorPaleta["tipo"];
}

/** Cuántas prendas de arriba (o vestidos) están dentro de la paleta. */
export const partesDeArribaEnPaleta = (prendas: PiezaAviso[]) =>
  prendas.filter((p) => (p.cat === "arriba" || p.cat === "vestido") && p.pal !== "evita").length;

/** Los colores de la paleta con los que empezar a comprar (los primeros «ok»), en minúscula. */
export const coloresPara = (paleta: ColorPaleta[], n = 3) =>
  paleta
    .filter((c) => c.tipo === "ok")
    .slice(0, n)
    .map((c) => c.n.toLowerCase());

/** Aviso del resumen del armario: con 3 prendas o más y menos de 2 partes de arriba en paleta. */
export function avisoPartesDeArriba(prendas: PiezaAviso[], paleta: ColorPaleta[]): string | null {
  if (prendas.length < 3 || partesDeArribaEnPaleta(prendas) >= 2) return null;
  const cols = coloresPara(paleta);
  const lista = cols.length > 1 ? cols.slice(0, -1).join(", ") + " o " + cols[cols.length - 1] : cols[0];
  return "Te faltan partes de arriba en tu paleta" + (lista ? ": empieza por " + lista + "." : ".");
}
