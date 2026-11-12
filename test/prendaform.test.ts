import { test } from "vitest";
import assert from "node:assert/strict";
import {
  dominanteDe,
  leePrenda,
  rellenoDe,
  tamanoReducido,
  textoOpinionIA,
  textoSegundaOpinion,
  type CamposPrenda
} from "../src/lib/prendaform.ts";
import { construyePaleta } from "../src/lib/color.ts";
import { perfilManual } from "../src/lib/analysis.ts";

const paleta = construyePaleta(perfilManual("otono-suave", "natural-suave"));
const campos: CamposPrenda = {
  nombre: "  Falda midi  ",
  cat: "abajo",
  tipo: "falda",
  color: "#a3b18a",
  corte: "fluida",
  estilo: "casual",
  tejido: "saten",
  abrigo: "1",
  notas: " nota ",
  temporada: ["verano"]
};

test("leePrenda recorta, pasa el color a mayúsculas y calcula lo derivado", () => {
  const r = leePrenda(campos, null, paleta);
  assert.ok("prenda" in r);
  assert.equal(r.prenda.nombre, "Falda midi");
  assert.equal(r.prenda.color, "#A3B18A");
  assert.equal(r.prenda.abrigo, 1);
  assert.equal(r.prenda.notas, "nota");
  assert.deepEqual(r.prenda.temporada, ["verano"]);
});

test("leePrenda: las cuatro temporadas marcadas equivalen a todo el año", () => {
  const r = leePrenda({ ...campos, temporada: ["primavera", "verano", "otono", "invierno"] }, null, paleta);
  assert.ok("prenda" in r);
  assert.deepEqual(r.prenda.temporada, []);
});

test("leePrenda pide nombre salvo al analizar una compra", () => {
  assert.deepEqual(leePrenda({ ...campos, nombre: " " }, null, paleta), {
    error: "Ponle un nombre para reconocerla después."
  });
  const r = leePrenda({ ...campos, nombre: "", tipo: "" }, "compra", paleta);
  assert.ok("prenda" in r);
  assert.equal(r.prenda.nombre, "Prenda que he visto");
});

test("tamanoReducido nunca agranda y respeta la proporción", () => {
  assert.deepEqual(tamanoReducido(2000, 1000, 1000), { w: 1000, h: 500 });
  assert.deepEqual(tamanoReducido(300, 200, 1000), { w: 300, h: 200 });
});

test("dominanteDe devuelve el color que más pesa", () => {
  const n = 4;
  const d = new Uint8ClampedArray(n * n * 4);
  for (let i = 0; i < n * n; i++) d.set([255, 0, 0, 255], i * 4);
  assert.equal(dominanteDe(d, n), "#FF0000");
});

test("rellenoDe se queda solo con lo válido y falla si no ha visto nada", () => {
  const r = rellenoDe({ nombre: "Camiseta", cat: "arriba", color: "azul", corte: "rara", abrigo: 3 });
  assert.deepEqual(r, { nombre: "Camiseta", cat: "arriba", abrigo: "3" });
  assert.throws(() => rellenoDe({}), /No lo he visto claro/);
});

test("textoOpinionIA resume el veredicto y con qué combina", () => {
  assert.equal(
    textoOpinionIA({ veredicto: "si", porque: "Te favorece.", combina: ["Vaquero"] }),
    "IA: Cómprala. Te favorece. Con: Vaquero."
  );
});

test("textoSegundaOpinion incluye el armario y el análisis, no la foto", () => {
  const r = leePrenda(campos, null, paleta);
  assert.ok("prenda" in r);
  const t = textoSegundaOpinion("Perfil.", "Vaquero (abajo)", r.prenda, {
    v: "quiza",
    pro: ["A"],
    contra: ["B"]
  });
  assert.match(t, /Vaquero \(abajo\)/);
  assert.match(t, /Piénsatelo\. A favor: A En contra: B/);
});
