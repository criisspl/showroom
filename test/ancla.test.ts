import { test, beforeEach } from "vitest";
import assert from "node:assert/strict";
import {
  setEstado,
  estado,
  alternaAncla,
  chocaAncla,
  montaConAnclas,
  sugiereIdeas,
  huecosAncla,
  delArmarioParaIdea,
  porQueIdea
} from "../src/lib/engine.ts";
import { perfilManual } from "../src/lib/analysis.ts";
import { construyePaleta } from "../src/lib/color.ts";
import type { Contexto, Deseo, Prenda } from "../src/lib/tipos.ts";

const P: Prenda[] = [
  { id: "t1", nombre: "Camiseta de algodón", cat: "arriba", color: "#F5F0E6", formal: 1, abrigo: 1 },
  { id: "t2", nombre: "Blusa de gasa", cat: "arriba", color: "#708238", formal: 2, abrigo: 1 },
  { id: "b1", nombre: "Vaquero recto", cat: "abajo", color: "#3B5A7A", formal: 1, abrigo: 2 },
  { id: "b2", nombre: "Falda midi satén", cat: "abajo", color: "#8B5A2B", formal: 2, abrigo: 1 },
  { id: "v1", nombre: "Vestido lencero", cat: "vestido", color: "#6B3E2E", formal: 2, abrigo: 1 },
  { id: "z1", nombre: "Botines de ante", cat: "calzado", color: "#8B5A2B", formal: 2, abrigo: 2 },
  { id: "c1", nombre: "Chaqueta de punto", cat: "capa", color: "#C19A6B", formal: 1, abrigo: 2 }
];
const C: Contexto = { oca: "diario", banda: "templado", est: "primavera", cond: { entorno: "ciudad" } };
const DESEOS: Deseo[] = [
  {
    id: "w-bota",
    n: "Botas de caña media",
    cat: "calzado",
    cols: [["Chocolate", "#4E3326"]],
    abrigo: 2,
    formal: 2,
    estilo: "casual"
  },
  {
    id: "w-collar",
    n: "Collar dorado",
    cat: "accesorio",
    cols: [["Oro viejo", "#B8914A"]],
    abrigo: 1,
    formal: 2
  }
];
const get = (id: string) => P.find((p) => p.id === id) as Prenda;

beforeEach(() => {
  const perfil = perfilManual("otono-suave", "natural-suave");
  setEstado({ P: P.map((p) => ({ ...p })), O: [], V: [], perfil, PAL: construyePaleta(perfil) });
});

test("un vestido y un arriba no pueden ser fijos a la vez; dos arribas sí", () => {
  assert.equal(chocaAncla(get("v1"), get("t1")), true);
  assert.equal(chocaAncla(get("t1"), get("v1")), true);
  assert.equal(chocaAncla(get("t1"), get("t2")), false);
  assert.equal(chocaAncla(get("b1"), get("b2")), true);
  assert.equal(chocaAncla(get("t1"), get("t1")), false);
});

test("alternaAncla añade, quita y desplaza lo que ocupaba el sitio", () => {
  let a = alternaAncla([], get("t1"), true);
  a = alternaAncla(a, get("b1"), true);
  assert.deepEqual(
    a.map((p) => p.id),
    ["t1", "b1"]
  );
  a = alternaAncla(a, get("b2"), true);
  assert.deepEqual(
    a.map((p) => p.id),
    ["t1", "b2"]
  );
  a = alternaAncla(a, get("v1"), true);
  assert.deepEqual(
    a.map((p) => p.id),
    ["v1"]
  );
  assert.deepEqual(alternaAncla(a, get("v1"), false), []);
});

test("montaConAnclas mete todas las prendas fijas y no deja huérfano el estado", () => {
  const antes = estado.P.length;
  const res = montaConAnclas([get("t1"), get("b1")], C, 0);
  assert.ok(res.length >= 1);
  for (const o of res) {
    assert.ok(o.ids.includes("t1") && o.ids.includes("b1"));
    assert.ok(o.ids.every((id) => P.some((p) => p.id === id)));
  }
  assert.equal(estado.P.length, antes);
});

test("con una sola prenda fija sigue funcionando", () => {
  const res = montaConAnclas([get("z1")], C, 0);
  assert.ok(res.length >= 1);
  for (const o of res) assert.ok(o.ids.includes("z1"));
});

test("una prenda virtual fija entra en el look aunque no esté en el armario", () => {
  const v: Prenda = {
    id: "ancla-x",
    nombre: "Falda de cuadros",
    cat: "abajo",
    color: "#8B5A2B",
    formal: 2,
    abrigo: 2,
    virtual: true
  };
  const res = montaConAnclas([v], C, 0);
  assert.ok(res.length >= 1);
  for (const o of res) assert.ok(o.ids.includes("ancla-x"));
});

test("huecosAncla dice qué falta", () => {
  assert.deepEqual(huecosAncla([get("v1")], C), ["calzado", "accesorio"]);
  assert.deepEqual(huecosAncla([get("t1")], C), ["abajo", "calzado", "accesorio"]);
  assert.deepEqual(huecosAncla([get("t1")], { ...C, oca: "casa" }), ["abajo"]);
  assert.ok(huecosAncla([get("v1")], { ...C, banda: "frio" }).includes("capa"));
});

test("sugiereIdeas propone una por hueco, con motivo, y respeta los descartes", () => {
  const as = [get("t1"), get("b1")];
  const ideas = sugiereIdeas(as, C, DESEOS);
  assert.deepEqual(
    ideas.map((i) => i.cat),
    ["calzado", "accesorio"]
  );
  for (const i of ideas) assert.ok(i.porque.length > 0);
  const bota = ideas[0];
  const sin = sugiereIdeas(as, C, DESEOS, 0, { [bota.id]: 1 });
  assert.notEqual(sin[0].id, bota.id);
  assert.equal(sin[0].generica, true);
});

test("«Otra idea» cambia la sugerencia cuando hay más de una", () => {
  const as = [get("t1"), get("b1")];
  const a = sugiereIdeas(as, C, DESEOS, 0)[0],
    b = sugiereIdeas(as, C, DESEOS, 1)[0];
  assert.notEqual(a.id, b.id);
});

test("sin nada que añadir, no hay ideas", () => {
  const todo = [get("v1"), get("z1")];
  const descartadas = { "generica-accesorio": 1 as const, "w-collar": 1 as const };
  assert.deepEqual(sugiereIdeas(todo, C, DESEOS, 0, descartadas), []);
});

test("delArmarioParaIdea ofrece prendas del hueco que casan con lo elegido", () => {
  const r = delArmarioParaIdea({ cat: "calzado" }, [get("t1"), get("b1")], C);
  assert.deepEqual(
    r.map((p) => p.id),
    ["z1"]
  );
  assert.deepEqual(
    delArmarioParaIdea({ cat: "capa" }, [get("t1")], C).map((p) => p.id),
    ["c1"]
  );
});

test("porQueIdea habla de la forma y del color", () => {
  const amplia = porQueIdea({ nombre: "Vaquero", cat: "abajo", color: "#3B5A7A", corte: "amplia" }, [
    get("t1")
  ]);
  assert.match(amplia, /Mete un pico por delante para marcar cintura\./);
  const recta = porQueIdea({ nombre: "Pantalón", cat: "abajo", color: "#3B5A7A" }, [get("t1")]);
  assert.match(recta, /^Equilibra la forma de lo que llevas\./);
  assert.match(porQueIdea({ nombre: "Botines", cat: "calzado", color: "#4E3326" }, []), /Cierra el look/);
});
