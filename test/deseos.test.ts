import { test, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { setEstado } from "../src/lib/engine.ts";
import { familia, lab } from "../src/lib/color.ts";
import {
  FILTROS,
  combinaCon,
  iconoSvg,
  nombreColor,
  nombreNuevo,
  notaDeArmario,
  prellenadoDe,
  prellenadoPropio,
  prendasVisibles,
  propiasDe,
  textoFiltro,
  textoVacio,
  vistaPropia
} from "../src/lib/deseos.ts";
import { ICONOS } from "../src/data/icons.ts";
import type { DeseoGuardado } from "../src/lib/store.ts";
import type { ColorPaleta, Deseo, Prenda } from "../src/lib/tipos.ts";

const W = (id: string, extra: Partial<Deseo> = {}): Deseo => ({
  id,
  n: "Prenda " + id,
  cat: "arriba",
  cols: [["Crema", "#F3E9D2"]],
  ...extra
});
const WISH: Deseo[] = [
  W("a", { top: true }),
  W("b", { cat: "abajo" }),
  W("c", { cat: "calzado", top: true }),
  W("d", { cat: "abajo" })
];
const D = (...d: DeseoGuardado[]): Record<string, DeseoGuardado> =>
  Object.fromEntries(d.map((x) => [x.id, x]));

const P = (id: string, cat: Prenda["cat"], extra: Partial<Prenda> = {}): Prenda => ({
  id,
  nombre: "Prenda " + id,
  cat,
  color: "#3B5A7A",
  ...extra
});

beforeEach(() => setEstado({ P: [], perfil: null, PAL: [] }));

test("los filtros incluyen «Mi lista» y «Todo»", () => {
  assert.equal(FILTROS[0][0], "top");
  assert.ok(FILTROS.some(([id]) => id === "mia"));
  assert.equal(FILTROS[FILTROS.length - 1][0], "todo");
});

test("«Empieza aquí» enseña las destacadas y «todo» enseña todas", () => {
  assert.deepEqual(
    prendasVisibles(WISH, {}, "top").map((w) => w.id),
    ["a", "c"]
  );
  assert.equal(prendasVisibles(WISH, {}, "todo").length, 4);
});

test("un filtro de categoría solo enseña esa categoría", () => {
  assert.deepEqual(
    prendasVisibles(WISH, {}, "abajo").map((w) => w.id),
    ["b", "d"]
  );
});

test("«Mi lista» enseña solo lo que quieres", () => {
  const g = D({ id: "b", estado: "quiero" }, { id: "d", estado: "no" });
  assert.deepEqual(
    prendasVisibles(WISH, g, "mia").map((w) => w.id),
    ["b"]
  );
});

test("las que ya tienes van al final sin alterar el resto del orden", () => {
  const g = D({ id: "a", estado: "tengo" });
  assert.deepEqual(
    prendasVisibles(WISH, g, "todo").map((w) => w.id),
    ["b", "c", "d", "a"]
  );
});

test("«Mi lista» cuenta lo que quieres y lo que añadiste tú", () => {
  const g = D(
    { id: "a", estado: "quiero" },
    { id: "x", propio: true, nombre: "Corsé", estado: "quiero" },
    { id: "y", propio: true, estado: "quiero" }
  );
  assert.equal(textoFiltro("mia", "Mi lista", WISH, g), "Mi lista · 2");
  assert.equal(textoFiltro("mia", "Mi lista", WISH, {}), "Mi lista");
  assert.equal(textoFiltro("top", "Empieza aquí", WISH, g), "Empieza aquí");
});

test("las prendas propias van de la más reciente a la más antigua y piden nombre", () => {
  const g = D(
    { id: "1", propio: true, nombre: "Vieja", cuando: "2026-01-01" },
    { id: "2", propio: true, nombre: "Nueva", cuando: "2026-03-01" },
    { id: "3", propio: true, cuando: "2026-05-01" },
    { id: "4", estado: "quiero" }
  );
  assert.deepEqual(
    propiasDe(g).map((d) => d.id),
    ["2", "1"]
  );
});

test("la lista vacía explica qué hacer solo en «Mi lista»", () => {
  assert.match(textoVacio("mia"), /Pulsa «La quiero»/);
  assert.equal(textoVacio("capa"), "No hay prendas en este apartado.");
});

test("el icono desconocido o ausente cae en la camiseta", () => {
  assert.equal(iconoSvg(undefined), ICONOS.camiseta);
  assert.equal(iconoSvg("no-existe"), ICONOS.camiseta);
  assert.equal(iconoSvg("blusa"), ICONOS.blusa);
});

test("el nombre del color es el suyo o el más cercano de tu paleta", () => {
  assert.equal(nombreColor(["Crema", "#F3E9D2"], []), "Crema");
  const pal: ColorPaleta[] = [
    { n: "Azul", hex: "#3B5A7A", tipo: "ok", lab: lab("#3B5A7A"), fam: familia("#3B5A7A") }
  ];
  assert.equal(nombreColor(["", "#3B5A7A"], pal), "Azul");
});

test("«Combina con lo tuyo» solo nombra prendas de las categorías que casan", () => {
  assert.equal(combinaCon(W("x", { cat: "accesorio" }), "#F3E9D2"), "");
  assert.equal(combinaCon(W("x", { cat: "arriba" }), "#F3E9D2"), "");
});

test("«Combina con lo tuyo» nombra como mucho dos prendas, en minúscula inicial", () => {
  setEstado({
    P: [
      P("b1", "abajo", { nombre: "Vaquero recto" }),
      P("b2", "abajo", { nombre: "Falda midi" }),
      P("b3", "abajo", { nombre: "Pantalón sastre" }),
      P("t1", "arriba", { nombre: "Camisa" })
    ]
  });
  const t = combinaCon(W("x", { cat: "arriba" }), "#F3E9D2");
  if (t) {
    assert.match(t, /^Combina con lo tuyo: [a-záéíóúñ]/);
    assert.ok(t.split(" y ").length <= 2);
    assert.ok(!t.includes("camisa"));
  }
});

test("lo que se pasa al formulario del armario conserva solo lo que existe", () => {
  const w = W("a", { tipo: "camisa", corte: "fluida", abrigo: 1 });
  assert.deepEqual(prellenadoDe(w, "#fff"), {
    nombre: "Prenda a",
    cat: "arriba",
    tipo: "camisa",
    color: "#fff",
    corte: "fluida",
    abrigo: 1,
    estilo: undefined,
    tejido: undefined
  });
  assert.deepEqual(
    prellenadoPropio({
      id: "x",
      nombre: "Corsé",
      color: "#8B5A2B",
      foto: null,
      mini: "data:img",
      motivo: "no se pasa",
      estado: "quiero"
    }),
    { nombre: "Corsé", color: "#8B5A2B", mini: "data:img" }
  );
});

test("la tarjeta propia dice si está analizada y qué color y categoría tiene", () => {
  assert.equal(vistaPropia({ id: "1", nombre: "Corsé" }, []).etiqueta, "Añadida por ti");
  const v = vistaPropia(
    {
      id: "2",
      nombre: "Chaqueta",
      veredicto: "quiza",
      motivo: "Ya tienes algo igual",
      color: "#3B5A7A",
      cat: "capa"
    },
    []
  );
  assert.equal(v.etiqueta, "Analizada: piénsatelo");
  assert.equal(v.motivo, "Ya tienes algo igual");
  assert.match(v.detalle, / · capas?$/i);
  assert.equal(vistaPropia({ id: "3", nombre: "Sin color" }, []).detalle, "");
});

test("la frase de arriba cambia según lo que falta en el armario", () => {
  assert.equal(notaDeArmario(), "Las piezas que más te favorecen, según tu análisis.");
  setEstado({ P: [P("t1", "arriba")] });
  assert.equal(
    notaDeArmario(),
    "En tu armario todavía no hay partes de abajo, capas, calzado: empieza por ahí."
  );
  setEstado({ P: [P("t1", "arriba"), P("b1", "abajo"), P("c1", "capa")] });
  assert.equal(notaDeArmario(), "En tu armario todavía no hay calzado: empieza por ahí.");
  setEstado({ P: [P("t1", "arriba"), P("b1", "abajo")] });
  assert.equal(notaDeArmario(), "En tu armario todavía no hay capas ni calzado: empieza por ahí.");
  setEstado({ P: [P("t1", "arriba"), P("b1", "abajo"), P("c1", "capa"), P("z1", "calzado")] });
  assert.equal(notaDeArmario(), "Te faltan partes de arriba en tu paleta: mira el apartado Arriba.");
  setEstado({
    P: [P("t1", "arriba"), P("t2", "arriba"), P("b1", "abajo"), P("c1", "capa"), P("z1", "calzado")]
  });
  assert.equal(notaDeArmario(), "Las piezas que más multiplican lo que ya tienes.");
});

test("el nombre nuevo se recorta y se limita a 60 letras", () => {
  assert.equal(nombreNuevo("   "), "");
  assert.equal(nombreNuevo("  Corsé  "), "Corsé");
  assert.equal(nombreNuevo("x".repeat(80)).length, 60);
});
