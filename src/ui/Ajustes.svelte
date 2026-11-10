<script lang="ts">
  // Ajustes: proveedor de IA, copia de seguridad y borrado de datos.
  import { app, repinta } from "../state.js";
  import { pregunta } from "../lib/ai.ts";
  import {
    ajustesDeCampos,
    camposDeAjustes,
    mensajeConexion,
    mensajeGuardado,
    nombreCopia,
    opcionesProveedor,
    vistaProveedor
  } from "../lib/ajustes.ts";
  import { ver, falla } from "./comun.js";
  import { importaArchivo } from "./importa.js";
  import { cambios } from "./puente.svelte.ts";

  // Los ajustes no son reactivos: los campos se rellenan de nuevo cada vez que main.js avisa de un cambio
  // y siguen siendo editables hasta entonces.
  const guardados = $derived.by(() => {
    void cambios.n;
    return camposDeAjustes(app.ajustes);
  });
  let proveedor = $derived(guardados.proveedor);
  let modelo = $derived(guardados.modelo);
  let url = $derived(guardados.url);
  let clave = $derived(guardados.clave);
  const vista = $derived(vistaProveedor(proveedor));

  let msg = $state("");
  let datosMsg = $state("");
  let armado = $state(false);

  async function guarda() {
    app.ajustes = ajustesDeCampos({ proveedor, modelo, url, clave });
    await app.store.kset("ajustes", app.ajustes);
    msg = mensajeGuardado(app.ajustes);
    repinta("hoy");
  }

  async function prueba() {
    await guarda();
    msg = "Probando…";
    try {
      await pregunta(app.ajustes, { texto: "Responde solo con la palabra: ok", json: false });
      msg = mensajeConexion(app.ajustes);
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e);
    }
  }

  async function exporta() {
    datosMsg = "Preparando la copia…";
    try {
      const enlace = URL.createObjectURL(await app.store.exportaBlob());
      const a = document.createElement("a");
      a.href = enlace;
      a.download = nombreCopia();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(enlace), 60000);
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
  <h2>Inteligencia artificial</h2>
  <label class="a-f"
    ><span>Qué IA usar</span><select id="s-prov" bind:value={proveedor}>
      {#each opcionesProveedor() as o (o.id)}
        <option value={o.id}>{o.n}</option>
      {/each}
    </select></label
  >
  <p class="a-msg" id="s-prov-nota" role="status" aria-live="polite">{vista.nota}</p>
  <div id="s-propia" hidden={!vista.propia}>
    <label class="a-f"
      ><span>Modelo</span><input
        type="text"
        id="s-modelo"
        autocomplete="off"
        placeholder={vista.placeholderModelo}
        bind:value={modelo}
      /><small>Tiene que entender imágenes para analizar fotos.</small></label
    >
    <label class="a-f" id="s-url-f" hidden={!vista.pideUrl}
      ><span>URL de la API</span><input
        type="url"
        id="s-url"
        autocomplete="off"
        placeholder={vista.placeholderUrl}
        bind:value={url}
      /></label
    >
    <label class="a-f"
      ><span>Tu clave</span><input type="password" id="s-clave" autocomplete="off" bind:value={clave} /><small
        ><a
          id="s-clave-link"
          href={vista.enlaceClave || "#"}
          hidden={!vista.enlaceClave}
          target="_blank"
          rel="noopener">Consigue una clave ↗</a
        ></small
      ></label
    >
  </div>
  <div class="a-row">
    <button type="button" class="a-btn" id="s-guarda" onclick={guarda}>Guardar</button><button
      type="button"
      class="a-btn ghost"
      id="s-prueba"
      onclick={prueba}>Probar conexión</button
    ><span class="a-msg" id="s-msg" role="status" aria-live="polite">{msg}</span>
  </div>
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
<p class="a-note" style="margin-top: 18px">
  Proyecto de código abierto. Las recomendaciones son orientativas y no sustituyen a una asesora profesional.
</p>
