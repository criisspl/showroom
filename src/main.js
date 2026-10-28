// Punto de entrada: abre la base de datos, carga el perfil y conecta las pantallas.
// Fuentes servidas desde la propia app (sin peticiones a Google): más privado y funciona sin conexión
import "@fontsource/caprasimo/latin-400.css";
import "@fontsource/caveat/latin-500.css";
import "@fontsource/caveat/latin-700.css";
import "@fontsource-variable/dm-sans/opsz.css";
import "./styles.css";
import { creaStore } from "./lib/store.ts";
import { app, setPerfil, repinta } from "./state.js";
import { setEstado } from "./lib/engine.ts";
import { gustoDe } from "./lib/gusto.ts";
import { normaliza } from "./lib/analysis.ts";
import { ver, falla } from "./ui/comun.js";
import { initHoy } from "./ui/hoy.js";
import { initArmario } from "./ui/armario.js";
import { initDeseos } from "./ui/deseos.js";
import { mount } from "svelte";
import Historial from "./ui/Historial.svelte";
import Espejo from "./ui/Espejo.svelte";
import Gusto from "./ui/Gusto.svelte";
import { avisa } from "./ui/puente.svelte.ts";
import { initAnalisis } from "./ui/analisis.js";
import { initBienvenida } from "./ui/bienvenida.js";
import { initAjustes } from "./ui/ajustes.js";
import { initInstala, protegeDatos } from "./ui/instala.js";

async function arranca() {
  try {
    app.store = await creaStore({ onError: falla });
  } catch (e) {
    document.body.textContent =
      "Este navegador no permite guardar datos (IndexedDB). Prueba con otro navegador o sal del modo privado.";
    return;
  }
  app.ajustes = { ...app.ajustes, ...((await app.store.kget("ajustes")) || {}) };
  const p = await app.store.kget("perfil");
  if (p) {
    try {
      setPerfil(normaliza(p, p.respuestas || {}, p.origen || "ia"));
    } catch (e) {
      setPerfil(null);
    }
  }

  // Si una pantalla falla al arrancar, las demás (y la carga de tus prendas) siguen funcionando
  [initHoy, initArmario, initDeseos, initAnalisis, initBienvenida, initAjustes, initInstala].forEach((f) => {
    try {
      f();
    } catch (e) {
      falla(e);
    }
  });
  // Pantallas ya pasadas a Svelte: se montan una vez y se repintan con el aviso del puente
  try {
    mount(Historial, { target: document.querySelector("#tab-historial .wrap") });
    app.pinta.historial = avisa;
    mount(Espejo, { target: document.querySelector("#a-espejo") });
    app.pinta.espejo = avisa;
    mount(Gusto, { target: document.querySelector("#a-gusto") });
    app.pinta.gusto = avisa;
  } catch (e) {
    falla(e);
  }
  document
    .querySelectorAll(".a-tabs button")
    .forEach((b) => b.addEventListener("click", () => ver(b.getAttribute("data-tab"))));

  app.store.on("prendas", (a) => {
    setEstado({ P: a });
    repinta("armario", "historial", "deseos", "hoy");
  });
  app.store.on("outfits", (a) => {
    setEstado({ O: a });
    repinta("historial");
  });
  app.store.on("votos", (a) => {
    setEstado({ V: a });
    repinta("historial");
  });
  app.store.on("deseos", (a) => {
    app.D = Object.fromEntries(a.map((d) => [d.id, d]));
    repinta("deseos", "hoy");
  });
  app.store.on("refs", (a) => {
    app.refs = a;
    setEstado({ G: gustoDe(a) });
    repinta("gusto");
  });
  repinta("ajustes", "analisis");

  if (app.perfil) protegeDatos();
  let t0 = "hoy";
  try {
    t0 = localStorage.getItem("armario-tab") || "hoy";
  } catch (e) {
    /* sin almacenamiento */
  }
  ver(app.perfil ? (document.querySelector('.panel[data-panel="' + t0 + '"]') ? t0 : "hoy") : "bienvenida");
}
arranca();
