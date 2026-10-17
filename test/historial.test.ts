import { test, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { setEstado } from "../src/lib/engine.ts";
import { cifras, puestos, guardados, altasPorMes, aprendizaje } from "../src/lib/historial.ts";
import type { Outfit, Prenda, Voto } from "../src/lib/tipos.ts";

const P: Prenda[] = [
  { id: "t1", nombre: "Blusa de gasa", cat: "arriba", color: "#708238", creada: "2026-03-02" },
  { id: "b1", nombre: "Vaquero recto", cat: "abajo", color: "#3B5A7A", creada: "2026-03-20" },
  { id: "z1", nombre: "Botines de ante", cat: "calzado", color: "#8B5A2B", creada: "2026-04-01" },
  { id: "c1", nombre: "Chaqueta vieja", cat: "capa", color: "#C19A6B", activa: false }
];
const O = (id: string, extra: Partial<Outfit>): Outfit => ({
  id,
  prendas: ["t1", "b1"],
  ocasion: "diario",
  banda: "templado",
  lluvia: false,
  fecha: null,
  fav: false,
  creada: "2026-04-01T10:00:00Z",
  origen: "local",
  ...extra
});

beforeEach(() => setEstado({ P, O: [], V: [] }));

test("sin actividad: cifras a cero y listas vacías", () => {
  assert.deepEqual(cifras(), [
    { n: "3", t: "prendas en el armario" },
    { n: "0", t: "outfits anotados" },
    { n: "3", t: "sin estrenar" }
  ]);
  assert.deepEqual(puestos(), []);
  assert.deepEqual(guardados(), []);
  assert.equal(aprendizaje(), null);
});

test("ordena lo puesto y lo guardado del más reciente al más antiguo", () => {
  setEstado({
    O: [
      O("a", { fecha: "2026-04-10" }),
      O("b", { fecha: "2026-04-12", prendas: ["t1", "b1", "z1"] }),
      O("c", { fecha: "2026-04-12", creada: "2026-04-12T20:00:00Z" }),
      O("f1", { fav: true, creada: "2026-04-01T00:00:00Z" }),
      O("f2", { fav: true, creada: "2026-04-05T00:00:00Z" }),
      O("f3", { fav: true, fecha: "2026-04-11" }) // guardado y ya puesto: cuenta como puesto
    ]
  });
  assert.deepEqual(
    puestos().map((o) => o.id),
    ["c", "b", "f3", "a"]
  );
  assert.deepEqual(
    guardados().map((o) => o.id),
    ["f2", "f1"]
  );
  const c = cifras();
  assert.deepEqual(c[1], { n: "4", t: "outfits anotados" });
  assert.deepEqual(c[2], { n: "0", t: "sin estrenar" });
  assert.deepEqual(c[3], { n: "4×", t: "Lo más usado: Blusa de gasa" });
});

test("agrupa las altas por mes, incluidas las retiradas y las que no tienen fecha", () => {
  const meses = altasPorMes();
  assert.deepEqual(
    meses.map((m) => m.prendas.map((p) => p.id)),
    [["z1"], ["b1", "t1"], ["c1"]]
  );
  assert.match(meses[0].titulo, /abril de 2026 · 1/);
  assert.equal(meses[2].titulo, "Sin fecha · 1");
});

test("resume las valoraciones y lo aprendido", () => {
  const voto = (id: string, v: "si" | "no"): Voto => ({
    id,
    key: "t1+b1",
    prendas: ["t1", "b1"],
    ocasion: "diario",
    banda: "templado",
    voto: v,
    motivos: [],
    piezas: [],
    est: ["arreglado", "casual"],
    tej: ["ligero", "vaquero"],
    fam: ["verde", "azul"],
    cor: ["fluida", "ajustada"],
    creada: "2026-04-01"
  });
  setEstado({ V: [voto("v1", "si")] });
  assert.deepEqual(aprendizaje()?.cifras, [
    { n: "1", t: "outfit valorado" },
    { n: "1", t: "te pondrías" },
    { n: "0", t: "no te pondrías" }
  ]);
  assert.deepEqual(aprendizaje()?.frases, []); // con un solo voto aún no hay nada claro

  setEstado({ V: [voto("v1", "si"), voto("v2", "si"), voto("v3", "si")] });
  const a = aprendizaje();
  assert.ok(a);
  assert.ok(a.frases.length > 0 && a.frases.length <= 8);
  assert.ok(a.frases.every((f) => f.startsWith("Más ")));

  setEstado({ V: [voto("v2", "no")] });
  const b = aprendizaje();
  assert.ok(b?.frases.includes("1 combinación descartada"));
});
