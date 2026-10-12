// Motor de outfits: decide qué prendas casan (registro, tejido, forma, color, ocasión y tiempo)
// y aprende de las valoraciones de la persona.
import { OCAS, BANDAS, S_PAR, S_OCA, T_PAR, par, ESTN, TEJN, CATN } from "../data/constants.js";
import { clasifica, familia, harm, lab } from "./color.js";

export const estado = { P: [], O: [], V: [], PAL: [], perfil: null, L: null };
export function setEstado(patch) { Object.assign(estado, patch); if ("V" in patch) estado.L = null; }

export const VISTE = { arriba: 1, abajo: 1, vestido: 1, capa: 1 };
export const activas = () => estado.P.filter((p) => p.activa !== false);
export const byId = (id) => estado.P.find((p) => p.id === id) || null;
export const txt = (p) => ((p.nombre || p.n || "") + " " + (p.tipo || "")).toLowerCase();
export const famDe = (p) => p.fam || familia(p.color || "#C19A6B");
export const palDe = (p) => clasifica(p.color || "#C19A6B", estado.PAL).tipo;

/** Registro de la prenda: lo guardado manda; si falta, se deduce del nombre. */
export function estiloDe(p) {
  if (p.estilo && ESTN[p.estilo]) return p.estilo;
  const t = txt(p), f = +p.formal || 1;
  if (/ch[aá]ndal|deportiv|trekking|legging|malla|gorra|riñonera/.test(t)) return "deportivo";
  if (/lentejuel|cors[eé]|boquilla|de fiesta/.test(t) || f === 3) return "fiesta";
  if (/sudadera|camiseta|vaquer|bermuda|zapatilla/.test(t)) return "casual";
  return f >= 2 ? "arreglado" : "casual";
}
export function tejidoDe(p) {
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
export function casan(p, q) {
  const e = par(S_PAR, estiloDe(p), estiloDe(q)); if (e === null) return null;
  if (!VISTE[p.cat] || !VISTE[q.cat]) return e;
  const t = par(T_PAR, tejidoDe(p), tejidoDe(q)); if (t === null) return null;
  return e + t;
}
const corto = (p) => /short|mini|bermuda/.test(txt(p));
export const clave2 = (a, b) => [a, b].sort().join("|");

export function usos() { const m = {}; estado.O.forEach((o) => { if (o.fecha) (o.prendas || []).forEach((id) => { m[id] = (m[id] || 0) + 1; }); }); return m; }

/* ---------- Aprendizaje a partir de las valoraciones ---------- */
export function aprende() {
  const l = { par: {}, veto: {}, est: {}, tej: {}, col: {}, cor: {}, pie: {}, comp: {}, si: 0, no: 0 };
  const mas = (t, k, d, lo, hi) => { t[k] = Math.max(lo, Math.min(hi, (t[k] || 0) + d)); };
  estado.V.forEach((v) => {
    if (!v || !v.key) return;
    const m = v.motivos || [], pz = v.piezas || [], base = v.key.split("+");
    const dos = (v.est || []).length === 2 && (v.tej || []).length === 2 && (v.fam || []).length === 2;
    if (v.voto === "si") {
      l.si++; mas(l.par, v.key, 0.8, -9, 1.6);
      if (dos) { mas(l.est, clave2(v.est[0], v.est[1]), 0.15, -2, 0.6); mas(l.tej, clave2(v.tej[0], v.tej[1]), 0.15, -2, 0.6); mas(l.col, clave2(v.fam[0], v.fam[1]), 0.15, -2, 0.6); }
      return;
    }
    if (v.voto !== "no") return;
    l.no++;
    let ctx = false, mezcla = false;
    if (m.includes("ocasion")) { l.veto[v.key + "|o:" + v.ocasion] = 1; ctx = true; }
    if (m.includes("tiempo")) { l.veto[v.key + "|b:" + v.banda] = 1; ctx = true; }
    if (dos) {
      if (m.includes("estilos")) { mas(l.est, clave2(v.est[0], v.est[1]), -0.5, -2, 0.6); mezcla = true; }
      if (m.includes("tejidos")) { mas(l.tej, clave2(v.tej[0], v.tej[1]), -0.5, -2, 0.6); mezcla = true; }
      if (m.includes("colores")) { mas(l.col, clave2(v.fam[0], v.fam[1]), -0.5, -2, 0.6); mezcla = true; }
      if (m.includes("forma") && (v.cor || []).length === 2) { mas(l.cor, clave2(v.cor[0], v.cor[1]), -0.5, -2, 0.6); mezcla = true; }
    }
    const soloComp = pz.length > 0 && pz.every((id) => !base.includes(id));
    pz.forEach((id) => { if (base.includes(id)) mas(l.pie, id + "|" + v.ocasion, -1.2, -4, 0); else { l.comp[id + "|" + v.key] = 1; mas(l.pie, id + "|" + v.ocasion, -0.8, -4, 0); } });
    if (!ctx && !(soloComp && !mezcla)) l.veto[v.key] = 1;
  });
  return l;
}
const L = () => estado.L || (estado.L = aprende());

/* ---------- Montar outfits ---------- */
export function monta(ocaId, bandaId, lluvia, seed, evitar) {
  const oca = OCAS.find((o) => o.id === ocaId) || OCAS[0], banda = BANDAS.find((b) => b.id === bandaId) || BANDAS[2];
  const A = activas(), by = (c) => A.filter((p) => p.cat === c), SO = S_OCA[oca.id], l = L();
  const tops = by("arriba"), bots = by("abajo"), dress = by("vestido"), capas = by("capa"), shoes = by("calzado"), accs = by("accesorio");
  const rec = {};
  estado.O.filter((o) => o.fecha).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 2).forEach((o) => (o.prendas || []).forEach((id) => { rec[id] = 1; }));
  const us = usos();
  const wfit = (p) => { const a = +p.abrigo || 2, d = Math.abs(a - banda.t); let s = -d * 0.8; if (banda.id === "calor" && a === 3) s -= 2; if (banda.id === "frio" && a === 1 && p.cat !== "arriba") s -= 0.6; return s; };

  function base(ps) {
    let s = 0;
    const k = ps.map((p) => p.id).join("+");
    if (l.veto[k] || l.veto[k + "|o:" + oca.id] || l.veto[k + "|b:" + banda.id]) return null;
    s += l.par[k] || 0; ps.forEach((p) => { s += l.pie[p.id + "|" + oca.id] || 0; });
    if (ps.length === 2) s += (l.est[clave2(estiloDe(ps[0]), estiloDe(ps[1]))] || 0) + (l.tej[clave2(tejidoDe(ps[0]), tejidoDe(ps[1]))] || 0) + (l.col[clave2(famDe(ps[0]), famDe(ps[1]))] || 0) + (l.cor[clave2(ps[0].corte || "fluida", ps[1].corte || "fluida")] || 0);
    let so = 0;
    for (const p of ps) { const o = SO[estiloDe(p)]; if (o === null) return null; if (oca.id === "evento" && estiloDe(p) === "casual") return null; so += o; }
    s += (so / ps.length) * 2.2;
    if (oca.id === "casa") ps.forEach((p) => { const t = tejidoDe(p); s += t === "vaquero" ? -0.6 : t === "felpa" || t === "algodon" ? 0.3 : 0; });
    if (/cita|noche|evento|finde/.test(oca.id) && !ps.some((p) => /arreglado|fiesta/.test(estiloDe(p)))) s -= oca.id === "finde" ? 1.2 : 1.5;
    s += ps.reduce((t, p) => t + wfit(p), 0) / ps.length;
    ps.forEach((p) => { if (corto(p)) s += (banda.id === "frio" ? -2 : banda.id === "fresco" ? -0.8 : banda.id === "calor" ? 0.4 : 0) + (oca.id === "evento" ? -1.2 : oca.id === "oficina" ? -0.6 : 0); });
    if (ps.length === 2) {
      const c = casan(ps[0], ps[1]); if (c === null) return null;
      s += c * 1.4 + harm(famDe(ps[0]), famDe(ps[1])) * 0.7;
      const c0 = ps[0].corte, c1 = ps[1].corte;
      if (c0 === "amplia" && c1 === "amplia") s -= tejidoDe(ps[0]) === "felpa" && tejidoDe(ps[1]) === "felpa" ? 0.2 : 1.5;
      else if (c0 === "amplia" || c1 === "amplia") s += 0.5;
      else if (c0 === "ajustada" && c1 === "ajustada") s -= 0.4;
    } else s += palDe(ps[0]) === "evita" ? 1.4 : 2.2;
    const pc = palDe(ps[0]); s += pc === "ok" ? 0.5 : pc === "neutro" ? 0.3 : /noche|concierto/.test(oca.id) ? -0.2 : -0.6;
    ps.forEach((p) => { if (rec[p.id]) s -= 0.5; if (!us[p.id]) s += 0.2; });
    if (seed) s += Math.random() * 1.1;
    return s;
  }
  const cands = [];
  const prueba = (ps) => { const s = base(ps); if (s !== null) cands.push({ ps, s }); };
  dress.forEach((d) => prueba([d]));
  tops.forEach((t) => bots.forEach((b) => prueba([t, b])));
  cands.sort((a, b) => b.s - a.s);
  const out = [], usados = {}, key = (c) => c.ps.map((p) => p.id).join("+");
  const toma = (estricto) => cands.forEach((c) => {
    if (out.length >= 3 || c.tomado || c.s < -1.5) return;
    if (estricto && (c.ps.some((p) => usados[p.id]) || (evitar && evitar.includes(key(c))))) return;
    c.tomado = true; c.ps.forEach((p) => { usados[p.id] = 1; }); out.push(c);
  });
  toma(true); if (out.length < Math.min(3, cands.length)) toma(false);

  function mejor(list, ref, fn) {
    let b = null, bs = -1.2;
    const kk = ref.map((p) => p.id).join("+");
    list.forEach((p) => {
      const o = SO[estiloDe(p)]; if (o === null || l.comp[p.id + "|" + kk]) return;
      let s = o + fn(p) + (l.pie[p.id + "|" + oca.id] || 0);
      for (const r of ref) { const c = casan(p, r); if (c === null) return; s += c / ref.length + (harm(famDe(p), famDe(r)) / ref.length) * 0.6; }
      if (seed) s += Math.random() * 0.4;
      if (s > bs) { bs = s; b = p; }
    });
    return b;
  }
  const yaAcc = {}, tipsCuerpo = (estado.perfil && estado.perfil.cuerpo && estado.perfil.cuerpo.tips) || [];
  return out.map((c, idx) => {
    const ps = c.ps.slice(), tips = [], warn = [], encasa = oca.id === "casa";
    if (!encasa && (banda.id === "frio" || banda.id === "fresco" || (banda.id === "templado" && lluvia))) {
      const capa = mejor(capas, c.ps, (p) => wfit(p) * 1.2 + (palDe(p) === "evita" ? -0.2 : 0.3));
      if (capa) ps.push(capa); else if (banda.id !== "templado") warn.push("No tienes una capa que encaje con este look.");
    }
    const z = encasa ? null : mejor(shoes, c.ps, (p) => {
      const t = txt(p); let s = 0;
      if (/sandal|chancl|alparg/.test(t)) s += banda.id === "calor" ? 1.2 : banda.id === "templado" ? 0.2 : -2;
      if (/bota|botín|botin/.test(t)) s += banda.id === "calor" ? -1.2 : 0.8;
      if (lluvia) s += /bota|botín|botin|zapatill/.test(t) ? 0.8 : -1;
      if (estiloDe(p) === "deportivo" && c.ps.some((q) => q.cat === "vestido" || /falda/.test(txt(q)))) s -= 1.5;
      return s;
    });
    if (z) ps.push(z); else if (!encasa) warn.push("No tienes calzado que encaje con este look.");
    const ac = encasa ? null : mejor(accs, c.ps, (p) => {
      const t = txt(p); let s = (palDe(p) === "evita" ? -0.3 : 0.4) - (yaAcc[p.id] ? 0.8 : 0);
      if (/gorro|bufanda|guante/.test(t)) s += banda.id === "frio" ? 0.8 : banda.id === "fresco" ? 0 : -4;
      if (/gafas/.test(t)) s += /noche|evento|casa/.test(oca.id) ? -4 : banda.id === "calor" ? 0.5 : 0;
      return s;
    });
    if (ac) { ps.push(ac); yaAcc[ac.id] = 1; }
    const t0 = c.ps[0];
    if (!encasa) {
      if (c.ps.length === 2) {
        if (t0.corte === "amplia") tips.push("Mete un pico por delante para dibujar la cintura.");
        else if (c.ps[1].corte === "amplia") tips.push("Arriba cerca del cuerpo: que se vea el tiro.");
      }
      if (tipsCuerpo.length) tips.push(tipsCuerpo[idx % tipsCuerpo.length]);
      if (ps.some((p) => p.cat === "capa")) tips.push("La capa, abierta, para que se vea la cintura.");
      if (palDe(t0) === "evita") tips.push("Ese color no es de tu paleta: acerca a la cara un pañuelo, un collar o una capa de tus colores.");
      if (lluvia) tips.push("Con lluvia, deja el ante en casa.");
    }
    const fams = c.ps.map(famDe), h = c.ps.length === 2 ? harm(fams[0], fams[1]) : null;
    const esquema = h == null ? (palDe(t0) === "evita" ? "Una sola pieza, fuera de paleta" : "Una sola pieza en tu paleta")
      : fams[0] === fams[1] ? "Tonal: dos tonos de la misma familia" : h >= 1.8 ? "Combinación estrella" : h >= 1.2 ? "Colores que combinan bien" : "Mezcla justa: un neutro tuyo la arregla";
    const es = c.ps.map(estiloDe), ts = c.ps.map(tejidoDe);
    const mezcla = (es.length === 2 && es[0] !== es[1] ? ESTN[es[0]] + " con " + ESTN[es[1]].toLowerCase() : "Todo " + ESTN[es[0]].toLowerCase())
      + " · " + (ts.length === 2 && ts[0] !== ts[1] ? TEJN[ts[0]].toLowerCase() + " con " + TEJN[ts[1]].toLowerCase() : TEJN[ts[0]].toLowerCase());
    return { ids: ps.map((p) => p.id), key: key(c), tips: tips.slice(0, 3), warn, esquema, mezcla };
  });
}

/* ---------- ¿Lo compro? ---------- */
export function tipoClave(p) {
  const m = /(camiseta|top|blusa|camisa|jersey|cárdigan|cardigan|sudadera|chaleco|chaqueta|abrigo|gabardina|capa|falda|pantal|vaquero|short|bermuda|mallas|vestido|bota|botín|botin|zapatilla|zapato|merceditas|sandalia|bolso|pañuelo|bandana|cinturón|gafas|gorro|pendiente|collar)/.exec(txt(p));
  return m ? m[1].replace("botín", "botin").replace("cárdigan", "cardigan") : p.cat;
}
const COMPI = { arriba: ["abajo"], abajo: ["arriba"], vestido: ["capa", "calzado"], capa: ["arriba", "abajo", "vestido"], calzado: ["abajo", "vestido"], accesorio: ["arriba", "vestido"] };
export function companeros(n) {
  const cats = COMPI[n.cat] || [], res = [];
  activas().forEach((p) => {
    if (!cats.includes(p.cat)) return;
    const c = casan(n, p); if (c === null) return;
    if (n.corte === "amplia" && p.corte === "amplia" && VISTE[n.cat] && VISTE[p.cat] && !(tejidoDe(n) === "felpa" && tejidoDe(p) === "felpa")) return;
    if (!VISTE[n.cat] && estiloDe(n) !== "deportivo" && estiloDe(p) === "deportivo") return;
    const s = c + harm(famDe(n), famDe(p)) * 0.7;
    if (s >= 0.9) res.push({ p, s });
  });
  return res.sort((a, b) => b.s - a.s);
}
export function evalua(n, deseos) {
  const pro = [], contra = [], A = activas(), c = clasifica(n.color, estado.PAL), t = txt(n);
  let s = 0;
  const cerca = n.cat === "arriba" || n.cat === "vestido" || /pañuelo|bandana|pendiente|collar|bufanda/.test(t);
  if (c.tipo === "ok") { s += 2; pro.push("El " + c.n.toLowerCase() + " es de tu paleta."); }
  else if (c.tipo === "neutro") { s += 1; pro.push(c.n + " es un neutro tuyo: combina con casi todo."); }
  else { s -= cerca ? 2.5 : 1; contra.push(c.n + " no es de tu paleta" + (cerca ? " y va junto a la cara." : "; lejos de la cara se salva.")); }
  const cuerpo = (estado.perfil && estado.perfil.cuerpo) || {};
  const pal = (x) => (x || "").toLowerCase().split(/[^a-záéíóúñ]+/).filter((w) => w.length > 3);
  const malos = (cuerpo.evita || []).flatMap(pal), buenos = (cuerpo.si || []).flatMap(pal), mias = pal(t);
  if (mias.some((w) => malos.includes(w)) || /l[aá]piz|tiro bajo|hombrera|aguja|r[ií]gid/.test(t) && malos.length === 0) { s -= 1.5; contra.push("Ese corte no es de los que más te favorecen."); }
  else if (mias.some((w) => buenos.includes(w)) || n.corte === "fluida") { s += 1; pro.push("La forma va con tu tipo de cuerpo."); }
  const est = (estado.perfil && estado.perfil.estetica) || {}, claves = (est.claves || []).flatMap(pal);
  if (claves.length && mias.some((w) => claves.includes(w))) { s += 0.8; pro.push("Encaja con tu estética" + (est.nombre ? ": " + est.nombre.toLowerCase() : "") + "."); }
  const so = companeros(n), k = so.length;
  if (k >= 6) { s += 2; pro.push("Combina con " + k + " prendas que ya tienes."); }
  else if (k >= 3) { s += 1; pro.push("Combina con " + k + " prendas que ya tienes."); }
  else if (k === 0) { s -= 2; contra.push("No casa con nada de tu armario: te obligaría a comprar más cosas."); }
  else contra.push("Solo combina con " + k + (k === 1 ? " prenda" : " prendas") + " de tu armario.");
  const cnt = A.filter((p) => p.cat === n.cat).length;
  if (cnt <= 1) { s += 1.5; pro.push("Cubre un hueco: " + (cnt ? "solo tienes una prenda" : "no tienes nada") + " de " + (CATN[n.cat] || n.cat).toLowerCase() + "."); }
  const dup = A.filter((p) => p.cat === n.cat && famDe(p) === c.fam && estiloDe(p) === estiloDe(n) && tejidoDe(p) === tejidoDe(n) && tipoClave(p) === tipoClave(n))
    .sort((a, b) => pal(txt(b)).filter((w) => mias.includes(w)).length - pal(txt(a)).filter((w) => mias.includes(w)).length)[0];
  if (dup) { s -= 1.5; contra.push("Ya tienes algo muy parecido: " + dup.nombre + "."); }
  const w = (deseos || []).find((x) => x.cat === n.cat && tipoClave(x) === tipoClave(n) && (x.cols || []).some((kk) => familia(kk[1]) === c.fam));
  if (w) { s += 1; pro.push("Es de las prendas que te faltan: " + w.n.toLowerCase() + "."); }
  const ocas = OCAS.filter((o) => { const v = S_OCA[o.id][estiloDe(n)]; return v !== null && v > 0 && !(o.id === "casa" && (!VISTE[n.cat] || n.cat === "capa")); }).map((o) => o.n.toLowerCase());
  const v = s >= 4 ? "si" : s >= 1.5 ? "quiza" : "no";
  return {
    v, s, pro, contra, socios: so.slice(0, 4).map((x) => x.p), ocas,
    resumen: v === "si" ? "Merece la pena: suma más de lo que cuesta." : v === "quiza" ? "Tiene cosas buenas, pero mira bien lo que juega en contra." : "No te va a compensar: piensa en otra versión."
  };
}
export { lab };
