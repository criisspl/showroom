// Llamada a chat/completions y traducción de sus fallos a mensajes en español. La comparten los dos
// adaptadores: la IA integrada habla el mismo protocolo, pero sin modelo ni clave y con sus propios mensajes.

import { esUrlHttps } from "../url.ts";
import type { Pregunta } from "./proveedor.ts";

export interface ConfigChat {
  url: string;
  modelo: string;
  clave: string;
  /** Cómo quiere el proveedor las imágenes: como texto o como objeto { url }. */
  imagen: "texto" | "objeto";
  /** La IA integrada de la app: sin modelo ni clave. */
  integrada: boolean;
}

type Contenido = { type: "text"; text: string } | { type: "image_url"; image_url: string | { url: string } };

export async function llamaChat(
  cfg: ConfigChat,
  { sistema, texto, imagenes = [], json = true, signal }: Pregunta
): Promise<string> {
  const contenido: Contenido[] = [{ type: "text", text: texto }];
  imagenes.forEach((u) =>
    contenido.push(
      cfg.imagen === "texto"
        ? { type: "image_url", image_url: u }
        : { type: "image_url", image_url: { url: u } }
    )
  );
  const body: Record<string, unknown> = {
    ...(cfg.integrada ? {} : { model: cfg.modelo }),
    messages: [
      ...(sistema ? [{ role: "system", content: sistema }] : []),
      { role: "user", content: imagenes.length ? contenido : texto }
    ],
    temperature: 0.4
  };
  if (json) body.response_format = { type: "json_object" };
  // Destino configurable: la clave solo sale hacia una URL https
  if (!cfg.integrada && !esUrlHttps(cfg.url))
    throw new Error("La URL de la IA tiene que empezar por https://");
  let r;
  try {
    r = await fetch(cfg.url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(cfg.integrada ? {} : { Authorization: "Bearer " + cfg.clave })
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    throw new Error(
      cfg.integrada
        ? "No se ha podido conectar con la IA. Revisa tu conexión a internet."
        : "No se ha podido conectar con la IA. Revisa tu conexión o prueba otro proveedor (algunos no aceptan llamadas desde el navegador)."
    );
  }
  if (!r.ok) {
    let det = "",
      propio = "";
    try {
      const j = await r.json();
      propio = cfg.integrada && j.mensaje ? j.mensaje : "";
      det = (j.error && (j.error.message || j.error)) || j.message || "";
    } catch (e) {
      /* sin detalle */
    }
    if (r.status === 400 && json && /response_format|json/i.test(String(det)))
      return llamaChat(cfg, { sistema, texto, imagenes, json: false, signal });
    if (propio) throw new Error(propio);
    if (cfg.integrada && r.status === 404)
      throw new Error(
        "La IA integrada no está disponible en esta copia de la app. Puedes usar tu propia clave en Ajustes."
      );
    if (r.status === 401 || r.status === 403)
      throw new Error("La IA ha rechazado la clave. Revisa que esté bien copiada.");
    if (r.status === 429)
      throw new Error("Has llegado al límite gratuito de la IA por ahora. Prueba en un rato.");
    throw new Error(
      "La IA ha devuelto un error (" + r.status + ")" + (det ? ": " + String(det).slice(0, 160) : ".")
    );
  }
  const j = await r.json();
  const m = j.choices && j.choices[0] && j.choices[0].message;
  const out =
    m &&
    (typeof m.content === "string"
      ? m.content
      : Array.isArray(m.content)
        ? m.content.map((x: { text?: string }) => x.text || "").join("")
        : "");
  if (!out) throw new Error("La IA no ha devuelto respuesta.");
  return out;
}
