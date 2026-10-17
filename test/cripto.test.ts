import { test } from "vitest";
import assert from "node:assert/strict";
import {
  ITERACIONES,
  generaClaveDatos,
  derivaClave,
  nuevaSal,
  generaFrase,
  claveDeFrase,
  envuelve,
  desenvuelve,
  cifra,
  descifra,
  descifraTexto
} from "../src/lib/cripto.ts";

// Pocas iteraciones para que los tests vayan rápido
const IT = 1000;
const ERROR_DESCIFRAR = /No se pudo descifrar: contraseña incorrecta o datos dañados/;

test("ITERACIONES sigue la recomendación de OWASP", () => {
  assert.equal(ITERACIONES, 600_000);
});

test("nuevaSal da 16 bytes distintos cada vez", () => {
  const a = nuevaSal();
  const b = nuevaSal();
  assert.equal(a.length, 16);
  assert.notDeepEqual(a, b);
});

test("ida y vuelta de texto", async () => {
  const clave = await generaClaveDatos();
  const bytes = await cifra("Blusa de gasa · 🌿 ñ", clave);
  assert.equal(await descifraTexto(bytes, clave), "Blusa de gasa · 🌿 ñ");
});

test("ida y vuelta de binario", async () => {
  const clave = await generaClaveDatos();
  const datos = new Uint8Array([0, 1, 2, 250, 255, 128]);
  const bytes = await cifra(datos, clave);
  assert.deepEqual(await descifra(bytes, clave), datos);
});

test("el formato empieza por ARM y la versión 1", async () => {
  const clave = await generaClaveDatos();
  const bytes = await cifra("hola", clave);
  assert.deepEqual([...bytes.slice(0, 4)], [0x41, 0x52, 0x4d, 1]);
  // cabecera 4 + IV 12 + texto 4 + etiqueta 16
  assert.equal(bytes.length, 4 + 12 + 4 + 16);
});

test("dos cifrados del mismo texto dan bytes distintos", async () => {
  const clave = await generaClaveDatos();
  const a = await cifra("lo mismo", clave);
  const b = await cifra("lo mismo", clave);
  assert.notDeepEqual(a, b);
});

test("con otra clave no descifra", async () => {
  const bytes = await cifra("secreto", await generaClaveDatos());
  await assert.rejects(descifra(bytes, await generaClaveDatos()), ERROR_DESCIFRAR);
});

test("un byte manipulado hace fallar el descifrado", async () => {
  const clave = await generaClaveDatos();
  const bytes = await cifra("secreto", clave);
  for (const i of [5, bytes.length - 1]) {
    const roto = bytes.slice();
    roto[i] ^= 0x01;
    await assert.rejects(descifra(roto, clave), ERROR_DESCIFRAR);
  }
});

test("cabecera desconocida se rechaza", async () => {
  const clave = await generaClaveDatos();
  const bytes = await cifra("secreto", clave);
  const otro = bytes.slice();
  otro[0] = 0x58;
  await assert.rejects(descifra(otro, clave), /no son una copia cifrada de Armario/);
  await assert.rejects(descifra(new Uint8Array(3), clave), /no son una copia cifrada de Armario/);
});

test("versión no soportada se rechaza", async () => {
  const clave = await generaClaveDatos();
  const bytes = await cifra("secreto", clave);
  bytes[3] = 2;
  await assert.rejects(descifra(bytes, clave), /Versión de cifrado no soportada: 2/);
});

test("datos demasiado cortos se rechazan como dañados", async () => {
  const clave = await generaClaveDatos();
  const bytes = await cifra("x", clave);
  await assert.rejects(descifra(bytes.slice(0, 10), clave), ERROR_DESCIFRAR);
});

test("envolver con contraseña y desenvolver recupera la clave de datos", async () => {
  const sal = nuevaSal();
  const claveDatos = await generaClaveDatos();
  const cifrado = await cifra("armario", claveDatos);
  const envuelta = await envuelve(claveDatos, await derivaClave("buena", sal, IT));
  const recuperada = await desenvuelve(envuelta, await derivaClave("buena", sal, IT));
  assert.equal(await descifraTexto(cifrado, recuperada), "armario");
});

test("contraseña incorrecta no desenvuelve", async () => {
  const sal = nuevaSal();
  const envuelta = await envuelve(await generaClaveDatos(), await derivaClave("buena", sal, IT));
  await assert.rejects(desenvuelve(envuelta, await derivaClave("mala", sal, IT)), ERROR_DESCIFRAR);
});

test("la clave envuelta manipulada no desenvuelve", async () => {
  const sal = nuevaSal();
  const kek = await derivaClave("buena", sal, IT);
  const envuelta = await envuelve(await generaClaveDatos(), kek);
  envuelta[envuelta.length - 1] ^= 0x01;
  await assert.rejects(desenvuelve(envuelta, kek), ERROR_DESCIFRAR);
});

test("cambiar la contraseña no obliga a recifrar los datos", async () => {
  const sal = nuevaSal();
  const claveDatos = await generaClaveDatos();
  const cifrado = await cifra("mis prendas", claveDatos);
  const vieja = await envuelve(claveDatos, await derivaClave("vieja", sal, IT));

  // Cambio: desenvolver con la vieja y envolver con la nueva (sal nueva)
  const salNueva = nuevaSal();
  const abierta = await desenvuelve(vieja, await derivaClave("vieja", sal, IT));
  const nueva = await envuelve(abierta, await derivaClave("nueva", salNueva, IT));

  const conNueva = await desenvuelve(nueva, await derivaClave("nueva", salNueva, IT));
  assert.equal(await descifraTexto(cifrado, conNueva), "mis prendas");
  await assert.rejects(desenvuelve(nueva, await derivaClave("vieja", salNueva, IT)), ERROR_DESCIFRAR);
});

test("generaFrase: 7 bloques de 4 en base32 Crockford, distinta cada vez", () => {
  const f = generaFrase();
  assert.match(f, /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){6}$/);
  assert.notEqual(f, generaFrase());
});

test("recuperar con la frase, aunque se escriba en minúsculas y sin guiones", async () => {
  const sal = nuevaSal();
  const frase = generaFrase();
  const claveDatos = await generaClaveDatos();
  const cifrado = await cifra("recuperado", claveDatos);
  const envuelta = await envuelve(claveDatos, await claveDeFrase(frase, sal));

  const tecleada = ` ${frase.toLowerCase().replaceAll("-", "")} `;
  const recuperada = await desenvuelve(envuelta, await claveDeFrase(tecleada, sal));
  assert.equal(await descifraTexto(cifrado, recuperada), "recuperado");
});

test("la frase acepta las confusiones típicas de Crockford (O→0, I/L→1)", async () => {
  const sal = nuevaSal();
  const frase = "0000-1111-2222-3333-4444-5555-6666";
  const envuelta = await envuelve(await generaClaveDatos(), await claveDeFrase(frase, sal));
  await desenvuelve(envuelta, await claveDeFrase("OOOO-IIII-2222-3333-4444-5555-6666", sal));
  await desenvuelve(envuelta, await claveDeFrase("oooo-llll-2222-3333-4444-5555-6666", sal));
});

test("frase equivocada no recupera", async () => {
  const sal = nuevaSal();
  const envuelta = await envuelve(await generaClaveDatos(), await claveDeFrase(generaFrase(), sal));
  await assert.rejects(desenvuelve(envuelta, await claveDeFrase(generaFrase(), sal)), ERROR_DESCIFRAR);
});

test("frase mal formada se rechaza con error claro", async () => {
  await assert.rejects(claveDeFrase("hola", nuevaSal()), /Frase de recuperación no válida/);
  await assert.rejects(
    claveDeFrase("UUUU-1111-2222-3333-4444-5555-6666", nuevaSal()),
    /Frase de recuperación no válida/
  );
});
