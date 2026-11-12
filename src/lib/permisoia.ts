// Texto del aviso que se enseña antes de enviar nada a la IA: a quién y qué datos salen del dispositivo.
import { config } from "./ai.ts";
import { SUGERENCIAS } from "./ia/sugerencias.ts";
import type { Ajustes } from "./ai.ts";

/** Qué servicio recibirá los datos: con clave propia el elegido; si no, los que usa el servidor de la app. */
export function destinoIA(ajustes: Ajustes | null | undefined): string {
  const c = config(ajustes);
  if (c.sinClave)
    return "la IA de la app (Groq y, si está saturado, Mistral como reserva, a través del servidor de la app, que no guarda nada)";
  if (c.id === "otro") {
    let host = c.url;
    try {
      host = new URL(c.url).host;
    } catch (e) {
      /* se deja la dirección tal cual */
    }
    return "el servicio que has configurado (" + host + ")";
  }
  return SUGERENCIAS[c.id].n;
}

/** Aviso completo: `datos` dice qué se envía (sin punto final). */
export function avisoEnvio(ajustes: Ajustes | null | undefined, datos: string): string {
  return "Se enviarán a " + destinoIA(ajustes) + " " + datos + ". ¿Los envío?";
}

export const DATOS_SEGUNDA_OPINION =
  "la foto de la prenda (si la hay), sus datos, tu perfil y la lista de tu armario";
export const DATOS_PEDIR_IA =
  "tu perfil, tus gustos, la lista de tu armario, la ocasión y el tiempo, y las notas de los outfits que has votado (sin fotos)";
