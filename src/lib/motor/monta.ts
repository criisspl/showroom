// Montar outfits para una ocasión y un tiempo.
import { S_OCA, ESTN, TEJN } from "../../data/constants.ts";
import { harm } from "../color.ts";
import type { Cat, Condiciones, Prenda, Temporada } from "../tipos.ts";
import { aprendido, clave2, usos } from "./aprende.ts";
import { bandaDe, ocaDe } from "./contexto.ts";
import { activas, estado, famDe, palDe, txt } from "./estado.ts";
import { casan, corto, estiloDe, fueraTemporada, penCond, tejidoDe } from "./prenda.ts";

/** Un look propuesto por monta(). */
export interface Look {
  ids: string[];
  key: string;
  tips: string[];
  warn: string[];
  esquema: string;
  mezcla: string;
}
interface Candidato {
  ps: Prenda[];
  s: number;
  tomado?: boolean;
}

export function monta(
  ocaId: string,
  bandaId: string,
  lluvia: boolean | undefined,
  seed: unknown,
  evitar?: string[] | null,
  est?: Temporada,
  cond?: Condiciones
): Look[] {
  const oca = ocaDe(ocaId),
    banda = bandaDe(bandaId),
    bc = banda.capa || banda,
    calido = /calor|templado/.test((banda.calido || banda).id);
  const capaSi =
    bc.id === "frio" ||
    bc.id === "fresco" ||
    (bc.id === "templado" && lluvia) ||
    (cond && (cond.viento || cond.entorno === "montana") && bc.id !== "calor");
  const A = activas(),
    by = (c: Cat) => A.filter((p) => p.cat === c),
    SO = S_OCA[oca.id],
    l = aprendido();
  const tops = by("arriba"),
    bots = by("abajo"),
    dress = by("vestido"),
    capas = by("capa"),
    shoes = by("calzado"),
    accs = by("accesorio");
  const rec: Record<string, 1> = {};
  estado.O.filter((o) => o.fecha)
    .sort((a, b) => ((a.fecha as string) < (b.fecha as string) ? 1 : -1))
    .slice(0, 2)
    .forEach((o) =>
      (o.prendas || []).forEach((id) => {
        rec[id] = 1;
      })
    );
  const us = usos();
  const wfit = (p: Prenda) => {
    const a = Number(p.abrigo) || 2,
      d = Math.abs(a - banda.t);
    let s = -d * 0.8;
    if (banda.id === "calor" && a === 3) s -= 2;
    if (banda.id === "frio" && a === 1 && p.cat !== "arriba") s -= 0.6;
    return s;
  };

  function base(ps: Prenda[]): number | null {
    let s = 0;
    const k = ps.map((p) => p.id).join("+");
    if (l.veto[k] || l.veto[k + "|o:" + oca.id] || l.veto[k + "|b:" + banda.id]) return null;
    for (const p of ps) {
      const ft = fueraTemporada(p, est),
        pc = penCond(p, cond, calido);
      if (ft === null || pc === null) return null;
      s -= ft + pc;
    }
    s += l.par[k] || 0;
    ps.forEach((p) => {
      s += l.pie[p.id + "|" + oca.id] || 0;
    });
    if (ps.length === 2)
      s +=
        (l.est[clave2(estiloDe(ps[0]), estiloDe(ps[1]))] || 0) +
        (l.tej[clave2(tejidoDe(ps[0]), tejidoDe(ps[1]))] || 0) +
        (l.col[clave2(famDe(ps[0]), famDe(ps[1]))] || 0) +
        (l.cor[clave2(ps[0].corte || "fluida", ps[1].corte || "fluida")] || 0);
    let so = 0;
    for (const p of ps) {
      const o = SO[estiloDe(p)];
      if (o === null) return null;
      if (/evento/.test(oca.id) && estiloDe(p) === "casual") return null;
      so += o;
    }
    s += (so / ps.length) * 2.2;
    if (oca.id === "casa")
      ps.forEach((p) => {
        const t = tejidoDe(p);
        s += t === "vaquero" ? -0.6 : t === "felpa" || t === "algodon" ? 0.3 : 0;
      });
    if (
      /cita|noche|evento|finde|oficina-formal/.test(oca.id) &&
      !ps.some((p) => /arreglado|fiesta/.test(estiloDe(p)))
    )
      s -= oca.id === "finde" ? 1.2 : /oficina-formal/.test(oca.id) ? 2.5 : 1.5;
    s += ps.reduce((t, p) => t + wfit(p), 0) / ps.length;
    ps.forEach((p) => {
      if (corto(p))
        s +=
          (bc.id === "frio" ? -2 : bc.id === "fresco" ? -0.8 : bc.id === "calor" ? 0.4 : 0) +
          (/evento/.test(oca.id) ? -1.2 : /oficina/.test(oca.id) ? -0.6 : 0);
    });
    if (ps.length === 2) {
      const c = casan(ps[0], ps[1]);
      if (c === null) return null;
      s += c * 1.4 + harm(famDe(ps[0]), famDe(ps[1])) * 0.7;
      const c0 = ps[0].corte,
        c1 = ps[1].corte;
      if (c0 === "amplia" && c1 === "amplia")
        s -= tejidoDe(ps[0]) === "felpa" && tejidoDe(ps[1]) === "felpa" ? 0.2 : 1.5;
      else if (c0 === "amplia" || c1 === "amplia") s += 0.5;
      else if (c0 === "ajustada" && c1 === "ajustada") s -= 0.4;
    } else s += palDe(ps[0]) === "evita" ? 1.4 : 2.2;
    const pc = palDe(ps[0]);
    s += pc === "ok" ? 0.5 : pc === "neutro" ? 0.3 : /noche|concierto/.test(oca.id) ? -0.2 : -0.6;
    ps.forEach((p) => {
      if (rec[p.id]) s -= 0.5;
      if (!us[p.id]) s += 0.2;
    });
    if (seed) s += Math.random() * 1.1;
    return s;
  }
  const cands: Candidato[] = [];
  const prueba = (ps: Prenda[]) => {
    const s = base(ps);
    if (s !== null) cands.push({ ps, s });
  };
  dress.forEach((d) => prueba([d]));
  tops.forEach((t) => bots.forEach((b) => prueba([t, b])));
  cands.sort((a, b) => b.s - a.s);
  const out: Candidato[] = [],
    usados: Record<string, 1> = {},
    key = (c: Candidato) => c.ps.map((p) => p.id).join("+");
  const toma = (estricto: boolean) =>
    cands.forEach((c) => {
      if (out.length >= 3 || c.tomado || c.s < -1.5) return;
      if (estricto && (c.ps.some((p) => usados[p.id]) || (evitar && evitar.includes(key(c))))) return;
      c.tomado = true;
      c.ps.forEach((p) => {
        usados[p.id] = 1;
      });
      out.push(c);
    });
  toma(true);
  if (out.length < Math.min(3, cands.length)) toma(false);

  function mejor(list: Prenda[], ref: Prenda[], fn: (p: Prenda) => number): Prenda | null {
    let b: Prenda | null = null,
      bs = -1.2;
    const kk = ref.map((p) => p.id).join("+");
    list.forEach((p) => {
      const o = SO[estiloDe(p)],
        ft = fueraTemporada(p, est),
        pc = penCond(p, cond, calido);
      if (o === null || ft === null || pc === null || l.comp[p.id + "|" + kk]) return;
      let s = o + fn(p) - ft - pc + (l.pie[p.id + "|" + oca.id] || 0);
      for (const r of ref) {
        const c = casan(p, r);
        if (c === null) return;
        s += c / ref.length + (harm(famDe(p), famDe(r)) / ref.length) * 0.6;
      }
      if (seed) s += Math.random() * 0.4;
      if (s > bs) {
        bs = s;
        b = p;
      }
    });
    return b;
  }
  const yaAcc: Record<string, 1> = {},
    tipsCuerpo = (estado.perfil && estado.perfil.cuerpo && estado.perfil.cuerpo.tips) || [];
  return out.map((c, idx) => {
    const ps = c.ps.slice(),
      tips: string[] = [],
      warn: string[] = [],
      encasa = oca.id === "casa";
    if (!encasa && capaSi) {
      const capa = mejor(
        capas,
        c.ps,
        (p) => -Math.abs((Number(p.abrigo) || 2) - bc.t) * 0.96 + (palDe(p) === "evita" ? -0.2 : 0.3)
      );
      if (capa) ps.push(capa);
      else if (bc.id !== "templado") warn.push("No tienes una capa que encaje con este look.");
    }
    const z = encasa
      ? null
      : mejor(shoes, c.ps, (p) => {
          const t = txt(p);
          let s = 0;
          if (/sandal|chancl|alparg/.test(t)) s += bc.id === "calor" ? 1.2 : bc.id === "templado" ? 0.2 : -2;
          if (/bota|botín|botin/.test(t)) s += bc.id === "calor" ? -1.2 : 0.8;
          if (lluvia) s += /bota|botín|botin|zapatill/.test(t) ? 0.8 : -1;
          if (estiloDe(p) === "deportivo" && c.ps.some((q) => q.cat === "vestido" || /falda/.test(txt(q))))
            s -= 1.5;
          return s;
        });
    if (z) ps.push(z);
    else if (!encasa) warn.push("No tienes calzado que encaje con este look.");
    const ac = encasa
      ? null
      : mejor(accs, c.ps, (p) => {
          const t = txt(p);
          let s = (palDe(p) === "evita" ? -0.3 : 0.4) - (yaAcc[p.id] ? 0.8 : 0);
          if (/gorro|bufanda|guante/.test(t)) s += bc.id === "frio" ? 0.8 : bc.id === "fresco" ? 0 : -4;
          if (/gafas/.test(t))
            s += /noche|evento|casa/.test(oca.id) ? -4 : (banda.calido || banda).id === "calor" ? 0.5 : 0;
          return s;
        });
    if (ac) {
      ps.push(ac);
      yaAcc[ac.id] = 1;
    }
    const t0 = c.ps[0];
    if (!encasa) {
      if (c.ps.length === 2) {
        if (t0.corte === "amplia") tips.push("Mete un pico por delante para dibujar la cintura.");
        else if (c.ps[1].corte === "amplia") tips.push("Arriba cerca del cuerpo: que se vea el tiro.");
      }
      if (tipsCuerpo.length) tips.push(tipsCuerpo[idx % tipsCuerpo.length]);
      if (ps.some((p) => p.cat === "capa")) tips.push("La capa, abierta, para que se vea la cintura.");
      if (palDe(t0) === "evita")
        tips.push(
          "Ese color no es de tu paleta: acerca a la cara un pañuelo, un collar o una capa de tus colores."
        );
      if (lluvia) tips.push("Con lluvia, deja el ante en casa.");
    }
    const fams = c.ps.map(famDe),
      h = c.ps.length === 2 ? harm(fams[0], fams[1]) : null;
    const esquema =
      h == null
        ? palDe(t0) === "evita"
          ? "Una sola pieza, fuera de paleta"
          : "Una sola pieza en tu paleta"
        : fams[0] === fams[1]
          ? "Tonal: dos tonos de la misma familia"
          : h >= 1.8
            ? "Combinación estrella"
            : h >= 1.2
              ? "Colores que combinan bien"
              : "Mezcla justa: un neutro tuyo la arregla";
    const es = c.ps.map(estiloDe),
      ts = c.ps.map(tejidoDe);
    const mezcla =
      (es.length === 2 && es[0] !== es[1]
        ? ESTN[es[0]] + " con " + ESTN[es[1]].toLowerCase()
        : "Todo " + ESTN[es[0]].toLowerCase()) +
      " · " +
      (ts.length === 2 && ts[0] !== ts[1]
        ? TEJN[ts[0]].toLowerCase() + " con " + TEJN[ts[1]].toLowerCase()
        : TEJN[ts[0]].toLowerCase());
    return { ids: ps.map((p) => p.id), key: key(c), tips: tips.slice(0, 3), warn, esquema, mezcla };
  });
}
