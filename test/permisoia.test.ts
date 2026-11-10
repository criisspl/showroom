import { test } from "vitest";
import assert from "node:assert/strict";
import { avisoEnvio, destinoIA, DATOS_PEDIR_IA, DATOS_SEGUNDA_OPINION } from "../src/lib/permisoia.ts";

test("sin clave propia nombra a Groq y a Mistral de reserva", () => {
  const d = destinoIA(null);
  assert.match(d, /Groq/);
  assert.match(d, /Mistral/);
  assert.match(d, /no guarda nada/);
});

test("con clave propia nombra solo al proveedor elegido", () => {
  assert.equal(destinoIA({ proveedor: "gemini", clave: "k" }), "Google Gemini");
});

test("un proveedor sin clave vuelve a la IA de la app", () => {
  assert.match(destinoIA({ proveedor: "groq" }), /Mistral/);
});

test("«otro» enseña el servidor configurado", () => {
  const d = destinoIA({ proveedor: "otro", clave: "k", url: "https://ia.ejemplo.org/v1/chat/completions" });
  assert.match(d, /ia\.ejemplo\.org/);
});

test("el aviso dice a quién y qué datos salen", () => {
  const a = avisoEnvio({ proveedor: "mistral", clave: "k" }, DATOS_SEGUNDA_OPINION);
  assert.match(a, /^Se enviarán a Mistral \(Francia\) la foto de la prenda/);
  assert.ok(a.endsWith("¿Los envío?"));
  assert.match(avisoEnvio(null, DATOS_PEDIR_IA), /notas de los outfits que has votado/);
});
