import { test } from "vitest";
import assert from "node:assert/strict";
import {
  OCASION_EN,
  busquedasInspo,
  coloresPelo,
  estacionDelMes,
  ficha,
  hexDeCambio,
  textoAnalisisIA
} from "../src/lib/analisis.ts";
import { OCAS } from "../src/data/constants.ts";
import type { Perfil } from "../src/lib/tipos.ts";

const perfil = (parte: Partial<Perfil>): Perfil => parte as Perfil;

test("toda ocasión de la app tiene su texto en inglés para Pinterest", () => {
  for (const o of OCAS) assert.ok(OCASION_EN[o.id], o.id);
});

test("la estación por defecto sigue el mes", () => {
  assert.equal(estacionDelMes(0), "winter");
  assert.equal(estacionDelMes(3), "spring");
  assert.equal(estacionDelMes(6), "summer");
  assert.equal(estacionDelMes(9), "autumn");
  assert.equal(estacionDelMes(11), "winter");
});

test("la ficha solo incluye los datos que existen", () => {
  const p = perfil({
    color: { estacion: "Verano Suave", subtono: "frío" } as Perfil["color"],
    cuerpo: { tipo: "Reloj de arena" } as Perfil["cuerpo"],
    rostro: null,
    estetica: { nombre: "Clásico" } as Perfil["estetica"]
  });
  assert.deepEqual(ficha(p), [
    ["Color", "Verano Suave, frío"],
    ["Cuerpo", "Reloj de arena"],
    ["Estética", "Clásico"]
  ]);
  assert.deepEqual(ficha(perfil({})), []);
});

test("el aviso de análisis con IA cambia según el origen", () => {
  assert.match(textoAnalisisIA("local"), /hecho en tu móvil/);
  assert.match(textoAnalisisIA("rapido"), /Has empezado con tu estación/);
});

test("el color de cambio sale de la paleta o los neutros; si no, transparente", () => {
  const c = {
    paleta: [{ n: "Rosa", hex: "#f0a" }],
    neutros: [{ n: "Gris", hex: "#888" }]
  };
  assert.equal(hexDeCambio(c, { n: "Naranja", hex: "#f60", cambio: "Rosa" }), "#f0a");
  assert.equal(hexDeCambio(c, { n: "Naranja", hex: "#f60", cambio: "Gris" }), "#888");
  assert.equal(hexDeCambio(c, { n: "Naranja", hex: "#f60", cambio: "Nada" }), "transparent");
  assert.equal(hexDeCambio({}, { n: "Naranja", hex: "#f60" }), "transparent");
});

test("los colores de pelo sin hex se descartan", () => {
  assert.deepEqual(
    coloresPelo([
      { nombre: "Castaño", hex: "#431" },
      { nombre: "Raro", hex: "" }
    ]),
    [{ n: "Castaño", hex: "#431" }]
  );
});

test("las búsquedas de inspo usan estética, ocasión, estación y colores", () => {
  const p = perfil({
    color: {
      estacion: "Verano Suave",
      paleta: [
        { n: "Rosa", hex: "#f0a" },
        { n: "Azul", hex: "#00f" },
        { n: "Verde", hex: "#0f0" }
      ]
    } as Perfil["color"],
    estetica: { nombre: "Clásico", claves: ["quiet", "luxury", "x"] } as Perfil["estetica"]
  });
  assert.deepEqual(busquedasInspo(p, "winter", "cita"), [
    ["quiet luxury date night winter outfit", "Outfits"],
    ["date night winter outfit Rosa Azul", "En tus colores"],
    ["Verano Suave makeup date night", "Maquillaje"]
  ]);
});

test("sin estética ni ocasión las búsquedas no dejan espacios sobrantes", () => {
  const r = busquedasInspo(perfil({}), "summer", null);
  assert.equal(r[0][0], "summer outfit");
  assert.equal(r[2][0], "makeup");
});
