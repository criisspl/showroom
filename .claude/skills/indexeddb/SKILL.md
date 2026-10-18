---
name: indexeddb
description: Use when writing or reviewing client-side storage code in a project that uses IndexedDB (Dexie, idb or the native API).
---

# IndexedDB (Dexie 4, idb o API nativa)

## Esquema y versiones
- Cada cambio de esquema es una versión nueva. Una versión con `upgrade` que haya llegado a usuarios no se toca.
- En Dexie 3+ solo hace falta conservar las versiones con `upgrade` mientras haya usuarios en versiones anteriores.
- Dexie solo declara índices en `stores()`; no hace falta listar todos los campos.

```ts
db.version(1).stores({ prendas: '++id, categoria' })
db.version(2)
  .stores({ prendas: '++id, categoria, color' })
  .upgrade((tx) =>
    tx.table('prendas').toCollection().modify((p) => { p.color ??= 'sin-definir' }),
  )
```
- Con API nativa o `idb`: `openDB(nombre, version, { upgrade(db, oldVersion) { ... } })`, migrando por `oldVersion`.
- Cambiar el formato de lo guardado sin migración rompe los datos de quien ya usa la app.

## Transacciones
- Se auto-confirman cuando no quedan peticiones pendientes. Un `await` de algo ajeno a IndexedDB (`fetch`, `setTimeout`, WebCrypto) las cierra y la siguiente escritura falla (`TransactionInactiveError`).
- Haz lo asíncrono antes y abre la transacción después. Si no hay más remedio, `Dexie.waitFor()`.
- Agrupa lecturas y escrituras relacionadas en una sola transacción (`db.transaction('rw', db.prendas, async () => { ... })`).

## Persistencia y Safari
- Safari borra el almacenamiento escribible por scripts (IndexedDB incluido) tras 7 días de uso de Safari sin interacción con el sitio. Las web apps añadidas a la pantalla de inicio llevan su propio recuento y no se espera que se borren.
- `navigator.storage.persist()` pide almacenamiento persistente; el navegador puede decir que no (`false`) y no hay garantía. Solo en HTTPS, no en workers.
- Por eso: pídelo y ofrece exportar/importar una copia de seguridad (y avisa al usuario). No lo vendas como fiable.
- Captura los errores de apertura/escritura (cuota llena, modo privado, conexión cerrada) y enséñalos.

```ts
const persistente = await navigator.storage?.persist?.()
```

## UI reactiva (Dexie)
- `liveQuery(() => db.prendas.toArray())` devuelve un observable que se reejecuta cuando cambian los datos, incluso desde otra pestaña.
- Svelte: es un store válido (`$prendas`). React: `useLiveQuery` de `dexie-react-hooks` (empieza en `undefined`).
- Dentro del querier no hagas llamadas asíncronas ajenas a Dexie sin `Dexie.waitFor()`.

## Tests
- `fake-indexeddb`: `import 'fake-indexeddb/auto'` (o pasar `IDBFactory` a Dexie). Base nueva por test para no arrastrar datos.
- Prueba la migración: crea la base en la versión anterior, mete datos, ábrela con la nueva y comprueba el resultado.

## Errores típicos de LLM
- Editar `version(1)` en vez de añadir `version(2)`.
- `await fetch()` dentro de una transacción.
- Dar por hecho que los datos son permanentes.
- Guardar datos sensibles sin pensar en cifrado ni en la copia en la nube.
- Dejar abierta una suscripción de `liveQuery` sin cancelar (en JS plano, `unsubscribe()`).

## Verificar
- Tests con `fake-indexeddb` (incluida la migración).
- Abrir la app en local con datos de una versión anterior y comprobar que migran.
- Probar a mano en Safari si el flujo depende de persistencia.

## Fuentes
- https://dexie.org/docs/Version/Version.upgrade()
- https://dexie.org/docs/Tutorial/Design
- https://dexie.org/docs/liveQuery()
- https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
- https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction
- https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
