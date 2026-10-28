import { test } from "vitest";
import assert from "node:assert/strict";
import { maquillajeDeLook } from "../src/lib/maquillaje.ts";
import { perfilManual } from "../src/lib/analysis.ts";
import type { PiezaMaq } from "../src/lib/maquillaje.ts";

const perfil = perfilManual("otono-suave", "natural-suave");
const blusa = (color: string): PiezaMaq => ({ cat: "arriba", color });
const pantalon = (color: string): PiezaMaq => ({ cat: "abajo", color });

test("sin perfil o con una estación desconocida no hay propuesta", () => {
  assert.equal(maquillajeDeLook(null, [blusa("#8A9A5B")], "diario"), null);
  const rara = { ...perfil, color: { ...perfil.color, estacion: "Inventada" } };
  assert.equal(maquillajeDeLook(rara, [blusa("#8A9A5B")], "diario"), null);
});

test("el maquillaje del análisis manda sobre el de la estación", () => {
  const propio = {
    ...perfil,
    maquillaje: {
      piel: "Mi piel",
      looks: [{ nombre: "Diario", pasos: ["X"], pinterest: "q" }],
      gestos: [],
      evita: []
    }
  };
  const r = maquillajeDeLook(propio, [blusa("#8A9A5B")], "diario");
  assert.equal(r?.filas[0][1], "Mi piel");
});

test("la ocasión elige el look de día o el de noche del perfil", () => {
  const dia = maquillajeDeLook(perfil, [blusa("#8A9A5B")], "oficina");
  const noche = maquillajeDeLook(perfil, [blusa("#8A9A5B")], "cita");
  assert.ok(dia && noche);
  assert.equal(dia.filas[1][0], "Base de día");
  assert.equal(noche.filas[1][0], "Base de noche");
  assert.notEqual(dia.filas[1][1], noche.filas[1][1]);
});

test("ropa llamativa: ojos neutros y repetir el tono en labios o mejillas", () => {
  const r = maquillajeDeLook(perfil, [blusa("#B03A2E"), pantalon("#3B2F2F")], "diario");
  assert.ok(r);
  assert.ok(r.filas.some(([e, t]) => e === "Con tu ropa" && /Ojos neutros/.test(t)));
  assert.ok(r.notas.some((n) => /nunca en los ojos/.test(n)));
});

test("ropa neutra: el maquillaje es el acento", () => {
  const r = maquillajeDeLook(perfil, [blusa("#E8DCC8"), pantalon("#6B4F3A")], "diario");
  assert.ok(r);
  assert.ok(r.filas.some(([e, t]) => e === "Con tu ropa" && /acento/.test(t)));
});

test("negro junto a la cara: avisa de subir colorete y labio", () => {
  const r = maquillajeDeLook(perfil, [blusa("#111111")], "diario");
  assert.ok(r);
  assert.ok(r.notas.some((n) => /colorete/.test(n)));
});

test("devuelve siempre piel, base y una búsqueda de Pinterest", () => {
  const r = maquillajeDeLook(perfil, [blusa("#8A9A5B")], "evento");
  assert.ok(r);
  assert.equal(r.filas[0][0], "Piel");
  assert.ok(r.busqueda.length > 0);
});
