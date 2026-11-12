import { test } from "vitest";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  CLAVE_KV,
  cargaAjustes,
  cifraClave,
  desbloquea,
  descifraClave,
  errorContrasena,
  esClaveCifrada,
  guardaClave,
  hayClaveCifrada,
  quitaClave
} from "../src/lib/claveia.ts";
import { guardaConfig, normalizaConfig, sugerida } from "../src/lib/config.ts";
import { pregunta } from "../src/lib/ai.ts";
import { creaStore } from "../src/lib/store.ts";

const CLAVE = "gsk_clave-inventada-0123456789";
const CONTRASENA = "contraseña-de-prueba";

test("la clave se cifra y se descifra con la contraseña; el resultado no lleva la clave en claro", async () => {
  const c = await cifraClave(CLAVE, CONTRASENA);
  assert.equal(esClaveCifrada(c), true);
  assert.doesNotMatch(JSON.stringify(c), /gsk_|inventada/);
  assert.equal(await descifraClave(c, CONTRASENA), CLAVE);
});

test("con otra contraseña no se descifra", async () => {
  const c = await cifraClave(CLAVE, CONTRASENA);
  await assert.rejects(() => descifraClave(c, "otra-contraseña"), /contraseña incorrecta/);
});

test("dos cifrados de la misma clave son distintos (sal e IV aleatorios)", async () => {
  const [a, b] = await Promise.all([cifraClave(CLAVE, CONTRASENA), cifraClave(CLAVE, CONTRASENA)]);
  assert.notEqual(a.cifrada, b.cifrada);
  assert.notEqual(a.sal, b.sal);
});

test("la contraseña necesita al menos 8 caracteres", () => {
  assert.match(errorContrasena("1234567"), /al menos 8/);
  assert.equal(errorContrasena("12345678"), "");
});

test("lo guardado en IndexedDB nunca lleva la clave en claro, ni siquiera en la copia", async () => {
  const store = await creaStore();
  await store.borraTodo();
  await store.kset("ajustes", { proveedor: "groq", modelo: "m", url: "", clave: CLAVE }); // como lo dejaba la versión anterior
  await guardaClave(store, CLAVE, CONTRASENA);

  assert.equal(await hayClaveCifrada(store), true);
  // migrada: la clave antigua en claro desaparece del kv
  assert.equal((await store.kget<{ clave: string }>("ajustes"))?.clave, "");
  const guardado = JSON.stringify(await store.kget(CLAVE_KV));
  assert.doesNotMatch(guardado, /gsk_|inventada/);
  const copia = await (await store.exportaBlob()).text();
  assert.doesNotMatch(copia, /gsk_|inventada/);
  assert.equal(await desbloquea(store, CONTRASENA), CLAVE);
  await assert.rejects(() => desbloquea(store, "mala-contraseña"), /contraseña incorrecta/);
  await store.borraTodo();
});

test("al arrancar: con clave cifrada queda bloqueada; con la antigua en claro se sigue usando", async () => {
  const store = await creaStore();
  await store.borraTodo();
  const config = normalizaConfig({ ia: { proveedor: "groq" } });
  await guardaConfig(store, config);
  await store.kset("ajustes", { proveedor: "groq", clave: CLAVE });

  const antiguo = await cargaAjustes(store, config);
  assert.equal(antiguo.cifrada, false);
  assert.equal(antiguo.ajustes.clave, CLAVE);

  await guardaClave(store, CLAVE, CONTRASENA);
  const nuevo = await cargaAjustes(store, config);
  assert.equal(nuevo.cifrada, true);
  assert.equal(nuevo.ajustes.clave, "");
  assert.equal(nuevo.ajustes.bloqueada, true);
  await store.borraTodo();
});

test("si quedó la clave en claro junto a la cifrada, al arrancar se borra la antigua", async () => {
  const store = await creaStore();
  await store.borraTodo();
  await guardaClave(store, CLAVE, CONTRASENA);
  await store.kset("ajustes", { proveedor: "groq", clave: CLAVE });
  await cargaAjustes(store, sugerida());
  assert.equal((await store.kget<{ clave: string }>("ajustes"))?.clave, "");
  await store.borraTodo();
});

test("quitar la clave deja el kv sin ella", async () => {
  const store = await creaStore();
  await store.borraTodo();
  await guardaClave(store, CLAVE, CONTRASENA);
  await quitaClave(store);
  assert.equal(await hayClaveCifrada(store), false);
  await assert.rejects(() => desbloquea(store, CONTRASENA), /No hay ninguna clave/);
  await store.borraTodo();
});

test("con la clave bloqueada la IA no se llama y avisa de cómo desbloquearla", async () => {
  const real = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = (async () => {
    llamadas++;
    return new Response("{}");
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => pregunta({ proveedor: "groq", bloqueada: true, clave: "" }, { texto: "hola" }),
      /clave de IA está bloqueada/
    );
    assert.equal(llamadas, 0);
  } finally {
    globalThis.fetch = real;
  }
});

test("la IA no envía la clave a una URL que no sea https", async () => {
  const real = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = (async () => {
    llamadas++;
    return new Response("{}");
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => pregunta({ proveedor: "otro", url: "http://evil.example/v1", clave: "k" }, { texto: "hola" }),
      /https/
    );
    assert.equal(llamadas, 0);
  } finally {
    globalThis.fetch = real;
  }
});
