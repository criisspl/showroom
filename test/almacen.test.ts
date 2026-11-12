// Contrato común de `Almacen`: cualquier adaptador nuevo tiene que pasar `contratoAlmacen` tal cual.
// Hoy solo existe el de IndexedDB (store.ts), así que esto demuestra que el contrato describe su comportamiento.
import { describe, test, expect, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import type { Almacen, Colecciones } from "../src/lib/almacen.ts";
import { creaStore } from "../src/lib/store.ts";

/** FileReader mínimo para Node (solo readAsDataURL), que es lo único que usa la copia. */
class FileReaderNode {
  result: string | null = null;
  error: unknown = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(blob: Blob) {
    blob.arrayBuffer().then(
      (b) => {
        this.result = `data:${blob.type};base64,${Buffer.from(b).toString("base64")}`;
        this.onload?.();
      },
      (e) => {
        this.error = e;
        this.onerror?.();
      }
    );
  }
}

const PNG = () => new Blob([Uint8Array.from([1, 2, 3])], { type: "image/png" });

function contratoAlmacen(nombre: string, crea: () => Promise<Almacen>) {
  describe("contrato Almacen: " + nombre, () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });
    const nuevo = async () => {
      const a = await crea();
      await a.borraTodo();
      return a;
    };

    test("add, get, set, update y del; update mezcla y no crea", async () => {
      const a = await nuevo();
      const id = await a.add("prendas", { nombre: "Blusa", cat: "arriba", color: "#9CAF88" });
      assert.equal(typeof id, "string");
      assert.deepEqual(await a.get("prendas", id), { nombre: "Blusa", cat: "arriba", color: "#9CAF88", id });
      await a.update("prendas", id, { nombre: "Blusa musgo" });
      assert.equal((await a.get("prendas", id))?.color, "#9CAF88");
      await a.update("prendas", "no-existe", { nombre: "fantasma" });
      assert.equal(await a.get("prendas", "no-existe"), undefined);
      await a.set("prendas", id, { nombre: "Solo nombre", cat: "arriba" });
      assert.deepEqual(await a.get("prendas", id), { nombre: "Solo nombre", cat: "arriba", id });
      assert.equal((await a.todos("prendas")).length, 1);
      await a.del("prendas", id);
      assert.deepEqual(await a.todos("prendas"), []);
    });

    test("on entrega el estado actual y avisa de cada cambio con el array completo", async () => {
      const a = await nuevo();
      const vistas: string[][] = [];
      await a.on("prendas", (ps) => vistas.push(ps.map((p) => p.nombre)));
      const id = await a.add("prendas", { nombre: "A", cat: "arriba" });
      await a.update("prendas", id, { nombre: "B" });
      await a.del("prendas", id);
      // Un aviso pendiente de `borraTodo` puede repetir el estado vacío: se comparan los estados distintos seguidos.
      const distintas = () => vistas.filter((v, i) => i === 0 || v.join() !== vistas[i - 1].join());
      await vi.waitFor(() => expect(distintas()).toEqual([[], ["A"], ["B"], []]));
    });

    test("fotos: guarda, devuelve el blob, reutiliza la URL y borra", async () => {
      const a = await nuevo();
      const id = await a.putFoto(PNG());
      assert.equal((await a.blobFoto(id))?.size, 3);
      const url = await a.urlFoto(id);
      assert.ok(url);
      assert.equal(await a.urlFoto(id), url);
      await a.delFoto(id);
      assert.ok(!(await a.blobFoto(id)));
      assert.equal(await a.urlFoto(id), null);
      assert.equal(await a.urlFoto(null), null);
      assert.ok(!(await a.blobFoto(undefined)));
      await a.delFoto(undefined);
    });

    test("clave-valor", async () => {
      const a = await nuevo();
      assert.equal(await a.kget("perfil"), undefined);
      await a.kset("perfil", { nombre: "Ana" });
      assert.deepEqual(await a.kget("perfil"), { nombre: "Ana" });
    });

    test("la copia vuelve entera, sin la clave de IA, y conserva la que ya había", async () => {
      vi.stubGlobal("FileReader", FileReaderNode);
      const a = await nuevo();
      const foto = await a.putFoto(PNG());
      await a.add("prendas", { nombre: "Blusa", cat: "arriba", foto });
      await a.add("votos", { id: "v" } as Colecciones["votos"]);
      await a.kset("perfil", { nombre: "Ana" });
      await a.kset("ajustes", { proveedor: "groq", clave: "secreta" });
      const copia = await a.exporta();
      assert.deepEqual(copia.kv.ajustes, { proveedor: "groq", clave: "" });
      assert.match(copia.fotos[foto], /^data:image\/png;base64,/);
      assert.equal(JSON.stringify(copia).includes("secreta"), false);

      await a.borraTodo();
      await a.kset("ajustes", { clave: "mia" });
      await a.importa(copia);
      assert.equal((await a.todos("prendas")).length, 1);
      assert.equal((await a.todos("votos")).length, 1);
      assert.equal((await a.blobFoto(foto))?.size, 3);
      assert.deepEqual(await a.kget("perfil"), { nombre: "Ana" });
      assert.deepEqual(await a.kget("ajustes"), { proveedor: "groq", clave: "mia" });
    });

    test("importa sin reemplazar suma a lo que hay; con reemplazar lo sustituye", async () => {
      vi.stubGlobal("FileReader", FileReaderNode);
      const a = await nuevo();
      await a.add("prendas", { nombre: "Blusa", cat: "arriba" });
      const copia = await a.exporta();
      await a.add("prendas", { nombre: "Falda", cat: "abajo" });
      await a.importa(copia, { reemplazar: false });
      assert.equal((await a.todos("prendas")).length, 2);
      await a.importa(copia);
      assert.deepEqual(
        (await a.todos("prendas")).map((p) => p.nombre),
        ["Blusa"]
      );
    });

    test("exportaBlob es exporta() serializado (salvo la fecha)", async () => {
      vi.stubGlobal("FileReader", FileReaderNode);
      const a = await nuevo();
      const foto = await a.putFoto(PNG());
      await a.add("prendas", { nombre: "Blusa", cat: "arriba", foto });
      await a.kset("ajustes", { clave: "x" });
      const blob = await a.exportaBlob();
      assert.equal(blob.type, "application/json");
      const enBlob = JSON.parse(await blob.text());
      const enObjeto = JSON.parse(JSON.stringify(await a.exporta()));
      assert.deepEqual({ ...enBlob, fecha: "" }, { ...enObjeto, fecha: "" });
    });

    test("rechaza lo que no es una copia o es de una versión más nueva", async () => {
      const a = await nuevo();
      const copia = await a.exporta();
      await assert.rejects(a.importa({ ...copia, app: "otra" } as never), /no es una copia/);
      await assert.rejects(a.importa({ ...copia, version: copia.version + 1 }), /versión más nueva/);
    });

    test("borraTodo vacía colecciones, fotos y clave-valor y avisa a quien escucha", async () => {
      const a = await nuevo();
      await a.add("deseos", { id: "d" } as Colecciones["deseos"]);
      const foto = await a.putFoto(PNG());
      await a.kset("perfil", 1);
      const vistas: number[] = [];
      await a.on("deseos", (d) => vistas.push(d.length));
      await a.borraTodo();
      assert.deepEqual(await a.todos("deseos"), []);
      assert.ok(!(await a.blobFoto(foto)));
      assert.equal(await a.kget("perfil"), undefined);
      await vi.waitFor(() => expect(vistas.at(-1)).toBe(0));
    });
  });
}

contratoAlmacen("indexeddb", () => creaStore());
