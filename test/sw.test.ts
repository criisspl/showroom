import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, it } from "vitest";

type Evento = {
  waitUntil(p: Promise<unknown>): void;
  request?: { method: string; mode: string; url: string };
  respondWith?(p: Promise<unknown>): void;
};
type Oyente = (e: Evento) => void;

/** Ejecuta public/sw.js con un `self` y unas cachés falsas. */
function cargaSw(id: string, existentes: string[], ok: boolean) {
  const oyentes: Record<string, Oyente> = {};
  const cachés = new Map<string, Map<string, unknown>>(existentes.map((n) => [n, new Map()]));
  const caches = {
    keys: async () => [...cachés.keys()],
    delete: async (n: string) => cachés.delete(n),
    open: async (n: string) => {
      if (!cachés.has(n)) cachés.set(n, new Map());
      const c = cachés.get(n)!;
      return { addAll: async () => {}, put: async (k: string, v: unknown) => void c.set(k, v) };
    },
    match: async () => undefined
  };
  const self = {
    location: new URL("https://x.test/app/sw.js"),
    addEventListener: (t: string, f: Oyente) => void (oyentes[t] = f),
    skipWaiting: () => {},
    clients: { claim: async () => {} }
  };
  const respuesta = { ok, clone: () => respuesta };
  const fuente = readFileSync("public/sw.js", "utf8").replace("__BUILD_ID__", id);
  vm.runInNewContext(fuente, { self, caches, URL, fetch: async () => respuesta });
  return { oyentes, cachés };
}

describe("service worker", () => {
  it("activate borra las cachés de versiones anteriores y deja las ajenas", async () => {
    const { oyentes, cachés } = cargaSw("nueva", ["armario-vieja", "armario-nueva", "otra-app"], true);
    const esperas: Promise<unknown>[] = [];
    oyentes.activate({ waitUntil: (p) => void esperas.push(p) });
    await Promise.all(esperas);
    assert.deepEqual([...cachés.keys()].sort(), ["armario-nueva", "otra-app"]);
  });

  it("en navegación solo guarda las respuestas ok", async () => {
    for (const ok of [false, true]) {
      const { oyentes, cachés } = cargaSw("v1", [], ok);
      let respuesta: Promise<unknown> | undefined;
      oyentes.fetch({
        waitUntil() {},
        request: { method: "GET", mode: "navigate", url: "https://x.test/app/" },
        respondWith: (p) => void (respuesta = p)
      });
      await respuesta;
      await new Promise((r) => setTimeout(r, 0));
      assert.equal(cachés.get("armario-v1")?.has("/app/") ?? false, ok);
    }
  });
});
