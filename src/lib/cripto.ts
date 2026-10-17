// Cifrado en el dispositivo (base para una futura copia en la nube), solo con Web Crypto.
// Esquema: una clave de datos aleatoria cifra todo; esa clave se guarda envuelta con una
// clave derivada de la contraseña (PBKDF2) o de la frase de recuperación (HKDF). Así,
// cambiar la contraseña solo reenvuelve la clave de datos, sin recifrar los datos.
//
// Formato binario de cifra() y envuelve(): "ARM" + versión (1 byte) + IV (12) + cifrado.
// La cabecera va como datos adicionales autenticados (AAD) de AES-GCM.

const subtle = globalThis.crypto.subtle;

/** Iteraciones de PBKDF2-SHA256 (recomendación OWASP). */
export const ITERACIONES = 600_000;

const MAGICO = [0x41, 0x52, 0x4d]; // "ARM"
const VERSION = 1;
const LARGO_CABECERA = MAGICO.length + 1;
const LARGO_IV = 12;
const LARGO_ETIQUETA = 16;

const ERROR_DESCIFRAR = "No se pudo descifrar: contraseña incorrecta o datos dañados";

// Base32 de Crockford: sin I, L, O ni U para que no se confundan al teclear
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const BLOQUES_FRASE = 7;
const LARGO_BLOQUE = 4;
const INFO_FRASE = new TextEncoder().encode("armario-frase-v1");

const AES = { name: "AES-GCM", length: 256 } as const;

const aleatorios = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));

/** Clave AES-GCM 256 aleatoria para los datos (extraíble solo para poder envolverla). */
export function generaClaveDatos(): Promise<CryptoKey> {
  return subtle.generateKey(AES, true, ["encrypt", "decrypt"]);
}

/** Sal aleatoria de 16 bytes para derivaClave() o claveDeFrase(). */
export function nuevaSal(): Uint8Array<ArrayBuffer> {
  return aleatorios(16);
}

/** Clave para envolver derivada de la contraseña con PBKDF2-SHA256. */
export async function derivaClave(
  contraseña: string,
  sal: Uint8Array,
  iteraciones = ITERACIONES
): Promise<CryptoKey> {
  const base = await subtle.importKey("raw", new TextEncoder().encode(contraseña), "PBKDF2", false, [
    "deriveKey"
  ]);
  return subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(sal), iterations: iteraciones },
    base,
    AES,
    false,
    ["wrapKey", "unwrapKey"]
  );
}

/** Frase de recuperación: 28 caracteres base32 Crockford (140 bits) en bloques de 4. */
export function generaFrase(): string {
  const letras = [...aleatorios(BLOQUES_FRASE * LARGO_BLOQUE)].map((b) => CROCKFORD[b & 31]);
  const bloques: string[] = [];
  for (let i = 0; i < letras.length; i += LARGO_BLOQUE) {
    bloques.push(letras.slice(i, i + LARGO_BLOQUE).join(""));
  }
  return bloques.join("-");
}

// Mayúsculas, sin espacios ni guiones, y O→0, I/L→1 como manda Crockford
function normalizaFrase(frase: string): string {
  const limpia = frase.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  const valida =
    limpia.length === BLOQUES_FRASE * LARGO_BLOQUE && [...limpia].every((c) => CROCKFORD.includes(c));
  if (!valida) throw new Error("Frase de recuperación no válida");
  return limpia;
}

/** Clave para envolver derivada de la frase de recuperación (alta entropía: basta HKDF-SHA256). */
export async function claveDeFrase(frase: string, sal: Uint8Array): Promise<CryptoKey> {
  const base = await subtle.importKey("raw", new TextEncoder().encode(normalizaFrase(frase)), "HKDF", false, [
    "deriveKey"
  ]);
  return subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(sal), info: INFO_FRASE },
    base,
    AES,
    false,
    ["wrapKey", "unwrapKey"]
  );
}

function cabecera(): Uint8Array<ArrayBuffer> {
  return new Uint8Array([...MAGICO, VERSION]);
}

function junta(cab: Uint8Array, iv: Uint8Array, cuerpo: ArrayBuffer): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(cab.length + iv.length + cuerpo.byteLength);
  out.set(cab);
  out.set(iv, cab.length);
  out.set(new Uint8Array(cuerpo), cab.length + iv.length);
  return out;
}

// Comprueba la cabecera y separa sus partes; copia para tener ArrayBuffer propio
function separa(bytes: Uint8Array) {
  if (bytes.length < LARGO_CABECERA || MAGICO.some((b, i) => bytes[i] !== b)) {
    throw new Error("Estos datos no son una copia cifrada de Armario");
  }
  const version = bytes[MAGICO.length];
  if (version !== VERSION) throw new Error(`Versión de cifrado no soportada: ${version}`);
  if (bytes.length < LARGO_CABECERA + LARGO_IV + LARGO_ETIQUETA) throw new Error(ERROR_DESCIFRAR);
  return {
    cab: bytes.slice(0, LARGO_CABECERA),
    iv: bytes.slice(LARGO_CABECERA, LARGO_CABECERA + LARGO_IV),
    cuerpo: bytes.slice(LARGO_CABECERA + LARGO_IV)
  };
}

// Web Crypto falla con un OperationError opaco: lo traducimos a algo comprensible
async function traduceError<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch {
    throw new Error(ERROR_DESCIFRAR);
  }
}

/** Envuelve la clave de datos; devuelve bytes autocontenidos (cabecera + IV + clave cifrada). */
export async function envuelve(
  claveDatos: CryptoKey,
  claveEnvoltura: CryptoKey
): Promise<Uint8Array<ArrayBuffer>> {
  const cab = cabecera();
  const iv = aleatorios(LARGO_IV);
  const envuelta = await subtle.wrapKey("raw", claveDatos, claveEnvoltura, {
    name: "AES-GCM",
    iv,
    additionalData: cab
  });
  return junta(cab, iv, envuelta);
}

/** Recupera la clave de datos (extraíble, para poder reenvolverla al cambiar la contraseña). */
export async function desenvuelve(bytes: Uint8Array, claveEnvoltura: CryptoKey): Promise<CryptoKey> {
  const { cab, iv, cuerpo } = separa(bytes);
  return traduceError(
    subtle.unwrapKey("raw", cuerpo, claveEnvoltura, { name: "AES-GCM", iv, additionalData: cab }, AES, true, [
      "encrypt",
      "decrypt"
    ])
  );
}

/** Cifra texto o bytes con la clave de datos. */
export async function cifra(datos: Uint8Array | string, clave: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const plano = typeof datos === "string" ? new TextEncoder().encode(datos) : new Uint8Array(datos);
  const cab = cabecera();
  const iv = aleatorios(LARGO_IV);
  const cifrado = await subtle.encrypt({ name: "AES-GCM", iv, additionalData: cab }, clave, plano);
  return junta(cab, iv, cifrado);
}

/** Descifra bytes producidos por cifra(). */
export async function descifra(bytes: Uint8Array, clave: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const { cab, iv, cuerpo } = separa(bytes);
  const plano = await traduceError(
    subtle.decrypt({ name: "AES-GCM", iv, additionalData: cab }, clave, cuerpo)
  );
  return new Uint8Array(plano);
}

/** Descifra bytes producidos por cifra() con un texto. */
export async function descifraTexto(bytes: Uint8Array, clave: CryptoKey): Promise<string> {
  return new TextDecoder().decode(await descifra(bytes, clave));
}
