// Contrato del almacenamiento de datos de la persona. La interfaz (`Almacen`) no sabe dónde se guarda
// nada: hoy solo existe el adaptador de IndexedDB (store.ts); otros destinos implementarán lo mismo.

import type { Outfit, Prenda, Referencia, Voto } from "./tipos.ts";

/** Estado de una prenda de «Deseos» (las del perfil y las que añade la persona). */
export interface DeseoGuardado {
  id: string;
  estado?: string;
  cuando?: string;
  propio?: boolean;
  nombre?: string;
  foto?: string | null;
  mini?: string | null;
  [k: string]: unknown;
}
/** Lo que guarda cada colección. */
export interface Colecciones {
  prendas: Prenda;
  outfits: Outfit;
  deseos: DeseoGuardado;
  votos: Voto;
  refs: Referencia;
}
export type Coleccion = keyof Colecciones;
/** Copia de seguridad (.armario.json). */
export interface Copia {
  app: "armario";
  version: number;
  fecha: string;
  kv: Record<string, unknown>;
  fotos: Record<string, string>;
  prendas: Prenda[];
  outfits: Outfit[];
  deseos: DeseoGuardado[];
  votos: Voto[];
  /** Referencias de gusto (desde la versión 2). */
  refs?: Referencia[];
}

export interface Almacen {
  /** Se suscribe a una colección: recibe el array completo cada vez que cambia. */
  on<C extends Coleccion>(c: C, cb: (a: Colecciones[C][]) => void): Promise<void>;
  add<C extends Coleccion>(c: C, d: Omit<Colecciones[C], "id">): Promise<string>;
  set<C extends Coleccion>(c: C, id: string, d: Partial<Colecciones[C]>): Promise<void>;
  /** Mezcla `patch` con lo guardado (no pisa); si el id no existe, no hace nada. */
  update<C extends Coleccion>(c: C, id: string, patch: Partial<Colecciones[C]>): Promise<void>;
  del(c: Coleccion, id: string): Promise<void>;
  get<C extends Coleccion>(c: C, id: string): Promise<Colecciones[C] | undefined>;
  todos<C extends Coleccion>(c: C): Promise<Colecciones[C][]>;

  // Fotos
  putFoto(blob: Blob): Promise<string>;
  delFoto(id: string | null | undefined): Promise<void>;
  urlFoto(id: string | null | undefined): Promise<string | null>;
  blobFoto(id: string | null | undefined): Promise<Blob | null>;

  // Clave-valor (perfil, ajustes)
  kget<T = unknown>(k: string): Promise<T | undefined>;
  kset(k: string, v: unknown): Promise<void>;

  /** Copia de seguridad completa en JSON (las fotos van en base64). */
  exporta(): Promise<Copia>;
  /** La misma copia que `exporta()` ya serializada, idéntica byte a byte a `JSON.stringify(await exporta())`. */
  exportaBlob(): Promise<Blob>;
  importa(data: Copia, opciones?: { reemplazar?: boolean }): Promise<void>;
  borraTodo(): Promise<void>;
}
