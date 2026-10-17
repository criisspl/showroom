# 0001. Local-first con copia cifrada opcional

- Estado: Aceptada
- Fecha: 2026-10-17

## Contexto

Los datos del armario solo viven en IndexedDB. Se pierden si la persona borra los datos del sitio o cambia de móvil, y Safari los borra tras 7 días sin uso si la app no está instalada. Existe la copia manual `.armario.json`, pero en la práctica nadie la hace.

Requisitos: privacidad total y coste cero.

## Decisión

- IndexedDB sigue siendo la fuente de verdad y la app funciona sin conexión.
- Copia en la nube opcional. Al activarla se genera una clave de datos aleatoria AES-GCM de 256 bits (Web Crypto, sin dependencias).
- Esa clave se guarda envuelta con una clave derivada de la contraseña de la usuaria (PBKDF2-SHA256, sal de 16 bytes por usuaria, iteraciones guardadas en la cabecera) y, si la activa, también con una frase de recuperación.
- Perfil y prendas van en un blob cifrado. Las fotos van cifradas en ficheros aparte y solo se suben las que cambian.
- Supabase (región UE, capa gratuita) solo se usa para el login por enlace mágico, una tabla con RLS (`user_id = auth.uid()`) y Storage privado.
- Conflictos: gana la última versión; la anterior queda en local.
- El servidor nunca ve datos en claro.
- Cliente: `@supabase/supabase-js` (dependencia aprobada).

## Consecuencias

- Si la usuaria olvida la contraseña y la frase, la copia de la nube es irrecuperable. La app lo avisa y ofrece la copia `.armario.json`.
- Cambiar la contraseña solo reenvuelve la clave de datos; no hay que volver a cifrar nada.
- La capa gratuita pausa los proyectos inactivos y limita Storage: hay que comprimir las fotos.
- RGPD: página de privacidad, exportar datos y borrar la cuenta.
- La CSP necesita `connect-src` al dominio de Supabase.

## Alternativas descartadas

- Seguir solo en el navegador: no resuelve la pérdida de datos.
- Supabase con datos en claro + RLS: el servidor vería los datos.
- Cloudflare R2/KV con login propio: obliga a mantener la autenticación.
- Vercel KV/Blob: mismo problema de login y peor encaje con el Worker actual.
