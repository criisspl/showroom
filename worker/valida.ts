// Comprobaciones de lo que el navegador manda a /api/ia. Solo se reenvía lo que la app necesita:
// mensajes de texto e imágenes, sin modelo ni parámetros elegidos por el cliente.

export const MAX_BYTES = 6 * 1024 * 1024; // 5 fotos de 1024 px en JPEG caben de sobra
const MAX_IMAGENES = 5;
const MAX_TEXTO = 24000;

type ImagenUrl = string | { url: string };
export type Contenido = { type: "text"; text: string } | { type: "image_url"; image_url: ImagenUrl };
export interface Mensaje {
  role: "system" | "user";
  content: string | Contenido[];
}
/** Lo que manda el navegador, ya validado por valida(). */
export interface Entrada {
  messages: Mensaje[];
  response_format?: { type: string };
}

/** Devuelve el motivo del rechazo o null si la entrada es válida (y entonces es una Entrada). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- es justo lo que valida esta función
export function valida(e: any): string | null {
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
const imagen = (u: string, comoTexto: boolean): Contenido => ({
  type: "image_url",
  image_url: comoTexto ? u : { url: u }
});

/** Cuerpo para el proveedor: el modelo y los límites los pone el servidor. */
const urlDe = (u: ImagenUrl) => (typeof u === "string" ? u : u.url);

export interface CuerpoProveedor {
  model: string;
  messages: { role: Mensaje["role"]; content: string | Contenido[] }[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: "json_object" };
}

export function cuerpoPara(e: Entrada, modelo: string, imagenComoTexto = false): CuerpoProveedor {
  const messages = e.messages.map((m): CuerpoProveedor["messages"][number] => ({
    role: m.role,
    content:
      typeof m.content === "string"
        ? m.content
        : m.content.map((c) =>
            c.type === "text"
              ? ({ type: "text", text: c.text } as const)
              : imagen(urlDe(c.image_url), imagenComoTexto)
          )
  }));
  const b: CuerpoProveedor = { model: modelo, messages, temperature: 0.4, max_tokens: 4096 };
  if (e.response_format && e.response_format.type === "json_object")
    b.response_format = { type: "json_object" };
  return b;
}
