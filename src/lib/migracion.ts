// Migración entre almacenamientos: copia todo (colecciones, fotos, perfil y ajustes) de un `Almacen` a otro.
// El origen solo se lee, así que nunca queda a medias. Al destino solo llega lo que ya salía en una copia de
// seguridad (sin clave de IA ni configuración del dispositivo), en la misma forma que `exporta()`.
// Genérico: sirve para cualquier pareja de adaptadores del contrato.

import type { Almacen, Coleccion, Copia } from "./almacen.ts";
import { VERSION, migraCopia, validaCopia } from "./store.ts";

const COLS: Coleccion[] = ["prendas", "outfits", "deseos", "votos", "refs"];
/** Claves del kv que son de cada dispositivo y nunca viajan: la configuración y la clave de IA cifrada. */
const KV_LOCAL = ["config", "claveIA"];
/** Tope de fotos (suma del texto base64) y de documentos por colección. */
export const LIMITE_FOTOS_BYTES = 500 * 1024 * 1024;
export const LIMITE_DOCS = 50_000;

export type Fase = "leyendo" | "copia-previa" | "escribiendo" | "verificando" | "terminado";
export interface Progreso {
  fase: Fase;
  /** Paso actual (1..pasos). */
  paso: number;
  pasos: number;
}

export type CodigoError =
  | "cancelada"
  | "fallo-origen"
  | "copia-invalida"
  | "destino-no-vacio"
  | "sin-copia-previa"
  | "fallo-destino"
  | "verificacion";

/** El origen no se modifica en ninguno de estos casos; `destinoRestaurado` dice si el destino volvió a como estaba. */
export class ErrorMigracion extends Error {
  constructor(
    readonly codigo: CodigoError,
    mensaje: string,
    /** null: no se llegó a escribir en el destino. */
    readonly destinoRestaurado: boolean | null = null
  ) {
    super(mensaje);
    this.name = "ErrorMigracion";
  }
}

export interface OpcionesMigracion {
  /** Permite sobrescribir un destino que ya tiene datos. Exige `copiaPrevia`. */
  reemplazar?: boolean;
  /** Recibe la copia del destino antes de sobrescribirlo (p. ej. para descargarla). Si falla, no se toca el destino. */
  copiaPrevia?: (copia: Copia) => void | Promise<void>;
  alProgreso?: (p: Progreso) => void;
  /** Se atiende antes de escribir; una vez empezada la escritura no se puede cancelar. */
  senal?: AbortSignal;
}

export interface ResultadoMigracion {
  prendas: number;
  outfits: number;
  deseos: number;
  votos: number;
  refs: number;
  fotos: number;
  /** Había datos en el destino y se hizo copia previa. */
  sobrescrito: boolean;
}

const INTACTO = " Tus datos de origen siguen intactos.";

/** Copia lista para viajar: sin la configuración del dispositivo y sin clave de IA, pase lo que pase en el adaptador. */
function limpia(c: Copia): Copia {
  const kv: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(c.kv ?? {})) {
    if (KV_LOCAL.includes(k)) continue;
    kv[k] = k === "ajustes" && v && typeof v === "object" ? { ...(v as object), clave: "" } : v;
  }
  return { ...c, kv };
}

/** Formato, versión y tamaño de lo que sale del origen; lanza si algo no cuadra. No toca ningún almacén. */
function revisa(c: Copia): Copia {
  if (!c || c.app !== "armario")
    throw new ErrorMigracion("copia-invalida", "Los datos de origen no son válidos." + INTACTO);
  if (!Number.isInteger(c.version) || c.version < 1)
    throw new ErrorMigracion("copia-invalida", "Los datos de origen no tienen una versión válida." + INTACTO);
  if (c.version > VERSION)
    throw new ErrorMigracion(
      "copia-invalida",
      "Los datos de origen son de una versión más nueva de la app: actualízala y vuelve a probar." + INTACTO
    );
  const copia = limpia(c.version < VERSION ? migraCopia(c) : c);
  for (const col of COLS) {
    const lista = copia[col] ?? [];
    if (Array.isArray(lista) && lista.length > LIMITE_DOCS)
      throw new ErrorMigracion("copia-invalida", "Hay demasiados datos para migrar de una vez." + INTACTO);
  }
  const fotos = copia.fotos && typeof copia.fotos === "object" ? Object.values(copia.fotos) : [];
  let bytes = 0;
  for (const f of fotos) bytes += typeof f === "string" ? f.length : 0;
  if (bytes > LIMITE_FOTOS_BYTES)
    throw new ErrorMigracion("copia-invalida", "Las fotos pesan demasiado para migrar de una vez." + INTACTO);
  try {
    validaCopia(copia);
  } catch (e) {
    throw new ErrorMigracion("copia-invalida", (e instanceof Error ? e.message : "") + INTACTO);
  }
  return copia;
}

async function estaVacio(a: Almacen): Promise<boolean> {
  for (const c of COLS) if ((await a.todos(c)).length > 0) return false;
  return (await a.kget("perfil")) === undefined && (await a.kget("ajustes")) === undefined;
}

const ids = (l: { id: string }[] | undefined) => (l ?? []).map((d) => d.id).sort();
const mismos = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Comprueba que el destino tiene lo mismo que se envió (mismos ids, mismas fotos, mismas claves). */
function coincide(enviado: Copia, leido: Copia): boolean {
  for (const c of COLS) if (!mismos(ids(enviado[c]), ids(leido[c]))) return false;
  if (!mismos(Object.keys(enviado.fotos ?? {}).sort(), Object.keys(leido.fotos ?? {}).sort())) return false;
  return Object.keys(enviado.kv ?? {}).every((k) => k in (leido.kv ?? {}));
}

/** Vuelve a dejar el destino como estaba. true si lo consigue. */
async function restaura(destino: Almacen, previa: Copia | null): Promise<boolean> {
  try {
    if (previa) await destino.importa(previa, { reemplazar: true });
    else await destino.borraTodo();
    return true;
  } catch {
    return false;
  }
}

/**
 * Copia todo de `origen` a `destino`. El origen solo se lee. Un destino con datos no se toca sin
 * `reemplazar` y una `copiaPrevia` que se haya podido entregar. Si la escritura o la verificación fallan,
 * se intenta devolver el destino a como estaba y el error lo cuenta.
 */
export async function migraAlmacen(
  origen: Almacen,
  destino: Almacen,
  { reemplazar = false, copiaPrevia, alProgreso, senal }: OpcionesMigracion = {}
): Promise<ResultadoMigracion> {
  const pasos = 4;
  const avisa = (fase: Fase, paso: number) => alProgreso?.({ fase, paso, pasos });
  const sinCancelar = () => {
    if (senal?.aborted)
      throw new ErrorMigracion("cancelada", "Migración cancelada. No se ha cambiado nada." + INTACTO);
  };

  sinCancelar();
  avisa("leyendo", 1);
  let leida: Copia;
  try {
    leida = await origen.exporta();
  } catch {
    throw new ErrorMigracion("fallo-origen", "No he podido leer los datos de origen." + INTACTO);
  }
  const copia = revisa(leida);

  let previa: Copia | null = null;
  let vacio: boolean;
  try {
    vacio = await estaVacio(destino);
  } catch {
    throw new ErrorMigracion(
      "fallo-destino",
      "No he podido comprobar el destino. No se ha cambiado nada." + INTACTO
    );
  }
  if (!vacio) {
    if (!reemplazar)
      throw new ErrorMigracion(
        "destino-no-vacio",
        "El destino ya tiene datos. Confirma que quieres reemplazarlos para continuar." + INTACTO
      );
    if (!copiaPrevia)
      throw new ErrorMigracion(
        "sin-copia-previa",
        "No se reemplaza un destino con datos sin guardar antes una copia suya." + INTACTO
      );
    sinCancelar();
    avisa("copia-previa", 2);
    try {
      previa = await destino.exporta();
      await copiaPrevia(previa);
    } catch {
      throw new ErrorMigracion(
        "sin-copia-previa",
        "No he podido guardar la copia previa del destino, así que no lo he tocado." + INTACTO
      );
    }
  }

  sinCancelar();
  avisa("escribiendo", 3);
  try {
    await destino.importa(copia, { reemplazar: true });
  } catch {
    const ok = await restaura(destino, previa);
    throw new ErrorMigracion(
      "fallo-destino",
      "No he podido escribir en el destino." +
        (ok
          ? " Lo he dejado como estaba."
          : " Puede haber quedado a medias: restáuralo con la copia previa que se guardó.") +
        INTACTO,
      ok
    );
  }

  avisa("verificando", 4);
  let correcto = false;
  try {
    correcto = coincide(copia, await destino.exporta());
  } catch {
    correcto = false;
  }
  if (!correcto) {
    const ok = await restaura(destino, previa);
    throw new ErrorMigracion(
      "verificacion",
      "Lo escrito en el destino no coincide con el origen." +
        (ok
          ? " Lo he dejado como estaba."
          : " Puede haber quedado a medias: restáuralo con la copia previa.") +
        INTACTO,
      ok
    );
  }
  avisa("terminado", pasos);
  return {
    prendas: (copia.prendas ?? []).length,
    outfits: (copia.outfits ?? []).length,
    deseos: (copia.deseos ?? []).length,
    votos: (copia.votos ?? []).length,
    refs: (copia.refs ?? []).length,
    fotos: Object.keys(copia.fotos ?? {}).length,
    sobrescrito: previa !== null
  };
}
