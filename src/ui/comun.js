// Piezas de interfaz compartidas: miniaturas, navegación por pestañas e iconos.
import { el, $ } from "../lib/dom.js";
import { app } from "../state.js";
import { CATN } from "../data/constants.ts";
import { ICONOS } from "../data/icons.ts";

/** Miniatura de una prenda: foto si la hay (se carga de IndexedDB), si no, su color con la categoría. */
export function thumb(p) {
  const d = el("div", "a-th");
  d.style.background = (p && p.color) || "#D9C9AE";
  const etiqueta = () => d.appendChild(el("span", "a-th-l", p ? CATN[p.cat] || "" : ""));
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

export function ver(tab, target) {
  document.querySelectorAll(".panel").forEach((p) => {
    p.hidden = p.getAttribute("data-panel") !== tab;
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
