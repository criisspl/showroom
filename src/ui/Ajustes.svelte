<script lang="ts">
  // Ajustes: dónde se guardan los datos, proveedor de IA, copia de seguridad y borrado de datos.
  import { app } from "../state.js";
  import { nombreCopia } from "../lib/ajustes.ts";
  import { ver, falla } from "./comun.js";
  import CambiarAlmacen from "./CambiarAlmacen.svelte";
  import { descarga } from "./descarga.ts";
  import FormConfig from "./FormConfig.svelte";
  import { importaArchivo } from "./importa.js";

  let datosMsg = $state("");
  let armado = $state(false);

  async function exporta() {
    datosMsg = "Preparando la copia…";
    try {
      descarga(await app.store.exportaBlob(), nombreCopia());
      datosMsg = "Copia descargada. La clave de la IA no se incluye.";
    } catch (e) {
      datosMsg = "";
      falla(e);
    }
  }

  async function borra() {
    if (!armado) {
      armado = true;
      return;
    }
    await app.store.borraTodo();
    location.reload();
  }
</script>

<header class="a-head">
  <p class="eyebrow">Tu app</p>
  <h1 class="a-h1">Ajustes</h1>
</header>
<div class="card paso">
  <FormConfig pref="s" />
</div>
<div class="card paso" id="s-instala" hidden>
  <h2>Instálala en tu móvil</h2>
  <p class="a-msg" id="s-instala-t" role="status" aria-live="polite"></p>
  <div class="a-row">
    <button type="button" class="a-btn" id="s-instala-b" hidden>Instalar</button>
  </div>
</div>
<div class="card paso">
  <h2>Tus datos</h2>
  <p class="a-msg">
    Todo vive en este navegador. Haz copias de vez en cuando: si borras los datos del navegador, se pierden.
  </p>
  <div class="a-row">
    <button type="button" class="a-btn ghost" id="s-exporta" onclick={exporta}>Descargar copia</button>
    <label class="a-btn ghost" style="position: relative"
      >Importar copia<input
        type="file"
        id="s-importa"
        accept="application/json,.json"
        style="position: absolute; inset: 0; opacity: 0"
        onchange={(ev) => importaArchivo(ev.currentTarget, (t: string) => (datosMsg = t))}
      /></label
    >
  </div>
  <div class="a-row">
    <button type="button" class="a-btn ghost" id="s-rehacer" onclick={() => ver("bienvenida")}
      >Rehacer mi análisis</button
    ><button type="button" class="a-btn danger" id="s-borra" onclick={borra}
      >{armado ? "Pulsa otra vez: se borra todo" : "Borrar todo"}</button
    >
  </div>
  <p class="a-msg" id="s-datos-msg" role="status" aria-live="polite">{datosMsg}</p>
</div>
<CambiarAlmacen />
<p class="a-note" style="margin-top: 18px">
  Proyecto de código abierto. Las recomendaciones son orientativas y no sustituyen a una asesora profesional.
</p>
