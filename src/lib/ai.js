// Cliente de IA. Por defecto usa la IA integrada de la web (/api/ia, ver worker/), que no
// necesita clave. Opcionalmente, cada persona puede usar su propia clave de cualquier proveedor
// compatible con la API de OpenAI (chat/completions); esa clave se guarda solo en su navegador.

export const PROVEEDORES = {
  integrada: {
    n: "IA de la app (sin clave)",
    url: "api/ia",
    modelo: "",
    clave: "",
    nota: "No tienes que hacer nada: la app ya trae la IA. Tiene un cupo diario compartido; si se llena, prueba más tarde o usa tu propia clave.",
    imagen: "objeto",
    sinClave: true
  },
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
  otro: {
    n: "Otro compatible con OpenAI",
    url: "",
    modelo: "",
    clave: "",
    nota: "Cualquier servicio con la API chat/completions.",
    imagen: "objeto"
  }
};

export function config(ajustes) {
  let id = (ajustes && ajustes.proveedor) || "integrada";
  // Sin clave propia, siempre la integrada
  if (!PROVEEDORES[id] || (!PROVEEDORES[id].sinClave && !(ajustes && ajustes.clave))) id = "integrada";
  const p = PROVEEDORES[id];
  if (p.sinClave) return { id, url: p.url, modelo: "", clave: "", imagen: p.imagen, sinClave: true };
  return {
    id,
    url: (ajustes && ajustes.url) || p.url,
    modelo: (ajustes && ajustes.modelo) || p.modelo,
    clave: (ajustes && ajustes.clave) || "",
    imagen: p.imagen
  };
}
export const hayIA = (ajustes) => !!config(ajustes).url;

/** Reduce una imagen (Blob o File) a JPEG de como mucho `max` px y la devuelve como data URL. */
export async function imagenParaIA(blob, max = 1024) {
  const img = await abreImagen(blob);
  const w = img.naturalWidth || img.width,
    h = img.naturalHeight || img.height;
  const r = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * r));
  c.height = Math.max(1, Math.round(h * r));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  if (img.close) img.close();
  return c.toDataURL("image/jpeg", 0.85);
}

/** Abre una foto respetando la orientación EXIF. Usa <img> como respaldo (Safari antiguo). */
export async function abreImagen(blob) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch (e) {
      /* probamos con <img> */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await (img.decode
      ? img.decode()
      : new Promise((ok, ko) => {
          img.onload = ok;
          img.onerror = ko;
        }));
    return img;
  } catch (e) {
    throw new Error(
      "No he podido abrir esa foto. Prueba con una en JPG o PNG (en iPhone: Ajustes → Cámara → Formatos → Más compatible)."
    );
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Llama al modelo. `imagenes` son data URLs. Devuelve el texto de la respuesta.
 * Lanza Error con un mensaje en español si algo falla.
 */
export async function pregunta(ajustes, { sistema, texto, imagenes = [], json = true, signal }) {
  const cfg = config(ajustes);
  const contenido = [{ type: "text", text: texto }];
  imagenes.forEach((u) =>
    contenido.push(
      cfg.imagen === "texto"
        ? { type: "image_url", image_url: u }
        : { type: "image_url", image_url: { url: u } }
    )
  );
  const body = {
    ...(cfg.sinClave ? {} : { model: cfg.modelo }),
    messages: [
      ...(sistema ? [{ role: "system", content: sistema }] : []),
      { role: "user", content: imagenes.length ? contenido : texto }
    ],
    temperature: 0.4
  };
  if (json) body.response_format = { type: "json_object" };
  let r;
  try {
    r = await fetch(cfg.url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(cfg.sinClave ? {} : { Authorization: "Bearer " + cfg.clave })
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    throw new Error(
      cfg.sinClave
        ? "No se ha podido conectar con la IA. Revisa tu conexión a internet."
        : "No se ha podido conectar con la IA. Revisa tu conexión o prueba otro proveedor (algunos no aceptan llamadas desde el navegador)."
    );
  }
  if (!r.ok) {
    let det = "",
      propio = "";
    try {
      const j = await r.json();
      propio = cfg.sinClave && j.mensaje ? j.mensaje : "";
      det = (j.error && (j.error.message || j.error)) || j.message || "";
    } catch (e) {
      /* sin detalle */
    }
    if (r.status === 400 && json && /response_format|json/i.test(String(det)))
      return pregunta(ajustes, { sistema, texto, imagenes, json: false, signal });
    if (propio) throw new Error(propio);
    if (cfg.sinClave && r.status === 404)
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
        ? m.content.map((x) => x.text || "").join("")
        : "");
  if (!out) throw new Error("La IA no ha devuelto respuesta.");
  return out;
}

/** Extrae el primer objeto JSON de un texto (quita ``` y texto alrededor). */
export function sacaJSON(t) {
  const s = String(t).replace(/```(?:json)?/gi, "");
  const a = s.indexOf("{"),
    b = s.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("La IA no ha devuelto datos con el formato esperado.");
  return JSON.parse(s.slice(a, b + 1));
}

export async function preguntaJSON(ajustes, opts) {
  const t = await pregunta(ajustes, opts);
  try {
    return sacaJSON(t);
  } catch (e) {
    // Un segundo intento pidiendo solo JSON
    const t2 = await pregunta(ajustes, {
      ...opts,
      texto:
        opts.texto +
        "\n\nIMPORTANTE: responde únicamente con un objeto JSON válido, sin texto antes ni después."
    });
    return sacaJSON(t2);
  }
}
