// Lógica de la pantalla Deseos (sin DOM): qué prendas se enseñan, sus textos y lo que pasa al marcarlas.
import { CATN } from "../data/constants.ts";
import { ICONOS } from "../data/icons.ts";
import { partesDeArribaEnPaleta } from "./armario.ts";
import { clasifica, familia, harm } from "./color.ts";
import { activas, casan, estado, famDe, palDe } from "./engine.ts";
import type { DeseoGuardado } from "./store.ts";
import type { Cat, ColorPaleta, Deseo, Veredicto } from "./tipos.ts";

/** Filtros de la pantalla: id y texto. */
export const FILTROS: [string, string][] = [
  ["top", "Empieza aquí"],
  ["mia", "Mi lista"],
  ["arriba", "Arriba"],
  ["layering", "Layering"],
  ["abajo", "Abajo"],
  ["vestido", "Vestidos"],
  ["capa", "Capas"],
  ["calzado", "Calzado"],
  ["accesorio", "Accesorios"],
  ["todo", "Todo"]
];

/** Con qué categorías se combina cada una al sugerir «Combina con lo tuyo». */
const COMBINA: Partial<Record<Cat, Cat[]>> = {
  arriba: ["abajo"],
  abajo: ["arriba"],
  vestido: ["capa", "calzado"],
  capa: ["arriba", "vestido", "abajo"],
  calzado: ["abajo", "vestido"]
};

const VEREDICTO: Record<Veredicto, string> = { si: "cómprala", quiza: "piénsatelo", no: "mejor no" };

type Guardados = Record<string, DeseoGuardado>;

/** Estrella de las prendas añadidas por la persona. */
export const ESTRELLA =
  "<svg viewBox='-20 -20 40 40' aria-hidden='true' focusable='false'><path d='M0,-16 Q2,-2 16,0 Q2,2 0,16 Q-2,2 -16,0 Q-2,-2 0,-16 Z' fill='currentColor'/></svg>";

/** SVG del icono de una prenda (camiseta si no hay o no se conoce). */
export const iconoSvg = (tipo: string | undefined): string =>
  (tipo && tipo in ICONOS ? ICONOS[tipo as keyof typeof ICONOS] : "") || ICONOS.camiseta;

/** Estado guardado de una prenda del perfil («quiero», «tengo» o «no»). */
export const estadoDe = (D: Guardados, w: Deseo): string | undefined => D[w.id]?.estado;

/** Prendas añadidas por la persona, de la más reciente a la más antigua. */
export const propiasDe = (D: Guardados): DeseoGuardado[] =>
  Object.values(D)
    .filter((d) => d.propio && d.nombre)
    .sort((a, b) => ((a.cuando || "") < (b.cuando || "") ? 1 : -1));

/** Prendas del perfil que enseña un filtro; las que ya tienes, al final. */
export function prendasVisibles(deseos: Deseo[], D: Guardados, filtro: string): Deseo[] {
  return deseos
    .filter(
      (w) =>
        filtro === "todo" ||
        (filtro === "top" ? w.top : filtro === "mia" ? estadoDe(D, w) === "quiero" : w.cat === filtro)
    )
    .sort((a, b) => Number(estadoDe(D, a) === "tengo") - Number(estadoDe(D, b) === "tengo"));
}

/** Texto de un filtro; «Mi lista» lleva la cuenta si hay algo. */
export function textoFiltro(id: string, texto: string, deseos: Deseo[], D: Guardados): string {
  if (id !== "mia") return texto;
  const n = deseos.filter((w) => estadoDe(D, w) === "quiero").length + propiasDe(D).length;
  return texto + (n ? " · " + n : "");
}

/** Mensaje de la lista vacía. */
export const textoVacio = (filtro: string): string =>
  filtro === "mia"
    ? "Tu lista está vacía. Pulsa «La quiero» en lo que te guste y se quedará aquí."
    : "No hay prendas en este apartado.";

/** Nombre del color de una prenda del perfil: el suyo o el más cercano de tu paleta. */
export const nombreColor = (col: [string, string], paleta: ColorPaleta[] = estado.PAL): string =>
  col[0] || clasifica(col[1], paleta).n;

/** «Combina con lo tuyo: …» con hasta dos prendas del armario que arman bien con ese color. */
export function combinaCon(w: Deseo, hex: string): string {
  const cats = COMBINA[w.cat];
  if (!cats) return "";
  const fam = familia(hex);
  const c = activas()
    .filter((p) => cats.includes(p.cat) && p.nombre && casan({ ...w, nombre: w.n }, p) !== null)
    .map((p) => ({ p, h: harm(fam, famDe(p)) }))
    .filter((x) => x.h >= 1.5)
    .sort((a, b) => b.h - a.h)
    .slice(0, 2);
  return c.length
    ? "Combina con lo tuyo: " +
        c.map((x) => x.p.nombre.charAt(0).toLowerCase() + x.p.nombre.slice(1)).join(" y ") +
        "."
    : "";
}

/** Datos con los que se abre el formulario del armario al decir «Ya la tengo» de una prenda del perfil. */
export const prellenadoDe = (w: Deseo, hex: string) => ({
  nombre: w.n,
  cat: w.cat,
  tipo: w.tipo,
  color: hex,
  corte: w.corte,
  abrigo: w.abrigo,
  estilo: w.estilo,
  tejido: w.tejido
});

/** Lo mismo para una prenda propia: solo los campos que tiene. */
export function prellenadoPropio(d: DeseoGuardado): Record<string, unknown> {
  const pre: Record<string, unknown> = {};
  for (const k of ["nombre", "cat", "tipo", "color", "corte", "abrigo", "estilo", "tejido", "foto", "mini"])
    if (d[k] != null) pre[k] = d[k];
  return pre;
}

/** Textos de la tarjeta de una prenda propia. */
export function vistaPropia(d: DeseoGuardado, paleta: ColorPaleta[] = estado.PAL) {
  const color = typeof d.color === "string" ? d.color : "";
  const cat = typeof d.cat === "string" ? d.cat : "";
  const v = typeof d.veredicto === "string" ? d.veredicto : "";
  return {
    color,
    etiqueta: v ? "Analizada: " + (VEREDICTO[v as Veredicto] ?? v) : "Añadida por ti",
    detalle: color
      ? clasifica(color, paleta).n + (cat ? " · " + (CATN[cat as Cat] || cat).toLowerCase() : "")
      : "",
    motivo: typeof d.motivo === "string" ? d.motivo : ""
  };
}

/** Frase de arriba: lo que más falta o más multiplica el armario. */
export function notaDeArmario(): string {
  const A = activas();
  if (!A.length) return "Las piezas que más te favorecen, según tu análisis.";
  const falta = (
    [
      ["arriba", "partes de arriba"],
      ["abajo", "partes de abajo"],
      ["capa", "capas"],
      ["calzado", "calzado"]
    ] as const
  )
    .filter((c) => !A.some((p) => p.cat === c[0]))
    .map((c) => c[1]);
  if (falta.length)
    return (
      "En tu armario todavía no hay " + falta.join(falta.length === 2 ? " ni " : ", ") + ": empieza por ahí."
    );
  return partesDeArribaEnPaleta(A.map((p) => ({ cat: p.cat, pal: palDe(p) }))) < 2
    ? "Te faltan partes de arriba en tu paleta: mira el apartado Arriba."
    : "Las piezas que más multiplican lo que ya tienes.";
}

/** Nombre de la prenda propia recortado; vacío si no escribió nada. */
export const nombreNuevo = (texto: string): string => texto.trim().slice(0, 60);
