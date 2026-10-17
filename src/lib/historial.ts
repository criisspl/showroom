// Datos de la pestaña Historial, calculados a partir del estado del motor (sin DOM).
import { ESTN, TEJN, FAMN, CORN } from "../data/constants.ts";
import { activas, aprende, estado, usos } from "./engine.ts";
import type { Corte, Estilo, Familia, Outfit, Prenda, Tejido } from "./tipos.ts";

/** Una cifra con su texto: «12 prendas en el armario». */
export interface Cifra {
  n: string;
  t: string;
}

/** Cifras de arriba: prendas, outfits anotados, sin estrenar y lo más usado. */
export function cifras(): Cifra[] {
  const us = usos(),
    A = activas(),
    n = puestos().length;
  let top: Prenda | null = null;
  for (const p of A) if (us[p.id] && (!top || us[p.id] > us[top.id])) top = p;
  const out: Cifra[] = [
    { n: String(A.length), t: A.length === 1 ? "prenda en el armario" : "prendas en el armario" },
    { n: String(n), t: n === 1 ? "outfit anotado" : "outfits anotados" },
    { n: String(A.filter((p) => !us[p.id]).length), t: "sin estrenar" }
  ];
  if (top) out.push({ n: us[top.id] + "×", t: "Lo más usado: " + top.nombre });
  return out;
}

/** Outfits que te has puesto, del más reciente al más antiguo. */
export const puestos = (): Outfit[] =>
  estado.O.filter((o) => o.fecha).sort((a, b) =>
    a.fecha === b.fecha
      ? (a.creada || "") < (b.creada || "")
        ? 1
        : -1
      : (a.fecha as string) < (b.fecha as string)
        ? 1
        : -1
  );

/** Outfits guardados para otro día (aún sin ponerse), del más reciente al más antiguo. */
export const guardados = (): Outfit[] =>
  estado.O.filter((o) => o.fav && !o.fecha).sort((a, b) => ((a.creada || "") < (b.creada || "") ? 1 : -1));

/** Prendas agrupadas por mes de alta, del mes más reciente al más antiguo. */
export function altasPorMes(): { titulo: string; prendas: Prenda[] }[] {
  const meses = new Map<string, Prenda[]>();
  estado.P.slice()
    .sort((a, b) => ((a.creada || "") < (b.creada || "") ? 1 : -1))
    .forEach((p) => {
      const k = (p.creada || "").slice(0, 7) || "sin-fecha";
      if (!meses.has(k)) meses.set(k, []);
      meses.get(k)?.push(p);
    });
  return [...meses].map(([k, prendas]) => ({
    titulo:
      (k === "sin-fecha"
        ? "Sin fecha"
        : new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString("es-ES", {
            month: "long",
            year: "numeric"
          })) +
      " · " +
      prendas.length,
    prendas
  }));
}

/** Resumen de las valoraciones y hasta 8 frases sobre lo aprendido, de lo que menos a lo que más te gusta. */
export function aprendizaje(): { cifras: Cifra[]; frases: string[] } | null {
  const n = estado.V.length;
  if (!n) return null;
  const l = aprende(),
    frases: { v: number; t: string }[] = [];
  const saca = (t: Record<string, number>, nombre: (x: string) => string, tipo: string) =>
    Object.entries(t).forEach(([k, v]) => {
      if (Math.abs(v) < 0.3) return;
      const [a, b] = k.split("|");
      frases.push({
        v,
        t:
          (v < 0 ? "Menos " : "Más ") +
          (a === b ? tipo + " " + nombre(a) + " con " + nombre(b) : nombre(a) + " con " + nombre(b))
      });
    });
  saca(l.est, (x) => (ESTN[x as Estilo] || x).toLowerCase(), "todo");
  saca(l.tej, (x) => (TEJN[x as Tejido] || x).toLowerCase(), "tejido");
  saca(l.col, (x) => FAMN[x as Familia] || x, "tonos");
  saca(l.cor, (x) => CORN[x as Corte] || x, "corte");
  const vetos = Object.keys(l.veto).length;
  if (vetos)
    frases.push({
      v: -9,
      t: vetos + (vetos === 1 ? " combinación descartada" : " combinaciones descartadas")
    });
  return {
    cifras: [
      { n: String(n), t: n === 1 ? "outfit valorado" : "outfits valorados" },
      { n: String(l.si), t: "te pondrías" },
      { n: String(l.no), t: "no te pondrías" }
    ],
    frases: frases
      .sort((a, b) => a.v - b.v)
      .slice(0, 8)
      .map((f) => f.t)
  };
}
