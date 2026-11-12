import { test } from "vitest";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  ALMACENES,
  ajustesDeConfig,
  cargaConfig,
  configDeAjustes,
  errorConfig,
  esUrlHttps,
  guardaConfig,
  normalizaConfig,
  sugerida
} from "../src/lib/config.ts";
import { creaStore } from "../src/lib/store.ts";
import { SUGERENCIAS } from "../src/lib/ia/sugerencias.ts";
import type { Copia } from "../src/lib/store.ts";

/** Clave-valor en memoria: basta para el contrato de config.ts, que solo usa kget y kset. */
function kvMemoria(inicial: Record<string, unknown> = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    datos,
    kget: async <T = unknown>(k: string) => datos.get(k) as T | undefined,
    kset: async (k: string, v: unknown) => void datos.set(k, v)
  };
}

test("la sugerida es IndexedDB local con la IA integrada", () => {
  assert.deepEqual(sugerida(), {
    version: 1,
    almacenamiento: { tipo: "indexeddb" },
    ia: { tipo: "integrada", proveedor: "integrada", url: "api/ia", modelo: "" }
  });
  assert.equal(errorConfig(sugerida()), "");
});

test("cada tipo de almacenamiento tiene nombre; hoy solo existe indexeddb", () => {
  assert.deepEqual(Object.keys(ALMACENES), ["indexeddb"]);
});

test("solo se aceptan URLs https", () => {
  assert.equal(esUrlHttps("https://api.example.com/v1/chat/completions"), true);
  for (const u of ["http://x.com", "ftp://x.com", "javascript:alert(1)", "api/ia", "", "  ", null, 3])
    assert.equal(esUrlHttps(u), false, String(u));
});

test("una configuración con URL no https o sin URL no es válida", () => {
  const c = (url: string) => ({
    ...sugerida(),
    ia: { ...sugerida().ia, tipo: "openai-compatible" as const, url }
  });
  assert.match(errorConfig(c("http://x.com")), /https/);
  assert.match(errorConfig(c("")), /Falta la URL/);
  assert.equal(errorConfig(c("https://x.com/v1")), "");
});

test("normalizar lo guardado: lo desconocido o no https vuelve a lo sugerido", () => {
  assert.deepEqual(normalizaConfig(undefined), sugerida());
  assert.deepEqual(normalizaConfig("basura"), sugerida());
  assert.equal(normalizaConfig({ almacenamiento: { tipo: "nube-rara" } }).almacenamiento.tipo, "indexeddb");
  assert.equal(normalizaConfig({ ia: { proveedor: "no-existe" } }).ia.proveedor, "integrada");
  const malo = normalizaConfig({ ia: { proveedor: "groq", url: "http://evil.example", modelo: "m" } });
  assert.equal(malo.ia.url, SUGERENCIAS.groq.url);
  assert.equal(malo.ia.modelo, "m");
  const bueno = normalizaConfig({ ia: { proveedor: "otro", url: " https://mi.api/v1 ", modelo: "x" } });
  assert.deepEqual(bueno.ia, {
    tipo: "openai-compatible",
    proveedor: "otro",
    url: "https://mi.api/v1",
    modelo: "x"
  });
});

test("ajustes de IA a partir de la configuración: sin clave la ponen aparte, y puede ir bloqueada", () => {
  assert.deepEqual(ajustesDeConfig(sugerida()), {
    proveedor: "integrada",
    modelo: "",
    url: "api/ia",
    clave: ""
  });
  const g = normalizaConfig({ ia: { proveedor: "groq" } });
  assert.deepEqual(ajustesDeConfig(g, { clave: "k" }), {
    proveedor: "groq",
    modelo: SUGERENCIAS.groq.modelo,
    url: SUGERENCIAS.groq.url,
    clave: "k"
  });
  assert.equal(ajustesDeConfig(g, { bloqueada: true }).bloqueada, true);
});

test("instalación nueva: se sugiere y se pide elegir (no se guarda nada)", async () => {
  const kv = kvMemoria();
  const r = await cargaConfig(kv);
  assert.deepEqual(r, { config: sugerida(), elegida: false });
  assert.equal(kv.datos.size, 0);
});

test("migración: quien ya usaba la app conserva proveedor, modelo y URL sin pasos manuales", async () => {
  const kv = kvMemoria({
    perfil: { nombre: "x" },
    ajustes: { proveedor: "otro", modelo: "mi-modelo", url: "https://mi.api/v1/chat", clave: "k-antigua" }
  });
  const r = await cargaConfig(kv);
  assert.equal(r.elegida, true);
  assert.deepEqual(r.config.ia, {
    tipo: "openai-compatible",
    proveedor: "otro",
    url: "https://mi.api/v1/chat",
    modelo: "mi-modelo"
  });
  assert.deepEqual(kv.datos.get("config"), r.config); // queda guardada: no se repite la migración
  // la clave antigua no se toca aquí ni acaba dentro de la configuración
  assert.equal((kv.datos.get("ajustes") as { clave: string }).clave, "k-antigua");
  assert.doesNotMatch(JSON.stringify(kv.datos.get("config")), /k-antigua/);
});

test("migración: con perfil pero sin ajustes sale lo sugerido; un proveedor conocido sin URL usa la suya", async () => {
  const solo = kvMemoria({ perfil: { nombre: "x" } });
  assert.deepEqual((await cargaConfig(solo)).config, sugerida());
  assert.deepEqual(configDeAjustes({ proveedor: "groq", clave: "k" }).ia, {
    tipo: "openai-compatible",
    proveedor: "groq",
    url: SUGERENCIAS.groq.url,
    modelo: SUGERENCIAS.groq.modelo
  });
  assert.deepEqual(configDeAjustes({ proveedor: "http-raro" }), sugerida());
  // una URL antigua que no es https no se conserva
  assert.equal(configDeAjustes({ proveedor: "otro", url: "http://x.com" }).ia.url, "");
});

test("una configuración ya guardada manda sobre los ajustes antiguos", async () => {
  const guardada = normalizaConfig({ ia: { proveedor: "mistral" } });
  const kv = kvMemoria({ config: guardada, ajustes: { proveedor: "groq", clave: "k" } });
  assert.deepEqual(await cargaConfig(kv), { config: guardada, elegida: true });
});

test("guardar y volver a cargar da la misma configuración", async () => {
  const kv = kvMemoria();
  const c = normalizaConfig({ ia: { proveedor: "gemini", modelo: "gemini-x" } });
  await guardaConfig(kv, c);
  assert.deepEqual(await cargaConfig(kv), { config: c, elegida: true });
});

test("la copia de seguridad no lleva la configuración ni la clave cifrada, y al importar no se pisan", async () => {
  const store = await creaStore();
  await store.borraTodo();
  await store.kset("perfil", { nombre: "x" });
  await guardaConfig(store, normalizaConfig({ ia: { proveedor: "groq" } }));
  await store.kset("claveIA", { version: 1, iteraciones: 1, sal: "s", envuelta: "e", cifrada: "c" });
  const copia: Copia = JSON.parse(await (await store.exportaBlob()).text());
  assert.equal("config" in copia.kv, false);
  assert.equal("claveIA" in copia.kv, false);

  // Una copia manipulada intenta cambiar el destino de la IA: se ignora
  copia.kv.config = { ia: { proveedor: "otro", url: "https://evil.example/v1" } };
  copia.kv.claveIA = { version: 1, iteraciones: 1, sal: "x", envuelta: "x", cifrada: "x" };
  await store.importa(copia);
  assert.equal((await cargaConfig(store)).config.ia.proveedor, "groq");
  assert.equal((await store.kget<{ sal: string }>("claveIA"))?.sal, "s");
  await store.borraTodo();
});
