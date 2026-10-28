import { test } from "vitest";
import assert from "node:assert/strict";
import { gustoDe, limpiaRef, puntosGusto, repetidas, textoGusto } from "../src/lib/gusto.ts";
import type { AnalisisRef, Referencia } from "../src/lib/tipos.ts";

const analisis = (p: Partial<AnalisisRef> = {}): AnalisisRef => ({
  resumen: "Look de oficina relajado",
  esteticas: ["minimal"],
  registro: "arreglado",
  prendas: ["blazer"],
  detalles: [],
  colores: [{ n: "azul marino", hex: "#3B6EA5" }],
  ...p
});
const ref = (a: AnalisisRef | null, id = "r"): Referencia => ({
  id,
  foto: null,
  creada: "2026-10-28",
  analisis: a
});

test("limpiaRef acota listas, textos y colores", () => {
  const r = limpiaRef({
    resumen: "  Un   look  ",
    esteticas: ["a", "b", "c", "d"],
    registro: "formal",
    prendas: ["x", 3, "", "y"],
    detalles: "no es lista",
    colores: [{ n: "rojo", hex: "#c0392b" }, { n: "mal", hex: "rojo" }, null]
  });
  assert.ok(r);
  assert.equal(r.resumen, "Un look");
  assert.deepEqual(r.esteticas, ["a", "b", "c"]);
  assert.equal(r.registro, null);
  assert.deepEqual(r.prendas, ["x", "y"]);
  assert.deepEqual(r.detalles, []);
  assert.deepEqual(r.colores, [{ n: "rojo", hex: "#C0392B" }]);
});

test("limpiaRef descarta lo que no sirve", () => {
  assert.equal(limpiaRef(null), null);
  assert.equal(limpiaRef("texto"), null);
  assert.equal(limpiaRef({ registro: "casual" }), null);
});

test("gustoDe ignora las referencias sin analizar y cuenta las demás", () => {
  const g = gustoDe([ref(analisis(), "1"), ref(null, "2"), ref(analisis({ registro: "casual" }), "3")]);
  assert.equal(g.n, 2);
  assert.equal(g.est.minimal, 2);
  assert.deepEqual(g.reg, { arreglado: 1, casual: 1 });
  assert.equal(g.fam.azul, 2);
});

test("repetidas pide al menos dos coincidencias cuando hay varias referencias", () => {
  const g = gustoDe([
    ref(analisis({ prendas: ["blazer", "mocasín"] })),
    ref(analisis({ prendas: ["blazer"] }))
  ]);
  assert.deepEqual(repetidas(g.pre, g), ["blazer"]);
  const uno = gustoDe([ref(analisis({ prendas: ["blazer", "mocasín"] }))]);
  assert.deepEqual(repetidas(uno.pre, uno), ["blazer", "mocasín"]);
});

test("puntosGusto sube con el color y el registro que se repiten", () => {
  const g = gustoDe([ref(analisis())]);
  assert.equal(puntosGusto(null, "azul", "arreglado"), 0);
  assert.equal(puntosGusto(g, "azul", "arreglado"), 1.3);
  assert.equal(puntosGusto(g, "azul", "casual"), 0.8);
  assert.equal(puntosGusto(g, "rosa", "casual"), 0);
});

test("textoGusto queda vacío sin referencias analizadas", () => {
  assert.equal(textoGusto(null), "");
  assert.equal(textoGusto(gustoDe([ref(null)])), "");
  assert.match(textoGusto(gustoDe([ref(analisis())])), /Estéticas: minimal.*Registro: arreglado/);
});
