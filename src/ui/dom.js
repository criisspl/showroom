// Pequeñas utilidades de DOM sin dependencias.
export const $ = (id) => document.getElementById(id);

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
