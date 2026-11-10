import { test, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { setEstado, evalua, companeros, tipoClave } from "../src/lib/engine.ts";
import { perfilManual } from "../src/lib/analysis.ts";
import { construyePaleta } from "../src/lib/color.ts";
import type { DatosPrenda, Deseo, Prenda } from "../src/lib/tipos.ts";

const base: Prenda[] = [
  { id: "t1", nombre: "Blusa fluida azul", cat: "arriba", color: "#7A93B0", formal: 2, abrigo: 1 },
  { id: "t2", nombre: "Camiseta de algodón blanca", cat: "arriba", color: "#F5F0E6", formal: 1, abrigo: 1 },
  { id: "t3", nombre: "Top de punto gris", cat: "arriba", color: "#A0A4A8", formal: 1, abrigo: 1 },
  { id: "b1", nombre: "Pantalón de pinzas marino", cat: "abajo", color: "#2E3F5C", formal: 2, abrigo: 2 },
  { id: "b2", nombre: "Falda midi gris", cat: "abajo", color: "#8E9296", formal: 2, abrigo: 1 },
  { id: "b3", nombre: "Vaquero recto", cat: "abajo", color: "#4F6A8F", formal: 1, abrigo: 2 },
  { id: "z1", nombre: "Botines de ante gris", cat: "calzado", color: "#8E9296", formal: 2, abrigo: 2 },
  { id: "c1", nombre: "Chaqueta de punto", cat: "capa", color: "#B8A9C9", formal: 1, abrigo: 2 }
];

function pon(P: Prenda[] = base) {
  const perfil = perfilManual("verano-suave", "clasico-suave");
  setEstado({ P: P.map((p) => ({ ...p })), O: [], V: [], perfil, PAL: construyePaleta(perfil) });
  return perfil;
}
beforeEach(() => {
  pon();
});

test("tipoClave saca el tipo del nombre y, si no, la categoría", () => {
  assert.equal(tipoClave({ cat: "arriba", nombre: "Blusa fluida" }), "blusa");
  assert.equal(tipoClave({ cat: "calzado", nombre: "Botín de ante" }), "botin");
  assert.equal(tipoClave({ cat: "capa", nombre: "Cárdigan largo" }), "cardigan");
  assert.equal(tipoClave({ cat: "accesorio", nombre: "Algo raro" }), "accesorio");
});

test("companeros ordena por encaje y respeta la categoría", () => {
  const r = companeros({ nombre: "Blusa de seda", cat: "arriba", color: "#7A93B0" });
  assert.ok(r.length > 0);
  assert.ok(r.every((x) => x.p.cat === "abajo" || x.p.cat === "layering"));
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].s >= r[i].s);
  assert.ok(
    companeros({ nombre: "Collar", cat: "accesorio", color: "#7A93B0" }).every((x) => x.p.cat === "arriba")
  );
});

test("dos prendas amplias de vestir no se juntan", () => {
  const sin = companeros({ nombre: "Pantalón", cat: "abajo", color: "#2E3F5C", corte: "amplia" });
  setEstado({ P: base.map((p) => (p.cat === "arriba" ? { ...p, corte: "amplia" as const } : p)) });
  const con = companeros({ nombre: "Pantalón", cat: "abajo", color: "#2E3F5C", corte: "amplia" });
  assert.ok(con.length < sin.length);
});

test("una prenda de la paleta que combina y cubre un hueco puntúa alto", () => {
  const n: DatosPrenda = {
    nombre: "Vestido fluido malva",
    cat: "vestido",
    color: "#B8A9C9",
    corte: "fluida"
  };
  const e = evalua(n);
  assert.ok(e.pro.some((x) => /paleta|neutro/.test(x)));
  assert.ok(e.pro.some((x) => /hueco/.test(x)));
  assert.ok(e.pro.some((x) => /tipo de cuerpo/.test(x)));
  assert.ok(e.s >= 1.5);
  assert.ok(e.socios.length <= 4);
  assert.ok(e.ocas.length > 0);
});

test("un color fuera de paleta junto a la cara pesa más que lejos de ella", () => {
  const cerca = evalua({ nombre: "Camiseta naranja", cat: "arriba", color: "#FF6A00" });
  const lejos = evalua({ nombre: "Zapatillas naranja", cat: "calzado", color: "#FF6A00" });
  assert.ok(cerca.contra.some((x) => /junto a la cara/.test(x)));
  assert.ok(lejos.contra.some((x) => /lejos de la cara/.test(x)));
});

test("sin prendas con las que casar, avisa y sale «no»", () => {
  setEstado({ P: [] });
  const e = evalua({ nombre: "Camiseta naranja de rejilla", cat: "arriba", color: "#FF6A00" });
  assert.ok(e.contra.some((x) => /No casa con nada/.test(x)));
  assert.equal(e.v, "no");
  assert.match(e.resumen, /otra versión/);
  assert.equal(e.socios.length, 0);
});

test("con una sola compañera avisa de cuántas son", () => {
  setEstado({ P: base.filter((p) => p.cat !== "abajo" || p.id === "b1") });
  const e = evalua({ nombre: "Blusa fluida", cat: "arriba", color: "#7A93B0" });
  assert.ok(e.contra.some((x) => /Solo combina con 1 prenda /.test(x)));
});

test("combina con muchas: lo dice", () => {
  const muchas: Prenda[] = [
    ...base,
    { id: "b4", nombre: "Pantalón gris claro", cat: "abajo", color: "#A0A4A8", formal: 2, abrigo: 2 },
    { id: "b5", nombre: "Falda plisada gris", cat: "abajo", color: "#9AA0A6", formal: 2, abrigo: 1 },
    { id: "b6", nombre: "Pantalón blanco roto", cat: "abajo", color: "#F5F0E6", formal: 2, abrigo: 2 }
  ];
  setEstado({ P: muchas });
  const e = evalua({ nombre: "Jersey fino azul", cat: "arriba", color: "#7A93B0" });
  const n = +(/Combina con (\d+)/.exec(e.pro.join(" "))?.[1] ?? 0);
  assert.ok(n >= 3);
});

test("detecta duplicados y cortes que no favorecen", () => {
  const e = evalua({ nombre: "Camiseta de algodón blanca", cat: "arriba", color: "#F5F0E6" });
  assert.ok(e.contra.some((x) => /muy parecido: Camiseta de algodón blanca/.test(x)));
  setEstado({ perfil: { ...pon(), cuerpo: { ...pon().cuerpo, evita: [], si: [] } } });
  const r = evalua({ nombre: "Pantalón de tiro bajo rígido", cat: "abajo", color: "#2E3F5C" });
  assert.ok(r.contra.some((x) => /corte no es de los que más/.test(x)));
});

test("el corte malo sale del perfil cuando hay palabras a evitar", () => {
  const perfil = pon();
  perfil.cuerpo = { ...perfil.cuerpo, evita: ["Prendas rígidas y angulosas"], si: ["Tejidos fluidos"] };
  setEstado({ perfil });
  const mala = evalua({ nombre: "Chaqueta rígidas", cat: "capa", color: "#B8A9C9" });
  assert.ok(mala.contra.some((x) => /corte/.test(x)));
  const buena = evalua({ nombre: "Blusa de tejidos fluidos", cat: "arriba", color: "#7A93B0" });
  assert.ok(buena.pro.some((x) => /tipo de cuerpo/.test(x)));
});

test("encaja con la estética si el nombre usa una de sus claves", () => {
  const perfil = pon();
  perfil.estetica = { ...perfil.estetica, nombre: "Romántica", claves: ["romántica", "vaporosa"] };
  setEstado({ perfil });
  const e = evalua({ nombre: "Blusa vaporosa", cat: "arriba", color: "#7A93B0" });
  assert.ok(e.pro.some((x) => /Encaja con tu estética: romántica/.test(x)));
});

test("una prenda de la lista de deseos suma un punto", () => {
  const deseos: Deseo[] = [
    { id: "w1", n: "Falda midi plisada", cat: "abajo", cols: [["Gris", "#8E9296"]], top: true }
  ];
  const n: DatosPrenda = { nombre: "Falda midi plisada", cat: "abajo", color: "#8E9296" };
  const con = evalua(n, deseos);
  const sin = evalua(n);
  assert.ok(con.pro.some((x) => /te faltan: falda midi plisada/.test(x)));
  assert.equal(+(con.s - sin.s).toFixed(1), 1);
});

test("en casa solo valen las prendas que se visten", () => {
  const e = evalua({ nombre: "Botines de ante", cat: "calzado", color: "#8E9296" });
  assert.ok(!e.ocas.includes("en casa"));
});
