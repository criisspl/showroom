// Rasgos de una prenda (registro, tejido, temporada) y si dos prendas casan.
import { S_PAR, T_PAR, par, ESTN, TEJN, TEMPN } from "../../data/constants.ts";
import type { DatosPrenda, Condiciones, Estilo, Tejido, Temporada } from "../tipos.ts";
import { VISTE, txt } from "./estado.ts";

/** Registro de la prenda: lo guardado manda; si falta, se deduce del nombre. */
export function estiloDe(p: DatosPrenda): Estilo {
  if (p.estilo && ESTN[p.estilo]) return p.estilo;
  const t = txt(p),
    f = Number(p.formal) || 1;
  if (/ch[aá]ndal|deportiv|trekking|legging|malla|gorra|riñonera/.test(t)) return "deportivo";
  if (/lentejuel|cors[eé]|boquilla|de fiesta/.test(t) || f === 3) return "fiesta";
  if (/sudadera|camiseta|vaquer|bermuda|zapatilla/.test(t)) return "casual";
  return f >= 2 ? "arreglado" : "casual";
}
export function tejidoDe(p: DatosPrenda): Tejido {
  if (p.tejido && TEJN[p.tejido]) return p.tejido;
  const t = txt(p);
  if (/sudadera|ch[aá]ndal|felpa/.test(t)) return "felpa";
  if (/vaquer|denim|pana/.test(t)) return "vaquero";
  if (/jersey|punto|c[aá]rdigan|crochet|calado|gorro|chaleco/.test(t)) return "punto";
  if (/sat[eé]n|lencer|terciopelo|brocado|lentejuel|seda/.test(t)) return "saten";
  if (/encaje|gasa|bambula|bordad|lino|plisad|volantes/.test(t)) return "ligero";
  if (/piel|cuero|(^|\s)ante(\s|$)/.test(t)) return "piel";
  return "algodon";
}
/** ¿Pueden ir juntas? null si no; si sí, cuánto suman registro y tejido. */
export function casan(p: DatosPrenda, q: DatosPrenda): number | null {
  const e = par(S_PAR, estiloDe(p), estiloDe(q));
  if (e === null) return null;
  if (!VISTE[p.cat] || !VISTE[q.cat]) return e;
  const t = par(T_PAR, tejidoDe(p), tejidoDe(q));
  if (t === null) return null;
  return e + t;
}
export const corto = (p: DatosPrenda) => /short|mini|bermuda/.test(txt(p));

/* ---------- Estación del año ---------- */
/** Temporadas de una prenda: las que guardó la persona; si no, se deducen del nombre y del abrigo. */
export function temporadaDe(p: DatosPrenda): { t: Temporada[]; fija: boolean } {
  if (Array.isArray(p.temporada) && p.temporada.length) return { t: p.temporada, fija: true };
  const t = txt(p),
    a = Number(p.abrigo) || 2;
  if (
    /abrigo|plumas|plumífero|borrego|gorro|bufanda|guante|terciopelo|(^|\s)(pana|lana)(\s|$)|forro polar/.test(
      t
    ) ||
    a === 3
  )
    return { t: ["otono", "invierno"], fija: false };
  if (
    /sandalia|chancla|alpargata|bikini|bañador|(^|\s)lino(\s|$)|crochet|bambula|(^|\s)short|bermuda|tirantes|palabra de honor|bandeau/.test(
      t
    )
  )
    return { t: ["primavera", "verano"], fija: false };
  if (/bota|botín|botin|jersey|sudadera|cárdigan|cardigan|chaqueta|medias/.test(t))
    return { t: ["primavera", "otono", "invierno"], fija: false };
  return { t: ["primavera", "verano", "otono", "invierno"], fija: false };
}
/** 0 si es de temporada; 2.5 si es de la estación de al lado; null (no se usa) si es la contraria o la marcaste de otra. */
export function fueraTemporada(p: DatosPrenda, est: Temporada | undefined): number | null {
  if (!est) return 0;
  const x = temporadaDe(p);
  if (x.t.includes(est)) return 0;
  if (x.fija) return null;
  const veraniega = x.t.includes("verano") && !x.t.includes("invierno"),
    invernal = x.t.includes("invierno") && !x.t.includes("verano");
  if ((veraniega && est === "invierno") || (invernal && est === "verano")) return null;
  return 2.5;
}
/* ---------- Condiciones: viento, humedad y dónde vas a estar ---------- */
/** Penalizaciones (y algún premio, en negativo) de una prenda según las condiciones del día: [puntos, texto]. */
export function condiciones(
  p: DatosPrenda,
  cd: Condiciones | undefined,
  calido = false
): [number, string | null][] {
  const out: [number, string | null][] = [];
  if (!cd) return out;
  const t = txt(p),
    tej = tejidoDe(p),
    n = p.nombre.charAt(0).toLowerCase() + p.nombre.slice(1),
    N = n.charAt(0).toUpperCase() + n.slice(1);
  const tacon = /tac[oó]n|salones?|stiletto|aguja/.test(t),
    tacFino = /aguja|stiletto|salones?/.test(t) || (tacon && !/ancho|bajo|cuña/.test(t));
  const sand = /sandal|chancl|alpargat/.test(t),
    botas = /bota|botín|botin/.test(t),
    plano = /zapatilla|bota|botín|botin|trekking|mocas/.test(t) && !tacon;
  const falda = p.cat === "vestido" || /falda|minifalda/.test(t),
    vuelo =
      falda &&
      (/vuelo|plisad|volante|lencer|gasa|mini|campana|satén|saten/.test(t) ||
        tej === "ligero" ||
        tej === "saten");
  if (cd.viento) {
    if (vuelo) out.push([1.5, "Con viento, " + n + " se te va a levantar."]);
    if (/sombrero|pamela/.test(t)) out.push([2, "Con viento, " + n + " sale volando."]);
    if (p.cat === "capa" && /vaquer|bomber|gabardina|trench|chaqueta|cazadora|piel/.test(t))
      out.push([-0.6, null]);
  }
  if (cd.humedad) {
    if (calido && p.cat !== "accesorio" && (tej === "saten" || tej === "piel" || tej === "felpa"))
      out.push([1.2, "Con calor húmedo, " + n + " no transpira."]);
    if (/(^|\s)ante(\s|$)/.test(t)) out.push([1, "La humedad estropea el ante (" + n + ")."]);
    if (calido && (/lino|algod/.test(t) || tej === "algodon")) out.push([-0.4, null]);
  }
  if (cd.entorno === "montana") {
    if (p.cat === "calzado") {
      if (tacon) out.push([4, "En la montaña, mejor calzado plano y cerrado que " + n + "."]);
      else if (sand) out.push([2.5, "Para la montaña, mejor calzado cerrado que " + n + "."]);
      else if (plano) out.push([-1, null]);
    }
    if (estiloDe(p) === "fiesta") out.push([4, N + " no pega en la montaña."]);
    if (falda)
      out.push([2.5, "En la montaña, mejor pantalón que " + n + ": para andar y subir, más cómodo."]);
  }
  if (cd.entorno === "playa") {
    if (botas) out.push([2, N + " dan demasiado calor para la playa."]);
    if (tacFino) out.push([2, "En la arena, " + n + " se hunden."]);
    if (
      p.cat !== "accesorio" &&
      p.cat !== "calzado" &&
      (/pana|felpa/.test(t) || tej === "felpa" || tej === "piel")
    )
      out.push([1.5, N + " es pesado para la playa."]);
    if (sand) out.push([-1, null]);
  }
  if (cd.entorno === "pueblo") {
    if (tacFino) out.push([1.5, "Por el empedrado del pueblo, mejor tacón ancho o plano que " + n + "."]);
    if (p.cat === "calzado" && plano) out.push([-0.4, null]);
  }
  return out;
}
export function penCond(p: DatosPrenda, cd: Condiciones | undefined, calido: boolean): number | null {
  let s = 0;
  for (const [pts] of condiciones(p, cd, calido)) {
    if (pts >= 4) return null;
    s += pts;
  }
  return s;
}
export const txtTemporada = (p: DatosPrenda) => {
  const x = temporadaDe(p).t;
  return x.length === 4 ? "todo el año" : x.map((e) => TEMPN[e]).join(" y ");
};
