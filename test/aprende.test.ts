import { test, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { setEstado } from "../src/lib/engine.ts";
import { aprende, aprendido, usos, clave2 } from "../src/lib/motor/aprende.ts";
import type { Voto } from "../src/lib/tipos.ts";

let n = 0;
const voto = (extra: Partial<Voto>): Voto => ({
  id: "v" + ++n,
  key: "a1+b1",
  prendas: ["a1", "b1", "z1"],
  ocasion: "diario",
  banda: "templado",
  voto: "no",
  motivos: [],
  piezas: [],
  est: ["casual", "arreglado"] as Voto["est"],
  tej: ["punto", "vaquero"] as Voto["tej"],
  fam: ["verde", "rojizo"] as Voto["fam"],
  cor: ["ajustada", "amplia"] as Voto["cor"],
  creada: "2026-04-14T10:00:00.000Z",
  ...extra
});

beforeEach(() => {
  setEstado({ O: [], V: [] });
});

test("clave2 no depende del orden", () => {
  assert.equal(clave2("b", "a"), "a|b");
  assert.equal(clave2("a", "b"), "a|b");
});

test("usos cuenta solo los outfits con fecha", () => {
  setEstado({
    O: [
      { id: "o1", prendas: ["a1", "b1"], fecha: "2026-04-14" },
      { id: "o2", prendas: ["a1"], fecha: "2026-04-15" },
      { id: "o3", prendas: ["a1", "z1"] }
    ] as never
  });
  assert.deepEqual(usos(), { a1: 2, b1: 1 });
});

test("un «sí» sube el par y, con dos de cada, estilos, tejidos y colores", () => {
  setEstado({ V: [voto({ voto: "si" })] });
  const l = aprende();
  assert.equal(l.si, 1);
  assert.equal(l.no, 0);
  assert.equal(l.par["a1+b1"], 0.8);
  assert.equal(l.est["arreglado|casual"], 0.15);
  assert.equal(l.tej["punto|vaquero"], 0.15);
  assert.equal(l.col["rojizo|verde"], 0.15);
});

test("varios «sí» no pasan del tope", () => {
  setEstado({ V: [voto({ voto: "si" }), voto({ voto: "si" }), voto({ voto: "si" })] });
  assert.equal(aprende().par["a1+b1"], 1.6);
});

test("un «sí» sin pares completos solo sube el par", () => {
  setEstado({ V: [voto({ voto: "si", est: ["casual"] as Voto["est"] })] });
  const l = aprende();
  assert.equal(l.par["a1+b1"], 0.8);
  assert.deepEqual(l.est, {});
});

test("un «no» por ocasión o tiempo veta en ese contexto, y por mezcla baja los pesos", () => {
  setEstado({
    V: [voto({ motivos: ["ocasion", "tiempo", "estilos", "tejidos", "colores", "forma"] })]
  });
  const l = aprende();
  assert.equal(l.no, 1);
  assert.equal(l.veto["a1+b1|o:diario"], 1);
  assert.equal(l.veto["a1+b1|b:templado"], 1);
  assert.equal(l.est["arreglado|casual"], -0.5);
  assert.equal(l.tej["punto|vaquero"], -0.5);
  assert.equal(l.col["rojizo|verde"], -0.5);
  assert.equal(l.cor["ajustada|amplia"], -0.5);
  assert.equal(l.veto["a1+b1"], 1);
});

test("un «no» a una pieza del look castiga la pieza y descarta el look", () => {
  setEstado({ V: [voto({ piezas: ["a1"], motivos: ["todo"] })] });
  const l = aprende();
  assert.equal(l.pie["a1|diario"], -1.2);
  assert.equal(l.veto["a1+b1"], 1);
  assert.deepEqual(l.comp, {});
});

test("si solo falla un complemento, el look sigue y se cambia el complemento", () => {
  setEstado({ V: [voto({ piezas: ["z1"], motivos: ["todo"] })] });
  const l = aprende();
  assert.equal(l.pie["z1|diario"], -0.8);
  assert.equal(l.comp["z1|a1+b1"], 1);
  assert.equal(l.veto["a1+b1"], undefined);
});

test("si el complemento falla y además hay mezcla mala, el look también se veta", () => {
  setEstado({ V: [voto({ piezas: ["z1"], motivos: ["colores"] })] });
  assert.equal(aprende().veto["a1+b1"], 1);
});

test("los votos sin clave o con otro valor no cuentan, y el pie nunca baja de -4", () => {
  setEstado({
    V: [
      voto({ key: "" }),
      voto({ voto: "quizas" as never }),
      ...Array.from({ length: 5 }, () => voto({ piezas: ["a1"] }))
    ]
  });
  const l = aprende();
  assert.equal(l.no, 5);
  assert.equal(l.pie["a1|diario"], -4);
});

test("aprendido guarda el cálculo hasta que cambian los votos", () => {
  setEstado({ V: [voto({ voto: "si" })] });
  const a = aprendido();
  assert.equal(aprendido(), a);
  setEstado({ V: [] });
  assert.notEqual(aprendido(), a);
});
