// «Lo monto yo»: juzga un look montado por la persona y propone cómo mejorarlo.
import { S_PAR, S_OCA, T_PAR, par, ESTN, TEJN, TEMPN, ENTN } from "../../data/constants.ts";
import { clasifica, harm } from "../color.ts";
import type { Cat, Contexto, Prenda, Temporada, Veredicto } from "../tipos.ts";
import { aprendido } from "./aprende.ts";
import { bandaDe, capaHace, ocaDe } from "./contexto.ts";
import { VISTE, activas, byId, estado, famDe, palDe, txt } from "./estado.ts";
import { condiciones, corto, estiloDe, fueraTemporada, tejidoDe, txtTemporada } from "./prenda.ts";

const PRINC: Partial<Record<Cat, 1>> = { arriba: 1, abajo: 1, vestido: 1 };
const nomP = (p: Prenda) => p.nombre.charAt(0).toLowerCase() + p.nombre.slice(1);
const Cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const colN = (p: Prenda) => (p.colorN || clasifica(p.color || "#C19A6B", estado.PAL).n).toLowerCase();
const prendasDe = (ids: string[]) => ids.map(byId).filter((p): p is Prenda => !!p);

export function claveDe(ids: string[]): string {
  const ps = prendasDe(ids),
    d = ps.find((p) => p.cat === "vestido");
  if (d) return d.id;
  const t = ps.find((p) => p.cat === "arriba"),
    b = ps.find((p) => p.cat === "abajo");
  return t && b ? t.id + "+" + b.id : ps.map((p) => p.id).join("+");
}

/**
 * Juzga un look montado por la persona. c = { oca, banda, lluvia } (oca y banda pueden ser combinados con «+»).
 * Devuelve { s (0-10), raw, v: "si"|"quiza"|"no", bien[], mal[], culpa{idPrenda: puntos} }.
 */
/** Resultado de juzga(): nota de 0 a 10 y por qué. */
export interface Juicio {
  raw: number;
  s: number;
  v: Veredicto;
  mal: string[];
  bien: string[];
  /** Puntos que resta cada prenda, por id. */
  culpa: Record<string, number>;
}
export function juzga(ids: string[], c: Contexto): Juicio | null {
  const oca = ocaDe(c.oca),
    banda = bandaDe(c.banda),
    bc = banda.capa || banda,
    cal = banda.calido || banda,
    SO = S_OCA[oca.id];
  const ps = prendasDe(ids),
    mal: string[] = [],
    bien: string[] = [],
    culpa: Record<string, number> = {};
  let s = 10,
    grave = false;
  if (!ps.length) return null;
  const fallo = (pts: number, t: string, quien: Prenda[] = []) => {
    s -= pts;
    mal.push(t);
    if (pts >= 4) grave = true;
    quien.forEach((p) => {
      culpa[p.id] = (culpa[p.id] || 0) + pts;
    });
  };
  const by = (cat: Cat) => ps.filter((p) => p.cat === cat);
  const dress = by("vestido"),
    tops = by("arriba"),
    bots = by("abajo"),
    capas = by("capa"),
    shoes = by("calzado"),
    base = ps.filter((p) => PRINC[p.cat]);
  if (!dress.length && !(tops.length && bots.length))
    fallo(
      2,
      tops.length
        ? "Falta la parte de abajo."
        : bots.length
          ? "Falta la parte de arriba."
          : "Falta la base: algo de arriba y algo de abajo, o un vestido."
    );
  if (dress.length && bots.length)
    fallo(1, "Vestido y parte de abajo a la vez: solo funciona si el vestido hace de blusón.", bots);
  if (bots.length > 1) fallo(3, "Dos partes de abajo a la vez.", bots.slice(1));
  // Registro y tejido, por parejas
  const vis = ps.filter((p) => p.cat !== "accesorio");
  let choques = 0;
  for (let i = 0; i < vis.length; i++)
    for (let j = i + 1; j < vis.length; j++) {
      const p = vis[i],
        q = vis[j],
        ep = estiloDe(p),
        eq = estiloDe(q);
      if (par(S_PAR, ep, eq) === null) {
        choques++;
        fallo(
          4,
          Cap(nomP(p)) +
            " (" +
            ESTN[ep].toLowerCase() +
            ") y " +
            nomP(q) +
            " (" +
            ESTN[eq].toLowerCase() +
            ") son de mundos distintos.",
          [p, q]
        );
        continue;
      }
      if (VISTE[p.cat] && VISTE[q.cat] && par(T_PAR, tejidoDe(p), tejidoDe(q)) === null) {
        choques++;
        fallo(
          3,
          "El tejido de " +
            nomP(p) +
            " (" +
            TEJN[tejidoDe(p)].toLowerCase() +
            ") no casa con el de " +
            nomP(q) +
            " (" +
            TEJN[tejidoDe(q)].toLowerCase() +
            ").",
          [p, q]
        );
      }
    }
  if (!choques && vis.length > 1) {
    const es = [...new Set(vis.map(estiloDe))];
    bien.push(
      es.length === 1
        ? "Todo en registro " + ESTN[es[0]].toLowerCase() + ": coherente."
        : "Los registros conviven bien (" +
            es.map((e) => ESTN[e].toLowerCase()).join(" y ") +
            ") y los tejidos casan."
    );
  }
  // Ocasión
  const nOca = mal.length;
  ps.forEach((p) => {
    const v = SO[estiloDe(p)];
    if (v === null) fallo(4, Cap(nomP(p)) + " no es para " + oca.n.toLowerCase() + ".", [p]);
    else if (/evento/.test(oca.id) && estiloDe(p) === "casual" && p.cat !== "accesorio")
      fallo(2, Cap(nomP(p)) + " se queda demasiado informal para un evento.", [p]);
    else if (v <= -1.2)
      fallo(1, Cap(nomP(p)) + " no es lo más apropiado para " + oca.n.toLowerCase() + ".", [p]);
  });
  if (/oficina-formal/.test(oca.id) && !ps.some((p) => estiloDe(p) === "arreglado"))
    fallo(
      4,
      "Para la oficina formal le falta una prenda arreglada: camisa, blazer o pantalón de pinzas.",
      base
    );
  else if (/cita|noche|evento|finde/.test(oca.id) && !ps.some((p) => /arreglado|fiesta/.test(estiloDe(p))))
    fallo(
      1.5,
      "Para " +
        oca.n.toLowerCase() +
        " le falta un punto arreglado: una prenda más cuidada o un accesorio con brillo."
    );
  if (mal.length === nOca)
    bien.push(
      oca.multi ? "Te sirve para todo el día: " + oca.n.toLowerCase() + "." : "Encaja con «" + oca.n + "»."
    );
  // Tiempo
  const nT = mal.length;
  base.forEach((p) => {
    if (cal.id === "calor" && Number(p.abrigo) === 3)
      fallo(2, Cap(nomP(p)) + " da demasiado calor" + (banda.multi ? " para las horas de calor." : "."), [p]);
  });
  if (!capas.length && capaHace(c)) {
    if (bc.id === "frio" && base.every((p) => (Number(p.abrigo) || 2) <= 1))
      fallo(2.5, "Con frío y sin capa vas a pasar frío: añade una chaqueta o un abrigo.");
    else
      fallo(1.5, (banda.multi ? "Para la parte fresca del día" : "Para este tiempo") + " te falta una capa.");
  }
  capas.forEach((p) => {
    if (cal.id === "calor" && !banda.multi && Number(p.abrigo) >= 2)
      fallo(1.5, Cap(nomP(p)) + " sobra con este calor.", [p]);
  });
  shoes.forEach((p) => {
    const t = txt(p);
    if (/sandal|chancl/.test(t) && (bc.id === "frio" || bc.id === "fresco" || c.lluvia))
      fallo(2, Cap(nomP(p)) + " no van con " + (c.lluvia ? "lluvia." : "este frío."), [p]);
    if (c.lluvia && /(^|\s)ante(\s|$)/.test(t))
      fallo(1.5, "Con lluvia, " + nomP(p) + " de ante sufren.", [p]);
  });
  ps.forEach((p) => {
    if (corto(p) && bc.id === "frio")
      fallo(1.5, Cap(nomP(p)) + " se queda corto para el frío (salvo con medias gruesas).", [p]);
  });
  if (mal.length === nT)
    bien.push(
      banda.multi
        ? "Va bien para el cambio de temperatura" +
            (capas.length ? ": capa por la mañana y fuera cuando suba." : ".")
        : "Va bien para el tiempo que hace."
    );
  // Viento, humedad y entorno
  const cd = c.cond || {},
    nC = mal.length,
    calidoJ = /calor|templado/.test(cal.id);
  ps.forEach((p) =>
    condiciones(p, cd, calidoJ).forEach(([pts, t]) => {
      if (t && pts > 0) fallo(pts, t, [p]);
    })
  );
  if (mal.length === nC && (cd.viento || cd.humedad || (cd.entorno && cd.entorno !== "ciudad")))
    bien.push(
      "Preparado para " +
        [
          cd.viento ? "el viento" : "",
          cd.humedad ? "la humedad" : "",
          cd.entorno && cd.entorno !== "ciudad"
            ? (cd.entorno === "pueblo" ? "el " : "la ") + ENTN[cd.entorno]
            : ""
        ]
          .filter(Boolean)
          .join(", ") +
        "."
    );
  // Estación del año
  const est = c.est;
  const malT = est ? ps.filter((p) => fueraTemporada(p, est) !== 0) : [];
  malT.forEach((p) =>
    fallo(
      fueraTemporada(p, est) === null ? 4 : 2,
      Cap(nomP(p)) +
        (/^\S+s\b/i.test(p.nombre) ? " son" : " es") +
        " más de " +
        txtTemporada(p) +
        " que de " +
        TEMPN[est as Temporada] +
        ".",
      [p]
    )
  );
  if (!malT.length && c.est) bien.push("Todo es de temporada (" + TEMPN[c.est] + ").");
  // Color
  const col = ps.filter((p) => p.cat !== "accesorio" && p.cat !== "calzado");
  if (col.length >= 2) {
    let peor: [Prenda, Prenda] | null = null,
      ph = 9,
      sum = 0,
      n = 0;
    for (let i = 0; i < col.length; i++)
      for (let j = i + 1; j < col.length; j++) {
        const h = harm(famDe(col[i]), famDe(col[j]));
        sum += h;
        n++;
        if (h < ph) {
          ph = h;
          peor = [col[i], col[j]];
        }
      }
    if (ph < 1.0 && peor)
      fallo(
        1.5,
        "El " +
          colN(peor[0]) +
          " y el " +
          colN(peor[1]) +
          " no terminan de casar: un neutro tuyo entre los dos lo arregla.",
        [peor[1]]
      );
    else
      bien.push(
        sum / n >= 1.8 ? "Colores: combinación estrella de tu paleta." : "Los colores combinan bien."
      );
  }
  const cara = tops[0] || dress[0];
  if (cara && palDe(cara) === "evita")
    fallo(
      1,
      "El " +
        colN(cara) +
        " junto a la cara no es de tu paleta: acércale un pañuelo, un collar o una capa de tus colores.",
      [cara]
    );
  else if (cara) bien.push("Junto a la cara llevas un color tuyo (" + colN(cara) + ").");
  // Forma
  const amplias = base.filter((p) => p.corte === "amplia");
  if (amplias.length >= 2 && !amplias.every((p) => tejidoDe(p) === "felpa"))
    fallo(1, "Dos prendas anchas: mete la de arriba por delante o cambia una por otra más ajustada.", [
      amplias[0]
    ]);
  // Lo aprendido de tus valoraciones
  const l = aprendido(),
    k = claveDe(ids);
  if (l.veto[k] || l.veto[k + "|o:" + oca.id] || l.veto[k + "|b:" + banda.id])
    fallo(3, "Me dijiste que esta combinación no te convence.");
  else if ((l.par[k] || 0) > 0) bien.push("Ya me dijiste que este te gusta.");
  const raw = s;
  s = Math.max(0, Math.round(s * 2) / 2);
  return { raw, s, v: grave || s < 6 ? "no" : mal.length ? "quiza" : "si", mal, bien, culpa };
}

/** Hasta dos cambios de prenda y, si falta, añade capa o calzado del armario. */
export interface Mejora {
  cambios: { de: Prenda | null; a: Prenda }[];
  ids: string[];
  v: Veredicto;
}
export function mejora(ids: string[], c: Contexto, j: Juicio): Mejora | null {
  let cur = ids.slice(),
    cj = j;
  const cambios: Mejora["cambios"] = [];
  for (let ronda = 0; ronda < 2 && cj.v !== "si"; ronda++) {
    const orden = Object.keys(cj.culpa).sort((a, b) => cj.culpa[b] - cj.culpa[a]);
    let best: { de: Prenda; a: Prenda; ids: string[]; j: Juicio } | null = null,
      bs = cj.raw + 0.5;
    for (const pid of orden.slice(0, 3)) {
      const p = byId(pid);
      if (!p) continue;
      for (const q of activas()) {
        if (q.cat !== p.cat || cur.includes(q.id)) continue;
        const nids = cur.map((id) => (id === pid ? q.id : id)),
          r = juzga(nids, c);
        if (r && r.raw > bs) {
          bs = r.raw;
          best = { de: p, a: q, ids: nids, j: r };
        }
      }
    }
    if (!best) break;
    cambios.push({ de: best.de, a: best.a });
    cur = best.ids;
    cj = best.j;
  }
  const ps = prendasDe(cur),
    has = (cat: Cat) => ps.some((p) => p.cat === cat);
  const faltan: [Cat, boolean][] = [
    ["calzado", ocaDe(c.oca).id !== "casa"],
    ["capa", capaHace(c)]
  ];
  for (const [cat, hace] of faltan) {
    if (!hace || has(cat)) continue;
    let best: { a: Prenda; ids: string[]; j: Juicio } | null = null,
      bs = cj.raw;
    for (const q of activas()) {
      if (q.cat !== cat) continue;
      const nids = cur.concat(q.id),
        r = juzga(nids, c);
      if (r && r.raw >= bs) {
        bs = r.raw;
        best = { a: q, ids: nids, j: r };
      }
    }
    if (best) {
      cambios.push({ de: null, a: best.a });
      cur = best.ids;
      cj = best.j;
    }
  }
  return cambios.length ? { cambios, ids: cur, v: cj.v } : null;
}
