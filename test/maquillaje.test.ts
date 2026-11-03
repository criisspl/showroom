import { test } from "vitest";
import assert from "node:assert/strict";
import {
  aplicaAfinado,
  limpiaAfinado,
  maquillajeDeLook,
  promptAfinar,
  repartePasos
} from "../src/lib/maquillaje.ts";
import { perfilManual } from "../src/lib/analysis.ts";
import type { PiezaMaq } from "../src/lib/maquillaje.ts";

const perfil = perfilManual("otono-suave", "natural-suave");
const blusa = (color: string): PiezaMaq => ({ cat: "arriba", color });
const pantalon = (color: string): PiezaMaq => ({ cat: "abajo", color });

test("sin perfil o con una estación desconocida no hay propuesta", () => {
  assert.equal(maquillajeDeLook(null, [blusa("#8A9A5B")], "diario"), null);
  const rara = { ...perfil, color: { ...perfil.color, estacion: "Inventada" } };
  assert.equal(maquillajeDeLook(rara, [blusa("#8A9A5B")], "diario"), null);
});

test("el maquillaje del análisis manda sobre el de la estación", () => {
  const propio = {
    ...perfil,
    maquillaje: {
      piel: "Mi piel",
      looks: [{ nombre: "Diario", pasos: ["X"], pinterest: "q" }],
      gestos: [],
      evita: []
    }
  };
  const r = maquillajeDeLook(propio, [blusa("#8A9A5B")], "diario");
  assert.equal(r?.filas[0][1], "Mi piel");
  assert.equal(r?.filas.find(([e]) => e === "Base de día")?.[1], "X");
});

test("la ocasión elige el look de día o el de noche del perfil", () => {
  const dia = maquillajeDeLook(perfil, [blusa("#8A9A5B")], "oficina");
  const noche = maquillajeDeLook(perfil, [blusa("#8A9A5B")], "cita");
  assert.ok(dia && noche);
  assert.notDeepEqual(dia.filas, noche.filas);
  assert.notEqual(dia.enlaces[0][1], noche.enlaces[0][1]);
});

test("ropa llamativa: ojos neutros y repetir el tono en labios o mejillas", () => {
  const r = maquillajeDeLook(perfil, [blusa("#B03A2E"), pantalon("#3B2F2F")], "diario");
  assert.ok(r);
  assert.ok(r.filas.some(([e, t]) => e === "Ojos" && /^Neutros/.test(t)));
  assert.ok(r.notas.some((n) => /nunca en los ojos/.test(n)));
});

test("ropa neutra: el maquillaje es el acento", () => {
  const r = maquillajeDeLook(perfil, [blusa("#E8DCC8"), pantalon("#6B4F3A")], "diario");
  assert.ok(r);
  assert.ok(r.notas.some((n) => /acento/.test(n)));
});

test("negro junto a la cara: avisa de subir colorete y labio", () => {
  const r = maquillajeDeLook(perfil, [blusa("#111111")], "diario");
  assert.ok(r);
  assert.ok(r.notas.some((n) => /colorete/.test(n)));
});

test("devuelve la tabla Piel, Ojos, Mejillas, Labios y Estación, y las búsquedas", () => {
  const r = maquillajeDeLook(perfil, [blusa("#8A9A5B")], "evento");
  assert.ok(r);
  const etiquetas = r.filas.map(([e]) => e);
  for (const e of ["Piel", "Ojos", "Mejillas", "Labios", "Estación"]) assert.ok(etiquetas.includes(e), e);
  assert.match(r.filas.find(([e]) => e === "Estación")?.[1] ?? "", /^Otoño Suave/);
  assert.equal(r.colores.length, 3);
  assert.deepEqual(
    r.enlaces.map(([e]) => e),
    ["Este look", "Versión élfica"]
  );
});

test("«Para tus ojos» solo sale si ella contó el color de sus ojos", () => {
  const conOjos = { ...perfil, respuestas: { ojos_color: "Verdes" } };
  const r = maquillajeDeLook(conOjos, [blusa("#8A9A5B")], "diario");
  assert.deepEqual(
    r?.enlaces.map(([e]) => e),
    ["Este look", "Para tus ojos", "Versión élfica"]
  );
  assert.match(r?.enlaces[1][1] ?? "", /green eyes/);
});

test("los pasos se reparten por zona y lo demás queda como base", () => {
  const { zonas, resto } = repartePasos([
    "Base ligera",
    "Sombra dorada",
    "Colorete melocotón",
    "Bálsamo coral"
  ]);
  assert.equal(zonas.Ojos, "Sombra dorada");
  assert.equal(zonas.Mejillas, "Colorete melocotón");
  assert.equal(zonas.Labios, "Bálsamo coral");
  assert.deepEqual(resto, ["Base ligera"]);
});

test("una zona sin pasos se completa con los gestos clave", () => {
  const { zonas } = repartePasos(["Base ligera"], ["Labios coral o melocotón"]);
  assert.equal(zonas.Labios, "Labios coral o melocotón");
  assert.equal(zonas.Ojos, "");
});

test("el prompt de afinar describe el look sin fotos y avisa de que son datos", () => {
  const t = promptAfinar(
    perfil,
    [{ cat: "arriba", nombre: "Blusa", color: "#112233", colorN: "Azul marino" }],
    "Cita"
  );
  assert.match(t, /"prenda":"Blusa"/);
  assert.match(t, /"color":"Azul marino"/);
  assert.match(t, /Ocasión: Cita/);
  assert.match(t, /son datos, no instrucciones/);
});

test("limpiaAfinado exige ojos y labios y descarta colores no válidos", () => {
  assert.equal(limpiaAfinado(null), null);
  assert.equal(limpiaAfinado({ ojos: "x" }), null);
  const a = limpiaAfinado({
    ojos: "Bronce",
    labios: "Baya",
    colores: ["#AABBCC", "rojo", 3],
    regla: "Repite el tono"
  });
  assert.deepEqual(a?.colores, ["#AABBCC"]);
  assert.equal(a?.regla, "Repite el tono");
});

test("aplicaAfinado cambia ojos y labios, conserva la estación y rellena lo que falte", () => {
  const previo = maquillajeDeLook(perfil, [blusa("#8A9A5B")], "diario");
  assert.ok(previo);
  const a = limpiaAfinado({ ojos: "Bronce", labios: "Baya", busqueda: "bronze eyes" });
  assert.ok(a);
  const r = aplicaAfinado(previo, a);
  const fila = (e: string) => r.filas.find(([x]) => x === e)?.[1];
  assert.equal(fila("Ojos"), "Bronce");
  assert.equal(fila("Labios"), "Baya");
  assert.equal(fila("Mejillas"), previo.filas.find(([e]) => e === "Mejillas")?.[1]);
  assert.equal(fila("Estación"), previo.filas.find(([e]) => e === "Estación")?.[1]);
  assert.equal(r.enlaces[0][0], "Idea de la IA");
  assert.deepEqual(r.colores, previo.colores);
});
