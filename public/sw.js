// Service worker: guarda la app para que abra rápido y funcione sin conexión
// (todo menos la IA, que necesita internet). Los datos de cada persona están en IndexedDB, no aquí.
// El build sustituye el marcador del nombre por el identificador de la versión (en desarrollo se queda tal cual).
const CACHE = "armario-__BUILD_ID__";
const BASE = new URL("./", self.location).pathname;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([BASE, BASE + "manifest.webmanifest", BASE + "favicon.svg"]))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) =>
        Promise.all(ks.filter((k) => k.startsWith("armario-") && k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request,
    url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith(BASE + "api/"))
    return;
  // Páginas: primero la red (para tener siempre la última versión), si no hay, la guardada.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok) {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put(BASE, copia));
          }
          return r;
        })
        .catch(() => caches.match(BASE))
    );
    return;
  }
  // Archivos con hash (assets/…) e iconos: primero la caché.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((r) => {
          if (r.ok) {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return r;
        })
    )
  );
});
