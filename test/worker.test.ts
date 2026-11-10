import { test, afterEach } from "vitest";
import assert from "node:assert/strict";
import worker, { clavePorRed, type Env } from "../worker/index.ts";
import { valida, cuerpoPara, type Entrada } from "../worker/valida.ts";

const IMG = "data:image/jpeg;base64,AAAA";
const msg = (extra: object = {}): Entrada => ({
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "hola" },
        { type: "image_url", image_url: { url: IMG } }
      ]
    }
  ],
  ...extra
});
const env = (o: Partial<Env> = {}): Env => ({
  ASSETS: { fetch: async () => new Response("web") },
  IA_URL: "https://uno.test/v1",
  IA_MODELO: "m1",
  IA_CLAVE: "k1",
  IA2_URL: "https://api.mistral.ai/v1",
  IA2_MODELO: "m2",
  IA2_CLAVE: "k2",
  LIMITE: { limit: async () => ({ success: true }) },
  ...o
});
const pide = (body: unknown, headers = {}) =>
  new Request("https://armario.test/api/ia", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://armario.test", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
const real = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = real;
});

test("valida acepta lo que manda la app y rechaza lo raro", () => {
  assert.equal(valida(msg()), null);
  assert.ok(valida({}));
  assert.ok(valida({ messages: [{ role: "assistant", content: "x" }] }));
  assert.ok(
    valida({
      messages: [
        { role: "user", content: [{ type: "image_url", image_url: { url: "https://otra.web/foto.jpg" } }] }
      ]
    })
  );
  assert.ok(valida({ messages: [{ role: "user", content: "x".repeat(30000) }] }));
  assert.ok(
    valida({ messages: [{ role: "user", content: Array(6).fill({ type: "image_url", image_url: IMG }) }] })
  );
});

test("cuerpoPara pone el modelo del servidor y no deja pasar otros parámetros", () => {
  const b = cuerpoPara(
    msg({ model: "caro", max_tokens: 99999, response_format: { type: "json_object" } }),
    "m1"
  );
  assert.equal(b.model, "m1");
  assert.equal(b.max_tokens, 4096);
  assert.deepEqual(b.response_format, { type: "json_object" });
  const contenido = cuerpoPara(msg(), "m2", true).messages[0].content as { image_url?: unknown }[];
  assert.equal(contenido[1].image_url, IMG);
});

test("sirve la web fuera de /api", async () => {
  const r = await worker.fetch(new Request("https://armario.test/"), env());
  assert.equal(await r.text(), "web");
});

test("añade la clave del servidor y devuelve la respuesta", async () => {
  let visto:
    { url: string; init: RequestInit & { headers: Record<string, string>; body: string } } | undefined;
  globalThis.fetch = (async (
    url: string,
    init: RequestInit & { headers: Record<string, string>; body: string }
  ) => {
    visto = { url, init };
    return new Response('{"choices":[]}', { status: 200 });
  }) as typeof fetch;
  const r = await worker.fetch(pide(msg()), env());
  assert.equal(r.status, 200);
  assert.equal(visto?.url, "https://uno.test/v1");
  assert.equal(visto?.init.headers.authorization, "Bearer k1");
  assert.equal(JSON.parse(visto?.init.body ?? "{}").model, "m1");
});

test("si el principal está saturado, usa el de reserva", async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    urls.push(url);
    return url.includes("uno")
      ? new Response("{}", { status: 429 })
      : new Response('{"ok":1}', { status: 200 });
  }) as typeof fetch;
  const r = await worker.fetch(pide(msg()), env());
  assert.equal(r.status, 200);
  assert.equal(urls.length, 2);
});

test("cupo lleno en todos → 429 con mensaje en español", async () => {
  globalThis.fetch = async () => new Response("{}", { status: 429 });
  const r = await worker.fetch(pide(msg()), env());
  assert.equal(r.status, 429);
  assert.match(((await r.json()) as { mensaje: string }).mensaje, /cupo/);
});

test("rechaza otros orígenes, métodos, exceso de peticiones y cuerpos no válidos", async () => {
  globalThis.fetch = async () => {
    throw new Error("no debería llamar");
  };
  assert.equal((await worker.fetch(pide(msg(), { origin: "https://otra.web" }), env())).status, 403);
  assert.equal((await worker.fetch(new Request("https://armario.test/api/ia"), env())).status, 405);
  assert.equal(
    (await worker.fetch(pide(msg()), env({ LIMITE: { limit: async () => ({ success: false }) } }))).status,
    429
  );
  assert.equal((await worker.fetch(pide("no es json"), env())).status, 400);
  assert.equal((await worker.fetch(pide(msg()), env({ IA_CLAVE: "", IA2_CLAVE: "" }))).status, 503);
});

test("sin Origin solo pasa con sec-fetch-site: same-origin", async () => {
  globalThis.fetch = async () => new Response("{}", { status: 200 });
  const sinOrigen = (headers: Record<string, string> = {}) =>
    new Request("https://armario.test/api/ia", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(msg())
    });
  assert.equal((await worker.fetch(sinOrigen(), env())).status, 403);
  assert.equal((await worker.fetch(sinOrigen({ "sec-fetch-site": "cross-site" }), env())).status, 403);
  assert.equal((await worker.fetch(sinOrigen({ "sec-fetch-site": "same-origin" }), env())).status, 200);
  assert.equal((await worker.fetch(pide(msg(), { origin: "null" }), env())).status, 403);
});

test("cuerpo grande sin content-length se corta por streaming", async () => {
  globalThis.fetch = async () => {
    throw new Error("no debería llamar");
  };
  let leidos = 0;
  const trozo = new Uint8Array(1024 * 1024);
  const cuerpo = new ReadableStream<Uint8Array>({
    pull(c) {
      if (++leidos > 50) return c.close();
      c.enqueue(trozo);
    }
  });
  const r = await worker.fetch(
    new Request("https://armario.test/api/ia", {
      method: "POST",
      headers: { origin: "https://armario.test" },
      body: cuerpo,
      duplex: "half"
    } as RequestInit),
    env()
  );
  assert.equal(r.status, 413);
  assert.ok(leidos < 20, "no debe leer el cuerpo entero");
});

test("el límite usa el prefijo /64 en IPv6 y la IP completa en IPv4", async () => {
  assert.equal(clavePorRed("203.0.113.7"), "203.0.113.7");
  assert.equal(clavePorRed(null), "anon");
  assert.equal(clavePorRed("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), "2001:db8:1:2::/64");
  assert.equal(clavePorRed("2001:DB8:1:2::1"), clavePorRed("2001:db8:1:2:ffff::9"));
  assert.equal(clavePorRed("2001:db8::1"), "2001:db8:0:0::/64");
  assert.equal(clavePorRed("::1"), "0:0:0:0::/64");
  let clave = "";
  globalThis.fetch = async () => new Response("{}", { status: 200 });
  await worker.fetch(
    pide(msg(), { "cf-connecting-ip": "2001:db8:1:2:3:4:5:6" }),
    env({ LIMITE: { limit: async (o) => ((clave = o.key), { success: true }) } })
  );
  assert.equal(clave, "2001:db8:1:2::/64");
});

test("reserva: error de red, 5xx y clave rechazada pasan al siguiente proveedor", async () => {
  const llamadas: string[] = [];
  globalThis.fetch = (async (url: string) => {
    llamadas.push(url);
    if (url.includes("uno")) throw new Error("red caída");
    return new Response('{"ok":1}', { status: 200 });
  }) as typeof fetch;
  assert.equal((await worker.fetch(pide(msg()), env())).status, 200);
  assert.equal(llamadas.length, 2);

  globalThis.fetch = async (url) => new Response("{}", { status: String(url).includes("uno") ? 503 : 200 });
  assert.equal((await worker.fetch(pide(msg()), env())).status, 200);

  globalThis.fetch = async () => new Response("{}", { status: 401 });
  assert.equal((await worker.fetch(pide(msg()), env())).status, 502);
  globalThis.fetch = async () => {
    throw new Error("red caída");
  };
  assert.equal((await worker.fetch(pide(msg()), env())).status, 502);
});
