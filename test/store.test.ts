import { test } from "vitest";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  creaStore,
  VERSION,
  type Coleccion,
  type Colecciones,
  type Copia,
  type Store
} from "../src/lib/store.ts";
import type { Voto } from "../src/lib/tipos.ts";

// Guarda las conexiones que abre la app para poder cortarlas como hace Safari
const conexiones: IDBDatabase[] = [];
const abreOriginal = indexedDB.open.bind(indexedDB);
indexedDB.open = (...a: Parameters<IDBFactory["open"]>) => {
  const r = abreOriginal(...a);
  r.addEventListener("success", () => conexiones.push(r.result));
  return r;
};

const recibe = <C extends Coleccion>(store: Store, c: C) =>
  new Promise<Colecciones[C][]>((res) => store.on(c, res));

test("carga las prendas aunque Safari haya cortado la conexión", async () => {
  const errores: unknown[] = [],
    store = await creaStore({ onError: (e) => errores.push(e) });
  await store.add("prendas", { nombre: "Blusa salvia", cat: "arriba" });
  conexiones[conexiones.length - 1].close(); // la conexión queda inservible sin avisar (sin evento close)
  const prendas = await recibe(store, "prendas");
  assert.deepEqual(
    prendas.map((p) => p.nombre),
    ["Blusa salvia"]
  );
  await store.add("prendas", { nombre: "Falda camel", cat: "abajo" });
  assert.equal((await store.todos("prendas")).length, 2);
  assert.deepEqual(errores, []);
});

test("un fallo al pintar se avisa y no rompe la carga", async () => {
  const errores: Error[] = [],
    store = await creaStore({ onError: (e) => errores.push(e as Error) });
  await store.on("deseos", () => {
    throw new Error("pantalla rota");
  });
  assert.equal(errores[0].message, "pantalla rota");
});

test("añade, cambia y borra avisando a quien escucha", async () => {
  const store = await creaStore();
  await store.borraTodo();
  const vistas: string[][] = [];
  await store.on("prendas", (ps) => vistas.push(ps.map((p) => p.nombre)));
  const id = await store.add("prendas", { nombre: "Blusa salvia", cat: "arriba", color: "#9CAF88" });
  await store.update("prendas", id, { nombre: "Blusa musgo" });
  assert.equal((await store.get("prendas", id))?.color, "#9CAF88"); // update mezcla, no pisa
  await store.update("prendas", "no-existe", { nombre: "fantasma" });
  assert.equal(await store.get("prendas", "no-existe"), undefined);
  await store.set("prendas", id, { nombre: "Solo nombre", cat: "arriba" });
  assert.equal((await store.get("prendas", id))?.color, undefined); // set reemplaza entera
  await store.del("prendas", id);
  await recibe(store, "prendas"); // deja que lleguen los avisos pendientes
  assert.deepEqual(vistas[0], []);
  assert.deepEqual(vistas.at(-1), []);
  assert.ok(vistas.some((v) => v[0] === "Blusa musgo"));
});

test("guarda fotos y reutiliza su URL", async () => {
  const store = await creaStore();
  const id = await store.putFoto(new Blob(["foto"], { type: "image/jpeg" }));
  assert.equal(await (await store.blobFoto(id))?.text(), "foto");
  const url = await store.urlFoto(id);
  assert.match(url ?? "", /^blob:/);
  assert.equal(await store.urlFoto(id), url);
  await store.delFoto(id);
  assert.equal(await store.urlFoto(id), null);
  assert.equal(await store.urlFoto(null), null);
  assert.equal(await store.blobFoto(undefined), null);
  await store.delFoto(null);
});

test("la copia no se lleva la clave de la IA y al importar se conserva la tuya", async () => {
  const store = await creaStore();
  await store.borraTodo();
  await store.add("votos", { key: "a+b" } as Voto);
  await store.kset("perfil", { resumen: "Otoño suave" });
  await store.kset("ajustes", { proveedor: "groq", clave: "secreta" });
  const copia = await store.exporta();
  assert.equal(copia.app, "armario");
  assert.deepEqual(copia.kv.ajustes, { proveedor: "groq", clave: "" });
  assert.equal(copia.votos.length, 1);

  await store.borraTodo();
  await store.kset("ajustes", { proveedor: "mistral", clave: "mia" });
  copia.fotos = { f1: "data:image/png;base64,aG9sYQ==" };
  await store.importa(copia);
  assert.deepEqual(await store.kget("ajustes"), { proveedor: "groq", clave: "mia" });
  assert.deepEqual(await store.kget("perfil"), { resumen: "Otoño suave" });
  assert.equal((await store.todos("votos")).length, 1);
  assert.equal(await (await store.blobFoto("f1"))?.text(), "hola");

  await store.importa(copia, { reemplazar: false });
  assert.equal((await store.todos("votos")).length, 1); // mismo id: no se duplica
  await assert.rejects(store.importa({ app: "otra" } as unknown as Copia), /no es una copia/);
});

const espera = <T>(r: IDBRequest<T>) =>
  new Promise<T>((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

test("una base de datos v1 de antes de las migraciones se abre sin perder nada", async () => {
  // Las conexiones de los otros tests se cierran solas con el aviso de versionchange
  await espera(indexedDB.deleteDatabase("armario"));
  const r = indexedDB.open("armario", 1);
  r.onupgradeneeded = () => {
    const db = r.result;
    for (const c of ["prendas", "outfits", "deseos", "votos"]) db.createObjectStore(c, { keyPath: "id" });
    db.createObjectStore("fotos");
    db.createObjectStore("kv");
    r.transaction!.objectStore("prendas").put({ id: "p1", nombre: "Blusa salvia", cat: "arriba" });
    r.transaction!.objectStore("kv").put({ resumen: "Otoño suave" }, "perfil");
  };
  (await espera(r)).close();

  const store = await creaStore();
  assert.equal((await store.get("prendas", "p1"))?.nombre, "Blusa salvia");
  assert.deepEqual(await store.kget("perfil"), { resumen: "Otoño suave" });
  await store.kset("ajustes", { proveedor: "groq" });
  assert.deepEqual(await store.kget("ajustes"), { proveedor: "groq" });
});

test("rechaza una copia de una versión más nueva de la app", async () => {
  const store = await creaStore();
  const copia = await store.exporta();
  await assert.rejects(store.importa({ ...copia, version: copia.version + 1 }), /versión más nueva/);
});

test("una copia de la versión actual se sigue restaurando", async () => {
  const store = await creaStore();
  await store.borraTodo();
  await store.add("prendas", { nombre: "Falda camel", cat: "abajo" });
  const copia = await store.exporta();
  assert.equal(copia.version, VERSION);
  await store.borraTodo();
  await store.importa(copia);
  assert.deepEqual(
    (await store.todos("prendas")).map((p) => p.nombre),
    ["Falda camel"]
  );
});
