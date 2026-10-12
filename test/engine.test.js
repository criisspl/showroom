import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setEstado, monta, casan, estiloDe, tejidoDe, evalua } from "../src/lib/engine.js";
import { perfilManual } from "../src/lib/analysis.js";
import { construyePaleta } from "../src/lib/color.js";
import { OCAS } from "../src/data/constants.js";

const P = [
  { id: "t1", nombre: "Top de lentejuelas", cat: "arriba", color: "#C0A060", formal: 3, abrigo: 1 },
  { id: "t2", nombre: "Camiseta de algodón", cat: "arriba", color: "#F5F0E6", formal: 1, abrigo: 1 },
  { id: "t3", nombre: "Blusa de gasa", cat: "arriba", color: "#708238", formal: 2, abrigo: 1 },
  { id: "b1", nombre: "Pantalón de chándal", cat: "abajo", color: "#555555", formal: 1, abrigo: 2 },
  { id: "b2", nombre: "Vaquero recto", cat: "abajo", color: "#3B5A7A", formal: 1, abrigo: 2 },
  { id: "b3", nombre: "Falda midi satén", cat: "abajo", color: "#8B5A2B", formal: 2, abrigo: 1 },
  { id: "v1", nombre: "Vestido lencero", cat: "vestido", color: "#6B3E2E", formal: 2, abrigo: 1 },
  { id: "z1", nombre: "Botines de ante", cat: "calzado", color: "#8B5A2B", formal: 2, abrigo: 2 },
  { id: "z2", nombre: "Zapatillas blancas", cat: "calzado", color: "#FFFFFF", formal: 1, abrigo: 2 },
  { id: "c1", nombre: "Chaqueta de punto", cat: "capa", color: "#C19A6B", formal: 1, abrigo: 2 }
];

beforeEach(() => {
  const perfil = perfilManual("otono-suave", "natural-suave");
  setEstado({ P: P.map((p) => ({ ...p })), O: [], V: [], perfil, PAL: construyePaleta(perfil) });
});

test("estilo y tejido se deducen del nombre", () => {
  assert.equal(estiloDe(P[3]), "deportivo");
  assert.equal(tejidoDe(P[3]), "felpa");
  assert.equal(estiloDe(P[0]), "fiesta");
  assert.equal(tejidoDe(P[4]), "vaquero");
  assert.notEqual(tejidoDe({ nombre: "Top de tirantes", cat: "arriba" }), "piel");
});

test("nunca junta chándal con un top de fiesta", () => {
  assert.equal(casan(P[0], P[3]), null);
  for (const o of OCAS) for (const b of ["frio", "fresco", "templado", "calor"]) {
    for (const r of monta(o.id, b, false, 1)) assert.ok(!(r.ids.includes("t1") && r.ids.includes("b1")), o.id + "/" + b);
  }
});

test("monta devuelve hasta 3 outfits con prendas existentes", () => {
  const r = monta("diario", "templado", false, 0);
  assert.ok(r.length >= 1 && r.length <= 3);
  for (const o of r) for (const id of o.ids) assert.ok(P.some((p) => p.id === id));
});

test("los votos «no» vetan esa combinación", () => {
  const r = monta("diario", "templado", false, 0)[0];
  setEstado({ V: [{ id: "v", key: r.key, voto: "no", ocasion: "diario", banda: "templado", motivos: ["todo"] }] });
  const r2 = monta("diario", "templado", false, 0);
  assert.ok(!r2.some((o) => o.key === r.key));
});

test("evalua da un veredicto para una prenda nueva", () => {
  const v = evalua({ nombre: "Falda midi de punto", cat: "abajo", color: "#708238", formal: 2, abrigo: 2 }, []);
  assert.ok(v && typeof v === "object");
});
