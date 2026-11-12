// Registro de adaptadores de almacenamiento: cómo se abre cada `TipoAlmacen`. Cuando haya más proveedores
// (la nube, por ejemplo) se añaden aquí y en `ALMACENES` (config.ts); la migración y Ajustes ya los usan.

import type { Almacen } from "./almacen.ts";
import { ALMACENES } from "./config.ts";
import type { TipoAlmacen } from "./config.ts";
import { migraAlmacen } from "./migracion.ts";
import type { OpcionesMigracion, ResultadoMigracion } from "./migracion.ts";
import { creaStore } from "./store.ts";

const ABRIR: Record<TipoAlmacen, () => Promise<Almacen>> = {
  indexeddb: () => creaStore()
};

/** A qué almacenamientos se pueden copiar los datos desde el actual (todos menos él). */
export const destinosPosibles = (actual: TipoAlmacen): { id: TipoAlmacen; n: string }[] =>
  (Object.keys(ALMACENES) as TipoAlmacen[])
    .map((id) => ({ id, n: ALMACENES[id].n }))
    .filter((d) => d.id !== actual);

/** Abre el almacenamiento `destino` y copia a él todo lo de `origen`. */
export async function copiaAOtroAlmacen(
  origen: Almacen,
  destino: TipoAlmacen,
  opciones: OpcionesMigracion = {}
): Promise<ResultadoMigracion> {
  return migraAlmacen(origen, await ABRIR[destino](), opciones);
}

const FASES = {
  leyendo: "Leyendo tus datos…",
  "copia-previa": "Guardando una copia del destino…",
  escribiendo: "Copiando al destino (no se puede cancelar)…",
  verificando: "Comprobando que está todo…",
  terminado: "Terminado."
} as const;

/** Texto del progreso para la pantalla. */
export const textoFase = (fase: keyof typeof FASES, paso: number, pasos: number): string =>
  `${FASES[fase]} (${paso}/${pasos})`;

/** Texto del resultado para la pantalla. */
export const textoResultado = (r: ResultadoMigracion): string =>
  `Copiado: ${r.prendas} prendas, ${r.outfits} outfits, ${r.deseos} deseos, ${r.votos} votos, ${r.refs} referencias y ${r.fotos} fotos.` +
  " Tus datos de origen siguen donde estaban.";
