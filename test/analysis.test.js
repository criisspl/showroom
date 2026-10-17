import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliza, perfilManual, textoPerfil } from "../src/lib/analysis.js";
import { sacaJSON } from "../src/lib/ai.js";
import { ESTACIONES, CUERPOS, CATALOGO } from "../src/data/presets.js";
import { TIPOS_ICONO } from "../src/data/icons.js";

test("sacaJSON extrae el objeto aunque venga envuelto en texto o ```json", () => {
  assert.deepEqual(sacaJSON('Aquí tienes:\n```json\n{"a":1}\n```'), { a: 1 });
  assert.throws(() => sacaJSON("sin datos"));
});

test("normaliza exige una paleta válida", () => {
  assert.throws(() => normaliza({}));
  assert.throws(() => normaliza({ color: { paleta: [{ n: "x", hex: "rojo" }] } }));
});

test("normaliza limpia y recorta lo que devuelve la IA", () => {
  const p = normaliza({
    resumen: "x".repeat(2000),
    color: {
      estacion: "Otoño suave",
      paleta: [
        { n: "Oliva", hex: "#708238" },
        { n: "mal", hex: "nope" }
      ],
      combinaciones: [{ nombre: "A", hex: ["#111111"] }]
    },
    cuerpo: { tipo: "Soft Natural", si: ["Cintura marcada", 3] },
    estetica: { palabras: ["a", "b", "c", "d", "e"] },
    deseos: [{ n: "Falda midi", cat: "abajo", cols: [["Oliva", "#708238"]] }, null]
  });
  assert.equal(p.resumen.length <= 800, true);
  assert.deepEqual(
    p.color.paleta.map((c) => c.hex),
    ["#708238"]
  );
  assert.equal(p.color.combinaciones.length, 0);
  assert.ok(p.estetica.palabras.length <= 4);
  assert.ok(p.deseos.length >= 1);
  assert.equal(p.rostro, null);
});

test("perfilManual funciona con todas las estaciones y cuerpos", () => {
  for (const e of Object.keys(ESTACIONES))
    for (const b of Object.keys(CUERPOS)) {
      const p = perfilManual(e, b);
      assert.ok(p.color.paleta.length >= 6, e);
      assert.equal(p.deseos.length, CATALOGO.length);
      assert.ok(textoPerfil(p).includes(ESTACIONES[e].n));
      // y vuelve a pasar por normaliza (como al importar una copia)
      normaliza(p, {}, "manual");
    }
  assert.throws(() => perfilManual("nope", "nope"));
});

test("cada prenda del catálogo tiene icono", () => {
  for (const w of CATALOGO) assert.ok(TIPOS_ICONO.includes(w.icono), w.n + " → " + w.icono);
});
