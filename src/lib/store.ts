// Almacenamiento local en IndexedDB. Todo se queda en el navegador de cada persona.
// Colecciones de documentos con suscripción (on), fotos como Blob y un pequeño almacén clave-valor.

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
type Almacen = Coleccion | "fotos" | "kv";
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

const DB_NAME = "armario";
const COLS: Coleccion[] = ["prendas", "outfits", "deseos", "votos", "refs"];
/**
 * Migraciones del esquema, en orden: la de índice i lleva de la versión i a la i+1.
 * Solo se añaden al final; nunca se cambia una que ya esté publicada.
 */
const migraciones: ((db: IDBDatabase, tx: IDBTransaction) => void)[] = [
  // 0 → 1: esquema inicial. Crea solo lo que falte, por si la base ya existía.
  (db) => {
    ["prendas", "outfits", "deseos", "votos"].forEach((c) => {
      if (!db.objectStoreNames.contains(c)) db.createObjectStore(c, { keyPath: "id" });
    });
    if (!db.objectStoreNames.contains("fotos")) db.createObjectStore("fotos");
    if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
  },
  // 1 → 2: referencias de gusto. Los datos que ya había no se tocan.
  (db) => {
    if (!db.objectStoreNames.contains("refs")) db.createObjectStore("refs", { keyPath: "id" });
  }
];
/** Versión del esquema: la de la base de datos y la que lleva la copia de seguridad. */
export const VERSION = migraciones.length;

/** Pone al día una copia antigua (version < VERSION). */
function migraCopia(data: Copia): Copia {
  // v1 → v2: las copias antiguas no traen referencias de gusto
  if (data.version < 2) data = { ...data, refs: data.refs || [], version: 2 };
  return data;
}

const FOTO_PERMITIDA = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]*={0,2})$/;
const esObjeto = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const invalida = () => new Error("La copia está dañada o no es válida: no se ha importado nada.");

/**
 * Comprueba la copia entera y decodifica las fotos sin red (solo data:image/jpeg|png|webp).
 * Lanza si algo no cuadra; no toca la base de datos.
 */
function validaCopia(data: Copia) {
  const docs = {} as { [C in Coleccion]: Colecciones[C][] };
  for (const c of COLS) {
    const lista: unknown = data[c] ?? [];
    if (!Array.isArray(lista)) throw invalida();
    for (const d of lista) if (!esObjeto(d) || typeof d.id !== "string" || !d.id) throw invalida();
    (docs as Record<Coleccion, unknown[]>)[c] = lista;
  }
  const rawFotos: unknown = data.fotos ?? {};
  if (!esObjeto(rawFotos)) throw invalida();
  const fotos: [string, Blob][] = [];
  for (const [id, url] of Object.entries(rawFotos)) {
    const m = typeof url === "string" ? FOTO_PERMITIDA.exec(url) : null;
    if (!m) throw new Error("La copia lleva una foto que no es una imagen JPEG, PNG o WebP incrustada.");
    let bin: string;
    try {
      bin = atob(m[2]);
    } catch (e) {
      throw invalida();
    }
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    fotos.push([id, new Blob([bytes], { type: m[1] })]);
  }
  const kv: Record<string, unknown> = {};
  const rawKv: unknown = data.kv ?? {};
  if (!esObjeto(rawKv)) throw invalida();
  for (const [k, v] of Object.entries(rawKv)) {
    if (k === "ajustes" && !esObjeto(v)) throw invalida();
    kv[k] = v;
  }
  return { docs, fotos, kv };
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onupgradeneeded = (ev) => {
      for (let v = ev.oldVersion; v < VERSION; v++) migraciones[v](r.result, r.transaction!);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () =>
      rej(
        new Error(
          "La app está abierta en otra pestaña con una versión distinta. Ciérrala y vuelve a abrir esta."
        )
      );
  });
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function nid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Safari (sobre todo en iPhone, al volver de segundo plano) puede cortar la conexión con la base de datos:
// a partir de ahí cada transacción falla con InvalidStateError o UnknownError hasta recargar la página.
const perdida = (e: unknown) =>
  !!e &&
  typeof e === "object" &&
  "name" in e &&
  (e.name === "InvalidStateError" || e.name === "UnknownError");

export type Store = Awaited<ReturnType<typeof creaStore>>;

export async function creaStore({ onError = (e: unknown) => console.error(e) } = {}) {
  let db: IDBDatabase | null = null;
  async function conexion(nueva = false): Promise<IDBDatabase> {
    if (nueva || !db) {
      if (db)
        try {
          db.close();
        } catch (e) {
          /* ya cerrada */
        }
      const d = await abrir();
      d.onclose = () => {
        db = null;
      };
      d.onversionchange = () => {
        d.close();
        db = null;
      };
      db = d;
    }
    return db;
  }
  await conexion();
  type Sub<C extends Coleccion> = (a: Colecciones[C][]) => void;
  const subs = Object.fromEntries(COLS.map((c) => [c, []])) as unknown as { [C in Coleccion]: Sub<C>[] };
  const urls = new Map<string, string>();
  /** Ejecuta fn con el almacén pedido; si la conexión se ha perdido, reconecta y lo repite una vez. */
  async function usa<T>(
    store: Almacen,
    modo: IDBTransactionMode,
    fn: (s: IDBObjectStore) => Promise<T>
  ): Promise<T> {
    try {
      return await fn((await conexion()).transaction(store, modo).objectStore(store));
    } catch (e) {
      if (!perdida(e)) throw e;
      return fn((await conexion(true)).transaction(store, modo).objectStore(store));
    }
  }
  const lee = (store: Almacen, k: string) => usa(store, "readonly", (s) => req(s.get(k)));
  const pon = (store: Almacen, v: unknown, k?: string) =>
    usa(store, "readwrite", (s) => req(k === undefined ? s.put(v) : s.put(v, k)));
  const quita = (store: Almacen, k: string) => usa(store, "readwrite", (s) => req(s.delete(k)));

  async function todos<C extends Coleccion>(c: C): Promise<Colecciones[C][]> {
    return usa(c, "readonly", (s) => req(s.getAll()));
  }
  async function emit<C extends Coleccion>(c: C) {
    try {
      const a = await todos(c);
      (subs[c] as Sub<C>[]).forEach((f) => {
        try {
          f(a);
        } catch (e) {
          onError(e);
        }
      });
    } catch (e) {
      onError(e);
    }
  }

  const api = {
    /** Se suscribe a una colección: recibe el array completo cada vez que cambia. */
    on<C extends Coleccion>(c: C, cb: Sub<C>) {
      (subs[c] as Sub<C>[]).push(cb);
      return todos(c).then(cb).catch(onError);
    },
    async add<C extends Coleccion>(c: C, d: Omit<Colecciones[C], "id">): Promise<string> {
      const id = nid();
      await pon(c, { ...d, id });
      emit(c);
      return id;
    },
    async set<C extends Coleccion>(c: C, id: string, d: Partial<Colecciones[C]>) {
      await pon(c, { ...d, id });
      emit(c);
    },
    async update<C extends Coleccion>(c: C, id: string, patch: Partial<Colecciones[C]>) {
      await usa(c, "readwrite", async (s) => {
        const old = await req(s.get(id));
        if (old) await req(s.put({ ...old, ...patch, id }));
      });
      emit(c);
    },
    async del(c: Coleccion, id: string) {
      await quita(c, id);
      emit(c);
    },
    async get<C extends Coleccion>(c: C, id: string): Promise<Colecciones[C] | undefined> {
      return lee(c, id);
    },
    todos,

    // Fotos
    async putFoto(blob: Blob): Promise<string> {
      const id = "f" + nid();
      await pon("fotos", blob, id);
      return id;
    },
    async delFoto(id: string | null | undefined) {
      if (!id) return;
      await quita("fotos", id);
      const u = urls.get(id);
      if (u) {
        URL.revokeObjectURL(u);
        urls.delete(id);
      }
    },
    async urlFoto(id: string | null | undefined): Promise<string | null> {
      if (!id) return null;
      const ya = urls.get(id);
      if (ya) return ya;
      const b: Blob | undefined = await lee("fotos", id);
      if (!b) return null;
      const u = URL.createObjectURL(b);
      urls.set(id, u);
      return u;
    },
    async blobFoto(id: string | null | undefined): Promise<Blob | null> {
      return id ? lee("fotos", id) : null;
    },

    // Clave-valor (perfil, ajustes)
    async kget<T = unknown>(k: string): Promise<T | undefined> {
      return lee("kv", k) as Promise<T | undefined>;
    },
    async kset(k: string, v: unknown) {
      return pon("kv", v, k);
    },

    /** Copia de seguridad completa en JSON (las fotos van en base64). */
    async exporta(): Promise<Copia> {
      const out: Copia = {
        app: "armario",
        version: VERSION,
        fecha: new Date().toISOString(),
        kv: {},
        fotos: {},
        prendas: await todos("prendas"),
        outfits: await todos("outfits"),
        deseos: await todos("deseos"),
        votos: await todos("votos"),
        refs: await todos("refs")
      };
      for (const k of ["perfil", "ajustes"]) {
        const v = await api.kget<Record<string, unknown>>(k);
        if (v !== undefined) out.kv[k] = k === "ajustes" ? { ...v, clave: "" } : v;
      }
      const ids = new Set<string>();
      [...out.prendas, ...out.deseos, ...(out.refs || [])].forEach((p) => {
        if (p.foto) ids.add(p.foto);
      });
      for (const id of ids) {
        const b = await api.blobFoto(id);
        if (b) out.fotos[id] = await aDataURL(b);
      }
      return out;
    },
    async importa(data: Copia, { reemplazar = true } = {}) {
      if (!data || data.app !== "armario") throw new Error("Este archivo no es una copia de la app.");
      if (data.version > VERSION)
        throw new Error("Esta copia es de una versión más nueva de la app: actualízala y vuelve a probar.");
      if (data.version < VERSION) data = migraCopia(data);
      // 1. Valida y decodifica todo antes de tocar la base: si algo falla, no cambia nada.
      const { docs, fotos, kv } = validaCopia(data);
      const cur = (await api.kget<{ clave?: string }>("ajustes")) || {};
      if (kv.ajustes) kv.ajustes = { ...(kv.ajustes as object), clave: cur.clave || "" };
      // 2. Una sola transacción (sin await ajeno a IndexedDB dentro): o entra todo o no entra nada.
      const nombres: Almacen[] = [...COLS, "fotos", "kv"];
      const escribe = (d: IDBDatabase) =>
        new Promise<void>((res, rej) => {
          const tx = d.transaction(nombres, "readwrite");
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
          tx.onabort = () => rej(tx.error || new Error("No he podido guardar la copia."));
          if (reemplazar) for (const c of COLS) tx.objectStore(c).clear();
          for (const c of COLS) for (const d of docs[c]) tx.objectStore(c).put(d);
          for (const [id, blob] of fotos) tx.objectStore("fotos").put(blob, id);
          for (const [k, v] of Object.entries(kv)) tx.objectStore("kv").put(v, k);
        });
      try {
        await escribe(await conexion());
      } catch (e) {
        if (!perdida(e)) throw e;
        await escribe(await conexion(true));
      }
      COLS.forEach((c) => emit(c));
    },
    async borraTodo() {
      for (const c of [...COLS, "fotos", "kv"] as Almacen[]) await usa(c, "readwrite", (s) => req(s.clear()));
      COLS.forEach((c) => emit(c));
    }
  };
  return api;
}

export function aDataURL(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}
