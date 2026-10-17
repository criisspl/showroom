// Ajustes: proveedor de IA, copia de seguridad y borrado de datos.
import { $, el } from "../lib/dom.js";
import { app, setPerfil, repinta } from "../state.js";
import { PROVEEDORES, pregunta, config } from "../lib/ai.ts";
import { normaliza } from "../lib/analysis.ts";
import { ver, falla } from "./comun.js";

export function initAjustes() {
  const sel = $("s-prov");
  Object.entries(PROVEEDORES).forEach(([id, p]) => {
    const o = el("option", null, p.n);
    o.value = id;
    sel.appendChild(o);
  });
  const nota = () => {
    const p = PROVEEDORES[sel.value];
    $("s-prov-nota").textContent = p.nota;
    $("s-modelo").placeholder = p.modelo || "nombre-del-modelo";
    $("s-url").placeholder = p.url || "https://…/v1/chat/completions";
    $("s-propia").hidden = !!p.sinClave;
    $("s-url-f").hidden = sel.value !== "otro";
    const a = $("s-clave-link");
    a.href = p.clave || "#";
    a.hidden = !p.clave;
  };
  sel.addEventListener("change", nota);
  app.pinta.ajustes = () => {
    sel.value = config(app.ajustes).id;
    $("s-modelo").value = app.ajustes.modelo || "";
    $("s-url").value = app.ajustes.url || "";
    $("s-clave").value = app.ajustes.clave || "";
    nota();
  };
  $("s-guarda").addEventListener("click", guarda);
  $("s-prueba").addEventListener("click", prueba);
  $("s-exporta").addEventListener("click", exporta);
  $("s-importa").addEventListener("change", (ev) => importaArchivo(ev.target, $("s-datos-msg")));
  $("s-rehacer").addEventListener("click", () => ver("bienvenida"));
  let armed = false;
  $("s-borra").addEventListener("click", async () => {
    const b = $("s-borra");
    if (!armed) {
      armed = true;
      b.textContent = "Pulsa otra vez: se borra todo";
      return;
    }
    await app.store.borraTodo();
    location.reload();
  });
}

async function guarda() {
  app.ajustes = {
    proveedor: $("s-prov").value,
    modelo: $("s-modelo").value.trim(),
    url: $("s-prov").value === "otro" ? $("s-url").value.trim() : "",
    clave: $("s-clave").value.trim()
  };
  await app.store.kset("ajustes", app.ajustes);
  $("s-msg").textContent =
    app.ajustes.proveedor !== "integrada" && !app.ajustes.clave
      ? "Sin clave se usa la IA de la app."
      : "Guardado.";
  repinta("hoy");
}
async function prueba() {
  await guarda();
  const m = $("s-msg");
  m.textContent = "Probando…";
  try {
    await pregunta(app.ajustes, { texto: "Responde solo con la palabra: ok", json: false });
    const cfg = config(app.ajustes);
    m.textContent = "Conexión correcta" + (cfg.modelo ? " con " + cfg.modelo : "") + ".";
  } catch (e) {
    m.textContent = e.message;
  }
}
async function exporta() {
  const m = $("s-datos-msg");
  m.textContent = "Preparando la copia…";
  try {
    const data = await app.store.exporta();
    const a = el("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
    a.download = "copia-" + new Date().toISOString().slice(0, 10) + ".armario.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    m.textContent = "Copia descargada. La clave de la IA no se incluye.";
  } catch (e) {
    m.textContent = "";
    falla(e);
  }
}
export async function importaArchivo(input, msg) {
  const file = input.files && input.files[0];
  if (!file) return;
  msg.textContent = "Importando…";
  try {
    const data = JSON.parse(await file.text());
    await app.store.importa(data);
    const p = await app.store.kget("perfil");
    if (p) {
      setPerfil(normaliza(p, p.respuestas || {}, p.origen || "importado"));
    }
    app.ajustes = { ...app.ajustes, ...((await app.store.kget("ajustes")) || {}) };
    msg.textContent = "Copia importada.";
    repinta();
    ver(app.perfil ? "hoy" : "bienvenida");
  } catch (e) {
    msg.textContent = e.message || "No he podido leer ese archivo.";
  }
  input.value = "";
}
