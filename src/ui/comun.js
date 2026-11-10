// Piezas de interfaz compartidas: miniaturas, navegación por pestañas e iconos.
import { el, $ } from "../lib/dom.js";
import { app } from "../state.js";
import { CATN } from "../data/constants.ts";
import { ICONOS } from "../data/icons.ts";
import { fondoClaro } from "../lib/color.ts";

/** Miniatura de una prenda: foto si la hay (se carga de IndexedDB), si no, su color con la categoría. */
export function thumb(p) {
  const d = el("div", "a-th");
  d.style.background = (p && p.color) || "#D9C9AE";
  const etiqueta = () =>
    d.appendChild(
      el("span", "a-th-l" + (fondoClaro(p && p.color) ? " osc" : ""), p ? CATN[p.cat] || "" : "")
    );
  if (p && p.foto) {
    app.store.urlFoto(p.foto).then((u) => {
      if (!u) return etiqueta();
      const i = new Image();
      i.alt = "";
      i.src = u;
      d.appendChild(i);
    });
  } else if (p && p.mini) {
    const i = new Image();
    i.alt = "";
    i.src = p.mini;
    d.appendChild(i);
  } else etiqueta();
  return d;
}

export function icono(tipo, color) {
  const d = el("div", "w-pic");
  d.innerHTML = ICONOS[tipo] || ICONOS.camiseta;
  if (color) d.style.color = color;
  return d;
}

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
  nav.hidden = tab === "bienvenida";
  document.querySelectorAll(".a-tabs button").forEach((b) => {
    if (b.getAttribute("data-tab") === tab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  try {
    if (tab !== "bienvenida") localStorage.setItem("armario-tab", tab);
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
