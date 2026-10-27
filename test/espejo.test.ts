import { test } from "vitest";
import assert from "node:assert/strict";
import { CUERPOS } from "../src/data/presets.ts";
import { preguntasEspejo, veredictoEspejo } from "../src/lib/espejo.ts";
import type { Perfil } from "../src/lib/tipos.ts";

const conCuerpo = (tipo: string) => ({ cuerpo: { tipo } }) as Perfil;

test("sin perfil o con un tipo desconocido: cinco preguntas genéricas", () => {
  assert.equal(preguntasEspejo(null).length, 5);
  assert.deepEqual(preguntasEspejo(conCuerpo("Inventado")), preguntasEspejo(null));
});

test("con perfil: salen del tipo de cuerpo y siempre son cinco", () => {
  const p = preguntasEspejo(conCuerpo("Natural Suave"));
  assert.equal(p.length, 5);
  assert.match(p[0], new RegExp(CUERPOS["natural-suave"].si[0].toLowerCase()));
  assert.match(p[3], new RegExp(CUERPOS["natural-suave"].evita[0].toLowerCase()));
  assert.equal(p[4], "¿Hay un color tuyo junto a la cara?");
});

test("cada tipo de cuerpo da cinco preguntas distintas entre sí", () => {
  for (const c of Object.values(CUERPOS)) {
    const p = preguntasEspejo(conCuerpo(c.n));
    assert.equal(p.length, 5, c.n);
    assert.equal(new Set(p).size, 5, c.n);
  }
});

test("veredicto: ninguno, pocos y cuatro o más síes", () => {
  assert.equal(veredictoEspejo(0), "Marca lo que cumple el look.");
  assert.equal(veredictoEspejo(3), "Cambia una sola prenda y vuelve a mirar.");
  assert.equal(veredictoEspejo(4), "Listo. Sal por la puerta.");
  assert.equal(veredictoEspejo(5), "Listo. Sal por la puerta.");
});
