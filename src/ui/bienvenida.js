// Bienvenida: selfie con los colores marcados, preguntas y análisis hecho en el móvil.
// Opcional: análisis más completo con IA (con consentimiento expreso) o perfil a mano.
import { $, el, radios, vals, aviso } from "../lib/dom.js";
import { app, setPerfil, repinta } from "../state.js";
import { imagenParaIA, abreImagen, hayIA } from "../lib/ai.js";
import { PREGUNTAS, analizaConIA, perfilManual, normaliza } from "../lib/analysis.js";
import { perfilLocal } from "../lib/local.js";
import { ESTACIONES, CUERPOS } from "../data/presets.js";
import { ver, falla } from "./comun.js";
import { importaArchivo } from "./ajustes.js";
import { protegeDatos, consejoIOS } from "./instala.js";

const FOTOS_IA = [
  { id: "cuerpo", t: "Cuerpo entero (opcional)" },
  { id: "insp1", t: "Inspiración 1 (opcional)" },
  { id: "insp2", t: "Inspiración 2 (opcional)" },
  { id: "insp3", t: "Inspiración 3 (opcional)" }
];
const PASOS = [
  { id: "piel", t: "Toca tu mejilla, donde no haya sombra ni brillo", r: 0.025, n: "Piel" },
  { id: "ojos", t: "Ahora toca el color de tu ojo (el iris)", r: 0.006, n: "Ojos" },
  { id: "pelo", t: "Ahora toca tu pelo", r: 0.02, n: "Pelo" },
  {
    id: "blanco",
    t: "Por último, toca algo blanco si sale en la foto (una pared, un folio, tu camiseta). Sirve para corregir la luz.",
    r: 0.015,
    n: "Blanco",
    opc: true
  }
];

const fotos = {};
const sel = { selfie: null, canvas: null, paso: 0, muestras: {}, puntos: {} };

export function initBienvenida() {
  // Preguntas: las del móvil arriba, las de texto libre dentro del bloque de IA
  PREGUNTAS.forEach((p) => {
    const destino = p.ia ? $("b-preguntas-ia") : $("b-preguntas");
    if (p.tipo === "varias") {
      const f = el("fieldset", "pick"),
        o = el("div", "opts-r varias");
      f.appendChild(el("legend", null, p.t));
      f.appendChild(o);
      destino.appendChild(f);
      radios(o, "q-" + p.id, p.ops, [], { multi: true });
      o.addEventListener("change", (ev) => {
        const marcadas = o.querySelectorAll("input:checked");
        if (marcadas.length > p.max) ev.target.checked = false;
      });
      return;
    }
    const l = el("label", "a-f");
    l.appendChild(el("span", null, p.t + (p.opc ? " · opcional" : "")));
    let inp;
    if (p.tipo === "elige") {
      inp = el("select");
      [""].concat(p.ops).forEach((o) => {
        const op = el("option", null, o || "Elige…");
        op.value = o;
        inp.appendChild(op);
      });
    } else if (p.tipo === "num") {
      inp = el("input");
      inp.type = "number";
      inp.inputMode = "numeric";
      inp.min = "0";
      inp.max = "250";
    } else {
      inp = el("textarea");
      inp.maxLength = 400;
    }
    inp.id = "q-" + p.id;
    l.appendChild(inp);
    destino.appendChild(l);
  });

  // Selfie y marcado de colores
  const elige = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (f) cargaSelfie(f);
  };
  $("b-selfie").addEventListener("change", elige);
  $("b-selfie2").addEventListener("change", elige);
  $("b-marca-img").addEventListener("click", toca);
  $("b-marca-otra").addEventListener("click", () => {
    sel.paso = 0;
    sel.muestras = {};
    sel.puntos = {};
    pintaMarca();
  });
  $("b-marca-salta").addEventListener("click", () => {
    sel.paso = PASOS.length;
    pintaMarca();
  });

  // Fotos extra para la IA
  const box = $("b-fotos");
  FOTOS_IA.forEach((f) => {
    const l = el("label", "foto-in"),
      i = el("input");
    i.type = "file";
    i.accept = "image/*";
    l.appendChild(el("b", null, f.t));
    l.appendChild(i);
    i.addEventListener("change", () => {
      const file = i.files && i.files[0];
      if (!file) return;
      fotos[f.id] = file;
      l.querySelectorAll("img").forEach((x) => x.remove());
      const im = new Image();
      im.alt = f.t;
      im.src = URL.createObjectURL(file);
      l.appendChild(im);
    });
    box.appendChild(l);
  });

  const me = $("m-estacion"),
    mc = $("m-cuerpo");
  Object.entries(ESTACIONES).forEach(([id, e]) => {
    const o = el("option", null, e.n);
    o.value = id;
    me.appendChild(o);
  });
  Object.entries(CUERPOS).forEach(([id, b]) => {
    const o = el("option", null, b.n);
    o.value = id;
    mc.appendChild(o);
  });
  $("m-crear").addEventListener("click", creaManual);
  $("b-analiza").addEventListener("click", analizaLocal);
  $("b-analiza-ia").addEventListener("click", analizaIA);
  $("b-importa").addEventListener("change", (ev) => importaArchivo(ev.target, $("b-msg")));
}

/** Abre la sección de IA desde otras pantallas. */
export function abreIA() {
  ver("bienvenida");
  const d = $("b-ia");
  d.open = true;
  d.scrollIntoView({ block: "start" });
}

async function cargaSelfie(file) {
  try {
    const img = await abreImagen(file);
    const w = img.naturalWidth || img.width,
      h = img.naturalHeight || img.height,
      k = Math.min(1, 900 / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext("2d", { willReadFrequently: true }).drawImage(img, 0, 0, c.width, c.height);
    if (img.close) img.close();
    sel.selfie = file;
    sel.canvas = c;
    sel.paso = 0;
    sel.muestras = {};
    sel.puntos = {};
    // Mostramos lo que hemos dibujado en el canvas: así lo que ve la persona coincide con lo que medimos.
    $("b-marca-foto").src = c.toDataURL("image/jpeg", 0.85);
    $("b-selfie-in").hidden = true;
    $("b-marca").hidden = false;
    pintaMarca();
  } catch (e) {
    $("b-msg").textContent = e.message;
  }
}

function toca(ev) {
  if (!sel.canvas || sel.paso >= PASOS.length) return;
  const r = $("b-marca-foto").getBoundingClientRect();
  const x = (ev.clientX - r.left) / r.width,
    y = (ev.clientY - r.top) / r.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  const p = PASOS[sel.paso];
  sel.muestras[p.id] = mediana(sel.canvas, x, y, p.r);
  sel.puntos[p.id] = [x, y];
  sel.paso++;
  pintaMarca();
}

/** Color de una zona pequeña: mediana de cada canal (ignora brillos y pelos sueltos). */
function mediana(c, x, y, r) {
  const rad = Math.max(2, Math.round(Math.min(c.width, c.height) * r)),
    cx = Math.round(x * c.width),
    cy = Math.round(y * c.height);
  const x0 = Math.max(0, cx - rad),
    y0 = Math.max(0, cy - rad),
    w = Math.min(c.width, cx + rad) - x0,
    h = Math.min(c.height, cy + rad) - y0;
  const d = c
    .getContext("2d", { willReadFrequently: true })
    .getImageData(x0, y0, Math.max(1, w), Math.max(1, h)).data;
  const ch = [[], [], []];
  for (let i = 0; i < d.length; i += 4) {
    const dx = x0 + ((i / 4) % w) - cx,
      dy = y0 + Math.floor(i / 4 / w) - cy;
    if (dx * dx + dy * dy <= rad * rad) {
      ch[0].push(d[i]);
      ch[1].push(d[i + 1]);
      ch[2].push(d[i + 2]);
    }
  }
  return ch.map((a) => {
    a.sort((m, n) => m - n);
    return a[Math.floor(a.length / 2)] || 0;
  });
}

function pintaMarca() {
  const p = PASOS[sel.paso],
    box = $("b-marca-img");
  $("b-marca-t").textContent = p ? p.t : "¡Listo! Si algún punto no ha caído bien, vuelve a marcar.";
  $("b-marca-salta").hidden = !(p && p.opc);
  box.querySelectorAll(".pto").forEach((x) => x.remove());
  const res = $("b-marca-res");
  res.textContent = "";
  PASOS.forEach((q) => {
    const m = sel.muestras[q.id],
      pt = sel.puntos[q.id];
    if (!m) return;
    const hex = "rgb(" + m.join(",") + ")";
    const d = el("span", "pto");
    d.style.left = pt[0] * 100 + "%";
    d.style.top = pt[1] * 100 + "%";
    d.style.background = hex;
    d.appendChild(el("b", null, q.n));
    box.appendChild(d);
    const li = el("li"),
      i = el("i");
    i.style.background = hex;
    li.appendChild(i);
    li.appendChild(el("span", null, q.n));
    res.appendChild(li);
  });
}

function respuestas() {
  const r = {};
  PREGUNTAS.forEach((p) => {
    if (p.tipo === "varias") {
      const v = vals("q-" + p.id);
      if (v.length) r[p.id] = v;
      return;
    }
    const v = $("q-" + p.id).value.trim();
    if (v) r[p.id] = v;
  });
  return r;
}

async function terminaCon(perfil) {
  await app.store.kset("perfil", perfil);
  setPerfil(perfil);
  repinta();
  ver("analisis");
  protegeDatos();
  const c = consejoIOS();
  if (c) aviso(c, 9000);
}

async function analizaLocal() {
  const msg = $("b-msg"),
    r = respuestas();
  const faltan = [];
  if (!sel.muestras.piel && !(r.venas && r.joyas))
    faltan.push("tu selfie (o al menos las venas y las joyas)");
  if (!r.ojos_color || !r.pelo_color) faltan.push("el color de tus ojos y de tu pelo");
  if (!r.estructura) faltan.push("cómo es tu cuerpo");
  if (faltan.length) {
    msg.textContent = "Me falta " + faltan.join(", ") + ".";
    return;
  }
  try {
    msg.textContent = "";
    await terminaCon(normaliza(perfilLocal(sel.muestras, r), r, "local"));
  } catch (e) {
    msg.textContent = e.message;
    falla(e);
  }
}

async function analizaIA() {
  const msg = $("b-msg-ia"),
    btn = $("b-analiza-ia"),
    prog = $("b-prog");
  if (!$("b-acepto").checked) {
    msg.textContent = "Marca la casilla para aceptar el envío de tus fotos a la IA.";
    return;
  }
  if (!sel.selfie) {
    msg.textContent = "Falta tu selfie: súbelo en el paso 1.";
    $("b-selfie-in").scrollIntoView({ block: "center" });
    return;
  }
  if (!hayIA(app.ajustes)) {
    msg.textContent = "La IA no está disponible ahora mismo.";
    return;
  }
  const r = respuestas();
  btn.disabled = true;
  msg.textContent = "";
  prog.hidden = false;
  $("b-prog-t").textContent = "Preparando tus fotos…";
  try {
    const imgs = [{ que: "1) selfie con luz natural", url: await imagenParaIA(sel.selfie, 1024) }];
    for (const f of FOTOS_IA)
      if (fotos[f.id])
        imgs.push({
          que: f.id === "cuerpo" ? "2) foto de cuerpo entero" : "foto de inspiración de estilo",
          url: await imagenParaIA(fotos[f.id], 1024)
        });
    $("b-prog-t").textContent = "Haciendo tu análisis… puede tardar un minuto.";
    await terminaCon(await analizaConIA(app.ajustes, r, imgs));
  } catch (e) {
    msg.textContent = e.message;
    falla(e);
  }
  prog.hidden = true;
  btn.disabled = false;
}

async function creaManual() {
  try {
    await terminaCon(
      perfilManual($("m-estacion").value, $("m-cuerpo").value, { nombre: $("m-estetica").value.trim() })
    );
  } catch (e) {
    falla(e);
  }
}
