// Pequeñas utilidades de DOM sin dependencias.
export const $ = (id) => document.getElementById(id);

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function boton(texto, cls = "a-btn", onClick) {
  const b = el("button", cls, texto);
  b.type = "button";
  if (onClick) b.addEventListener("click", onClick);
  return b;
}

/** Grupo de opciones tipo chip (radios o checkboxes). items: [[valor, texto, subtexto?]] o {id, n, s}. */
export function radios(box, name, items, sel, { sub = false, multi = false } = {}) {
  if (!box) return;
  box.textContent = "";
  items.forEach((it) => {
    const id = it.id || it[0],
      n = it.n || it[1],
      s = it.s || it[2];
    const l = el("label"),
      i = el("input"),
      sp = el("span", null, n);
    i.type = multi ? "checkbox" : "radio";
    i.name = name;
    i.value = id;
    i.id = name + "-" + id;
    if (multi ? (sel || []).includes(id) : id === sel) i.checked = true;
    if (sub && s) sp.appendChild(el("small", null, s));
    l.appendChild(i);
    l.appendChild(sp);
    box.appendChild(l);
  });
}
export function val(name) {
  const e = document.querySelector('input[name="' + name + '"]:checked');
  return e ? e.value : null;
}
export function vals(name) {
  return [...document.querySelectorAll('input[name="' + name + '"]:checked')].map((i) => i.value);
}
export function setVal(name, v) {
  const e = $(name + "-" + v);
  if (e) e.checked = true;
}

export function hoyISO() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
export function fechaLarga(iso) {
  try {
    const p = iso.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
  } catch (e) {
    return iso;
  }
}
export const pinterest = (q) => "https://www.pinterest.com/search/pins/?q=" + encodeURIComponent(q);
export function pinA(q, txt, cls = "pinbtn") {
  const a = el("a", cls, txt + " ↗");
  a.href = pinterest(q);
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

let statusTimer = null;
export function aviso(msg, ms = 4000) {
  const s = $("a-status");
  if (!s) return;
  if (!msg) {
    s.hidden = true;
    return;
  }
  s.textContent = msg;
  s.hidden = false;
  clearTimeout(statusTimer);
  if (ms)
    statusTimer = setTimeout(() => {
      s.hidden = true;
    }, ms);
}
