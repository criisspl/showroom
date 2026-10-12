// Instalación como app (PWA), funcionamiento sin conexión y protección de los datos.
import { $ } from "../lib/dom.js";

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalada = () => (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
let aviso = null;

export function initInstala() {
  // Service worker solo en la versión publicada (en desarrollo molesta con la caché).
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    const registra = () => navigator.serviceWorker.register("./sw.js").catch(() => { /* sin modo sin conexión */ });
    if (document.readyState === "complete") registra(); else window.addEventListener("load", registra);
  }
  const card = $("s-instala"), t = $("s-instala-t"), b = $("s-instala-b");
  if (instalada()) return;
  if (esIOS()) {
    card.hidden = false;
    t.textContent = "En iPhone, Safari puede borrar los datos de las webs que no abres en una semana. Para que no se pierda tu armario, añádela a tu pantalla de inicio: botón Compartir (el cuadrado con la flecha) → «Añadir a pantalla de inicio».";
    return;
  }
  // Android y ordenador (Chrome, Edge, Samsung Internet): el navegador nos deja mostrar su botón de instalar.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); aviso = e;
    card.hidden = false; b.hidden = false;
    t.textContent = "Tenla con su icono en la pantalla de inicio, como cualquier otra app. Ocupa muy poco y funciona sin conexión (menos la IA).";
  });
  b.addEventListener("click", async () => {
    if (!aviso) return; aviso.prompt(); const r = await aviso.userChoice.catch(() => null); aviso = null;
    if (r && r.outcome === "accepted") card.hidden = true;
  });
  window.addEventListener("appinstalled", () => { card.hidden = true; });
}

/** Pide al navegador que no borre los datos de la app cuando ande justo de espacio. */
export async function protegeDatos() {
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) { /* no soportado */ }
}

export const consejoIOS = () => (esIOS() && !instalada() ? "Consejo: añade la app a tu pantalla de inicio (Compartir → «Añadir a pantalla de inicio») para que Safari no borre tus datos." : "");
