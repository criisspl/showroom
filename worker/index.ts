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
  // Sin Origin solo pasa si el navegador declara que la petición es del mismo sitio.
  if (!esMismoOrigen(request, url)) return json({ error: "origen" }, 403);

  // Límite por persona: unas pocas peticiones por minuto.
  // Limitación conocida: la app no tiene cuentas, así que la única clave posible es la red de
  // origen (IP; en IPv6, el prefijo /64). Quien cambie de red o rote IPs puede esquivar el límite,
  // y varias personas tras la misma IP (oficina, CGNAT) lo comparten. No hay mejor clave estable
  // sin cuentas; el tope real de gasto lo pone el cupo del proveedor.
  if (env.LIMITE) {
    const { success } = await env.LIMITE.limit({ key: clavePorRed(request.headers.get("cf-connecting-ip")) });
    if (!success)
      return json(
        { error: "limite", mensaje: "Vas muy rápido: espera un minuto y vuelve a intentarlo." },
        429
      );
  }

  const largo = +(request.headers.get("content-length") || 0);
  if (largo > MAX_BYTES) return json({ error: "grande", mensaje: "Las fotos pesan demasiado." }, 413);
  let texto: string | null;
  try {
    texto = await leeConTope(request, MAX_BYTES);
  } catch {
    return json({ error: "formato", mensaje: "Petición no válida." }, 400);
  }
  if (texto === null) return json({ error: "grande", mensaje: "Las fotos pesan demasiado." }, 413);
  let entrada: Entrada;
  try {
    entrada = JSON.parse(texto);
  } catch {
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

function esMismoOrigen(request: Request, url: URL): boolean {
  const origen = request.headers.get("origin");
  if (origen) {
    try {
      return new URL(origen).host === url.host;
    } catch {
      return false; // p. ej. "null"
    }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

/** Clave del límite: la IP; en IPv6, el prefijo /64 (una persona suele tener un /64 entero). */
export function clavePorRed(ip: string | null): string {
  if (!ip) return "anon";
  if (!ip.includes(":")) return ip;
  const [cabeza, cola = ""] = ip.split("::");
  const izq = cabeza ? cabeza.split(":") : [];
  const der = cola ? cola.split(":") : [];
  const grupos = ip.includes("::") ? [...izq, ...Array(8 - izq.length - der.length).fill("0"), ...der] : izq;
  return (
    grupos
      .slice(0, 4)
      .map((g) => g.toLowerCase().replace(/^0+(?=.)/, ""))
      .join(":") + "::/64"
  );
}

/** Lee el cuerpo como texto sin pasar de `max` bytes; devuelve null si lo supera. */
async function leeConTope(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const lector = request.body.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await lector.cancel();
      return null;
    }
    trozos.push(value);
  }
  const todo = new Uint8Array(total);
  let pos = 0;
  for (const t of trozos) {
    todo.set(t, pos);
    pos += t.byteLength;
  }
  return new TextDecoder().decode(todo);
}
