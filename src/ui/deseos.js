// Pestaña Deseos: las prendas que le faltan a tu armario según tu análisis, y las que añades tú.
import { $, el, boton, radios, setVal, pinA } from "../lib/dom.js";
import { app, estado } from "../state.js";
import { CATN } from "../data/constants.ts";
import { activas, casan, famDe, palDe } from "../lib/engine.ts";
import { partesDeArribaEnPaleta } from "../lib/armario.ts";
import { clasifica, familia, harm } from "../lib/color.ts";
import { icono, ver, falla } from "./comun.js";
import { abreForm } from "./armario.js";

const WFIL = [
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
const WCOMBI = {
  arriba: ["abajo"],
  abajo: ["arriba"],
  vestido: ["capa", "calzado"],
  capa: ["arriba", "vestido", "abajo"],
  calzado: ["abajo", "vestido"]
};
const VERD = { si: "cómprala", quiza: "piénsatelo", no: "mejor no" };
const WSTAR =
  "<svg viewBox='-20 -20 40 40' aria-hidden='true' focusable='false'><path d='M0,-16 Q2,-2 16,0 Q2,2 0,16 Q-2,2 -16,0 Q-2,-2 0,-16 Z' fill='currentColor'/></svg>";

export function initDeseos() {
  radios($("w-filter"), "w-filter", WFIL, "top");
  document.querySelectorAll('input[name="w-filter"]').forEach((i) =>
    i.addEventListener("change", () => {
      app.ui.wfil = i.value;
      pintaDeseos();
    })
  );
  $("w-own").addEventListener("submit", nuevoDeseo);
  app.pinta.deseos = pintaDeseos;
}

/** Marca una prenda del catálogo como «quiero», «tengo» o «no» (o la quita con null). */
export async function ponDeseo(id, estadoD) {
  try {
    if (estadoD) {
      app.D[id] = { ...app.D[id], id, estado: estadoD };
      await app.store.set("deseos", id, { estado: estadoD, cuando: new Date().toISOString() });
    } else {
      delete app.D[id];
      await app.store.del("deseos", id);
    }
  } catch (e) {
    falla(e);
  }
  pintaDeseos();
}

function compa(w, hex) {
  const cats = WCOMBI[w.cat];
  if (!cats) return "";
  const fam = familia(hex);
  const c = activas()
    .filter((p) => cats.includes(p.cat) && p.nombre && casan(w, p) !== null)
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
function alArmario(pre) {
  app.ui.vuelveA = "deseos";
  ver("armario");
  abreForm(null, pre);
}

function tarjeta(w) {
  const st = app.D[w.id] && app.D[w.id].estado,
    li = el("li", "card w-item" + (st === "tengo" ? " got" : ""));
  const ci = Math.min(app.ui.wcol[w.id] || 0, w.cols.length - 1),
    col = w.cols[ci];
  const pic = icono(w.icono, col[1]);
  li.appendChild(pic);
  const body = el("div", "w-body");
  if (w.top) body.appendChild(el("span", "w-top", "Empieza aquí"));
  body.appendChild(el("h3", null, w.n));
  const sw = el("div", "w-sw"),
    cn = el("span", "w-cn", col[0] || clasifica(col[1], estado.PAL).n),
    co = el("p", "w-co", compa(w, col[1]));
  co.hidden = !co.textContent;
  w.cols.forEach((c, i) => {
    const b = el("button");
    b.type = "button";
    b.style.background = c[1];
    b.setAttribute("aria-label", "Verla en " + (c[0] || clasifica(c[1], estado.PAL).n).toLowerCase());
    b.setAttribute("aria-pressed", i === ci ? "true" : "false");
    b.addEventListener("click", () => {
      app.ui.wcol[w.id] = i;
      pic.style.color = c[1];
      cn.textContent = c[0] || clasifica(c[1], estado.PAL).n;
      co.textContent = compa(w, c[1]);
      co.hidden = !co.textContent;
      sw.querySelectorAll("button").forEach((x, j) =>
        x.setAttribute("aria-pressed", j === i ? "true" : "false")
      );
    });
    sw.appendChild(b);
  });
  sw.appendChild(cn);
  body.appendChild(sw);
  if (w.nota) body.appendChild(el("p", "w-nota", w.nota));
  body.appendChild(co);
  li.appendChild(body);
  const foot = el("div", "w-foot"),
    r1 = el("div", "a-row"),
    r2 = el("div", "a-row");
  r1.appendChild(pinA(w.q1 || w.n, "Pinterest: la prenda"));
  r1.appendChild(pinA(w.q2 || w.n + " outfit", "Outfits con ella"));
  foot.appendChild(r1);
  if (st === "tengo") {
    r2.appendChild(el("span", "a-msg", "Ya la tienes."));
    r2.appendChild(boton("Deshacer", "a-btn ghost", () => ponDeseo(w.id, null)));
  } else {
    const q = boton(st === "quiero" ? "En mi lista" : "La quiero", "a-btn ghost", () =>
      ponDeseo(w.id, st === "quiero" ? null : "quiero")
    );
    q.setAttribute("aria-pressed", st === "quiero" ? "true" : "false");
    r2.appendChild(q);
    r2.appendChild(
      boton("Ya la tengo", "a-btn ghost", () => {
        const c = w.cols[Math.min(app.ui.wcol[w.id] || 0, w.cols.length - 1)];
        ponDeseo(w.id, "tengo");
        alArmario({
          nombre: w.n,
          cat: w.cat,
          tipo: w.tipo,
          color: c[1],
          corte: w.corte,
          abrigo: w.abrigo,
          estilo: w.estilo,
          tejido: w.tejido
        });
      })
    );
  }
  foot.appendChild(r2);
  li.appendChild(foot);
  return li;
}

function tarjetaPropia(d) {
  const li = el("li", "card w-item"),
    pic = el("div", "w-pic");
  if (d.foto) {
    pic.className = "w-pic foto";
    app.store.urlFoto(d.foto).then((u) => {
      if (u) {
        const im = new Image();
        im.alt = "";
        im.src = u;
        pic.appendChild(im);
      } else pic.innerHTML = WSTAR;
    });
  } else {
    pic.innerHTML = WSTAR;
    if (d.color) pic.style.color = d.color;
  }
  li.appendChild(pic);
  const body = el("div", "w-body");
  body.appendChild(el("span", "w-top", d.veredicto ? "Analizada: " + VERD[d.veredicto] : "Añadida por ti"));
  body.appendChild(el("h3", null, d.nombre));
  if (d.color)
    body.appendChild(
      el(
        "span",
        "w-cn",
        clasifica(d.color, estado.PAL).n + (d.cat ? " · " + (CATN[d.cat] || d.cat).toLowerCase() : "")
      )
    );
  if (d.motivo) body.appendChild(el("p", "w-co", d.motivo));
  li.appendChild(body);
  const foot = el("div", "w-foot"),
    r1 = el("div", "a-row"),
    r2 = el("div", "a-row");
  r1.appendChild(pinA(d.nombre, "Pinterest: la prenda"));
  r1.appendChild(pinA(d.nombre + " outfit", "Outfits con ella"));
  foot.appendChild(r1);
  r2.appendChild(
    boton("Ya la tengo", "a-btn ghost", () => {
      const pre = {};
      ["nombre", "cat", "tipo", "color", "corte", "abrigo", "estilo", "tejido", "foto", "mini"].forEach(
        (k) => {
          if (d[k] != null) pre[k] = d[k];
        }
      );
      app.store.del("deseos", d.id);
      alArmario(pre);
    })
  );
  r2.appendChild(
    boton("Quitar", "a-btn ghost", () => {
      app.store.del("deseos", d.id);
      if (d.foto) app.store.delFoto(d.foto);
    })
  );
  foot.appendChild(r2);
  li.appendChild(foot);
  return li;
}

export function pintaDeseos() {
  const list = $("w-list");
  list.textContent = "";
  const WISH = (app.perfil && app.perfil.deseos) || [];
  const propias = Object.values(app.D)
    .filter((d) => d.propio && d.nombre)
    .sort((a, b) => ((a.cuando || "") < (b.cuando || "") ? 1 : -1));
  const f = app.ui.wfil,
    est = (w) => app.D[w.id] && app.D[w.id].estado;
  const items = WISH.filter(
    (w) => f === "todo" || (f === "top" ? w.top : f === "mia" ? est(w) === "quiero" : w.cat === f)
  );
  items.sort((a, b) => (est(a) === "tengo") - (est(b) === "tengo"));
  const nmia = WISH.filter((w) => est(w) === "quiero").length + propias.length,
    lm = $("w-filter-mia");
  if (lm && lm.nextSibling) lm.nextSibling.textContent = "Mi lista" + (nmia ? " · " + nmia : "");
  if (f === "mia" || f === "todo") propias.forEach((d) => list.appendChild(tarjetaPropia(d)));
  items.forEach((w) => list.appendChild(tarjeta(w)));
  if (!list.children.length)
    list.appendChild(
      el(
        "li",
        "a-empty",
        f === "mia"
          ? "Tu lista está vacía. Pulsa «La quiero» en lo que te guste y se quedará aquí."
          : "No hay prendas en este apartado."
      )
    );
  const A = activas(),
    nota = $("w-nota");
  const falta = [
    ["arriba", "partes de arriba"],
    ["abajo", "partes de abajo"],
    ["capa", "capas"],
    ["calzado", "calzado"]
  ]
    .filter((c) => !A.some((p) => p.cat === c[0]))
    .map((c) => c[1]);
  nota.textContent = !A.length
    ? "Las piezas que más te favorecen, según tu análisis."
    : falta.length
      ? "En tu armario todavía no hay " +
        falta.join(falta.length === 2 ? " ni " : ", ") +
        ": empieza por ahí."
      : partesDeArribaEnPaleta(A.map((p) => ({ cat: p.cat, pal: palDe(p) }))) < 2
        ? "Te faltan partes de arriba en tu paleta: mira el apartado Arriba."
        : "Las piezas que más multiplican lo que ya tienes.";
}

async function nuevoDeseo(ev) {
  ev.preventDefault();
  const i = $("w-own-n"),
    n = i.value.trim().slice(0, 60),
    m = $("w-own-msg");
  if (!n) {
    m.textContent = "Escribe qué prenda es.";
    i.focus();
    return;
  }
  try {
    await app.store.add("deseos", {
      propio: true,
      nombre: n,
      estado: "quiero",
      cuando: new Date().toISOString()
    });
    i.value = "";
    m.textContent = "Añadida a tu lista.";
    app.ui.wfil = "mia";
    setVal("w-filter", "mia");
    pintaDeseos();
  } catch (e) {
    m.textContent = "";
    falla(e);
  }
}
