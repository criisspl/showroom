import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import type { Almacen, Copia } from "../src/lib/almacen.ts";
import { creaStore } from "../src/lib/store.ts";
import { ErrorMigracion, migraAlmacen, type Progreso } from "../src/lib/migracion.ts";
import { destinosPosibles, textoFase, textoResultado } from "../src/lib/almacenes.ts";
import { creaMemoria } from "./almacen-memoria.ts";

class FileReaderNode {
  result: string | null = null;
  error: unknown = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(blob: Blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type};base64,${Buffer.from(b).toString("base64")}`;
      this.onload?.();
    });
  }
}
const PNG = () => new Blob([Uint8Array.from([1, 2, 3])], { type: "image/png" });
const sinFecha = (c: Copia) => ({ ...c, fecha: "" });

async function relleno(a: Almacen) {
  const foto = await a.putFoto(PNG());
  await a.add("prendas", { nombre: "Blusa", cat: "arriba", foto });
  await a.add("outfits", { nombre: "Look" } as never);
  await a.add("deseos", { id: "d1", estado: "quiero" });
  await a.add("votos", { id: "v1" } as never);
  await a.kset("perfil", { nombre: "Ana" });
  await a.kset("ajustes", { proveedor: "groq", clave: "secreta" });
  await a.kset("config", { version: 1 });
  await a.kset("claveIA", { cifrada: "xyz" });
  return a;
}
async function origen(): Promise<Almacen> {
  const a = await creaStore();
  await a.borraTodo();
  return relleno(a);
}
const falla = async (p: Promise<unknown>, codigo: string) => {
  const e = await p.then(
    () => null,
    (x: unknown) => x
  );
  assert.ok(e instanceof ErrorMigracion, "debía lanzar ErrorMigracion");
  assert.equal(e.codigo, codigo);
  assert.match(e.message, /origen siguen intactos/);
  return e;
};

describe("migraAlmacen", () => {
  beforeEach(() => {
    vi.stubGlobal("FileReader", FileReaderNode);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("round-trip origen → destino → origen, con fotos y progreso", async () => {
    const a = await origen();
    const antes = sinFecha(await a.exporta());
    const b = creaMemoria();
    const fases: Progreso["fase"][] = [];
    const r = await migraAlmacen(a, b, { alProgreso: (p) => fases.push(p.fase) });
    assert.deepEqual(fases, ["leyendo", "escribiendo", "verificando", "terminado"]);
    assert.deepEqual(r, {
      prendas: 1,
      outfits: 1,
      deseos: 1,
      votos: 1,
      refs: 0,
      fotos: 1,
      sobrescrito: false
    });
    assert.deepEqual(sinFecha(await b.exporta()), antes);
    // El origen no se ha tocado (ni siquiera sus claves locales)
    assert.deepEqual(sinFecha(await a.exporta()), antes);
    assert.deepEqual(await a.kget("config"), { version: 1 });

    await a.borraTodo();
    await migraAlmacen(b, a);
    assert.deepEqual(sinFecha(await a.exporta()), antes);
    assert.equal((await a.todos("prendas")).length, 1);
    assert.equal((await a.blobFoto((await a.todos("prendas"))[0].foto))?.size, 3);
  });

  test("al destino no llegan la clave de IA, la clave cifrada ni la configuración (aunque el origen las dé)", async () => {
    const a = await origen();
    const filtra: Almacen = {
      ...a,
      exporta: async () => {
        const c = await a.exporta();
        return {
          ...c,
          kv: {
            ...c.kv,
            config: { x: 1 },
            claveIA: { y: 2 },
            ajustes: { proveedor: "groq", clave: "secreta" }
          }
        };
      }
    };
    const b = creaMemoria();
    await migraAlmacen(filtra, b);
    assert.equal(await b.kget("config"), undefined);
    assert.equal(await b.kget("claveIA"), undefined);
    assert.deepEqual(await b.kget("ajustes"), { proveedor: "groq", clave: "" });
    assert.equal(JSON.stringify(await b.exporta()).includes("secreta"), false);
  });

  test("destino con datos: pide confirmación y copia previa; con ambas, reemplaza", async () => {
    const a = await origen();
    const b = creaMemoria();
    await b.add("prendas", { nombre: "Vieja", cat: "abajo" });
    await b.kset("perfil", { nombre: "Otra" });
    const antes = sinFecha(await b.exporta());

    await falla(migraAlmacen(a, b), "destino-no-vacio");
    await falla(migraAlmacen(a, b, { reemplazar: true }), "sin-copia-previa");
    assert.deepEqual(sinFecha(await b.exporta()), antes);

    const previas: Copia[] = [];
    const r = await migraAlmacen(a, b, { reemplazar: true, copiaPrevia: (c) => void previas.push(c) });
    assert.equal(r.sobrescrito, true);
    assert.deepEqual(sinFecha(previas[0]), antes);
    assert.deepEqual(
      (await b.todos("prendas")).map((p) => p.nombre),
      ["Blusa"]
    );
  });

  test("si la copia previa no se puede guardar, el destino no se toca", async () => {
    const a = await origen();
    const b = creaMemoria();
    await b.add("prendas", { nombre: "Vieja", cat: "abajo" });
    const antes = sinFecha(await b.exporta());
    await falla(
      migraAlmacen(a, b, {
        reemplazar: true,
        copiaPrevia: () => {
          throw new Error("disco lleno");
        }
      }),
      "sin-copia-previa"
    );
    assert.deepEqual(sinFecha(await b.exporta()), antes);
  });

  test("fallo a mitad de la escritura: el destino vuelve a como estaba y el origen sigue igual", async () => {
    const a = await origen();
    const antes = sinFecha(await a.exporta());
    const b = creaMemoria();
    await b.add("prendas", { nombre: "Vieja", cat: "abajo" });
    const previo = sinFecha(await b.exporta());
    b.fallos.importaALaMitad = true;
    const e = await falla(migraAlmacen(a, b, { reemplazar: true, copiaPrevia: () => {} }), "fallo-destino");
    assert.equal(e.destinoRestaurado, true);
    assert.deepEqual(sinFecha(await b.exporta()), previo);
    assert.deepEqual(sinFecha(await a.exporta()), antes);
  });

  test("fallo a mitad en un destino vacío: se vacía otra vez", async () => {
    const a = await origen();
    const b = creaMemoria({ importaALaMitad: true });
    const e = await falla(migraAlmacen(a, b), "fallo-destino");
    assert.equal(e.destinoRestaurado, true);
    assert.equal((await b.todos("prendas")).length, 0);
  });

  test("si el destino pierde datos en silencio, la verificación lo detecta y lo deshace", async () => {
    const a = await origen();
    const b = creaMemoria({ pierdeFotos: true });
    const e = await falla(migraAlmacen(a, b), "verificacion");
    assert.equal(e.destinoRestaurado, true);
    assert.equal((await b.todos("prendas")).length, 0);
  });

  test("datos corruptos o de otra versión en el origen: se rechazan sin tocar el destino", async () => {
    const a = await origen();
    const buena = await a.exporta();
    const con = (c: unknown): Almacen => ({ ...a, exporta: async () => c as Copia });
    const b = creaMemoria();
    const sinEscribir = vi.spyOn(b, "importa");
    const foto = Object.keys(buena.fotos)[0];
    await falla(
      migraAlmacen(con({ ...buena, fotos: { [foto]: "data:text/html;base64,AAAA" } }), b),
      "copia-invalida"
    );
    await falla(migraAlmacen(con({ ...buena, prendas: [{ sin: "id" }] }), b), "copia-invalida");
    await falla(migraAlmacen(con({ ...buena, app: "otra" }), b), "copia-invalida");
    await falla(migraAlmacen(con({ ...buena, version: buena.version + 1 }), b), "copia-invalida");
    await falla(migraAlmacen(con({ ...buena, version: 0 }), b), "copia-invalida");
    await falla(migraAlmacen(con(null), b), "copia-invalida");
    expect(sinEscribir).not.toHaveBeenCalled();
  });

  test("una copia de versión antigua se pone al día", async () => {
    const a = await origen();
    const vieja = await a.exporta();
    delete vieja.refs;
    const b = creaMemoria();
    await migraAlmacen({ ...a, exporta: async () => ({ ...vieja, version: 1 }) as Copia }, b);
    assert.equal((await b.todos("prendas")).length, 1);
  });

  test("demasiados documentos: se rechaza por tamaño", async () => {
    const a = await origen();
    const buena = await a.exporta();
    const muchos = Array.from({ length: 50_001 }, (_, i) => ({ id: "p" + i, nombre: "x", cat: "arriba" }));
    await falla(
      migraAlmacen({ ...a, exporta: async () => ({ ...buena, prendas: muchos as never }) }, creaMemoria()),
      "copia-invalida"
    );
  });

  test("fallo al leer el origen o el destino", async () => {
    const a = await origen();
    await falla(migraAlmacen(creaMemoria({ exportaFalla: true }), creaMemoria()), "fallo-origen");
    const roto = creaMemoria();
    roto.todos = async () => {
      throw new Error("sin red");
    };
    const e = await migraAlmacen(a, roto).catch((x: unknown) => x);
    assert.ok(e instanceof ErrorMigracion && e.codigo === "fallo-destino" && e.destinoRestaurado === null);
  });

  test("cancelar antes de escribir no cambia nada; ya empezada la escritura no se cancela", async () => {
    const a = await origen();
    const b = creaMemoria();
    const c = new AbortController();
    await falla(
      migraAlmacen(a, b, {
        senal: c.signal,
        alProgreso: (p) => {
          if (p.fase === "leyendo") c.abort();
        }
      }),
      "cancelada"
    );
    assert.equal((await b.todos("prendas")).length, 0);
    await falla(migraAlmacen(a, b, { senal: AbortSignal.abort() }), "cancelada");

    const tarde = new AbortController();
    await migraAlmacen(a, b, {
      senal: tarde.signal,
      alProgreso: (p) => p.fase === "escribiendo" && tarde.abort()
    });
    assert.equal((await b.todos("prendas")).length, 1);
  });

  test("destino vacío con fallo de verificación irrecuperable avisa de que quedó a medias", async () => {
    const a = await origen();
    const b = creaMemoria({ pierdeFotos: true });
    b.borraTodo = async () => {
      throw new Error("no puedo");
    };
    const e = await falla(migraAlmacen(a, b), "verificacion");
    assert.equal(e.destinoRestaurado, false);
    assert.match(e.message, /a medias/);
  });
});

describe("almacenes", () => {
  test("destinos posibles: todos menos el actual (hoy ninguno)", () => {
    assert.deepEqual(destinosPosibles("indexeddb"), []);
  });
  test("textos de progreso y resultado", () => {
    assert.match(textoFase("escribiendo", 3, 4), /3\/4/);
    assert.match(
      textoResultado({ prendas: 2, outfits: 1, deseos: 0, votos: 0, refs: 0, fotos: 5, sobrescrito: false }),
      /2 prendas.*5 fotos.*origen siguen/
    );
  });
});
