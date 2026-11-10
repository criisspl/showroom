import { test, afterEach } from "vitest";
import assert from "node:assert/strict";
import worker, { type Env } from "../worker/index.ts";

const cuerpo = { messages: [{ role: "user", content: [{ type: "text", text: "hola" }] }] };
const env = (o: Partial<Env> = {}): Env => ({
  ASSETS: { fetch: async () => new Response("web") },
  IA_URL: "https://uno.test/v1",
  IA_MODELO: "m1",
  IA_CLAVE: "k1",
  IA2_URL: "https://dos.test/v1",
  IA2_MODELO: "m2",
  IA2_CLAVE: "k2",
  ...o
});
const pide = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://armario.test/api/ia", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://armario.test", ...headers },
    body: JSON.stringify(body)
  });
const real = globalThis.fetch;
const consola = console.error;
afterEach(() => {
  globalThis.fetch = real;
  console.error = consola;
});
const error = async (r: Response) => ((await r.json()) as { error?: string }).error;

test("si el principal se cae (red), usa el de reserva", async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    urls.push(url);
    if (url.includes("uno")) throw new Error("sin red");
    return new Response('{"ok":1}');
  }) as typeof fetch;
  const r = await worker.fetch(pide(cuerpo), env());
  assert.equal(r.status, 200);
  assert.deepEqual(urls, ["https://uno.test/v1", "https://dos.test/v1"]);
});

test("si el principal da error 5xx, usa el de reserva", async () => {
  globalThis.fetch = (async (url: string) =>
    url.includes("uno") ? new Response("{}", { status: 503 }) : new Response('{"ok":1}')) as typeof fetch;
  assert.equal((await worker.fetch(pide(cuerpo), env())).status, 200);
});

test("si rechazan la clave, lo apunta en el log sin la clave y prueba el de reserva", async () => {
  const log: unknown[][] = [];
  console.error = (...a: unknown[]) => void log.push(a);
  globalThis.fetch = (async (url: string) =>
    url.includes("uno") ? new Response("{}", { status: 401 }) : new Response('{"ok":1}')) as typeof fetch;
  assert.equal((await worker.fetch(pide(cuerpo), env())).status, 200);
  assert.equal(log.length, 1);
  assert.ok(!JSON.stringify(log).includes("k1"));
});

test("con todos caídos devuelve 502 con el aviso «caida»", async () => {
  globalThis.fetch = async () => {
    throw new Error("sin red");
  };
  const r = await worker.fetch(pide(cuerpo), env());
  assert.equal(r.status, 502);
  assert.equal(await error(r), "caida");
});

test("con las claves rechazadas en todos devuelve 502", async () => {
  console.error = () => {};
  globalThis.fetch = async () => new Response("{}", { status: 403 });
  assert.equal((await worker.fetch(pide(cuerpo), env())).status, 502);
});

test("con un solo proveedor configurado, un 5xx acaba en 502", async () => {
  globalThis.fetch = async () => new Response("{}", { status: 500 });
  const r = await worker.fetch(pide(cuerpo), env({ IA2_CLAVE: undefined }));
  assert.equal(r.status, 502);
});

test("un 400 del proveedor llega tal cual al navegador para que reintente sin JSON", async () => {
  globalThis.fetch = async () =>
    new Response('{"error":{"message":"response_format no soportado"}}', { status: 400 });
  const r = await worker.fetch(pide(cuerpo), env());
  assert.equal(r.status, 400);
  assert.match(await r.text(), /response_format/);
});

test("rutas /api desconocidas dan 404 y un cuerpo demasiado grande, 413", async () => {
  assert.equal((await worker.fetch(new Request("https://armario.test/api/otra"), env())).status, 404);
  const r = await worker.fetch(pide(cuerpo, { "content-length": "99999999" }), env());
  assert.equal(r.status, 413);
});
