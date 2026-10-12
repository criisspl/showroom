// Almacenamiento local en IndexedDB. Todo se queda en el navegador de cada persona.
// Colecciones de documentos con suscripción (on), fotos como Blob y un pequeño almacén clave-valor.

const DB_NAME = "armario";
const COLS = ["prendas", "outfits", "deseos", "votos"];
const VERSION = 1;

function abrir() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      COLS.forEach((c) => { if (!db.objectStoreNames.contains(c)) db.createObjectStore(c, { keyPath: "id" }); });
      if (!db.objectStoreNames.contains("fotos")) db.createObjectStore("fotos");
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
function nid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export async function creaStore() {
  const db = await abrir();
  const subs = Object.fromEntries(COLS.map((c) => [c, []]));
  const urls = new Map();
  const tx = (store, modo = "readonly") => db.transaction(store, modo).objectStore(store);

  async function todos(c) { return req(tx(c).getAll()); }
  async function emit(c) { const a = await todos(c); subs[c].forEach((f) => f(a)); }

  const api = {
    /** Se suscribe a una colección: recibe el array completo cada vez que cambia. */
    on(c, cb) { subs[c].push(cb); todos(c).then(cb); },
    async add(c, d) { const id = nid(); await req(tx(c, "readwrite").put({ ...d, id })); emit(c); return id; },
    async set(c, id, d) { await req(tx(c, "readwrite").put({ ...d, id })); emit(c); },
    async update(c, id, patch) {
      const s = tx(c, "readwrite"); const old = await req(s.get(id));
      if (old) await req(s.put({ ...old, ...patch, id }));
      emit(c);
    },
    async del(c, id) { await req(tx(c, "readwrite").delete(id)); emit(c); },
    async get(c, id) { return req(tx(c).get(id)); },
    todos,

    // Fotos
    async putFoto(blob) { const id = "f" + nid(); await req(tx("fotos", "readwrite").put(blob, id)); return id; },
    async delFoto(id) { if (!id) return; await req(tx("fotos", "readwrite").delete(id)); const u = urls.get(id); if (u) { URL.revokeObjectURL(u); urls.delete(id); } },
    async urlFoto(id) {
      if (!id) return null;
      if (urls.has(id)) return urls.get(id);
      const b = await req(tx("fotos").get(id));
      if (!b) return null;
      const u = URL.createObjectURL(b); urls.set(id, u); return u;
    },
    async blobFoto(id) { return id ? req(tx("fotos").get(id)) : null; },

    // Clave-valor (perfil, ajustes)
    async kget(k) { return req(tx("kv").get(k)); },
    async kset(k, v) { return req(tx("kv", "readwrite").put(v, k)); },

    /** Copia de seguridad completa en JSON (las fotos van en base64). */
    async exporta() {
      const out = { app: "armario", version: 1, fecha: new Date().toISOString(), kv: {}, fotos: {} };
      for (const c of COLS) out[c] = await todos(c);
      for (const k of ["perfil", "ajustes"]) { const v = await api.kget(k); if (v !== undefined) out.kv[k] = k === "ajustes" ? { ...v, clave: "" } : v; }
      const ids = new Set();
      [...out.prendas, ...out.deseos].forEach((p) => { if (p.foto) ids.add(p.foto); });
      for (const id of ids) { const b = await api.blobFoto(id); if (b) out.fotos[id] = await aDataURL(b); }
      return out;
    },
    async importa(data, { reemplazar = true } = {}) {
      if (!data || data.app !== "armario") throw new Error("Este archivo no es una copia de la app.");
      for (const c of COLS) {
        const s = tx(c, "readwrite");
        if (reemplazar) await req(s.clear());
        for (const d of data[c] || []) await req(s.put(d));
      }
      for (const [id, url] of Object.entries(data.fotos || {})) await req(tx("fotos", "readwrite").put(await (await fetch(url)).blob(), id));
      for (const [k, v] of Object.entries(data.kv || {})) {
        if (k === "ajustes") { const cur = (await api.kget("ajustes")) || {}; await api.kset(k, { ...v, clave: cur.clave || "" }); }
        else await api.kset(k, v);
      }
      COLS.forEach(emit);
    },
    async borraTodo() {
      for (const c of [...COLS, "fotos", "kv"]) await req(tx(c, "readwrite").clear());
      COLS.forEach(emit);
    }
  };
  return api;
}

export function aDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}
