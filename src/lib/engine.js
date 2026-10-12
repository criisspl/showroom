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

/* ---------- Contexto: una o varias ocasiones, uno o dos tiempos ---------- */
/** "oficina+finde" → ocasión combinada: solo vale lo que vale en todas, con un margen de formalidad común. */
export function ocaDe(id) {
  let os = String(id || "diario").split("+").map((x) => OCAS.find((o) => o.id === x)).filter(Boolean);
  if (!os.length) os = [OCAS[0]];
  if (os.length === 1) return os[0];
  const key = os.map((o) => o.id).join("+");
  if (!S_OCA[key]) {
    const so = {};
    ["deportivo", "casual", "arreglado", "fiesta"].forEach((e) => {
      const v = os.map((o) => S_OCA[o.id][e]);
      so[e] = v.includes(null) ? null : Math.min(...v) * 0.6 + (v.reduce((a, b) => a + b, 0) / v.length) * 0.4;
    });
    S_OCA[key] = so;
  }
  const f0 = Math.max(...os.map((o) => o.f[0])), f1 = Math.max(f0, Math.min(...os.map((o) => o.f[1])));
  return { id: key, n: os.map((o) => o.n).join(" + "), d: "todo el día fuera, sin pasar por casa: " + os.map((o) => o.n.toLowerCase()).join(" y después "), f: [f0, f1], multi: os };
}
/** "fresco+templado" → la base se elige para la parte cálida y la capa para la fría. */
export function bandaDe(id) {
  let bs = String(id || "templado").split("+").map((x) => BANDAS.find((b) => b.id === x)).filter(Boolean);
  if (!bs.length) bs = [BANDAS[2]];
  if (bs.length === 1) return bs[0];
  bs.sort((a, b) => a.t - b.t);
  const cal = bs[0], fr = bs[bs.length - 1];
  return { id: bs.map((b) => b.id).join("+"), n: "De " + fr.n.toLowerCase() + " a " + cal.n.toLowerCase(), s: "de " + fr.s + " a " + cal.s, t: cal.t * 0.7 + fr.t * 0.3, capa: fr, calido: cal, multi: true };
}
export function capaHace(c) { const b = bandaDe(c.banda), bc = b.capa || b; return bc.id === "frio" || bc.id === "fresco" || (bc.id === "templado" && c.lluvia); }

/* ---------- Montar outfits ---------- */
export function monta(ocaId, bandaId, lluvia, seed, evitar) {
  const oca = ocaDe(ocaId), banda = bandaDe(bandaId), bc = banda.capa || banda;
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
    for (const p of ps) { const o = SO[estiloDe(p)]; if (o === null) return null; if (/evento/.test(oca.id) && estiloDe(p) === "casual") return null; so += o; }
    s += (so / ps.length) * 2.2;
    if (oca.id === "casa") ps.forEach((p) => { const t = tejidoDe(p); s += t === "vaquero" ? -0.6 : t === "felpa" || t === "algodon" ? 0.3 : 0; });
    if (/cita|noche|evento|finde/.test(oca.id) && !ps.some((p) => /arreglado|fiesta/.test(estiloDe(p)))) s -= oca.id === "finde" ? 1.2 : 1.5;
    s += ps.reduce((t, p) => t + wfit(p), 0) / ps.length;
    ps.forEach((p) => { if (corto(p)) s += (bc.id === "frio" ? -2 : bc.id === "fresco" ? -0.8 : bc.id === "calor" ? 0.4 : 0) + (/evento/.test(oca.id) ? -1.2 : /oficina/.test(oca.id) ? -0.6 : 0); });
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
    if (!encasa && (bc.id === "frio" || bc.id === "fresco" || (bc.id === "templado" && lluvia))) {
      const capa = mejor(capas, c.ps, (p) => -Math.abs((+p.abrigo || 2) - bc.t) * 0.96 + (palDe(p) === "evita" ? -0.2 : 0.3));
      if (capa) ps.push(capa); else if (bc.id !== "templado") warn.push("No tienes una capa que encaje con este look.");
    }
    const z = encasa ? null : mejor(shoes, c.ps, (p) => {
      const t = txt(p); let s = 0;
      if (/sandal|chancl|alparg/.test(t)) s += bc.id === "calor" ? 1.2 : bc.id === "templado" ? 0.2 : -2;
      if (/bota|botín|botin/.test(t)) s += bc.id === "calor" ? -1.2 : 0.8;
      if (lluvia) s += /bota|botín|botin|zapatill/.test(t) ? 0.8 : -1;
      if (estiloDe(p) === "deportivo" && c.ps.some((q) => q.cat === "vestido" || /falda/.test(txt(q)))) s -= 1.5;
      return s;
    });
    if (z) ps.push(z); else if (!encasa) warn.push("No tienes calzado que encaje con este look.");
    const ac = encasa ? null : mejor(accs, c.ps, (p) => {
      const t = txt(p); let s = (palDe(p) === "evita" ? -0.3 : 0.4) - (yaAcc[p.id] ? 0.8 : 0);
      if (/gorro|bufanda|guante/.test(t)) s += bc.id === "frio" ? 0.8 : bc.id === "fresco" ? 0 : -4;
      if (/gafas/.test(t)) s += /noche|evento|casa/.test(oca.id) ? -4 : (banda.calido || banda).id === "calor" ? 0.5 : 0;
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

/* ---------- «Lo monto yo»: ¿pega? ---------- */
const PRINC = { arriba: 1, abajo: 1, vestido: 1 };
const nomP = (p) => p.nombre.charAt(0).toLowerCase() + p.nombre.slice(1);
const Cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const colN = (p) => (p.colorN || clasifica(p.color || "#C19A6B", estado.PAL).n).toLowerCase();
export function claveDe(ids) {
  const ps = ids.map(byId).filter(Boolean), d = ps.find((p) => p.cat === "vestido"); if (d) return d.id;
  const t = ps.find((p) => p.cat === "arriba"), b = ps.find((p) => p.cat === "abajo");
  return t && b ? t.id + "+" + b.id : ps.map((p) => p.id).join("+");
}

/**
 * Juzga un look montado por la persona. c = { oca, banda, lluvia } (oca y banda pueden ser combinados con «+»).
 * Devuelve { s (0-10), raw, v: "si"|"quiza"|"no", bien[], mal[], culpa{idPrenda: puntos} }.
 */
export function juzga(ids, c) {
  const oca = ocaDe(c.oca), banda = bandaDe(c.banda), bc = banda.capa || banda, cal = banda.calido || banda, SO = S_OCA[oca.id];
  const ps = ids.map(byId).filter(Boolean), mal = [], bien = [], culpa = {};
  let s = 10, grave = false;
  if (!ps.length) return null;
  const fallo = (pts, t, quien = []) => { s -= pts; mal.push(t); if (pts >= 4) grave = true; quien.forEach((p) => { culpa[p.id] = (culpa[p.id] || 0) + pts; }); };
  const by = (cat) => ps.filter((p) => p.cat === cat);
  const dress = by("vestido"), tops = by("arriba"), bots = by("abajo"), capas = by("capa"), shoes = by("calzado"), base = ps.filter((p) => PRINC[p.cat]);
  if (!dress.length && !(tops.length && bots.length)) fallo(2, tops.length ? "Falta la parte de abajo." : bots.length ? "Falta la parte de arriba." : "Falta la base: algo de arriba y algo de abajo, o un vestido.");
  if (dress.length && bots.length) fallo(1, "Vestido y parte de abajo a la vez: solo funciona si el vestido hace de blusón.", bots);
  if (bots.length > 1) fallo(3, "Dos partes de abajo a la vez.", bots.slice(1));
  // Registro y tejido, por parejas
  const vis = ps.filter((p) => p.cat !== "accesorio");
  let choques = 0;
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
    const p = vis[i], q = vis[j], ep = estiloDe(p), eq = estiloDe(q);
    if (par(S_PAR, ep, eq) === null) { choques++; fallo(4, Cap(nomP(p)) + " (" + ESTN[ep].toLowerCase() + ") y " + nomP(q) + " (" + ESTN[eq].toLowerCase() + ") son de mundos distintos.", [p, q]); continue; }
    if (VISTE[p.cat] && VISTE[q.cat] && par(T_PAR, tejidoDe(p), tejidoDe(q)) === null) { choques++; fallo(3, "El tejido de " + nomP(p) + " (" + TEJN[tejidoDe(p)].toLowerCase() + ") no casa con el de " + nomP(q) + " (" + TEJN[tejidoDe(q)].toLowerCase() + ").", [p, q]); }
  }
  if (!choques && vis.length > 1) {
    const es = [...new Set(vis.map(estiloDe))];
    bien.push(es.length === 1 ? "Todo en registro " + ESTN[es[0]].toLowerCase() + ": coherente." : "Los registros conviven bien (" + es.map((e) => ESTN[e].toLowerCase()).join(" y ") + ") y los tejidos casan.");
  }
  // Ocasión
  const nOca = mal.length;
  ps.forEach((p) => {
    const v = SO[estiloDe(p)];
    if (v === null) fallo(4, Cap(nomP(p)) + " no es para " + oca.n.toLowerCase() + ".", [p]);
    else if (/evento/.test(oca.id) && estiloDe(p) === "casual" && p.cat !== "accesorio") fallo(2, Cap(nomP(p)) + " se queda demasiado informal para un evento.", [p]);
    else if (v <= -1.2) fallo(1, Cap(nomP(p)) + " no es lo más apropiado para " + oca.n.toLowerCase() + ".", [p]);
  });
  if (/cita|noche|evento|finde/.test(oca.id) && !ps.some((p) => /arreglado|fiesta/.test(estiloDe(p)))) fallo(1.5, "Para " + oca.n.toLowerCase() + " le falta un punto arreglado: una prenda más cuidada o un accesorio con brillo.");
  if (mal.length === nOca) bien.push(oca.multi ? "Te sirve para todo el día: " + oca.n.toLowerCase() + "." : "Encaja con «" + oca.n + "».");
  // Tiempo
  const nT = mal.length;
  base.forEach((p) => { if (cal.id === "calor" && +p.abrigo === 3) fallo(2, Cap(nomP(p)) + " da demasiado calor" + (banda.multi ? " para las horas de calor." : "."), [p]); });
  if (!capas.length && capaHace(c)) {
    if (bc.id === "frio" && base.every((p) => (+p.abrigo || 2) <= 1)) fallo(2.5, "Con frío y sin capa vas a pasar frío: añade una chaqueta o un abrigo.");
    else fallo(1.5, (banda.multi ? "Para la parte fresca del día" : "Para este tiempo") + " te falta una capa.");
  }
  capas.forEach((p) => { if (cal.id === "calor" && !banda.multi && +p.abrigo >= 2) fallo(1.5, Cap(nomP(p)) + " sobra con este calor.", [p]); });
  shoes.forEach((p) => {
    const t = txt(p);
    if (/sandal|chancl/.test(t) && (bc.id === "frio" || bc.id === "fresco" || c.lluvia)) fallo(2, Cap(nomP(p)) + " no van con " + (c.lluvia ? "lluvia." : "este frío."), [p]);
    if (c.lluvia && /(^|\s)ante(\s|$)/.test(t)) fallo(1.5, "Con lluvia, " + nomP(p) + " de ante sufren.", [p]);
  });
  ps.forEach((p) => { if (corto(p) && bc.id === "frio") fallo(1.5, Cap(nomP(p)) + " se queda corto para el frío (salvo con medias gruesas).", [p]); });
  if (mal.length === nT) bien.push(banda.multi ? "Va bien para el cambio de temperatura" + (capas.length ? ": capa por la mañana y fuera cuando suba." : ".") : "Va bien para el tiempo que hace.");
  // Color
  const col = ps.filter((p) => p.cat !== "accesorio" && p.cat !== "calzado");
  if (col.length >= 2) {
    let peor = null, ph = 9, sum = 0, n = 0;
    for (let i = 0; i < col.length; i++) for (let j = i + 1; j < col.length; j++) { const h = harm(famDe(col[i]), famDe(col[j])); sum += h; n++; if (h < ph) { ph = h; peor = [col[i], col[j]]; } }
    if (ph < 1.0) fallo(1.5, "El " + colN(peor[0]) + " y el " + colN(peor[1]) + " no terminan de casar: un neutro tuyo entre los dos lo arregla.", [peor[1]]);
    else bien.push(sum / n >= 1.8 ? "Colores: combinación estrella de tu paleta." : "Los colores combinan bien.");
  }
  const cara = tops[0] || dress[0];
  if (cara && palDe(cara) === "evita") fallo(1, "El " + colN(cara) + " junto a la cara no es de tu paleta: acércale un pañuelo, un collar o una capa de tus colores.", [cara]);
  else if (cara) bien.push("Junto a la cara llevas un color tuyo (" + colN(cara) + ").");
  // Forma
  const amplias = base.filter((p) => p.corte === "amplia");
  if (amplias.length >= 2 && !amplias.every((p) => tejidoDe(p) === "felpa")) fallo(1, "Dos prendas anchas: mete la de arriba por delante o cambia una por otra más ajustada.", [amplias[0]]);
  // Lo aprendido de tus valoraciones
  const l = L(), k = claveDe(ids);
  if (l.veto[k] || l.veto[k + "|o:" + oca.id] || l.veto[k + "|b:" + banda.id]) fallo(3, "Me dijiste que esta combinación no te convence.");
  else if ((l.par[k] || 0) > 0) bien.push("Ya me dijiste que este te gusta.");
  const raw = s; s = Math.max(0, Math.round(s * 2) / 2);
  return { raw, s, v: grave || s < 6 ? "no" : mal.length ? "quiza" : "si", mal, bien, culpa };
}

/** Hasta dos cambios de prenda y, si falta, añade capa o calzado del armario. */
export function mejora(ids, c, j) {
  let cur = ids.slice(), cj = j;
  const cambios = [];
  for (let ronda = 0; ronda < 2 && cj.v !== "si"; ronda++) {
    const orden = Object.keys(cj.culpa).sort((a, b) => cj.culpa[b] - cj.culpa[a]);
    let best = null, bs = cj.raw + 0.5;
    orden.slice(0, 3).forEach((pid) => {
      const p = byId(pid); if (!p) return;
      activas().forEach((q) => {
        if (q.cat !== p.cat || cur.includes(q.id)) return;
        const nids = cur.map((id) => (id === pid ? q.id : id)), r = juzga(nids, c);
        if (r && r.raw > bs) { bs = r.raw; best = { de: p, a: q, ids: nids, j: r }; }
      });
    });
    if (!best) break;
    cambios.push({ de: best.de, a: best.a }); cur = best.ids; cj = best.j;
  }
  const ps = cur.map(byId).filter(Boolean), has = (cat) => ps.some((p) => p.cat === cat);
  [["calzado", ocaDe(c.oca).id !== "casa"], ["capa", capaHace(c)]].forEach(([cat, hace]) => {
    if (!hace || has(cat)) return;
    let best = null, bs = cj.raw;
    activas().forEach((q) => { if (q.cat !== cat) return; const nids = cur.concat(q.id), r = juzga(nids, c); if (r && r.raw >= bs) { bs = r.raw; best = { a: q, ids: nids, j: r }; } });
    if (best) { cambios.push({ de: null, a: best.a }); cur = best.ids; cj = best.j; }
  });
  return cambios.length ? { cambios, ids: cur, v: cj.v } : null;
}
