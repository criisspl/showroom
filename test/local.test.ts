import { test } from "vitest";
import assert from "node:assert/strict";
import {
  rgbALab,
  corrigeLuz,
  analizaColor,
  analizaCuerpo,
  analizaEstetica,
  perfilLocal,
  siluetaDe
} from "../src/lib/local.ts";
import { normaliza } from "../src/lib/analysis.ts";
import { ESTACIONES, CUERPOS } from "../src/data/presets.ts";
import type { Muestras } from "../src/lib/local.ts";
import type { Rgb } from "../src/lib/tipos.ts";

test("rgbALab: blanco y negro", () => {
  const b = rgbALab([255, 255, 255]),
    n = rgbALab([0, 0, 0]);
  assert.ok(Math.abs(b[0] - 100) < 0.5 && Math.abs(b[1]) < 0.5 && Math.abs(b[2]) < 0.5);
  assert.ok(Math.abs(n[0]) < 0.5);
});

test("corrigeLuz neutraliza una luz amarillenta", () => {
  const blanco: Rgb = [250, 235, 190];
  assert.deepEqual(corrigeLuz(blanco, blanco).map(Math.round), [250, 250, 250]);
});

const casos: [string, Muestras, Record<string, string>, RegExp][] = [
  [
    "rubia de ojos azules y piel rosada",
    { piel: [238, 212, 205], pelo: [205, 190, 165], ojos: [100, 135, 170] },
    {
      ojos_color: "Azul o gris claro",
      pelo_color: "Rubio claro",
      venas: "Azules o moradas",
      joyas: "Plateadas"
    },
    /^verano-claro$/
  ],
  [
    "morena de piel dorada y ojos oscuros",
    { piel: [165, 115, 80], pelo: [35, 24, 18], ojos: [70, 40, 22] },
    { ojos_color: "Marrón oscuro", pelo_color: "Castaño oscuro", venas: "Verdes", joyas: "Doradas" },
    /^otono-profundo$/
  ],
  [
    "piel clara, pelo negro, ojos azul intenso",
    { piel: [235, 215, 210], pelo: [20, 18, 20], ojos: [40, 90, 170] },
    { ojos_color: "Azul intenso", pelo_color: "Negro", venas: "Azules o moradas", joyas: "Plateadas" },
    /^invierno-/
  ],
  [
    "pelirroja de ojos verdes",
    { piel: [235, 205, 180], pelo: [160, 80, 40], ojos: [100, 120, 70] },
    { ojos_color: "Verdes", pelo_color: "Pelirrojo", venas: "Verdes", joyas: "Doradas" },
    /^(primavera|otono)-/
  ]
];
for (const [n, m, r, esperado] of casos)
  test("color: " + n, () => {
    const a = analizaColor(m, r);
    assert.match(a.estacionId, esperado);
    assert.equal(a.alternativas.length, 2);
    for (const x of a.alternativas) assert.ok(ESTACIONES[x]);
  });

test("sin selfie, también funciona solo con las preguntas", () => {
  assert.match(
    analizaColor(
      {},
      {
        venas: "Azules o moradas",
        joyas: "Plateadas",
        pelo_color: "Castaño claro",
        ojos_color: "Azul o gris claro"
      }
    ).estacionId,
    /^verano-/
  );
});

test("cuerpo: curvas y estatura baja → romántico; anguloso y alta → dramático", () => {
  assert.equal(
    analizaCuerpo({
      estructura: "Suave y con curvas",
      curvas: "Cintura muy marcada y curvas",
      altura: "158",
      rostro: "Redondeado y suave"
    }).cuerpoId,
    "romantico"
  );
  assert.equal(
    analizaCuerpo({
      estructura: "Huesuda y angulosa, de líneas rectas",
      altura: "176",
      rostro: "Anguloso: pómulos y mandíbula marcados"
    }).cuerpoId,
    "dramatico"
  );
  assert.ok(CUERPOS[analizaCuerpo({}).cuerpoId]);
});

test("silueta por medidas", () => {
  assert.match(siluetaDe({ pecho: 90, cintura: 64, cadera: 92 }) ?? "", /Reloj de arena/);
  assert.match(siluetaDe({ pecho: 86, cintura: 70, cadera: 100 }) ?? "", /pera/);
  assert.equal(siluetaDe({}), null);
});

test("estética: combina las dos primeras palabras", () => {
  assert.equal(analizaEstetica(["natural", "vintage"]).estetica.nombre, "Natural boho con toque vintage");
  assert.equal(analizaEstetica([]).estetica.nombre, "Clásica elegante");
});

test("perfilLocal completo pasa la normalización (como al guardarlo y volver a abrir)", () => {
  const r = {
    ojos_color: "Verdes",
    pelo_color: "Pelirrojo",
    estructura: "Suave y con curvas",
    estetica: ["romantica"]
  };
  const p = normaliza(perfilLocal({ piel: [235, 205, 180] }, r), r, "local");
  assert.ok(p.color.paleta.length >= 10);
  assert.ok(p.deseos.length >= 7);
  assert.ok((p.maquillaje?.looks.length ?? 0) >= 2);
  assert.equal(p.color.alternativas?.length, 2);
});
