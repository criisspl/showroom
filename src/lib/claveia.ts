// Clave de la IA de la persona: siempre cifrada en el navegador con su contraseña, con la cripto de
// cripto.ts (clave de datos aleatoria envuelta con PBKDF2). Nunca se guarda en claro, ni va en las
// copias (.armario.json), ni en ficheros ni en logs. Descifrada solo vive en memoria durante la sesión.

import type { Ajustes } from "./ai.ts";
import type { Almacen } from "./almacen.ts";
import { ajustesDeConfig, type Config } from "./config.ts";
import {
  cifra,
  derivaClave,
  descifraTexto,
  desenvuelve,
  envuelve,
  generaClaveDatos,
  ITERACIONES,
  nuevaSal
} from "./cripto.ts";

export const CLAVE_KV = "claveIA";
export const MIN_CONTRASENA = 8;

/** Lo que se guarda: todo en base64, sin la clave en claro. */
export interface ClaveCifrada {
  version: 1;
  iteraciones: number;
  sal: string;
  envuelta: string;
  cifrada: string;
}

type Kv = Pick<Almacen, "kget" | "kset">;

const aB64 = (b: Uint8Array): string => btoa(String.fromCharCode(...b));
const deB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function esClaveCifrada(x: unknown): x is ClaveCifrada {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.version === 1 &&
    typeof o.iteraciones === "number" &&
    typeof o.sal === "string" &&
    typeof o.envuelta === "string" &&
    typeof o.cifrada === "string"
  );
}

/** Mensaje si la contraseña no vale, o "". */
export const errorContrasena = (c: string): string =>
  c.length < MIN_CONTRASENA ? `La contraseña necesita al menos ${MIN_CONTRASENA} caracteres.` : "";

export async function cifraClave(clave: string, contrasena: string): Promise<ClaveCifrada> {
  const sal = nuevaSal();
  const datos = await generaClaveDatos();
  const kdf = await derivaClave(contrasena, sal, ITERACIONES);
  return {
    version: 1,
    iteraciones: ITERACIONES,
    sal: aB64(sal),
    envuelta: aB64(await envuelve(datos, kdf)),
    cifrada: aB64(await cifra(clave, datos))
  };
}

/** Lanza Error en español si la contraseña no es la correcta. */
export async function descifraClave(c: ClaveCifrada, contrasena: string): Promise<string> {
  const kdf = await derivaClave(contrasena, deB64(c.sal), c.iteraciones);
  const datos = await desenvuelve(deB64(c.envuelta), kdf);
  return descifraTexto(deB64(c.cifrada), datos);
}

export async function hayClaveCifrada(kv: Kv): Promise<boolean> {
  return esClaveCifrada(await kv.kget(CLAVE_KV));
}

/** Quita la clave en claro que dejaba la versión anterior en el kv 'ajustes'. */
async function limpiaClaveAntigua(kv: Kv): Promise<void> {
  const a = await kv.kget<Ajustes>("ajustes");
  if (a?.clave) await kv.kset("ajustes", { ...a, clave: "" });
}

/** Cifra y guarda la clave; después borra la antigua en claro. */
export async function guardaClave(kv: Kv, clave: string, contrasena: string): Promise<void> {
  await kv.kset(CLAVE_KV, await cifraClave(clave, contrasena));
  await limpiaClaveAntigua(kv);
}

/** Quita la clave guardada (cifrada y, si quedara, la antigua en claro). */
export async function quitaClave(kv: Kv): Promise<void> {
  await kv.kset(CLAVE_KV, null);
  await limpiaClaveAntigua(kv);
}

/** Descifra la clave guardada con la contraseña. Lanza Error si no hay clave o la contraseña falla. */
export async function desbloquea(kv: Kv, contrasena: string): Promise<string> {
  const c = await kv.kget(CLAVE_KV);
  if (!esClaveCifrada(c)) throw new Error("No hay ninguna clave guardada.");
  return descifraClave(c, contrasena);
}

/**
 * Ajustes de IA al arrancar. Con clave cifrada, queda bloqueada hasta que la persona ponga su contraseña;
 * sin ella, se usa la clave antigua en claro (si la hay) hasta que la proteja con una contraseña.
 */
export async function cargaAjustes(kv: Kv, config: Config): Promise<{ ajustes: Ajustes; cifrada: boolean }> {
  if (await hayClaveCifrada(kv)) {
    await limpiaClaveAntigua(kv);
    return { ajustes: ajustesDeConfig(config, { bloqueada: true }), cifrada: true };
  }
  const antiguo = await kv.kget<Ajustes>("ajustes");
  return { ajustes: ajustesDeConfig(config, { clave: antiguo?.clave || "" }), cifrada: false };
}
