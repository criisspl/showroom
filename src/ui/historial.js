// Pestaña Historial: lo que te has puesto, lo guardado, lo que la app ha aprendido y las altas.
import { $, el, boton, hoyISO, fechaLarga } from "../lib/dom.js";
import { app, estado } from "../state.js";
import { OCAS, BANDAS, ESTN, TEJN, FAMN, CORN } from "../data/constants.js";
import { activas, byId, usos, aprende, ocaDe, bandaDe } from "../lib/engine.js";
import { thumb, falla } from "./comun.js";

export function initHistorial() { app.pinta.historial = pintaHistorial; }

function fila(o, modo) {
  const li = el("li", "a-fit"), oca = o.ocasion ? ocaDe(o.ocasion) : null, banda = o.banda ? bandaDe(o.banda) : null;
  li.appendChild(el("p", "who", (o.fecha ? fechaLarga(o.fecha) + " · " : "") + (oca ? oca.n : "") + (banda ? " · " + banda.n.toLowerCase() : "") + (o.lluvia ? " con lluvia" : "")));
  const ul = el("ul", "a-pieces");
  (o.prendas || []).forEach((id) => { const p = byId(id), it = el("li"); it.appendChild(thumb(p)); it.appendChild(el("span", null, p ? p.nombre : "Prenda eliminada")); ul.appendChild(it); });
  li.appendChild(ul);
  const row = el("div", "a-row");
  if (modo === "fav") row.appendChild(boton("Me lo pongo hoy", "a-btn", (e) => { e.target.disabled = true; app.store.add("outfits", { prendas: o.prendas, ocasion: o.ocasion, banda: o.banda, lluvia: !!o.lluvia, fecha: hoyISO(), fav: false, creada: new Date().toISOString(), origen: o.origen || "local" }).catch(falla); }));
  let armed = false;
  const q = boton("Quitar", "a-btn ghost", () => { if (!armed) { armed = true; q.textContent = "Pulsa otra vez para quitar"; return; } app.store.del("outfits", o.id).catch(falla); });
  row.appendChild(q); li.appendChild(row);
  return li;
}

function pintaVotos(box) {
  box.textContent = "";
  if (!estado.V.length) { box.appendChild(el("p", "a-note", "Cuando valores un outfit con «Sí» o «No», lo que aprenda de ti aparecerá aquí.")); return; }
  const l = aprende(), ul = el("ul", "a-stats");
  [[estado.V.length, estado.V.length === 1 ? "outfit valorado" : "outfits valorados"], [l.si, "te pondrías"], [l.no, "no te pondrías"]].forEach(([n, t]) => { const li = el("li"); li.appendChild(el("b", null, String(n))); li.appendChild(el("span", null, t)); ul.appendChild(li); });
  box.appendChild(ul);
  const frases = [];
  const saca = (t, nombre, tipo) => Object.entries(t).forEach(([k, v]) => {
    if (Math.abs(v) < 0.3) return; const [a, b] = k.split("|");
    frases.push({ v, t: (v < 0 ? "Menos " : "Más ") + (a === b ? tipo + " " + nombre(a) + " con " + nombre(b) : nombre(a) + " con " + nombre(b)) });
  });
  saca(l.est, (x) => (ESTN[x] || x).toLowerCase(), "todo"); saca(l.tej, (x) => (TEJN[x] || x).toLowerCase(), "tejido");
  saca(l.col, (x) => FAMN[x] || x, "tonos"); saca(l.cor, (x) => CORN[x] || x, "corte");
  const vetos = Object.keys(l.veto).length;
  if (vetos) frases.push({ v: -9, t: vetos + (vetos === 1 ? " combinación descartada" : " combinaciones descartadas") });
  if (frases.length) {
    box.appendChild(el("p", "a-month", "Lo que voy aprendiendo"));
    const ch = el("ul", "chips"); frases.sort((a, b) => a.v - b.v).slice(0, 8).forEach((f) => ch.appendChild(el("li", null, f.t))); box.appendChild(ch);
  }
  const row = el("div", "a-row"); row.style.marginTop = "12px"; let armed = false;
  const b = boton("Borrar valoraciones", "a-btn ghost", async () => {
    if (!armed) { armed = true; b.textContent = "Pulsa otra vez para borrarlas todas"; return; }
    b.disabled = true; for (const v of estado.V.slice()) await app.store.del("votos", v.id);
  });
  row.appendChild(b); box.appendChild(row);
}

export function pintaHistorial() {
  const st = $("a-stats"), u = $("a-usos"), f = $("a-favs"), al = $("a-altas");
  [st, u, f, al].forEach((x) => { x.textContent = ""; });
  const us = usos(), A = activas(), P = estado.P, O = estado.O;
  const puestos = O.filter((o) => o.fecha).sort((a, b) => (a.fecha === b.fecha ? ((a.creada || "") < (b.creada || "") ? 1 : -1) : a.fecha < b.fecha ? 1 : -1));
  let top = null; A.forEach((p) => { if (us[p.id] && (!top || us[p.id] > us[top.id])) top = p; });
  [[A.length, A.length === 1 ? "prenda en el armario" : "prendas en el armario"], [puestos.length, puestos.length === 1 ? "outfit anotado" : "outfits anotados"], [A.filter((p) => !us[p.id]).length, "sin estrenar"]]
    .forEach(([n, t]) => { const li = el("li"); li.appendChild(el("b", null, String(n))); li.appendChild(el("span", null, t)); st.appendChild(li); });
  if (top) { const li = el("li"); li.appendChild(el("b", null, us[top.id] + "×")); li.appendChild(el("span", null, "Lo más usado: " + top.nombre)); st.appendChild(li); }
  if (!puestos.length) u.appendChild(el("li", "a-empty", "Cuando pulses «Me lo pongo hoy» en un outfit, aparecerá aquí con su fecha."));
  puestos.slice(0, 60).forEach((o) => u.appendChild(fila(o, "uso")));
  const favs = O.filter((o) => o.fav && !o.fecha).sort((a, b) => ((a.creada || "") < (b.creada || "") ? 1 : -1));
  if (!favs.length) f.appendChild(el("li", "a-empty", "Aquí se quedan los outfits que guardes para otro día."));
  favs.forEach((o) => f.appendChild(fila(o, "fav")));
  pintaVotos($("a-votos"));
  const meses = {}, orden = [];
  P.slice().sort((a, b) => ((a.creada || "") < (b.creada || "") ? 1 : -1)).forEach((p) => { const k = (p.creada || "").slice(0, 7) || "sin-fecha"; if (!meses[k]) { meses[k] = []; orden.push(k); } meses[k].push(p); });
  if (!orden.length) al.appendChild(el("p", "a-note", "Cada prenda que subas quedará aquí con su fecha de alta."));
  orden.forEach((k) => {
    const t = k === "sin-fecha" ? "Sin fecha" : new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    al.appendChild(el("p", "a-month", t + " · " + meses[k].length)); const ul = el("ul", "a-mini");
    meses[k].forEach((p) => { const li = el("li", p.activa === false ? "off" : ""); li.appendChild(thumb(p)); li.appendChild(el("span", null, p.nombre + (p.activa === false ? " (retirada)" : ""))); ul.appendChild(li); });
    al.appendChild(ul);
  });
}
