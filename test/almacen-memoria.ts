// Segundo adaptador del contrato `Almacen`, en memoria, solo para probar la migración entre proveedores.
import type { Almacen, Coleccion, Colecciones, Copia } from "../src/lib/almacen.ts";
import { VERSION, aDataURL, migraCopia, validaCopia } from "../src/lib/store.ts";

const COLS: Coleccion[] = ["prendas", "outfits", "deseos", "votos", "refs"];

export interface FallosMemoria {
  /** La próxima importa escribe la mitad de las colecciones y lanza (una sola vez). */
  importaALaMitad?: boolean;
  /** importa «funciona» pero pierde las fotos. */
  pierdeFotos?: boolean;
  /** exporta lanza. */
  exportaFalla?: boolean;
}

export function creaMemoria(fallos: FallosMemoria = {}): Almacen & { fallos: FallosMemoria } {
  const cols = Object.fromEntries(COLS.map((c) => [c, new Map<string, unknown>()])) as Record<
    Coleccion,
    Map<string, unknown>
  >;
  const fotos = new Map<string, Blob>();
  const kv = new Map<string, unknown>();
  let n = 0;
  const api: Almacen & { fallos: FallosMemoria } = {
    fallos,
    async on(c, cb) {
      cb([...cols[c].values()] as never);
    },
    async add(c, d) {
      const id = "m" + ++n;
      cols[c].set(id, { ...d, id });
      return id;
    },
    async set(c, id, d) {
      cols[c].set(id, { ...d, id });
    },
    async update(c, id, patch) {
      const old = cols[c].get(id);
      if (old) cols[c].set(id, { ...(old as object), ...patch, id });
    },
    async del(c, id) {
      cols[c].delete(id);
    },
    async get<C extends Coleccion>(c: C, id: string) {
      return cols[c].get(id) as Colecciones[C] | undefined;
    },
    async todos<C extends Coleccion>(c: C) {
      return [...cols[c].values()] as Colecciones[C][];
    },
    async putFoto(b) {
      const id = "f" + ++n;
      fotos.set(id, b);
      return id;
    },
    async delFoto(id) {
      if (id) fotos.delete(id);
    },
    async urlFoto() {
      return null;
    },
    async blobFoto(id) {
      return (id && fotos.get(id)) || null;
    },
    async kget<T>(k: string) {
      return kv.get(k) as T | undefined;
    },
    async kset(k, v) {
      kv.set(k, v);
    },
    async exporta(): Promise<Copia> {
      if (fallos.exportaFalla) throw new Error("boom");
      const out: Copia = {
        app: "armario",
        version: VERSION,
        fecha: new Date().toISOString(),
        kv: {},
        fotos: {},
        prendas: await api.todos("prendas"),
        outfits: await api.todos("outfits"),
        deseos: await api.todos("deseos"),
        votos: await api.todos("votos"),
        refs: await api.todos("refs")
      };
      for (const k of ["perfil", "ajustes"]) {
        const v = kv.get(k);
        if (v !== undefined) out.kv[k] = k === "ajustes" ? { ...(v as object), clave: "" } : v;
      }
      for (const d of [...out.prendas, ...out.deseos, ...(out.refs ?? [])])
        if (d.foto && fotos.has(d.foto)) out.fotos[d.foto] = await aDataURL(fotos.get(d.foto) as Blob);
      return out;
    },
    async exportaBlob() {
      return new Blob([JSON.stringify(await api.exporta())], { type: "application/json" });
    },
    async importa(data, { reemplazar = true } = {}) {
      if (!data || data.app !== "armario") throw new Error("Este archivo no es una copia de la app.");
      if (data.version < VERSION) data = migraCopia(data);
      const { docs, fotos: fs, kv: k2 } = validaCopia(data);
      if (reemplazar) for (const c of COLS) cols[c].clear();
      COLS.forEach((c, i) => {
        if (fallos.importaALaMitad && i === 2) {
          fallos.importaALaMitad = false; // el fallo ocurre una sola vez
          throw new Error("se cortó a mitad");
        }
        for (const d of docs[c]) cols[c].set((d as { id: string }).id, d);
      });
      if (!fallos.pierdeFotos) for (const [id, b] of fs) fotos.set(id, b);
      for (const [k, v] of Object.entries(k2)) kv.set(k, v);
    },
    async borraTodo() {
      for (const c of COLS) cols[c].clear();
      fotos.clear();
      kv.clear();
    }
  };
  return api;
}
