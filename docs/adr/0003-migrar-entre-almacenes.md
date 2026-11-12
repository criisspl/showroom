# 0003. Migrar los datos entre almacenamientos

- Estado: Aceptada
- Fecha: 2026-11-12

## Contexto

Con el almacenamiento elegible ([0002](0002-config-elegible.md)) hay que poder cambiar de proveedor sin perder datos. Hoy solo existe el adaptador de IndexedDB, pero el servicio no puede depender de él.

## Decisión

- `migraAlmacen(origen, destino, opciones)` (`src/lib/migracion.ts`) trabaja solo con el contrato `Almacen`: lee con `exporta()` y escribe con `importa()`. Fotos incluidas, porque la copia las lleva en base64.
- El origen solo se lee: ningún fallo lo deja a medias.
- Al destino llega lo mismo que ya salía en una copia `.armario.json`: nunca la clave de IA, la clave cifrada (`claveIA`) ni la configuración del dispositivo (`config`), aunque un adaptador las devolviera. La copia se valida antes de escribir (formato, versión, fotos `data:image/jpeg|png|webp`, máximo 50 000 documentos por colección y 500 MB de fotos).
- Un destino con datos no se toca sin `reemplazar: true` y sin entregar antes su copia previa (`copiaPrevia`; Ajustes la descarga). Si la copia previa falla, no se escribe nada.
- Tras escribir se lee el destino y se comprueba que tiene los mismos ids, fotos y claves. Si la escritura o la comprobación fallan, se restaura el destino (con su copia previa, o vaciándolo si estaba vacío) y el error dice si lo consiguió.
- Progreso por fases (leer, copia previa, escribir, verificar). Se puede cancelar hasta empezar a escribir; después no.
- Ajustes muestra «Copiar a otro almacenamiento» con los destinos de `destinosPosibles()` (todos los de `ALMACENES` menos el actual). Hoy no hay ninguno y la tarjeta lo explica.

## Consecuencias

- Un proveedor nuevo solo añade su fábrica en `almacenes.ts` y su entrada en `ALMACENES`.
- Copiar no cambia el almacenamiento activo: elegir el nuevo como principal queda para cuando exista un segundo adaptador real.
- El progreso es por fases, no por foto, porque reutiliza `exporta()`/`importa()`.
