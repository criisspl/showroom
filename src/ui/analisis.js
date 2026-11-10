// Pestaña Análisis: tu informe visual (color, cuerpo, rostro, maquillaje, pelo, estética y looks)
// e «Inspo a la carta»: galerías de Pinterest según estación del año y ocasión.
import { $, el, boton, radios, val, pinA } from "../lib/dom.js";
import { app } from "../state.js";
import { OCAS } from "../data/constants.ts";
import { ver } from "./comun.js";
import { abreIA } from "./bienvenida.js";

const sec = (id, titulo, frase) => {
  const s = el("section", "b");
  s.id = id;
  s.appendChild(el("h2", null, titulo));
  if (frase) s.appendChild(el("p", "verdict", frase));
  return s;
};
const chips = (items, cls = "chips") => {
  const u = el("ul", cls);
  items.filter(Boolean).forEach((x) => u.appendChild(el("li", null, x)));
  return u;
};
const sub = (t) => el("p", "sub", t);
function swatches(lista, malos) {
  const g = el("div", "sws");
  lista.forEach((c) => {
    const s = el("div", "sw" + (malos ? " bad" : "")),
      i = el("span", "c");
    i.style.background = c.hex;
    s.appendChild(i);
    s.appendChild(el("span", "n", c.n));
    g.appendChild(s);
  });
  return g;
}
function legend(items) {
  const ol = el("ol", "legend");
  items.forEach((k) => {
    const li = el("li");
    li.appendChild(el("b", null, k.zona));
    li.appendChild(el("span", null, k.nota));
    ol.appendChild(li);
  });
  return ol;
}

export function initAnalisis() {
  app.pinta.analisis = pintaAnalisis;
}

export function pintaAnalisis() {
  const w = $("an-wrap"),
    p = app.perfil;
  w.textContent = "";
  if (!p) return;
  const c = p.color || {},
    b = p.cuerpo || {},
    e = p.estetica || {};
  const head = el("header", "a-head");
  head.appendChild(el("p", "eyebrow", "Tu análisis"));
  head.appendChild(el("h1", "a-h1", e.nombre || "Mi análisis"));
  if (e.subtitulo) head.appendChild(el("p", "hand", e.subtitulo));
  w.appendChild(head);
  const fic = el("ul", "datos");
  [
    ["Color", [c.estacion, c.subtono].filter(Boolean).join(", ")],
    ["Cuerpo", b.tipo],
    ["Rostro", p.rostro && p.rostro.forma],
    ["Estética", e.nombre]
  ].forEach(([k, v]) => {
    if (!v) return;
    const li = el("li");
    li.appendChild(el("small", null, k));
    li.appendChild(el("b", null, v));
    fic.appendChild(li);
  });
  w.appendChild(fic);
  // Sin librerías ni servidores: el navegador genera el PDF desde esta misma pantalla
  w.appendChild(boton("Guardar mi guía en PDF", "a-btn ghost no-print", () => window.print()));
  if (p.resumen) w.appendChild(el("p", "a-note", p.resumen));
  if (p.origen !== "ia") {
    const k = el("div", "card a-cta");
    k.appendChild(
      el(
        "p",
        null,
        p.origen === "local"
          ? "Este análisis se ha hecho en tu móvil. Si quieres más detalle (cara, cejas, gafas, cortes de pelo y una estética a tu medida), puedes hacerlo con IA."
          : "Has empezado con tu estación y tu tipo de cuerpo. Puedes hacer un análisis más completo cuando quieras."
      )
    );
    k.appendChild(boton("Análisis más completo con IA", "a-btn ghost", abreIA));
    w.appendChild(k);
  }
  const toc = el("div", "toc");
  [
    ["an-color", "Color"],
    ["an-cuerpo", "Cuerpo"],
    ["an-rostro", "Rostro"],
    ["an-maqui", "Maquillaje"],
    ["an-pelo", "Pelo"],
    ["an-estetica", "Estética"],
    ["an-looks", "Looks"],
    ["an-inspo", "Inspo"]
  ].forEach(([id, t]) => {
    const a = el("a", null, t);
    a.href = "#" + id;
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const x = $(id);
      if (x) x.scrollIntoView({ block: "start" });
    });
    toc.appendChild(a);
  });
  w.appendChild(toc);

  // Color
  const sc = sec("an-color", "Color", [c.estacion, c.intensidad].filter(Boolean).join(": "));
  if (c.explicacion) sc.appendChild(el("p", null, c.explicacion));
  if ((c.alternativas || []).length && p.origen !== "ia")
    sc.appendChild(
      el(
        "p",
        "a-note",
        "Estaciones vecinas que también podrían ser las tuyas: " + c.alternativas.join(" y ") + "."
      )
    );
  const card = el("div", "card");
  card.appendChild(sub("Tus mejores colores"));
  card.appendChild(swatches(c.paleta || []));
  if ((c.neutros || []).length) {
    card.appendChild(sub("Neutros"));
    card.appendChild(swatches(c.neutros));
  }
  if ((c.metales || []).length) {
    card.appendChild(sub("Metales"));
    card.appendChild(chips(c.metales, "chips mini"));
  }
  sc.appendChild(card);
  if ((c.evitar || []).length) {
    const ev = el("div", "card");
    ev.appendChild(sub("Mejor evitar junto a la cara · y cámbialo por"));
    const sw = el("div", "swaps");
    c.evitar.forEach((x) => {
      const r = el("div", "swap"),
        a = el("span", "c"),
        d = el("span", "c");
      a.style.background = x.hex;
      const nuevo = (c.paleta || []).concat(c.neutros || []).find((y) => y.n === x.cambio);
      d.style.background = nuevo ? nuevo.hex : "transparent";
      r.appendChild(a);
      r.appendChild(el("span", null, "→"));
      r.appendChild(d);
      const t = el("span");
      t.appendChild(el("s", null, x.n));
      t.appendChild(document.createTextNode(" " + (x.cambio || "")));
      r.appendChild(t);
      sw.appendChild(r);
    });
    ev.appendChild(sw);
    sc.appendChild(ev);
  }
  if ((c.combinaciones || []).length) {
    sc.appendChild(sub("Combinaciones 60 · 30 · 10"));
    const ul = el("ul", "a-combos");
    c.combinaciones.forEach((k) => {
      const li = el("li"),
        t = el("div", "a-trio");
      k.hex.forEach((h) => {
        const i = el("i");
        i.style.background = h;
        t.appendChild(i);
      });
      li.appendChild(t);
      li.appendChild(el("b", null, k.nombre));
      if (k.uso) li.appendChild(el("span", null, k.uso));
      ul.appendChild(li);
    });
    sc.appendChild(ul);
  }
  w.appendChild(sc);

  // Cuerpo
  const sb = sec("an-cuerpo", "Cuerpo", b.tipo);
  if (b.explicacion) sb.appendChild(el("p", null, b.explicacion));
  if ((b.claves || []).length) {
    const k = el("div", "card");
    k.appendChild(legend(b.claves));
    sb.appendChild(k);
  }
  if ((b.si || []).length) {
    sb.appendChild(sub("Te favorece"));
    sb.appendChild(chips(b.si));
  }
  if ((b.evita || []).length) {
    sb.appendChild(sub("Evita"));
    sb.appendChild(chips(b.evita, "chips no"));
  }
  if ((b.tips || []).length) {
    const t = el("ul", "a-tips");
    b.tips.forEach((x) => t.appendChild(el("li", null, x)));
    sb.appendChild(t);
  }
  w.appendChild(sb);

  // Rostro
  if (p.rostro) {
    const r = p.rostro,
      sr = sec("an-rostro", "Rostro", r.forma);
    if ((r.rasgos || []).length) {
      const k = el("div", "card");
      k.appendChild(legend(r.rasgos));
      sr.appendChild(k);
    }
    if (r.cejas) {
      sr.appendChild(sub("Cejas"));
      sr.appendChild(el("p", null, r.cejas));
    }
    if (r.gafas && (r.gafas.si.length || r.gafas.evita.length)) {
      sr.appendChild(sub("Gafas"));
      sr.appendChild(chips(r.gafas.si));
      sr.appendChild(chips(r.gafas.evita, "chips no"));
    }
    w.appendChild(sr);
  }
  // Maquillaje
  if (p.maquillaje) {
    const m = p.maquillaje,
      sm = sec("an-maqui", "Maquillaje", m.piel);
    if ((m.looks || []).length) {
      const g = el("ul", "looks");
      m.looks.forEach((l) => {
        const li = el("li");
        li.appendChild(el("h3", null, l.nombre));
        const o = el("ol", "lst");
        l.pasos.forEach((x) => o.appendChild(el("li", null, x)));
        li.appendChild(o);
        if (l.pinterest) li.appendChild(pinA(l.pinterest, "Ver en Pinterest"));
        g.appendChild(li);
      });
      sm.appendChild(g);
    }
    if ((m.gestos || []).length) {
      sm.appendChild(sub("Gestos que cambian tu cara"));
      sm.appendChild(chips(m.gestos));
    }
    if ((m.evita || []).length) sm.appendChild(chips(m.evita, "chips no"));
    w.appendChild(sm);
  }
  // Pelo
  if (p.pelo) {
    const h = p.pelo,
      sp = sec("an-pelo", "Pelo");
    if ((h.cortes || []).length) {
      const g = el("ul", "looks");
      h.cortes.forEach((x) => {
        const li = el("li");
        li.appendChild(el("h3", null, x.nombre));
        if (x.nota) li.appendChild(el("p", "a-msg", x.nota));
        if (x.pinterest) li.appendChild(pinA(x.pinterest, "Ver en Pinterest"));
        g.appendChild(li);
      });
      sp.appendChild(g);
    }
    if ((h.colores || []).length) {
      sp.appendChild(sub("Colores de pelo"));
      sp.appendChild(swatches(h.colores.filter((x) => x.hex).map((x) => ({ n: x.nombre, hex: x.hex }))));
    }
    if ((h.evita || []).length) sp.appendChild(chips(h.evita, "chips no"));
    w.appendChild(sp);
  }
  // Estética
  const se = sec("an-estetica", "Tu estética");
  if (e.nombre) se.appendChild(el("p", "vibe-name", e.nombre));
  if ((e.palabras || []).length) se.appendChild(chips(e.palabras, "words"));
  if ((e.formula || []).length) {
    se.appendChild(sub("Tu fórmula"));
    se.appendChild(chips(e.formula, "eq"));
  }
  if ((e.porque || []).length) {
    const u = el("ul", "lst");
    e.porque.forEach((x) => u.appendChild(el("li", null, x)));
    se.appendChild(u);
  }
  if ((e.pinterest || []).length) {
    const r = el("div", "a-row");
    e.pinterest.forEach((q) => r.appendChild(pinA(q, q)));
    se.appendChild(r);
  }
  if (!e.nombre && !(e.formula || []).length)
    se.appendChild(el("p", "a-note", "Haz el análisis con IA para descubrir tu estética."));
  w.appendChild(se);
  // Looks
  if ((p.looks || []).length) {
    const sl = sec("an-looks", "Looks para ti"),
      g = el("ul", "looks");
    p.looks.forEach((l) => {
      const li = el("li");
      li.appendChild(el("h3", null, l.ocasion));
      li.appendChild(chips(l.prendas, "chips mini"));
      if (l.pinterest) li.appendChild(pinA(l.pinterest, "Ver en Pinterest"));
      g.appendChild(li);
    });
    sl.appendChild(g);
    w.appendChild(sl);
  }
  // Inspo a la carta
  const si = sec(
    "an-inspo",
    "Inspo a la carta",
    "Elige estación y ocasión: te abro galerías de Pinterest con tu estética y tus colores."
  );
  const k = el("div", "card a-ctl"),
    f1 = el("fieldset", "pick"),
    f2 = el("fieldset", "pick"),
    o1 = el("div", "opts-r"),
    o2 = el("div", "opts-r");
  f1.appendChild(el("legend", null, "Estación"));
  f1.appendChild(o1);
  f2.appendChild(el("legend", null, "Ocasión"));
  f2.appendChild(o2);
  k.appendChild(f1);
  k.appendChild(f2);
  const res = el("div", "a-row");
  k.appendChild(res);
  si.appendChild(k);
  w.appendChild(si);
  radios(
    o1,
    "i-est",
    [
      ["autumn", "Otoño"],
      ["winter", "Invierno"],
      ["spring", "Primavera"],
      ["summer", "Verano"]
    ],
    [
      "winter",
      "winter",
      "spring",
      "spring",
      "spring",
      "summer",
      "summer",
      "summer",
      "autumn",
      "autumn",
      "autumn",
      "winter"
    ][new Date().getMonth()]
  );
  radios(
    o2,
    "i-oca",
    OCAS.map((o) => [o.id, o.n]),
    "diario"
  );
  const EN = {
    diario: "casual everyday",
    finde: "weekend afternoon",
    oficina: "casual office",
    "oficina-formal": "business formal office",
    casa: "cozy at home",
    cita: "date night",
    noche: "night out",
    evento: "wedding guest",
    viaje: "travel",
    concierto: "concert"
  };
  const pinta = () => {
    res.textContent = "";
    const est = val("i-est"),
      oca = EN[val("i-oca")] || "",
      nombre = (e.claves || []).slice(0, 2).join(" ") || e.nombre || "";
    const cols = (c.paleta || [])
      .slice(0, 2)
      .map((x) => x.n)
      .join(" ");
    [
      [nombre + " " + oca + " " + est + " outfit", "Outfits"],
      [oca + " " + est + " outfit " + cols, "En tus colores"],
      [(c.estacion || "") + " makeup " + oca, "Maquillaje"]
    ].forEach(([q, t]) => res.appendChild(pinA(q.replace(/\s+/g, " ").trim(), t)));
  };
  [...o1.querySelectorAll("input"), ...o2.querySelectorAll("input")].forEach((i) =>
    i.addEventListener("change", pinta)
  );
  pinta();

  const pie = el("div", "a-row");
  pie.style.marginTop = "28px";
  pie.appendChild(boton("Rehacer mi análisis", "a-btn ghost no-print", () => ver("bienvenida")));
  pie.appendChild(boton("Ajustes", "a-btn ghost no-print", () => ver("ajustes")));
  w.appendChild(pie);
}
