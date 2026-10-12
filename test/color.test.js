import { test } from "node:test";
import assert from "node:assert/strict";
import { familia, dist, construyePaleta, clasifica } from "../src/lib/color.js";
import { perfilManual } from "../src/lib/analysis.js";
import { ESTACIONES } from "../src/data/presets.js";

test("dist es 0 para el mismo color y simétrica", () => {
  assert.equal(dist("#336699", "#336699"), 0);
  assert.ok(Math.abs(dist("#000000", "#ffffff") - dist("#ffffff", "#000000")) < 1e-9);
});

test("familia devuelve una cadena para cualquier color", () => {
  for (const h of ["#000000", "#ffffff", "#C19A6B", "#B22222", "#2E8B57", "#1E3A8A"]) assert.equal(typeof familia(h), "string");
});

test("cada estación genera una paleta y clasifica sus propios colores como suyos", () => {
  for (const [id, e] of Object.entries(ESTACIONES)) {
    const pal = construyePaleta(perfilManual(id, "natural"));
    assert.ok(pal.length >= e.paleta.length, id);
    for (const c of e.paleta) assert.equal(clasifica(c.hex, pal).tipo, "ok", id + " " + c.n);
    for (const c of e.evitar) assert.equal(clasifica(c.hex, pal).tipo, "evita", id + " " + c.n);
  }
});
