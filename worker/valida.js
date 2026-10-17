// Comprobaciones de lo que el navegador manda a /api/ia. Solo se reenvía lo que la app necesita:
// mensajes de texto e imágenes, sin modelo ni parámetros elegidos por el cliente.

export const MAX_BYTES = 6 * 1024 * 1024; // 5 fotos de 1024 px en JPEG caben de sobra
const MAX_IMAGENES = 5;
const MAX_TEXTO = 24000;

export function valida(e) {
  if (!e || typeof e !== "object" || !Array.isArray(e.messages)) return "Faltan los mensajes.";
  if (e.messages.length < 1 || e.messages.length > 3) return "Demasiados mensajes.";
  let texto = 0,
    imagenes = 0;
  for (const m of e.messages) {
    if (!m || !["system", "user"].includes(m.role)) return "Mensaje no válido.";
    if (typeof m.content === "string") {
      texto += m.content.length;
      continue;
    }
    if (!Array.isArray(m.content)) return "Mensaje no válido.";
    for (const c of m.content) {
      if (c && c.type === "text" && typeof c.text === "string") texto += c.text.length;
      else if (c && c.type === "image_url") {
        const u = typeof c.image_url === "string" ? c.image_url : c.image_url && c.image_url.url;
        if (typeof u !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(u))
          return "Imagen no válida.";
        imagenes++;
      } else return "Contenido no válido.";
    }
  }
  if (texto > MAX_TEXTO) return "Texto demasiado largo.";
  if (imagenes > MAX_IMAGENES) return "Demasiadas fotos (máximo " + MAX_IMAGENES + ").";
  return null;
}

// Mistral quiere la imagen como texto; el resto, como objeto { url }.
const imagen = (u, comoTexto) => ({ type: "image_url", image_url: comoTexto ? u : { url: u } });

/** Cuerpo para el proveedor: el modelo y los límites los pone el servidor. */
export function cuerpoPara(e, modelo, imagenComoTexto = false) {
  const messages = e.messages.map((m) => ({
    role: m.role,
    content:
      typeof m.content === "string"
        ? m.content
        : m.content.map((c) =>
            c.type === "text"
              ? { type: "text", text: c.text }
              : imagen(typeof c.image_url === "string" ? c.image_url : c.image_url.url, imagenComoTexto)
          )
  }));
  const b = { model: modelo, messages, temperature: 0.4, max_tokens: 4096 };
  if (e.response_format && e.response_format.type === "json_object")
    b.response_format = { type: "json_object" };
  return b;
}
