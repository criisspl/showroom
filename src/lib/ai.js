// Cliente de IA. Todos los proveedores usan la API compatible con OpenAI (chat/completions),
// así que basta con cambiar la URL, el modelo y la clave. La clave la pone cada persona y
// se guarda solo en su navegador.

export const PROVEEDORES = {
  mistral: {
    n: "Mistral (Francia)",
    url: "https://api.mistral.ai/v1/chat/completions",
    modelo: "mistral-small-latest",
    clave: "https://console.mistral.ai/api-keys",
    nota: "Empresa europea con plan gratuito. El modelo Small entiende fotos.",
    imagen: "texto" // Mistral acepta image_url como texto
  },
  groq: {
    n: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    modelo: "meta-llama/llama-4-scout-17b-16e-instruct",
    clave: "https://console.groq.com/keys",
    nota: "Plan gratuito muy rápido. Elige un modelo con visión.",
    imagen: "objeto"
  },
  openrouter: {
    n: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    modelo: "openrouter/free",
    clave: "https://openrouter.ai/keys",
    nota: "Da acceso a varios modelos gratuitos (los que acaban en :free). Pocas peticiones al día.",
    imagen: "objeto"
  },
  gemini: {
    n: "Google Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    modelo: "gemini-flash-latest",
    clave: "https://aistudio.google.com/apikey",
    nota: "Ojo: según las condiciones de Google, en la UE, Suiza y Reino Unido solo se permite el plan de pago.",
    imagen: "objeto"
  },
  otro: { n: "Otro compatible con OpenAI", url: "", modelo: "", clave: "", nota: "Cualquier servicio con la API chat/completions.", imagen: "objeto" }
};

export function config(ajustes) {
  const p = PROVEEDORES[(ajustes && ajustes.proveedor) || "mistral"] || PROVEEDORES.mistral;
  return {
    url: (ajustes && ajustes.url) || p.url,
    modelo: (ajustes && ajustes.modelo) || p.modelo,
    clave: (ajustes && ajustes.clave) || "",
    imagen: p.imagen
  };
}
export const hayIA = (ajustes) => !!(ajustes && ajustes.clave && config(ajustes).url);

/** Reduce una imagen (Blob o File) a JPEG de como mucho `max` px y la devuelve como data URL. */
export async function imagenParaIA(blob, max = 1024) {
  const bm = await createImageBitmap(blob);
  const r = Math.min(1, max / Math.max(bm.width, bm.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bm.width * r); c.height = Math.round(bm.height * r);
  c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height);
  if (bm.close) bm.close();
  return c.toDataURL("image/jpeg", 0.85);
}

/**
 * Llama al modelo. `imagenes` son data URLs. Devuelve el texto de la respuesta.
 * Lanza Error con un mensaje en español si algo falla.
 */
export async function pregunta(ajustes, { sistema, texto, imagenes = [], json = true, signal }) {
  const cfg = config(ajustes);
  if (!cfg.clave) throw new Error("Falta la clave de la IA. Ponla en Ajustes.");
  const contenido = [{ type: "text", text: texto }];
  imagenes.forEach((u) => contenido.push(cfg.imagen === "texto" ? { type: "image_url", image_url: u } : { type: "image_url", image_url: { url: u } }));
  const body = {
    model: cfg.modelo,
    messages: [...(sistema ? [{ role: "system", content: sistema }] : []), { role: "user", content: imagenes.length ? contenido : texto }],
    temperature: 0.4
  };
  if (json) body.response_format = { type: "json_object" };
  let r;
  try {
    r = await fetch(cfg.url, { method: "POST", signal, headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.clave }, body: JSON.stringify(body) });
  } catch (e) {
    throw new Error("No se ha podido conectar con la IA. Revisa tu conexión o prueba otro proveedor (algunos no aceptan llamadas desde el navegador).");
  }
  if (!r.ok) {
    let det = ""; try { const j = await r.json(); det = (j.error && (j.error.message || j.error)) || j.message || ""; } catch (e) { /* sin detalle */ }
    if (r.status === 401 || r.status === 403) throw new Error("La IA ha rechazado la clave. Revisa que esté bien copiada.");
    if (r.status === 429) throw new Error("Has llegado al límite gratuito de la IA por ahora. Prueba en un rato.");
    if (r.status === 400 && json && /response_format|json/i.test(String(det))) return pregunta(ajustes, { sistema, texto, imagenes, json: false, signal });
    throw new Error("La IA ha devuelto un error (" + r.status + ")" + (det ? ": " + String(det).slice(0, 160) : "."));
  }
  const j = await r.json();
  const m = j.choices && j.choices[0] && j.choices[0].message;
  const out = m && (typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map((x) => x.text || "").join("") : "");
  if (!out) throw new Error("La IA no ha devuelto respuesta.");
  return out;
}

/** Extrae el primer objeto JSON de un texto (quita ``` y texto alrededor). */
export function sacaJSON(t) {
  const s = String(t).replace(/```(?:json)?/gi, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("La IA no ha devuelto datos con el formato esperado.");
  return JSON.parse(s.slice(a, b + 1));
}

export async function preguntaJSON(ajustes, opts) {
  const t = await pregunta(ajustes, opts);
  try { return sacaJSON(t); }
  catch (e) {
    // Un segundo intento pidiendo solo JSON
    const t2 = await pregunta(ajustes, { ...opts, texto: opts.texto + "\n\nIMPORTANTE: responde únicamente con un objeto JSON válido, sin texto antes ni después." });
    return sacaJSON(t2);
  }
}
