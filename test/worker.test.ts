import { test, afterEach } from "vitest";
import assert from "node:assert/strict";
import worker, { type Env } from "../worker/index.ts";
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
