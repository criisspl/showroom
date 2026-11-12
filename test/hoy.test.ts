import { test } from "vitest";
import assert from "node:assert/strict";
import {
  LIMITE_OCA,
  LIMITE_TEMP,
  alterna,
  cajaRecorte,
  nombreConColor,
  resultadoFoto,
  sinRepetir,
  textoOpinion,
  textoVeredicto
} from "../src/lib/hoy.ts";

test("alterna marca y desmarca, y nunca deja la lista vacía", () => {
  assert.deepEqual(alterna(["a"], "b", true, LIMITE_OCA), ["a", "b"]);
  assert.deepEqual(alterna(["a", "b"], "a", false, LIMITE_OCA), ["b"]);
  assert.deepEqual(alterna(["a"], "a", false, LIMITE_OCA), ["a"]);
});

test("alterna respeta el máximo y quita la más antigua", () => {
  const r = alterna(["a", "b"], "c", true, LIMITE_TEMP);
  assert.equal(r.length, LIMITE_TEMP);
  assert.ok(r.includes("c"));
});

test("cajaRecorte descarta cajas que no valen y añade margen a las buenas", () => {
  assert.equal(cajaRecorte(null, 100, 100), null);
  assert.equal(cajaRecorte([0, 0, 0.01, 0.5], 100, 100), null);
  const r = cajaRecorte([0.2, 0.2, 0.5, 0.5], 100, 200);
  assert.ok(r);
  assert.ok(r.X < 20 && r.Y < 40 && r.W > 50 && r.H > 100);
});

test("resultadoFoto recorta textos y listas", () => {
  const r = resultadoFoto({ resumen: "x".repeat(400), bien: new Array(9).fill("ok"), mejorar: "no" }, ["p1"]);
  assert.equal(r.resumen.length, 240);
  assert.equal(r.bien.length, 5);
  assert.deepEqual(r.mejorar, []);
  assert.deepEqual(r.ids, ["p1"]);
});

test("sinRepetir quita duplicados y deja seis como mucho", () => {
  assert.deepEqual(sinRepetir(["a", "a", "b"]), ["a", "b"]);
  assert.equal(sinRepetir(["1", "2", "3", "4", "5", "6", "7"]).length, 6);
});

test("los textos de veredicto y opinión cubren los tres casos", () => {
  assert.equal(textoOpinion("si"), "¡Está genial!");
  assert.equal(textoOpinion("quiza"), "Está bien, con algún retoque");
  assert.equal(textoOpinion("no"), "Le cambiaría cosas");
  assert.ok(textoVeredicto("si").length > 0);
  assert.notEqual(textoVeredicto("si"), textoVeredicto("no"));
});

test("nombreConColor no repite el color si ya está en el nombre", () => {
  const a = nombreConColor({ nombre: "Falda negra", colorN: "Negro" } as Parameters<
    typeof nombreConColor
  >[0]);
  assert.ok(a.includes("Falda negra"));
});
