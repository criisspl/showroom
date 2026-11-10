# Armario · tu asesora de imagen

Una app web para descubrir **tu paleta de color, tu tipo de cuerpo y tu estética**, subir tu ropa y que te **monte outfits** según la ocasión y el tiempo. También te dice si una prenda que has visto **merece la pena comprarla**.

Está pensada para que la use cualquiera: no hay que registrarse, ni instalar nada de una tienda, ni poner claves.

## Privacidad: tus datos no salen de tu móvil

- **Sin cuentas ni base de datos.** El perfil, la ropa, las fotos, los outfits y las valoraciones se guardan solo en el navegador de cada persona (IndexedDB). Nadie más puede verlos, tampoco quien publica la app.
- **El análisis se hace en el propio móvil.** Marcas tu piel, tus ojos y tu pelo en un selfie, respondes unas preguntas y la app calcula tu estación, tu tipo de cuerpo y tu estética sin enviar nada a ningún sitio.
- **La IA es opcional y siempre se pide permiso.** Si alguien quiere un análisis más completo, o que la IA rellene los datos de una prenda a partir de la foto, la app avisa de que la foto se envía a un servicio de IA externo y pide aceptarlo. El servidor de la app solo hace de intermediario: no guarda nada.
- **Fuentes propias.** La app no carga fuentes ni scripts de terceros.
- **Copias de seguridad.** Cada persona puede descargar una copia (`.armario.json`) y restaurarla en otro dispositivo.

## Qué hace

- **Análisis en el móvil, sin IA:**
  - **Color:** a partir de los colores que marcas en el selfie (y, si quieres, algo blanco para corregir la luz) y de tus respuestas (venas, joyas, sol, ojos, pelo), calcula tu subtono, tu claridad y tu contraste. Con eso te asigna una de las 12 estaciones y te sugiere las dos vecinas por si dudas.
  - **Cuerpo:** saca tu tipo de cuerpo (Kibbe, 10 tipos) por puntos según tu estatura y tus respuestas, y tu silueta si das tus medidas.
  - **Estética:** a partir de las palabras que elijas (romántica, natural, clásica, minimalista, urbana, llamativa, vintage, sexy), con su fórmula, looks, maquillaje, colores de pelo y prendas clave en tus colores.
- **Análisis con IA (opcional):** cara, cejas, gafas, cortes de pelo, maquillaje y una estética con nombre propio, a partir de tus fotos.
- **Ya sé mi estación:** si ya te han hecho un análisis de color, eliges tu estación y tu tipo de cuerpo directamente.
- **Armario:** sube tus prendas con foto. El color principal se detecta en el móvil.
- **Hoy:** te monta tres outfits según la ocasión (diario, tarde de finde, oficina, cita, noche, evento…) y el tiempo.
  - Nunca junta registros que chocan (un chándal con un top de fiesta, por ejemplo) y tiene en cuenta tejidos, formas y colores.
  - Si a un look le falta algo, te pregunta «¿Tienes algo así?».
- **Looks siempre completos:** si te falta una pieza (calzado, capa…), el look la muestra igualmente como sugerencia en tus colores y te pregunta si tienes algo así. Si dices que sí, la añades al armario y entra en el look; si dices que no, queda apuntado y puedes pasarla a tu lista de deseos.
- **Prendas que no has subido:** una de las opciones incluye un básico que probablemente tienes (vaquero recto, camisa, jersey fino…) o una prenda que dijiste que tienes. Si es así, la subes y entra en el look; si no, desaparece y no vuelve a salir.
- **Pinterest en cada look:** cada outfit trae un enlace a Pinterest con sus prendas, colores, ocasión y estación, para ver cómo queda en fotos reales.
- **Todo el día fuera:** marca varias ocasiones (por ejemplo, oficina y luego cervezas) y dos tiempos (mañana fresca, tarde templada). El outfit sirve para todo, con una capa que se puede quitar y un consejo para pasar de un plan a otro.
- **Con estas prendas:** elige una o varias prendas que te apetezca llevar (de tu armario o descrita, aunque no la hayas subido) y te monta los looks alrededor de ellas, con ideas de qué añadirles.
- **Foto de un look (con IA, opcional):** sube una foto de un outfit y te dice qué funciona y qué mejorar; reconoce las prendas que ya tienes y añade al armario las que no, con su recorte como foto.
- **Lo monto yo:** elige tú las prendas y la app te dice si pega con la ocasión y el tiempo, qué funciona, qué falla y qué cambiarías por otras de tu armario.
- **Viento, humedad y dónde vas a estar:** marca si hace viento o humedad y si vas a estar en la ciudad, un pueblo, la montaña o la playa. Con viento evita faldas con vuelo; en la montaña, calzado plano y pantalón; en la playa, nada de botas ni tejidos pesados.
- **Estación del año:** cada prenda sabe de qué temporada es (se deduce sola y se puede cambiar). En invierno no te propone sandalias ni shorts, y en verano nada de pana ni jerséis.
- **Valora los outfits:** con «Sí» o «No, me falla esto», y la app aprende tus gustos. Un look al que dices que no desaparece y no vuelve a salir.
- **¿Lo compro?:** haz una foto a una prenda en la tienda y te da un veredicto según tu paleta, tu cuerpo, tu estética y lo que ya tienes.
- **Deseos:** las prendas que te faltan, en tus colores, con referencias de Pinterest.
- **Historial:** lo que te has puesto, lo que has guardado y lo que la app ha aprendido de ti.

## Dispositivos compatibles

|               | Mínimo                                                  |
| ------------- | ------------------------------------------------------- |
| iPhone y iPad | iOS / iPadOS 15 o posterior (Safari, o Chrome para iOS) |
| Android       | Chrome 90+, Samsung Internet 15+, Firefox 94+           |
| Ordenador     | Chrome o Edge 90+, Firefox 94+, Safari 15+              |

- **Se instala como una app:** se puede añadir a la pantalla de inicio desde el navegador, con su icono, a pantalla completa y sin pasar por ninguna tienda.
  - En **Android**, la app muestra un botón «Instalar» en Ajustes.
  - En **iPhone**, explica cómo hacerlo: Compartir → «Añadir a pantalla de inicio».
- **iPhone:** conviene instalarla, porque Safari puede borrar los datos de las webs que no se abren en 7 días. Las apps añadidas a la pantalla de inicio no tienen ese límite. Además, la app pide al navegador que no borre sus datos.
- **Funciona sin conexión** (menos la IA), gracias a un service worker (su caché lleva el identificador de cada build y borra las versiones anteriores).
- **Fotos:** en iPhone, Safari convierte las fotos HEIC a JPEG al elegirlas. Si algún navegador no puede abrir una foto, la app lo dice y sugiere el formato «Más compatible».
- La interfaz está pensada para móvil (pantallas desde 320 px) y respeta la muesca y la barra inferior del iPhone.

## La IA opcional

La app trae su propio servidor intermediario (`worker/`, en Cloudflare Workers). La clave de la IA está en un secreto de Cloudflare, nunca en el navegador ni en el repo, así que **las personas que usan la app no tienen que poner nada**.

- **Proveedor principal:** [Groq](https://console.groq.com/keys), con plan gratuito y el modelo con visión `meta-llama/llama-4-scout-17b-16e-instruct`.
- **Reserva opcional:** [Mistral](https://console.mistral.ai/api-keys) (`mistral-small-latest`), que se usa si Groq se satura.
- **Anti-abuso:**
  - máximo 8 peticiones por minuto por persona
  - solo acepta llamadas desde la propia web
  - solo reenvía texto y hasta 5 fotos, de 6 MB en total como máximo
  - el modelo y los límites los decide el servidor, no el navegador
- **Cupo gratuito:** es compartido. Cuando se llena, la app lo explica y el análisis en el móvil sigue funcionando.
- **Clave propia:** quien quiera puede poner la suya en Ajustes (Mistral, Groq, OpenRouter, Gemini o cualquier servicio compatible con la API de OpenAI).

## Publicarla (gratis) en Cloudflare

1. Crea una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com/sign-up).
2. Ve a **Workers & Pages → Create → Import a repository**, conecta GitHub y elige este repo. Llama al proyecto `armario` (igual que `name` en `wrangler.jsonc`) y deja los valores por defecto: _Build command_ `npm run build` y _Deploy command_ `npx wrangler deploy`.
3. Crea una clave gratuita en [Groq](https://console.groq.com/keys).
4. En el Worker, ve a **Settings → Variables and Secrets → Add**, elige el tipo **Secret**, ponle el nombre `IA_CLAVE` y pega la clave.
   - Opcional: añade también `IA2_CLAVE` con una clave de Mistral como reserva.
5. Listo: la app queda en `https://armario.<tu-subdominio>.workers.dev`. Cada push a `main` la vuelve a publicar.

Sin `IA_CLAVE`, la app funciona igual; solo se desactiva la IA integrada.

## Desarrollo

Necesitas Node 20 o posterior.

```bash
npm install
npm run dev        # la web, con recarga en caliente
npm run dev:api    # la web + el servidor de la IA en local (pon IA_CLAVE en .dev.vars)
npm test           # pruebas unitarias con Vitest (motor, color, análisis local y servidor)
npm run e2e        # pruebas de punta a punta con Playwright (la app compilada, en Chromium de móvil)
npm run typecheck  # comprueba los tipos (TypeScript estricto)
npm run lint       # ESLint
npm run format     # Prettier
npm run build      # genera dist/
npm run deploy     # publica en Cloudflare desde tu ordenador
```

## Estructura

```
index.html            pantallas de la app
public/               icono, manifest y service worker (app instalable y sin conexión)
worker/               servidor de Cloudflare: sirve la web y hace de intermediario con la IA
src/main.js           arranque
src/lib/              lógica sin interfaz, en TypeScript estricto
  tipos.ts            tipos del dominio: prenda, outfit, voto, perfil…
  local.ts            análisis en el móvil: color desde el selfie, cuerpo y estética
  analysis.ts         preguntas, análisis con IA y normalización del perfil
  ai.ts               cliente de IA (integrada o con clave propia) y lectura de fotos
  color.ts            color en CIELAB, familias, paleta y clasificación
  engine.ts           punto de entrada del motor de outfits (reexporta motor/)
  motor/              estado, rasgos de prenda, aprendizaje, contexto, montar looks,
                      «¿Lo compro?» y «Lo monto yo»
  store.ts            IndexedDB: colecciones, fotos y copias de seguridad
src/data/             estaciones, tipos de cuerpo, estéticas, maquillaje e iconos
src/ui/               una pantalla por archivo; pasando de JavaScript a Svelte 5 (Historial ya está)
test/                 pruebas con Vitest
e2e/                  pruebas de punta a punta con Playwright y un armario de prueba inventado
```

## Aviso

Las recomendaciones son orientativas y no sustituyen a una asesora de imagen profesional. El análisis de color con una foto depende mucho de la luz: lo mejor es luz natural de día, de frente y sin filtros.

## Licencia

MIT
