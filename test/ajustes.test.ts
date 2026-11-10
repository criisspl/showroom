import { test } from "vitest";
import assert from "node:assert/strict";
import {
  ajustesDeCampos,
  camposDeAjustes,
  mensajeConexion,
  mensajeGuardado,
  nombreCopia,
  opcionesProveedor,
  vistaProveedor
} from "../src/lib/ajustes.ts";

test("el desplegable lista todos los proveedores, con la IA de la app primero", () => {
  const o = opcionesProveedor();
  assert.equal(o[0].id, "integrada");
  assert.ok(o.some((p) => p.id === "otro"));
});

test("la IA de la app no enseña campos propios ni enlace de clave", () => {
  const v = vistaProveedor("integrada");
  assert.equal(v.propia, false);
  assert.equal(v.pideUrl, false);
  assert.equal(v.enlaceClave, "");
  assert.match(v.nota, /la app ya trae la IA/);
});

test("un proveedor con clave enseña campos propios y su enlace; solo «otro» pide URL", () => {
  const g = vistaProveedor("groq");
  assert.equal(g.propia, true);
  assert.equal(g.pideUrl, false);
  assert.match(g.enlaceClave, /^https:\/\//);
  assert.equal(vistaProveedor("otro").pideUrl, true);
});

test("los marcadores de posición tienen valor de reserva", () => {
  const o = vistaProveedor("otro");
  assert.equal(o.placeholderModelo, "nombre-del-modelo");
  assert.equal(o.placeholderUrl, "https://…/v1/chat/completions");
});

test("campos guardados: sin ajustes sale la IA de la app y sin clave se vuelve a ella", () => {
  assert.deepEqual(camposDeAjustes({}), { proveedor: "integrada", modelo: "", url: "", clave: "" });
  assert.equal(camposDeAjustes({ proveedor: "groq" }).proveedor, "integrada");
  assert.equal(camposDeAjustes({ proveedor: "groq", clave: "k", modelo: "m" }).proveedor, "groq");
});

test("al guardar se recortan espacios y solo «otro» conserva la URL", () => {
  assert.deepEqual(ajustesDeCampos({ proveedor: "groq", modelo: " m ", url: " https://x ", clave: " k " }), {
    proveedor: "groq",
    modelo: "m",
    url: "",
    clave: "k"
  });
  assert.equal(
    ajustesDeCampos({ proveedor: "otro", modelo: "", url: " https://x/v1 ", clave: "k" }).url,
    "https://x/v1"
  );
});

test("mensaje al guardar: avisa si falta la clave salvo con la IA de la app", () => {
  assert.equal(mensajeGuardado({ proveedor: "groq", clave: "" }), "Sin clave se usa la IA de la app.");
  assert.equal(mensajeGuardado({ proveedor: "groq", clave: "k" }), "Guardado.");
  assert.equal(mensajeGuardado({ proveedor: "integrada", clave: "" }), "Guardado.");
});

test("mensaje de conexión: nombra el modelo solo si lo hay", () => {
  assert.equal(mensajeConexion({}), "Conexión correcta.");
  assert.match(mensajeConexion({ proveedor: "groq", clave: "k", modelo: "mi-modelo" }), /con mi-modelo\.$/);
});

test("el archivo de la copia lleva la fecha", () => {
  assert.equal(nombreCopia(new Date("2026-11-10T12:00:00Z")), "copia-2026-11-10.armario.json");
});
