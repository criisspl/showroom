// «Con estas prendas»: looks alrededor de varias prendas fijas e ideas de qué añadirles.
import { S_OCA } from "../../data/constants.ts";
import { familia, harm } from "../color.ts";
import type { Cat, Contexto, DatosPrenda, Deseo, Prenda } from "../tipos.ts";
import { bandaDe, capaHace, ocaDe } from "./contexto.ts";
import { activas, estado, famDe, palDe } from "./estado.ts";
import { monta } from "./monta.ts";
import type { Look } from "./monta.ts";
import { casan, estiloDe, fueraTemporada, penCond } from "./prenda.ts";

/** ¿Dos prendas fijas se pisan el sitio? Un vestido quita arriba y abajo; arriba y accesorios se pueden apilar, y el layering va debajo de arriba o vestido. */
export function chocaAncla(a: Pick<Prenda, "id" | "cat">, p: Pick<Prenda, "id" | "cat">): boolean {
  if (a.id === p.id) return false;
  // El layering va debajo de arriba o vestido: solo choca con otro layering
  if (a.cat === "layering" || p.cat === "layering") return a.cat === p.cat;
  if (a.cat === "vestido") return p.cat === "vestido" || p.cat === "arriba" || p.cat === "abajo";
  if (p.cat === "vestido") return a.cat === "arriba" || a.cat === "abajo";
  if (a.cat === "arriba" || a.cat === "accesorio") return false;
  return p.cat === a.cat;
}

/** Añade o quita una prenda de las elegidas (sin mutar). Al añadir, saca las que ocuparían su sitio. */
export function alternaAncla<T extends Pick<Prenda, "id" | "cat">>(anclas: T[], p: T, on: boolean): T[] {
  if (!on) return anclas.filter((a) => a.id !== p.id);
  return anclas.filter((a) => a.id !== p.id && !chocaAncla(p, a)).concat(p);
}

/** Prendas del armario que se quitan al montar: las que ocuparían el hueco de alguna prenda fija. */
function ocupaHueco(a: Pick<Prenda, "cat">, p: Pick<Prenda, "cat">): boolean {
  if (a.cat === "vestido") return ["vestido", "arriba", "abajo"].includes(p.cat);
  if (a.cat === "arriba" || a.cat === "abajo") return p.cat === a.cat || p.cat === "vestido";
  return p.cat === a.cat;
}

/** Un look montado alrededor de las prendas fijas; `forzadas` son las fijas que el motor no habría elegido. */
export type LookAncla = Look & { forzadas: string[] };

/** Monta con las prendas fijas: aparta lo que ocuparía su sitio y se asegura de que estén todas en el look. */
export function montaConAnclas(
  anclas: Prenda[],
  c: Contexto,
  seed: unknown,
  evitar?: string[] | null
): LookAncla[] {
  if (!anclas.length) return [];
  const ids = anclas.map((a) => a.id),
    real = estado.P;
  let res: Look[] = [];
  try {
    estado.P = real
      .filter((p) => ids.includes(p.id) || !anclas.some((a) => ocupaHueco(a, p)))
      .concat(anclas.filter((a) => a.virtual));
    res = monta(c.oca, c.banda, c.lluvia, seed, evitar, c.est, c.cond);
  } finally {
    estado.P = real;
  }
  return res.map((o) => {
    const faltan = ids.filter((id) => !o.ids.includes(id));
    return { ...o, ids: o.ids.concat(faltan), forzadas: faltan };
  });
}

/** Una idea de qué añadir: una prenda de Deseos o una genérica en un neutro de la paleta. */
export interface Idea {
  /** Id del deseo, o «generica-<hueco>» si es genérica. */
  id: string;
  nombre: string;
  cat: Cat;
  tipo?: string;
  color: string;
  colorN: string;
  generica: boolean;
  /** Motivo corto. */
  porque: string;
  /** Datos para subirla al armario si la tiene y no está. */
  pre: { nombre: string; cat: Cat; tipo?: string; color: string; corte?: string; abrigo?: number };
}

const GENERICAS: Partial<Record<Cat, [string, string]>> = {
  arriba: ["Una parte de arriba lisa", "camiseta"],
  abajo: ["Una parte de abajo lisa", "pantalón"],
  capa: ["Una capa ligera", "chaqueta"],
  calzado: ["Un calzado cerrado", "botines"],
  accesorio: ["Un accesorio sencillo", "pañuelo"]
};

/** Huecos que quedan por rellenar según lo elegido, la ocasión y el tiempo. */
export function huecosAncla(anclas: Pick<Prenda, "cat">[], c: Contexto): Cat[] {
  const oca = ocaDe(c.oca),
    has = (cat: Cat) => anclas.some((p) => p.cat === cat),
    out: Cat[] = [];
  if (!has("vestido") && !has("arriba")) out.push("arriba");
  if (!has("vestido") && !has("abajo")) out.push("abajo");
  if (!has("capa") && capaHace(c) && oca.id !== "casa") out.push("capa");
  if (!has("calzado") && oca.id !== "casa") out.push("calzado");
  if (!has("accesorio") && oca.id !== "casa") out.push("accesorio");
  return out;
}

/** Por qué le pega esa idea a lo elegido: la forma, el hueco que cubre y, si hay, el color. */
export function porQueIdea(p: DatosPrenda, anclas: Prenda[]): string {
  const t: string[] = [];
  let mejor: Prenda | null = null,
    h = 0;
  anclas.forEach((q) => {
    const x = harm(famDe(p), famDe(q));
    if (x > h) {
      h = x;
      mejor = q;
    }
  });
  if (p.cat === "capa") t.push("Para el tiempo que hace; llévala abierta.");
  else if (p.cat === "calzado") t.push("Cierra el look y aguanta el día.");
  else if (p.cat === "accesorio") t.push("El remate.");
  else
    t.push(
      p.corte === "amplia"
        ? "Mete un pico por delante para marcar cintura."
        : "Equilibra la forma de lo que llevas."
    );
  const m = mejor as Prenda | null;
  if (m && h >= 1.2)
    t.push(
      (h >= 1.8 ? "Su color es combinación estrella con " : "Su color combina bien con ") +
        m.nombre.toLowerCase() +
        "."
    );
  return t.join(" ");
}

interface Candidata {
  idea: Idea;
  s: number;
}

/**
 * Qué añadirle a las prendas elegidas: como mucho una idea por hueco que falta.
 * `seed` pasa a la siguiente mejor de cada hueco («Otra idea»); `descartadas` son las que dijo que no tiene.
 * Sale de los deseos de la persona y, si no hay, de una prenda lisa en un neutro de su paleta.
 */
export function sugiereIdeas(
  anclas: Prenda[],
  c: Contexto,
  deseos: Deseo[],
  seed = 0,
  descartadas: Record<string, 1> = {}
): Idea[] {
  const oca = ocaDe(c.oca),
    banda = bandaDe(c.banda),
    bc = banda.capa || banda,
    calido = /calor|templado/.test((banda.calido || banda).id),
    SO = S_OCA[oca.id],
    neutros = estado.PAL.filter((x) => x.tipo === "neutro");
  const out: Idea[] = [];
  huecosAncla(anclas, c).forEach((slot, i) => {
    const cands: Candidata[] = [];
    deseos.forEach((w) => {
      if (w.cat !== slot || descartadas[w.id]) return;
      const dw: DatosPrenda = {
        nombre: w.n,
        cat: w.cat,
        tipo: w.tipo,
        estilo: w.estilo,
        tejido: w.tejido,
        corte: w.corte,
        abrigo: w.abrigo,
        formal: w.formal
      };
      if (SO[estiloDe(dw)] === null) return;
      const pen = penCond(dw, c.cond, calido),
        ft = fueraTemporada(dw, c.est);
      if (pen === null || ft === null || anclas.some((p) => casan(dw, p) === null)) return;
      w.cols.forEach((k) => {
        const f = familia(k[1]),
          hs = anclas.length ? anclas.reduce((t, p) => t + harm(f, famDe(p)), 0) / anclas.length : 1;
        const w2 = Number(w.formal ?? 2);
        let s =
          hs -
          Math.abs((w.abrigo ?? 2) - (slot === "capa" ? bc.t : banda.t)) *
            (slot === "accesorio" ? 0.2 : 0.8) +
          (w2 < oca.f[0] ? -(oca.f[0] - w2) : w2 > oca.f[1] ? -(w2 - oca.f[1]) : 0.3) +
          (w.top ? 0.3 : 0) -
          ft -
          pen;
        if (palDe({ color: k[1], cat: slot, nombre: w.n }) === "evita") s -= 1;
        if (s < -1.5) return;
        const datos = { nombre: w.n, cat: slot, tipo: w.tipo, color: k[1], corte: w.corte };
        cands.push({
          s,
          idea: {
            id: w.id,
            nombre: w.n,
            cat: slot,
            tipo: w.tipo,
            color: k[1],
            colorN: k[0],
            generica: false,
            porque: porQueIdea({ ...datos, nombre: w.n }, anclas),
            pre: { ...datos, abrigo: w.abrigo }
          }
        });
      });
    });
    // Un solo color por deseo: el que mejor puntúa
    const vistos = new Set<string>(),
      unicas = cands
        .sort((a, b) => b.s - a.s)
        .filter((x) => (vistos.has(x.idea.id) ? false : (vistos.add(x.idea.id), true)));
    const g = GENERICAS[slot],
      gid = "generica-" + slot;
    if (g && !descartadas[gid] && SO["casual"] !== null) {
      const neu = neutros[slot === "calzado" ? 3 : 1] || neutros[0],
        color = neu ? neu.hex : "#C19A6B",
        colorN = neu ? neu.n : "Camel",
        datos = { nombre: g[0].replace(/^Una? /, ""), cat: slot, tipo: g[1], color };
      unicas.push({
        s: -1.4,
        idea: {
          id: gid,
          nombre: g[0] + " en " + colorN.toLowerCase(),
          cat: slot,
          tipo: g[1],
          color,
          colorN,
          generica: true,
          porque: porQueIdea(datos, anclas),
          pre: datos
        }
      });
    }
    if (!unicas.length) return;
    // Con la semilla se rota por las mejores; el hueco influye para no repetir el mismo desfase en todos
    out.push(unicas[(seed + (seed ? i : 0)) % unicas.length].idea);
  });
  return out;
}

/** Prendas del armario que valen como esa idea: mismo hueco, que casen con lo elegido y con la ocasión. */
export function delArmarioParaIdea(idea: Pick<Idea, "cat">, anclas: Prenda[], c: Contexto): Prenda[] {
  const SO = S_OCA[ocaDe(c.oca).id],
    bc = bandaDe(c.banda).capa || bandaDe(c.banda),
    ids = anclas.map((a) => a.id);
  return activas()
    .filter(
      (p) =>
        p.cat === idea.cat &&
        !ids.includes(p.id) &&
        !anclas.some((a) => chocaAncla(p, a)) &&
        SO[estiloDe(p)] !== null &&
        fueraTemporada(p, c.est) !== null &&
        anclas.every((a) => casan(p, a) !== null)
    )
    .sort((a, b) => Math.abs(Number(a.abrigo || 2) - bc.t) - Math.abs(Number(b.abrigo || 2) - bc.t));
}
