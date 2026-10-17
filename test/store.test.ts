import { test } from "vitest";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { creaStore, type Coleccion, type Colecciones, type Store } from "../src/lib/store.ts";

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
