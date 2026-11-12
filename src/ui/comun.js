// Piezas de interfaz compartidas: navegación por pestañas y avisos de error.
import { $ } from "./dom.js";

let primeraVista = true;

/** Lleva el foco al encabezado de la pantalla nueva (o a la propia pantalla) para que el lector de pantalla la anuncie. */
function enfocaPanel(panel, nombre) {
  const destino = panel.querySelector("h1, h2") || panel;
  if (destino === panel && !panel.hasAttribute("aria-label")) panel.setAttribute("aria-label", nombre);
  if (destino === panel && !panel.hasAttribute("role")) panel.setAttribute("role", "region");
  destino.setAttribute("tabindex", "-1");
  destino.focus({ preventScroll: true });
}

export function ver(tab, target) {
  const antes = primeraVista;
  primeraVista = false;
  let panelNuevo = null;
  document.querySelectorAll(".panel").forEach((p) => {
    p.hidden = p.getAttribute("data-panel") !== tab;
    if (!p.hidden) panelNuevo = p;
  });
  const nav = $("a-tabs");
  nav.hidden = tab === "bienvenida" || tab === "configuracion";
  document.querySelectorAll(".a-tabs button").forEach((b) => {
    if (b.getAttribute("data-tab") === tab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  try {
    if (tab !== "bienvenida" && tab !== "configuracion") localStorage.setItem("armario-tab", tab);
  } catch (e) {
    /* sin almacenamiento */
  }
  if (target) target.scrollIntoView({ block: "start" });
  else window.scrollTo(0, 0);
  // En la carga inicial no se roba el foco; al cambiar de pantalla, sí
  if (!antes && panelNuevo) {
    const boton = document.querySelector('.a-tabs button[data-tab="' + tab + '"]');
    enfocaPanel(panelNuevo, (boton && boton.textContent.trim()) || tab);
  }
}

export function falla(e) {
  console.error(e);
  const s = $("a-status");
  if (!s) return;
  s.textContent = (e && e.message) || "Algo ha fallado. Inténtalo otra vez.";
  s.hidden = false;
  setTimeout(() => {
    s.hidden = true;
  }, 6000);
}
