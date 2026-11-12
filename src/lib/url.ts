// Validación de destinos configurables: la clave y los datos solo salen hacia URLs https.

export function esUrlHttps(u: unknown): u is string {
  if (typeof u !== "string") return false;
  try {
    return new URL(u.trim()).protocol === "https:";
  } catch {
    return false;
  }
}
