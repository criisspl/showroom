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
import { mount } from "svelte";
import Armario from "./ui/Armario.svelte";
import Historial from "./ui/Historial.svelte";
import Espejo from "./ui/Espejo.svelte";
import Ajustes from "./ui/Ajustes.svelte";
import Gusto from "./ui/Gusto.svelte";
import Deseos from "./ui/Deseos.svelte";
import Analisis from "./ui/Analisis.svelte";
import Bienvenida from "./ui/Bienvenida.svelte";
import { avisa } from "./ui/puente.svelte.ts";
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

  // Ajustes se monta antes: su tarjeta «Instálala» la rellena initInstala por id
  try {
    mount(Ajustes, { target: document.querySelector("#tab-ajustes .wrap") });
    app.pinta.ajustes = avisa;
  } catch (e) {
    falla(e);
  }
  // Deseos también: su formulario «¿Lo compro?» va en #w-form-slot
  try {
    mount(Deseos, { target: document.querySelector("#tab-deseos .wrap") });
    app.pinta.deseos = avisa;
  } catch (e) {
    falla(e);
  }
  try {
    mount(Armario, { target: document.querySelector("#tab-armario .wrap") });
    app.pinta.armario = avisa;
  } catch (e) {
    falla(e);
  }
  // Análisis también: el pie de Gusto vive aparte, en #a-gusto
  try {
    mount(Analisis, { target: document.getElementById("an-wrap") });
    app.pinta.analisis = avisa;
  } catch (e) {
    falla(e);
  }
  // Bienvenida es de estado propio: no necesita repintarse con el puente
  try {
    mount(Bienvenida, { target: document.querySelector("#tab-bienvenida .wrap") });
  } catch (e) {
    falla(e);
  }
  // Si una pantalla falla al arrancar, las demás (y la carga de tus prendas) siguen funcionando
  [initHoy, initInstala].forEach((f) => {
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
    mount(Gusto, { target: document.querySelector("#a-refs-gusto") });
    app.pinta.gusto = avisa;
  } catch (e) {
    falla(e);
  }
  document
    .querySelectorAll(".a-tabs button")
    .forEach((b) => b.addEventListener("click", () => ver(b.getAttribute("data-tab"))));
  document
    .querySelectorAll("[data-ir]")
    .forEach((b) => b.addEventListener("click", () => ver(b.getAttribute("data-ir"))));

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
