import { test } from "vitest";
import assert from "node:assert/strict";
import { PREGUNTAS } from "../src/lib/analysis.ts";
import {
  PASOS,
  colorCss,
  medianaRgb,
  mensajeFalta,
  opcionesCuerpo,
  opcionesEstacion,
  respuestasDe,
  tamanoSelfie,
  textoPaso,
  zonaDe
} from "../src/lib/bienvenida.ts";

test("el marcado va en orden y solo el blanco es opcional", () => {
  assert.deepEqual(
    PASOS.map((p) => p.id),
    ["piel", "ojos", "pelo", "blanco"]
  );
  assert.deepEqual(
    PASOS.map((p) => !!p.opc),
    [false, false, false, true]
  );
  assert.match(textoPaso(0), /mejilla/);
  assert.match(textoPaso(PASOS.length), /Listo/);
});

test("el selfie se reduce a 900 px de lado mayor y no se amplía", () => {
  assert.deepEqual(tamanoSelfie(1800, 900), { w: 900, h: 450 });
  assert.deepEqual(tamanoSelfie(600, 800), { w: 600, h: 800 });
});

test("la zona a medir no se sale de la foto y tiene un radio mínimo", () => {
  const z = zonaDe(100, 200, 0, 0, 0.006);
  assert.equal(z.rad, 2);
  assert.equal(z.x0, 0);
  assert.equal(z.y0, 0);
  assert.equal(z.w, 2);
  assert.equal(z.h, 2);
  const c = zonaDe(100, 200, 0.5, 0.5, 0.1);
  assert.deepEqual([c.cx, c.cy, c.rad, c.x0, c.y0, c.w, c.h], [50, 100, 10, 40, 90, 20, 20]);
});

test("el color de una zona es la mediana de cada canal y ignora lo que cae fuera del círculo", () => {
  const z = zonaDe(10, 10, 0.5, 0.5, 0.2);
  const datos = new Uint8ClampedArray(z.w * z.h * 4);
  for (let i = 0; i < datos.length; i += 4) {
    datos[i] = 100;
    datos[i + 1] = 150;
    datos[i + 2] = 200;
    datos[i + 3] = 255;
  }
  // Una esquina (fuera del círculo) con un color distinto no cuenta
  datos[0] = 0;
  datos[1] = 0;
  datos[2] = 0;
  assert.deepEqual(medianaRgb(datos, z), [100, 150, 200]);
  assert.deepEqual(medianaRgb([], z), [0, 0, 0]);
  assert.equal(colorCss([1, 2, 3]), "rgb(1,2,3)");
});

test("las respuestas descartan lo vacío, recortan el texto y ordenan las de varias", () => {
  const texto = { ojos_color: " Verdes ", pelo_color: "  ", altura: "170" };
  const r = respuestasDe(PREGUNTAS, texto, { estetica: ["vintage", "natural"] });
  assert.deepEqual(r, { ojos_color: "Verdes", altura: "170", estetica: ["natural", "vintage"] });
  assert.deepEqual(respuestasDe(PREGUNTAS, {}, { estetica: [] }), {});
});

test("avisa de lo que falta para el análisis en el móvil", () => {
  assert.equal(
    mensajeFalta({}, {}),
    "Me falta tu selfie (o al menos las venas y las joyas), el color de tus ojos y de tu pelo, cómo es tu cuerpo."
  );
  assert.equal(
    mensajeFalta({ piel: [200, 160, 140] }, { ojos_color: "a", pelo_color: "b", estructura: "c" }),
    ""
  );
  assert.equal(
    mensajeFalta({}, { venas: "a", joyas: "b", ojos_color: "a", pelo_color: "b", estructura: "c" }),
    ""
  );
});

test("las estaciones y los tipos de cuerpo salen de los presets", () => {
  assert.ok(opcionesEstacion().some((e) => e.n === "Verano Suave"));
  assert.ok(opcionesCuerpo().some((c) => c.n === "Clásico Suave"));
});
