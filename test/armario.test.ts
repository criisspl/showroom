import { test } from "vitest";
import assert from "node:assert/strict";
import {
  avisoPartesDeArriba,
  coloresPara,
  necesitaRevision,
  partesDeArribaEnPaleta
} from "../src/lib/armario.ts";
import { construyePaleta } from "../src/lib/color.ts";
import { perfilManual } from "../src/lib/analysis.ts";

const paleta = construyePaleta(perfilManual("otono-suave", "natural-suave"));
const arriba = (pal: "ok" | "neutro" | "evita") => ({ cat: "arriba" as const, pal });
const abajo = { cat: "abajo" as const, pal: "ok" as const };

test("cuenta solo arriba y vestidos que están en la paleta", () => {
  assert.equal(
    partesDeArribaEnPaleta([arriba("ok"), arriba("evita"), { cat: "vestido", pal: "neutro" }, abajo]),
    2
  );
});

test("sin 3 prendas no avisa; con 3 y menos de 2 partes de arriba en paleta, sí", () => {
  assert.equal(avisoPartesDeArriba([arriba("evita"), abajo], paleta), null);
  assert.equal(avisoPartesDeArriba([arriba("ok"), arriba("neutro"), abajo], paleta), null);
  const aviso = avisoPartesDeArriba([arriba("evita"), abajo, abajo], paleta);
  assert.match(aviso ?? "", /^Te faltan partes de arriba en tu paleta: empieza por /);
});

test("los colores sugeridos salen de la paleta de la persona", () => {
  const cols = coloresPara(paleta);
  assert.equal(cols.length, 3);
  for (const c of cols) assert.ok(paleta.some((p) => p.tipo === "ok" && p.n.toLowerCase() === c));
  assert.equal(avisoPartesDeArriba([arriba("evita"), abajo, abajo], [])?.endsWith("paleta."), true);
});

test("necesitaRevision marca solo lo deducido de una foto de look y sin foto propia", () => {
  assert.equal(necesitaRevision({ origen: "foto-look", foto: null, mini: null }), true);
  assert.equal(necesitaRevision({ origen: "foto-look" }), true);
  assert.equal(necesitaRevision({ origen: "foto-look", foto: "f1", mini: null }), false);
  assert.equal(
    necesitaRevision({ origen: "foto-look", foto: null, mini: "data:image/jpeg;base64,x" }),
    false
  );
  assert.equal(necesitaRevision({ origen: "usuario" }), false);
  assert.equal(necesitaRevision({}), false);
});
