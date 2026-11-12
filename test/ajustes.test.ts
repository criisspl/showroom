import { test } from "vitest";
import assert from "node:assert/strict";
import {
  alElegirProveedor,
  camposDeConfig,
  configDeCampos,
  errorCampos,
  estadoClave,
  mensajeConexion,
  mensajeGuardado,
  nombreCopia,
  opcionesAlmacen,
  opcionesProveedor,
  vistaProveedor
} from "../src/lib/ajustes.ts";
import { iaDeProveedor, sugerida } from "../src/lib/config.ts";
import { SUGERENCIAS } from "../src/lib/ia/sugerencias.ts";

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

test("un proveedor con clave enseña campos propios, su enlace y la URL editable", () => {
  const g = vistaProveedor("groq");
  assert.equal(g.propia, true);
  assert.equal(g.pideUrl, true);
  assert.match(g.enlaceClave, /^https:\/\//);
  assert.equal(vistaProveedor("otro").pideUrl, true);
});

test("los marcadores de posición tienen valor de reserva", () => {
  const o = vistaProveedor("otro");
  assert.equal(o.placeholderModelo, "nombre-del-modelo");
  assert.equal(o.placeholderUrl, "https://…/v1/chat/completions");
});

test("campos guardados: salen de la configuración y la clave nunca vuelve al formulario", () => {
  assert.deepEqual(camposDeConfig(sugerida()), {
    almacen: "indexeddb",
    proveedor: "integrada",
    modelo: "",
    url: "",
    clave: "",
    contrasena: ""
  });
  const g = camposDeConfig({ ...sugerida(), ia: iaDeProveedor("groq") });
  assert.equal(g.proveedor, "groq");
  assert.match(g.url, /^https:\/\/api\.groq\.com/);
  assert.equal(g.clave, "");
});

test("al elegir un proveedor se rellenan modelo y URL de partida, y la IA de la app no lleva URL", () => {
  assert.deepEqual(alElegirProveedor("mistral"), {
    proveedor: "mistral",
    modelo: "mistral-small-latest",
    url: "https://api.mistral.ai/v1/chat/completions"
  });
  assert.deepEqual(alElegirProveedor("integrada"), { proveedor: "integrada", modelo: "", url: "" });
  assert.equal(alElegirProveedor("no-existe").proveedor, "integrada");
});

test("al guardar se recortan espacios; con la URL vacía se usa la de partida", () => {
  const base = { almacen: "indexeddb" as const, clave: "", contrasena: "" };
  const c = configDeCampos({ ...base, proveedor: "otro", modelo: " m ", url: " https://x/v1 " });
  assert.deepEqual(c.ia, { tipo: "openai-compatible", proveedor: "otro", url: "https://x/v1", modelo: "m" });
  assert.equal(
    configDeCampos({ ...base, proveedor: "groq", modelo: "", url: "" }).ia.url,
    SUGERENCIAS.groq.url
  );
  assert.deepEqual(configDeCampos({ ...base, proveedor: "integrada", modelo: "x", url: "http://x" }).ia, {
    tipo: "integrada",
    proveedor: "integrada",
    url: "api/ia",
    modelo: ""
  });
});

test("no se guarda una URL que no sea https ni una clave sin contraseña", () => {
  const base = { almacen: "indexeddb" as const, proveedor: "otro", modelo: "m", clave: "k", contrasena: "" };
  assert.match(errorCampos({ ...base, url: "http://x/v1" }, ""), /https/);
  assert.match(errorCampos({ ...base, url: "" }, ""), /Falta la URL/);
  assert.match(errorCampos({ ...base, url: "https://x/v1" }, "k"), /al menos 8/);
  assert.equal(errorCampos({ ...base, url: "https://x/v1", contrasena: "12345678" }, "k"), "");
  assert.equal(errorCampos({ ...base, url: "https://x/v1" }, ""), "");
});

test("estado de la clave: ninguna, sin cifrar, bloqueada o desbloqueada", () => {
  assert.equal(estadoClave({}, false), "ninguna");
  assert.equal(estadoClave({ clave: "k" }, false), "sin-cifrar");
  assert.equal(estadoClave({ bloqueada: true }, true), "bloqueada");
  assert.equal(estadoClave({ clave: "k" }, true), "desbloqueada");
});

test("el selector de almacenamiento lista los adaptadores que hay", () => {
  assert.deepEqual(
    opcionesAlmacen().map((o) => o.id),
    ["indexeddb"]
  );
});

test("mensaje al guardar: avisa si falta la clave salvo con la IA de la app", () => {
  assert.equal(mensajeGuardado({ proveedor: "groq", clave: "" }), "Sin clave se usa la IA de la app.");
  assert.equal(mensajeGuardado({ proveedor: "groq", clave: "k" }), "Guardado.");
  assert.equal(mensajeGuardado({ proveedor: "integrada", clave: "" }), "Guardado.");
  assert.equal(mensajeGuardado({ proveedor: "groq", clave: "", bloqueada: true }), "Guardado.");
});

test("mensaje de conexión: nombra el modelo solo si lo hay", () => {
  assert.equal(mensajeConexion({}), "Conexión correcta.");
  assert.match(mensajeConexion({ proveedor: "groq", clave: "k", modelo: "mi-modelo" }), /con mi-modelo\.$/);
});

test("el archivo de la copia lleva la fecha", () => {
  assert.equal(nombreCopia(new Date("2026-11-10T12:00:00Z")), "copia-2026-11-10.armario.json");
});
