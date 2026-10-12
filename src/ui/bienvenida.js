// Bienvenida: elegir IA, subir fotos, responder preguntas y hacer el análisis (o crear el perfil a mano).
import { $, el } from "../lib/dom.js";
import { app, setPerfil, repinta } from "../state.js";
import { PROVEEDORES, imagenParaIA } from "../lib/ai.js";
import { PREGUNTAS, analizaConIA, perfilManual } from "../lib/analysis.js";
import { ESTACIONES, CUERPOS } from "../data/presets.js";
import { ver, falla } from "./comun.js";
import { importaArchivo } from "./ajustes.js";

const FOTOS = [
  { id: "selfie", t: "Selfie con luz natural", obligatoria: true },
  { id: "cuerpo", t: "Cuerpo entero (opcional)" },
  { id: "insp1", t: "Inspiración 1 (opcional)" },
  { id: "insp2", t: "Inspiración 2 (opcional)" },
  { id: "insp3", t: "Inspiración 3 (opcional)" }
];
const fotos = {};

export function initBienvenida() {
  const sel = $("b-prov");
  Object.entries(PROVEEDORES).forEach(([id, p]) => { const o = el("option", null, p.n); o.value = id; sel.appendChild(o); });
  sel.value = app.ajustes.proveedor || "mistral"; $("b-clave").value = app.ajustes.clave || "";
  const nota = () => { const p = PROVEEDORES[sel.value]; $("b-prov-nota").textContent = p.nota; const a = $("b-clave-link"); a.href = p.clave || "#"; a.hidden = !p.clave; };
  sel.addEventListener("change", nota); nota();

  const box = $("b-fotos");
  FOTOS.forEach((f) => {
    const l = el("label", "foto-in"), i = el("input"); i.type = "file"; i.accept = "image/*";
    l.appendChild(el("b", null, f.t)); l.appendChild(i);
    i.addEventListener("change", () => {
      const file = i.files && i.files[0]; if (!file) return; fotos[f.id] = file;
      l.querySelectorAll("img").forEach((x) => x.remove()); const im = new Image(); im.alt = f.t; im.src = URL.createObjectURL(file); l.appendChild(im);
    });
    box.appendChild(l);
  });

  const pq = $("b-preguntas");
  PREGUNTAS.forEach((p) => {
    const l = el("label", "a-f"); l.appendChild(el("span", null, p.t + (p.opc ? " · opcional" : "")));
    let inp;
    if (p.tipo === "elige") { inp = el("select"); [""].concat(p.ops).forEach((o) => { const op = el("option", null, o || "Elige…"); op.value = o; inp.appendChild(op); }); }
    else if (p.tipo === "num") { inp = el("input"); inp.type = "number"; inp.inputMode = "numeric"; inp.min = "0"; inp.max = "250"; }
    else { inp = el("textarea"); inp.maxLength = 400; }
    inp.id = "q-" + p.id; l.appendChild(inp); pq.appendChild(l);
  });

  const me = $("m-estacion"), mc = $("m-cuerpo");
  Object.entries(ESTACIONES).forEach(([id, e]) => { const o = el("option", null, e.n); o.value = id; me.appendChild(o); });
  Object.entries(CUERPOS).forEach(([id, b]) => { const o = el("option", null, b.n); o.value = id; mc.appendChild(o); });
  $("m-crear").addEventListener("click", creaManual);
  $("b-analiza").addEventListener("click", analiza);
  $("b-importa").addEventListener("change", (ev) => importaArchivo(ev.target, $("b-msg")));
}

function respuestas() {
  const r = {};
  PREGUNTAS.forEach((p) => { const v = $("q-" + p.id).value.trim(); if (v) r[p.id] = v; });
  return r;
}

async function guardaAjustes() {
  app.ajustes = { ...app.ajustes, proveedor: $("b-prov").value, clave: $("b-clave").value.trim() };
  await app.store.kset("ajustes", app.ajustes);
}

async function terminaCon(perfil) {
  await app.store.kset("perfil", perfil); setPerfil(perfil); repinta(); ver("analisis");
}

async function analiza() {
  const msg = $("b-msg"), btn = $("b-analiza"), prog = $("b-prog");
  await guardaAjustes();
  if (!app.ajustes.clave) { msg.textContent = "Pega tu clave de la IA en el paso 1, o abajo elige «Prefiero hacerlo sin IA»."; return; }
  if (!fotos.selfie) { msg.textContent = "Falta el selfie con luz natural: es la foto más importante para tu color."; return; }
  const r = respuestas();
  const faltan = PREGUNTAS.filter((p) => !p.opc && !r[p.id]).map((p) => p.t.toLowerCase());
  if (faltan.length > 3) { msg.textContent = "Responde al menos las preguntas sin «opcional»: me ayudan mucho a acertar."; return; }
  btn.disabled = true; msg.textContent = ""; prog.hidden = false; $("b-prog-t").textContent = "Preparando tus fotos…";
  try {
    const imgs = [];
    for (const f of FOTOS) if (fotos[f.id]) imgs.push({ que: f.id === "selfie" ? "1) selfie con luz natural" : f.id === "cuerpo" ? "2) foto de cuerpo entero" : "foto de inspiración de estilo", url: await imagenParaIA(fotos[f.id], 1024) });
    $("b-prog-t").textContent = "Haciendo tu análisis… puede tardar un minuto.";
    const perfil = await analizaConIA(app.ajustes, r, imgs);
    await terminaCon(perfil);
  } catch (e) { msg.textContent = e.message; falla(e); }
  prog.hidden = true; btn.disabled = false;
}

async function creaManual() {
  try {
    const perfil = perfilManual($("m-estacion").value, $("m-cuerpo").value, { nombre: $("m-estetica").value.trim() });
    await guardaAjustes(); await terminaCon(perfil);
  } catch (e) { falla(e); }
}
