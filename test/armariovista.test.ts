import { test } from "vitest";
import assert from "node:assert/strict";
import {
  prendasDelFiltro,
  textoResumen,
  textoUsos,
  textoVacio,
  tiraDeColores
} from "../src/lib/armariovista.ts";

test("tiraDeColores ordena de oscuro a claro", () => {
  assert.deepEqual(tiraDeColores([{ color: "#FFFFFF" }, { color: "#000000" }]), ["#000000", "#FFFFFF"]);
});

test("textoResumen y textoUsos concuerdan en singular y plural", () => {
  assert.equal(textoResumen(1, 1), "1 prenda · 1 en tu paleta · 0 fuera");
  assert.equal(textoResumen(3, 2), "3 prendas · 2 en tu paleta · 1 fuera");
  assert.equal(textoUsos(undefined), "sin estrenar");
  assert.equal(textoUsos(1), "1 uso");
  assert.equal(textoUsos(4), "4 usos");
});

test("prendasDelFiltro filtra por categoría y pone primero las más nuevas", () => {
  const ps = [
    { cat: "arriba", creada: "2026-01-01" },
    { cat: "abajo", creada: "2026-02-01" },
    { cat: "arriba", creada: "2026-03-01" }
  ];
  assert.deepEqual(
    prendasDelFiltro(ps, "arriba").map((p) => p.creada),
    ["2026-03-01", "2026-01-01"]
  );
  assert.equal(prendasDelFiltro(ps, "todo").length, 3);
});

test("textoVacio distingue armario vacío de categoría vacía", () => {
  assert.match(textoVacio(false), /armario está vacío/);
  assert.match(textoVacio(true), /esta categoría/);
});
