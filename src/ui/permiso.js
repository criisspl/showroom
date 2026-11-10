// Permiso para enviar datos a la IA: mismo aviso que «Foto de un look» y las referencias de gusto.
// Se pide en cada envío; no se recuerda la respuesta.
import { el, boton } from "../lib/dom.js";

/** Cambia `btn` por un aviso con «Sí»/«No». Solo si dice «Sí» se llama a `alAceptar`. `tras` es dónde se pinta el aviso. */
export function pidePermisoIA(btn, aviso, alAceptar, tras = btn) {
  const cierra = () => {
    grupo.remove();
    btn.hidden = false;
  };
  const grupo = el("div", "ref-permiso");
  grupo.setAttribute("role", "group");
  grupo.setAttribute("aria-label", "Permiso para enviar a la IA");
  grupo.appendChild(el("p", null, aviso));
  grupo.appendChild(
    boton("Sí, enviarlos", "a-btn", () => {
      cierra();
      alAceptar();
    })
  );
  grupo.appendChild(boton("No", "a-btn ghost", cierra));
  btn.hidden = true;
  tras.after(grupo);
  grupo.querySelector("button")?.focus();
}
