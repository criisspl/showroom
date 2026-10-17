import { test, afterEach } from "vitest";
import assert from "node:assert/strict";
import { config, hayIA, pregunta, preguntaJSON } from "../src/lib/ai.ts";
import type { Crudo } from "../src/lib/tipos.ts";

const IMG = "data:image/jpeg;base64,AAAA";
const CLAVE = { proveedor: "groq", clave: "gsk_x" };
const ok = (content: unknown) => new Response(JSON.stringify({ choices: [{ message: { content } }] }));

// Guarda cada llamada a fetch y responde con lo que toque en cada turno
let llamadas: { url: string; init: RequestInit; body: Crudo }[] = [];
function responde(...rs: (Response | Error)[]) {
  llamadas = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    llamadas.push({ url, init, body: JSON.parse(String(init.body)) });
    const r = rs[Math.min(llamadas.length, rs.length) - 1];
    if (r instanceof Error) throw r;
    return r;
  }) as typeof fetch;
}
const real = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = real;
});

test("sin clave propia usa siempre la IA integrada", () => {
  assert.equal(config(null).id, "integrada");
  assert.equal(config({ proveedor: "groq" }).id, "integrada");
  assert.equal(config({ proveedor: "no-existe", clave: "x" }).id, "integrada");
  const c = config(CLAVE);
  assert.equal(c.id, "groq");
  assert.match(c.url, /groq\.com/);
  assert.equal(config({ ...CLAVE, modelo: "otro", url: "https://mio.test" }).url, "https://mio.test");
  assert.equal(hayIA(null), true);
  assert.equal(hayIA({ proveedor: "otro", clave: "x" }), false); // «otro» sin URL no sirve
});

test("la integrada no manda modelo ni clave; la propia, sí", async () => {
  responde(ok("hola"));
  assert.equal(await pregunta(null, { texto: "hola" }), "hola");
  assert.equal(llamadas[0].url, "api/ia");
  assert.equal(llamadas[0].body.model, undefined);
  assert.equal((llamadas[0].init.headers as Record<string, string>).Authorization, undefined);

  responde(ok("hola"));
  await pregunta(CLAVE, { texto: "hola" });
  assert.equal(llamadas[0].body.model, "meta-llama/llama-4-scout-17b-16e-instruct");
  assert.equal((llamadas[0].init.headers as Record<string, string>).Authorization, "Bearer gsk_x");
});

test("las fotos van como cada proveedor las quiere", async () => {
  responde(ok("x"));
  await pregunta(CLAVE, { sistema: "eres estilista", texto: "mira", imagenes: [IMG] });
  const [sis, user] = llamadas[0].body.messages;
  assert.deepEqual(sis, { role: "system", content: "eres estilista" });
  assert.deepEqual(user.content[1], { type: "image_url", image_url: { url: IMG } });
  assert.deepEqual(llamadas[0].body.response_format, { type: "json_object" });

  responde(ok("x"));
  await pregunta({ proveedor: "mistral", clave: "m" }, { texto: "mira", imagenes: [IMG], json: false });
  assert.deepEqual(llamadas[0].body.messages[0].content[1], { type: "image_url", image_url: IMG });
  assert.equal(llamadas[0].body.response_format, undefined);
});

test("si el proveedor no admite JSON, repite sin pedirlo", async () => {
  responde(
    new Response(JSON.stringify({ error: { message: "response_format not supported" } }), { status: 400 }),
    ok("{}")
  );
  assert.equal(await pregunta(CLAVE, { texto: "x" }), "{}");
  assert.equal(llamadas.length, 2);
  assert.equal(llamadas[1].body.response_format, undefined);
});

test("une la respuesta cuando llega por partes", async () => {
  responde(ok([{ text: "ho" }, { text: "la" }, {}]));
  assert.equal(await pregunta(null, { texto: "x" }), "hola");
});

test("cada fallo se explica en español", async () => {
  const falla = async (r: Response | Error, ajustes: object | null = CLAVE) => {
    responde(r);
    return pregunta(ajustes, { texto: "x" }).then(
      () => assert.fail("tenía que fallar"),
      (e: Error) => e.message
    );
  };
  assert.match(await falla(new TypeError("Failed to fetch"), null), /Revisa tu conexión a internet/);
  assert.match(await falla(new TypeError("Failed to fetch")), /prueba otro proveedor/);
  assert.match(await falla(new Response("{}", { status: 401 })), /rechazado la clave/);
  assert.match(await falla(new Response("{}", { status: 429 })), /límite gratuito/);
  assert.match(await falla(new Response("{}", { status: 404 }), null), /no está disponible/);
  assert.equal(
    await falla(new Response(JSON.stringify({ mensaje: "Cupo diario lleno" }), { status: 429 }), null),
    "Cupo diario lleno"
  );
  assert.match(
    await falla(new Response(JSON.stringify({ error: "modelo raro" }), { status: 500 })),
    /error \(500\): modelo raro/
  );
  assert.match(await falla(ok("")), /no ha devuelto respuesta/);
});

test("preguntaJSON insiste una vez si la respuesta no trae JSON", async () => {
  responde(ok("Claro, aquí tienes."), ok('```json\n{"a":1}\n```'));
  assert.deepEqual(await preguntaJSON(null, { texto: "dame datos" }), { a: 1 });
  assert.match(llamadas[1].body.messages[0].content, /únicamente con un objeto JSON/);

  responde(ok("nada"), ok("tampoco"));
  await assert.rejects(preguntaJSON(null, { texto: "x" }), /formato esperado/);
});
