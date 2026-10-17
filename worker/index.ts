// Servidor de la app en Cloudflare Workers.
// - Sirve la web (carpeta dist/).
// - /api/ia hace de intermediario con la IA: añade la clave (que vive en un secreto de
//   Cloudflare, nunca en el navegador ni en el repo) y limita el uso para que nadie la gaste.
//
// Variables (wrangler.jsonc → "vars") y secretos (wrangler secret put):
//   IA_URL, IA_MODELO, IA_CLAVE (secreto)          → proveedor principal
//   IA2_URL, IA2_MODELO, IA2_CLAVE (secreto, opc.)  → reserva si el principal está saturado

import { valida, cuerpoPara, MAX_BYTES, type Entrada } from "./valida.ts";

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  LIMITE?: { limit(o: { key: string }): Promise<{ success: boolean }> };
  IA_URL?: string;
  IA_MODELO?: string;
  IA_CLAVE?: string;
  IA2_URL?: string;
  IA2_MODELO?: string;
  IA2_CLAVE?: string;
}
interface Proveedor {
  url: string;
  modelo: string;
  clave: string;
}

const json = (obj: object, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/ia") return ia(request, env, url);
    if (url.pathname.startsWith("/api/")) return json({ error: "no-existe" }, 404);
    return env.ASSETS.fetch(request);
  }
};

async function ia(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== "POST") return json({ error: "metodo" }, 405);

  // Solo desde la propia web (evita que otras webs usen tu clave desde sus páginas).
  const origen = request.headers.get("origin");
  if (origen && new URL(origen).host !== url.host) return json({ error: "origen" }, 403);

  // Límite por persona (IP): unas pocas peticiones por minuto.
  if (env.LIMITE) {
    const ip = request.headers.get("cf-connecting-ip") || "anon";
    const { success } = await env.LIMITE.limit({ key: ip });
    if (!success)
      return json(
        { error: "limite", mensaje: "Vas muy rápido: espera un minuto y vuelve a intentarlo." },
        429
      );
  }

  const largo = +(request.headers.get("content-length") || 0);
  if (largo > MAX_BYTES) return json({ error: "grande", mensaje: "Las fotos pesan demasiado." }, 413);
  let entrada: Entrada;
  try {
    const t = await request.text();
    if (t.length > MAX_BYTES) throw 0;
    entrada = JSON.parse(t);
  } catch (e) {
    return json({ error: "formato", mensaje: "Petición no válida." }, 400);
  }
  const fallo = valida(entrada);
  if (fallo) return json({ error: "formato", mensaje: fallo }, 400);

  const proveedores = [
    { url: env.IA_URL, modelo: env.IA_MODELO, clave: env.IA_CLAVE },
    { url: env.IA2_URL, modelo: env.IA2_MODELO, clave: env.IA2_CLAVE }
  ].filter((p): p is Proveedor => !!(p.url && p.modelo && p.clave));
  if (!proveedores.length)
    return json({ error: "config", mensaje: "La IA de esta web no está configurada todavía." }, 503);

  let ultimo: { status: number } | null = null;
  for (const p of proveedores) {
    let r: Response;
    try {
      r = await fetch(p.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + p.clave },
        body: JSON.stringify(cuerpoPara(entrada, p.modelo, /mistral\.ai/.test(p.url)))
      });
    } catch (e) {
      ultimo = { status: 502 };
      continue;
    }
    // Saturado o caído: probamos con el de reserva.
    if (r.status === 429 || r.status >= 500) {
      ultimo = { status: r.status };
      continue;
    }
    if (r.status === 401 || r.status === 403) {
      console.error("IA: clave rechazada por", p.url);
      ultimo = { status: 503 };
      continue;
    }
    // Si el modelo no acepta el modo JSON, se lo decimos al navegador tal cual para que reintente sin él.
    const cuerpo = await r.text();
    return new Response(cuerpo, {
      status: r.status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }
  if (ultimo && ultimo.status === 429)
    return json(
      {
        error: "cupo",
        mensaje:
          "Hoy hay mucha gente usando la IA y se ha llenado el cupo gratuito. Prueba más tarde o mañana."
      },
      429
    );
  return json({ error: "caida", mensaje: "La IA no responde ahora mismo. Prueba en un rato." }, 502);
}
