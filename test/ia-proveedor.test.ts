// Contrato común de `ProveedorIA`: lo que cualquier adaptador cumple igual, más la forma del registro de sugerencias.
import { describe, test, afterEach } from "vitest";
import assert from "node:assert/strict";
import { proveedorDe } from "../src/lib/ai.ts";
import { creaIntegrada } from "../src/lib/ia/integrada.ts";
import { creaOpenAICompatible } from "../src/lib/ia/openai-compatible.ts";
import type { ProveedorIA } from "../src/lib/ia/proveedor.ts";
import { SUGERENCIAS } from "../src/lib/ia/sugerencias.ts";
import type { Crudo } from "../src/lib/tipos.ts";

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
const ok = (content: unknown) => new Response(JSON.stringify({ choices: [{ message: { content } }] }));
const IMG = "data:image/jpeg;base64,AAAA";

function contratoProveedorIA(nombre: string, crea: () => ProveedorIA, url: string) {
  describe("contrato ProveedorIA: " + nombre, () => {
    test("manda sistema, texto, imagen y JSON y devuelve el texto", async () => {
      responde(ok("hola"));
      const out = await crea().pregunta({ sistema: "eres estilista", texto: "mira", imagenes: [IMG] });
      assert.equal(out, "hola");
      assert.equal(llamadas[0].url, url);
      assert.equal(llamadas[0].init.method, "POST");
      const [sis, user] = llamadas[0].body.messages;
      assert.deepEqual(sis, { role: "system", content: "eres estilista" });
      assert.equal(user.content[0].text, "mira");
      assert.equal(user.content[1].type, "image_url");
      assert.deepEqual(llamadas[0].body.response_format, { type: "json_object" });
    });

    test("repite sin JSON si no lo admite y une la respuesta por partes", async () => {
      responde(
        new Response(JSON.stringify({ error: { message: "response_format not supported" } }), {
          status: 400
        }),
        ok([{ text: "ho" }, { text: "la" }])
      );
      assert.equal(await crea().pregunta({ texto: "x" }), "hola");
      assert.equal(llamadas.length, 2);
      assert.equal(llamadas[1].body.response_format, undefined);
    });

    test("los fallos salen como Error en español", async () => {
      responde(new Response("{}", { status: 429 }));
      await assert.rejects(crea().pregunta({ texto: "x" }), /límite gratuito/);
      responde(new TypeError("Failed to fetch"));
      await assert.rejects(crea().pregunta({ texto: "x" }), /No se ha podido conectar con la IA/);
      responde(ok(""));
      await assert.rejects(crea().pregunta({ texto: "x" }), /no ha devuelto respuesta/);
    });
  });
}

contratoProveedorIA(
  "openai-compatible",
  () => creaOpenAICompatible({ url: "https://mio.test/v1", modelo: "m", clave: "k", imagen: "objeto" }),
  "https://mio.test/v1"
);
contratoProveedorIA("integrada", () => creaIntegrada(), "api/ia");

describe("diferencias entre adaptadores", () => {
  test("openai-compatible manda modelo y clave; las imágenes como texto u objeto según el proveedor", async () => {
    responde(ok("x"));
    await creaOpenAICompatible({ url: "u", modelo: "m", clave: "k", imagen: "texto" }).pregunta({
      texto: "t",
      imagenes: [IMG]
    });
    assert.equal(llamadas[0].body.model, "m");
    assert.equal((llamadas[0].init.headers as Record<string, string>).Authorization, "Bearer k");
    assert.equal(llamadas[0].body.messages[0].content[1].image_url, IMG);
  });

  test("integrada no manda modelo ni clave y explica el 404", async () => {
    responde(ok("x"));
    await creaIntegrada().pregunta({ texto: "t" });
    assert.equal(llamadas[0].body.model, undefined);
    assert.equal((llamadas[0].init.headers as Record<string, string>).Authorization, undefined);
    responde(new Response("{}", { status: 404 }));
    await assert.rejects(creaIntegrada().pregunta({ texto: "t" }), /no está disponible/);
  });
});

describe("registro de sugerencias", () => {
  test("cada sugerencia apunta a un adaptador que existe y solo la integrada es sin clave", () => {
    for (const [id, s] of Object.entries(SUGERENCIAS)) {
      assert.ok(["openai-compatible", "integrada"].includes(s.tipo), id);
      assert.equal(s.tipo === "integrada", id === "integrada", id);
    }
  });

  test("proveedorDe elige el adaptador según los ajustes", () => {
    assert.equal(proveedorDe(null).tipo, "integrada");
    assert.equal(proveedorDe({ proveedor: "groq" }).tipo, "integrada"); // sin clave propia
    assert.equal(proveedorDe({ proveedor: "groq", clave: "k" }).tipo, "openai-compatible");
  });
});
