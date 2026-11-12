# 0002. Almacenamiento e IA elegibles, con la clave cifrada

- Estado: Aceptada
- Fecha: 2026-11-12

## Contexto

Cada persona debería decidir dónde se guardan sus datos y qué IA usa; la app solo sugiere un valor de partida. Hasta ahora la clave de IA propia estaba en claro en el kv `ajustes` de IndexedDB.

## Decisión

- La configuración (`{almacenamiento:{tipo}, ia:{tipo, proveedor, url, modelo}}`) se guarda en el kv `config` de IndexedDB local, que es el arranque. `sugerida()` es IndexedDB local más la IA integrada.
- La clave de la IA se guarda siempre cifrada en el kv `claveIA`, con la cripto de `cripto.ts`: clave de datos aleatoria envuelta con una clave PBKDF2 derivada de la contraseña. Descifrada solo vive en memoria; al arrancar queda bloqueada hasta que la persona escribe su contraseña. No va en las copias `.armario.json`.
- Al importar una copia se ignoran los kv `config` y `claveIA`, para que una copia ajena no cambie el destino de la IA ni pise la clave.
- Las URLs configurables tienen que ser https.
- Migración sin pasos: si no hay `config` pero sí perfil o ajustes, se deduce de los ajustes antiguos y se guarda. No cambia el esquema de IndexedDB ni el formato de las copias. Una clave antigua en claro sigue funcionando hasta que la persona le pone contraseña (cifrar necesita contraseña, así que no puede ser automático).
- El selector de almacenamiento solo ofrece `indexeddb`; la nube queda para más adelante.

## Consecuencias

- Si se olvida la contraseña hay que volver a escribir la clave.
- El análisis de la bienvenida usa la IA integrada antes de la pantalla de configuración (con su permiso explícito).
