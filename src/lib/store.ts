// Almacenamiento local en IndexedDB. Todo se queda en el navegador de cada persona.
// Colecciones de documentos con suscripción (on), fotos como Blob y un pequeño almacén clave-valor.

import type { Outfit, Prenda, Voto } from "./tipos.ts";

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
}

const DB_NAME = "armario";
const COLS: Coleccion[] = ["prendas", "outfits", "deseos", "votos"];
const VERSION = 1;

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      COLS.forEach((c) => {
        if (!db.objectStoreNames.contains(c)) db.createObjectStore(c, { keyPath: "id" });
      });
      if (!db.objectStoreNames.contains("fotos")) db.createObjectStore("fotos");
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
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
    async kget(k: string): Promise<any> {
      return lee("kv", k);
    },
    async kset(k: string, v: unknown) {
      return pon("kv", v, k);
    },

    /** Copia de seguridad completa en JSON (las fotos van en base64). */
    async exporta(): Promise<Copia> {
      const out: Copia = {
        app: "armario",
        version: 1,
        fecha: new Date().toISOString(),
        kv: {},
        fotos: {},
        prendas: await todos("prendas"),
        outfits: await todos("outfits"),
        deseos: await todos("deseos"),
        votos: await todos("votos")
      };
      for (const k of ["perfil", "ajustes"]) {
        const v = await api.kget(k);
        if (v !== undefined) out.kv[k] = k === "ajustes" ? { ...v, clave: "" } : v;
      }
      const ids = new Set<string>();
      [...out.prendas, ...out.deseos].forEach((p) => {
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
      for (const c of COLS) {
        await usa(c, "readwrite", async (s) => {
          if (reemplazar) await req(s.clear());
          for (const d of data[c] || []) await req(s.put(d));
        });
      }
      for (const [id, url] of Object.entries(data.fotos || {}))
        await pon("fotos", await (await fetch(url)).blob(), id);
      for (const [k, v] of Object.entries(data.kv || {})) {
        if (k === "ajustes") {
          const cur = (await api.kget("ajustes")) || {};
          await api.kset(k, { ...(v as object), clave: cur.clave || "" });
        } else await api.kset(k, v);
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
