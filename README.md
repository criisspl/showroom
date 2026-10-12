# Armario · tu asesora de imagen

Una app web para descubrir **tu paleta de color, tu tipo de cuerpo y tu estética**, subir tu ropa y que te **monte outfits** según la ocasión y el tiempo. También te dice si una prenda que has visto **merece la pena comprarla**.

Funciona entera en el navegador: no hay servidor ni cuentas, y tus datos se quedan en tu dispositivo.

## Qué hace

- **Análisis de imagen con IA**: con un selfie con luz natural, una foto de cuerpo entero (opcional), fotos de inspiración y unas preguntas, saca:
  - colorimetría: estación, subtono, paleta, neutros, colores que conviene evitar y con qué cambiarlos, metales y combinaciones 60·30·10
  - tipo de cuerpo con lo que te favorece, lo que conviene evitar y trucos
  - rostro, cejas y gafas; maquillaje; cortes y colores de pelo
  - tu estética, con su fórmula y búsquedas de Pinterest
- **Sin IA**: si ya conoces tu estación (12 estaciones) y tu tipo de cuerpo (10 tipos Kibbe), puedes empezar eligiéndolos en una lista.
- **Armario**: sube tus prendas con foto. La IA puede rellenar sola los datos de cada prenda: categoría, color, corte, registro (deportivo, casual, arreglado, fiesta) y tejido.
- **Hoy**: monta tres outfits según la ocasión (diario, tarde de finde, oficina, cita, noche, evento…) y el tiempo que hace.
  - Nunca junta registros que chocan (un chándal con un top de fiesta, por ejemplo) y tiene en cuenta los tejidos, las formas y los colores.
  - Si a un look le falta algo, te pregunta «¿Tienes algo así?».
- **Valora los outfits**: dile «Sí, me lo pondría» o «No, me falla esto» y la app aprende tus gustos.
- **¿Lo compro?**: haz una foto a una prenda en la tienda y te da un veredicto según tu paleta, tu cuerpo, tu estética y lo que ya tienes. Si te dice que sí, la apunta en tu lista de deseos.
- **Deseos**: prendas que te faltan, en tus colores, con referencias de Pinterest.
- **Historial**: lo que te has puesto, los outfits guardados y lo que la app ha aprendido de ti.
- **Copia de seguridad**: exporta e importa todo (fotos incluidas) en un archivo `.armario.json`.

## La IA: gratuita y la eliges tú

La app no trae ninguna IA de serie. Cada persona pega **su propia clave** de un proveedor compatible con la API de OpenAI (`chat/completions`) que entienda imágenes. Estos proveedores tienen plan gratuito:

| Proveedor | Modelo por defecto | Notas |
|---|---|---|
| [Mistral](https://console.mistral.ai/api-keys) | `mistral-small-latest` | Empresa europea. El modelo Small entiende fotos. |
| [Groq](https://console.groq.com/keys) | `meta-llama/llama-4-scout-17b-16e-instruct` | Muy rápido; elige un modelo con visión. |
| [OpenRouter](https://openrouter.ai/keys) | `openrouter/free` | Elige al azar entre modelos gratuitos. Tiene un límite de peticiones al día. |
| [Google Gemini](https://aistudio.google.com/apikey) | `gemini-flash-latest` | Las condiciones de Google no permiten el plan gratuito en la UE, Suiza ni Reino Unido. |
| Otro | — | Cualquier servicio compatible: pon la URL y el modelo en Ajustes. |

Antes de elegir, ten en cuenta:

- **Privacidad**: tus fotos y respuestas se envían directamente desde tu navegador al proveedor que elijas. En los planes gratuitos, el proveedor suele poder usar esos datos para mejorar sus modelos. Lee sus condiciones.
- **Edad**: estos servicios son para mayores de 18 años.
- **Planes y límites**: los planes gratuitos y sus límites cambian con frecuencia. Si un modelo deja de existir, cámbialo en Ajustes.
- **CORS**: la app llama al proveedor desde el navegador. Si un servicio bloquea esas llamadas, usa otro o pon un proxy propio como «Otro».

La clave se guarda solo en tu navegador (IndexedDB) y **no se incluye en las copias de seguridad**.

## Usarla

La forma más fácil es la versión publicada en GitHub Pages: `https://<tu-usuario>.github.io/<repo>/`.

En local (necesitas Node 20 o posterior):

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # pruebas unitarias
npm run build     # genera dist/
npm run preview   # sirve dist/
```

## Publicar en GitHub Pages

El repo trae un workflow (`.github/workflows/deploy.yml`) que, en cada push a `main`, pasa las pruebas, compila y publica la app.

Para activarlo la primera vez, ve en GitHub a **Settings → Pages → Build and deployment → Source** y elige **GitHub Actions**.

## Estructura

```
index.html            pantallas de la app
src/main.js           arranque
src/state.js          estado compartido de la interfaz
src/lib/
  ai.js               cliente de IA (proveedores, imágenes, JSON)
  analysis.js         preguntas, prompt del análisis, normalización y perfil manual
  color.js            color en CIELAB, familias, paleta y clasificación
  engine.js           motor de outfits, aprendizaje de valoraciones y «¿Lo compro?»
  store.js            IndexedDB: colecciones, fotos y copias de seguridad
  dom.js              utilidades de interfaz
src/data/
  constants.js        ocasiones, tiempo, registros, tejidos y tablas de compatibilidad
  presets.js          12 estaciones, 10 tipos de cuerpo y catálogo de prendas básicas
  icons.js            iconos SVG de prendas
src/ui/               una pantalla por archivo
test/                 pruebas con node:test
```

## Tus datos

Todo vive en el navegador donde usas la app. Si borras los datos del navegador, se pierden: haz una copia de vez en cuando desde **Ajustes → Exportar copia**.

Los archivos `*.armario.json` están en `.gitignore` para que no subas tus datos al repo sin querer.

## Licencia

MIT
