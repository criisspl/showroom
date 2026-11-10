import { test } from "vitest";
import assert from "node:assert/strict";
import { familia, dist, construyePaleta, clasifica, consejoColor, fondoClaro } from "../src/lib/color.ts";
import { perfilManual } from "../src/lib/analysis.ts";
import { ESTACIONES } from "../src/data/presets.ts";

test("dist es 0 para el mismo color y simétrica", () => {
  assert.equal(dist("#336699", "#336699"), 0);
  assert.ok(Math.abs(dist("#000000", "#ffffff") - dist("#ffffff", "#000000")) < 1e-9);
});

test("familia devuelve una cadena para cualquier color", () => {
  for (const h of ["#000000", "#ffffff", "#C19A6B", "#B22222", "#2E8B57", "#1E3A8A"])
    assert.equal(typeof familia(h), "string");
});

test("cada estación genera una paleta y clasifica sus propios colores como suyos", () => {
  for (const [id, e] of Object.entries(ESTACIONES)) {
    const pal = construyePaleta(perfilManual(id, "natural"));
    assert.ok(pal.length >= e.paleta.length, id);
    for (const c of e.paleta) assert.equal(clasifica(c.hex, pal).tipo, "ok", id + " " + c.n);
    for (const c of e.evitar) assert.equal(clasifica(c.hex, pal).tipo, "evita", id + " " + c.n);
  }
});

test("consejoColor: el negro y el blanco fuera de paleta llevan su consejo", () => {
  const pal = construyePaleta(perfilManual("otono-suave", "natural-suave"));
  assert.equal(consejoColor({ tipo: "ok" }, pal), "En tu paleta");
  assert.match(consejoColor({ tipo: "evita", fam: "negro" }, pal), /cintura para abajo/);
  assert.match(consejoColor({ tipo: "evita", fam: "blanco" }, pal), /cámbialo por \w+/);
  assert.equal(
    consejoColor({ tipo: "evita", fam: "verde" }, pal),
    "Fuera de tu paleta: llévalo lejos de la cara"
  );
  assert.match(consejoColor({ tipo: "evita", fam: "blanco" }), /un tono de tu paleta/);
});

test("fondoClaro pide tinta oscura sobre crema y blanco, y clara sobre marino y azul", () => {
  assert.equal(fondoClaro("#F3EBDD"), true);
  assert.equal(fondoClaro("#F5F5F0"), true);
  assert.equal(fondoClaro("#1B2440"), false);
  assert.equal(fondoClaro("#5F7FA3"), false);
});
