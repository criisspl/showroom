import { test, beforeEach } from "vitest";
import assert from "node:assert/strict";
import {
  setEstado,
  asoma,
  txtAsoma,
  cuelloAlto,
  crop,
  encima,
  casan,
  temporadaDe,
  monta,
  juzga,
  chocaAncla,
  alternaAncla
} from "../src/lib/engine.ts";
import { perfilManual } from "../src/lib/analysis.ts";
import { construyePaleta } from "../src/lib/color.ts";
import type { Contexto, DatosPrenda, Prenda } from "../src/lib/tipos.ts";

const P: Prenda[] = [
  { id: "t1", nombre: "Camiseta de algodón", cat: "arriba", color: "#F5F0E6", formal: 1, abrigo: 1 },
  { id: "t2", nombre: "Jersey de punto", cat: "arriba", color: "#C19A6B", formal: 1, abrigo: 2 },
  { id: "t4", nombre: "Camiseta de manga larga", cat: "arriba", color: "#DDDDDD", formal: 1, abrigo: 1 },
  { id: "t3", nombre: "Sudadera gris", cat: "arriba", color: "#999999", formal: 1, abrigo: 2 },
  { id: "b1", nombre: "Vaquero recto", cat: "abajo", color: "#3B5A7A", formal: 1, abrigo: 2 },
  { id: "z1", nombre: "Zapatillas blancas", cat: "calzado", color: "#FFFFFF", formal: 1, abrigo: 2 },
  {
    id: "l1",
    nombre: "Camiseta fina de manga larga",
    cat: "layering",
    color: "#4E3326",
    formal: 1,
    abrigo: 1
  },
  { id: "l2", nombre: "Jersey fino de cuello alto", cat: "layering", color: "#F3E9D4", formal: 1, abrigo: 1 },
  { id: "l3", nombre: "Top de malla de manga larga", cat: "layering", color: "#4A4A2C", formal: 1, abrigo: 1 }
];
const get = (id: string) => P.find((p) => p.id === id) as Prenda;
const C: Contexto = { oca: "diario", banda: "fresco", est: "otono", cond: { entorno: "ciudad" } };

beforeEach(() => {
  const perfil = perfilManual("otono-suave", "natural-suave");
  setEstado({ P: P.map((p) => ({ ...p })), O: [], V: [], perfil, PAL: construyePaleta(perfil) });
});

test("cuelloAlto y crop se deducen del nombre", () => {
  assert.ok(cuelloAlto(get("l2")));
  assert.ok(!cuelloAlto(get("t2")));
  assert.ok(crop({ nombre: "Top crop", cat: "arriba" }));
  assert.ok(crop({ nombre: "Camiseta corta", cat: "arriba" }));
  assert.ok(!crop({ nombre: "Camiseta de manga corta", cat: "arriba" }));
});

test("asoma dice qué se ve de la prenda de debajo", () => {
  assert.deepEqual(asoma(get("l1"), get("t1")), ["las mangas"]);
  assert.deepEqual(asoma(get("l2"), get("t1")), ["el cuello", "las mangas"]);
  assert.deepEqual(asoma(get("l2"), get("t2")), ["el cuello"]);
  assert.deepEqual(asoma(get("l1"), get("t2")), []);
  assert.deepEqual(asoma(get("l1"), { nombre: "Camiseta de manga 3/4", cat: "arriba" }), ["los puños"]);
  assert.deepEqual(asoma(get("l1"), { nombre: "Top crop de tirantes", cat: "arriba" }), [
    "las mangas",
    "el bajo"
  ]);
  assert.deepEqual(asoma(null, get("t1")), []);
});

test("txtAsoma concuerda en singular y plural", () => {
  assert.equal(txtAsoma([]), "");
  assert.equal(txtAsoma(["el cuello"]), "Se ve el cuello de la de debajo: ese es el layering.");
  assert.equal(txtAsoma(["las mangas"]), "Se ven las mangas de la de debajo: ese es el layering.");
  assert.equal(
    txtAsoma(["el cuello", "las mangas"]),
    "Se ven el cuello y las mangas de la de debajo: ese es el layering."
  );
});

test("encima: no vale un abrigo ni una sudadera, sí una camiseta o un vestido", () => {
  assert.ok(encima(get("t1")));
  assert.ok(!encima(get("t3")));
  assert.ok(encima({ nombre: "Algo", cat: "vestido" }));
  assert.ok(!encima(null));
});

test("el layering se viste, casa con arriba y por defecto es de otoño e invierno", () => {
  assert.notEqual(casan(get("l1"), get("t1")), null);
  assert.deepEqual(temporadaDe(get("l1")), { t: ["otono", "invierno"], fija: false });
  const x: DatosPrenda = { nombre: "Fina", cat: "layering", temporada: ["verano"] };
  assert.deepEqual(temporadaDe(x), { t: ["verano"], fija: true });
});

test("monta añade una capa fina debajo con frío u otoño, y no con calor", () => {
  const con = (banda: string, est: "otono" | "primavera") =>
    monta("diario", banda, false, 0, null, est).filter((o) => o.ids.some((id) => get(id).cat === "layering"));
  const frio = con("frio", "otono");
  assert.ok(frio.length > 0);
  for (const o of frio) {
    const i = o.ids.findIndex((id) => get(id).cat === "layering");
    assert.equal(get(o.ids[i - 1]).cat, "arriba");
    assert.ok(o.tips.some((t) => /layering/.test(t)));
  }
  assert.ok(con("fresco", "primavera").length > 0);
  assert.equal(con("templado", "primavera").length, 0);
  assert.equal(con("calor", "otono").length, 0);
  assert.equal(con("templado", "otono").length > 0, true);
});

test("monta no pone layering si no se ve nada o si la de encima es gruesa", () => {
  setEstado({ P: P.filter((p) => p.id !== "t1").map((p) => ({ ...p })) });
  const r = monta("diario", "frio", false, 0, null, "invierno");
  for (const o of r) {
    const arriba = o.ids.map(get).find((p) => p.cat === "arriba");
    const ly = o.ids.map(get).find((p) => p.cat === "layering");
    if (arriba && ly) assert.ok(asoma(ly, arriba).length > 0);
    if (arriba?.id === "t3") assert.equal(ly, undefined);
  }
});

test("juzga: dos layering, encima gruesa, no se ve y calor sobra", () => {
  const mal = (ids: string[], c: Contexto = C) => juzga(ids, c)?.mal.join(" | ") ?? "";
  assert.match(mal(["t1", "b1", "l1", "l2"]), /con una basta/);
  assert.match(mal(["t3", "b1", "l1"]), /demasiado grueso/);
  assert.match(mal(["t4", "b1", "l1"]), /no se ve/);
  assert.match(mal(["t1", "b1", "l1"], { ...C, banda: "calor", est: "verano" }), /debajo sobra/);
  assert.match(mal(["l1", "b1"]), /es para llevar debajo/);
  const ok = juzga(["t1", "b1", "l1"], C);
  assert.ok(ok?.bien.some((b) => /Buen layering/.test(b)));
  assert.ok(!ok?.mal.some((m) => /layering|debajo|se ve/.test(m)));
});

test("ancla: el layering se apila con arriba y vestido, pero no con otro layering", () => {
  assert.equal(chocaAncla(get("l1"), get("t1")), false);
  assert.equal(chocaAncla(get("t1"), get("l1")), false);
  assert.equal(chocaAncla({ id: "v", cat: "vestido" }, get("l1")), false);
  assert.equal(chocaAncla(get("l1"), { id: "v", cat: "vestido" }), false);
  assert.equal(chocaAncla(get("l1"), get("l2")), true);
  assert.deepEqual(
    alternaAncla([get("t1"), get("l1")], get("l2"), true).map((p) => p.id),
    ["t1", "l2"]
  );
});
