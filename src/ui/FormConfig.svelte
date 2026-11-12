<script lang="ts">
  // Formulario de configuración: dónde se guardan los datos y qué IA se usa (con su clave cifrada).
  // Lo comparten Ajustes y la configuración inicial; `pref` evita ids repetidos si coinciden en la página.
  import { app, repinta } from "../state.js";
  import { pregunta } from "../lib/ai.ts";
  import {
    alElegirProveedor,
    camposDeConfig,
    configDeCampos,
    errorCampos,
    estadoClave,
    mensajeConexion,
    mensajeGuardado,
    opcionesAlmacen,
    opcionesProveedor,
    vistaProveedor
  } from "../lib/ajustes.ts";
  import { desbloquea, guardaClave, quitaClave } from "../lib/claveia.ts";
  import { ALMACENES, ajustesDeConfig, guardaConfig } from "../lib/config.ts";
  import { falla } from "./comun.js";
  import { cambios } from "./puente.svelte.ts";

  interface Props {
    pref: string;
    textoGuardar?: string;
    /** Se llama tras guardar con éxito (no tras «Probar conexión»). */
    alGuardar?: () => void | Promise<void>;
  }
  const { pref, textoGuardar = "Guardar", alGuardar }: Props = $props();

  // La configuración no es reactiva: los campos se rellenan de nuevo cada vez que main.js avisa de un cambio
  // y siguen siendo editables hasta entonces.
  const guardados = $derived.by(() => {
    void cambios.n;
    return camposDeConfig(app.config);
  });
  let almacen = $derived(guardados.almacen);
  let proveedor = $derived(guardados.proveedor);
  let modelo = $derived(guardados.modelo);
  let url = $derived(guardados.url);
  const estado = $derived.by(() => {
    void cambios.n;
    return estadoClave(app.ajustes, app.claveCifrada);
  });
  // Ni la clave ni la contraseña se guardan en ningún sitio: solo viven en estos campos hasta usarlas
  let clave = $state("");
  let contrasena = $state("");
  let cambiando = $state(false);
  const vista = $derived(vistaProveedor(proveedor));
  const pideClave = $derived(vista.propia && (estado === "ninguna" || cambiando));
  const muestraClave = $derived(vista.propia || estado === "sin-cifrar");

  let msg = $state("");

  function eligeProveedor() {
    ({ modelo, url } = alElegirProveedor(proveedor));
  }

  async function guarda(): Promise<boolean> {
    const nueva = vista.propia ? clave.trim() : "";
    // Una clave antigua en claro se cifra con la contraseña que se escriba ahora
    const aCifrar = nueva || (estado === "sin-cifrar" ? (app.ajustes.clave ?? "") : "");
    const campos = { almacen, proveedor, modelo, url, clave: nueva, contrasena };
    const error = errorCampos(campos, aCifrar);
    if (error) {
      msg = error;
      return false;
    }
    try {
      const cfg = configDeCampos(campos);
      // Una clave guardada es para su destino: si cambia el proveedor o la URL y no se escribe otra, se quita
      const cambiaDestino = cfg.ia.proveedor !== app.config.ia.proveedor || cfg.ia.url !== app.config.ia.url;
      const descarta = cambiaDestino && !aCifrar && (estado !== "ninguna" || !!app.ajustes.clave);
      if (descarta) await quitaClave(app.store);
      await guardaConfig(app.store, cfg);
      app.config = cfg;
      app.configElegida = true;
      let viva = descarta ? "" : (app.ajustes.clave ?? "");
      let bloqueada = descarta ? false : !!app.ajustes.bloqueada;
      if (descarta) app.claveCifrada = false;
      if (aCifrar) {
        await guardaClave(app.store, aCifrar, contrasena);
        app.claveCifrada = true;
        viva = aCifrar;
        bloqueada = false;
      }
      app.ajustes = ajustesDeConfig(cfg, { clave: viva, bloqueada });
      clave = "";
      contrasena = "";
      cambiando = false;
      msg = mensajeGuardado(app.ajustes);
      repinta("ajustes", "hoy");
      return true;
    } catch (e) {
      msg = "";
      falla(e);
      return false;
    }
  }

  async function guardaYSigue() {
    if (await guarda()) await alGuardar?.();
  }

  async function prueba() {
    if (!(await guarda())) return;
    msg = "Probando…";
    try {
      await pregunta(app.ajustes, { texto: "Responde solo con la palabra: ok", json: false });
      msg = mensajeConexion(app.ajustes);
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e);
    }
  }

  async function desbloquear() {
    try {
      const k = await desbloquea(app.store, contrasena);
      app.ajustes = ajustesDeConfig(app.config, { clave: k });
      contrasena = "";
      msg = "Clave desbloqueada en esta sesión.";
      repinta("ajustes", "hoy");
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e);
    }
  }

  async function quitar() {
    try {
      await quitaClave(app.store);
      app.claveCifrada = false;
      app.ajustes = ajustesDeConfig(app.config);
      msg = "Clave quitada.";
      repinta("ajustes", "hoy");
    } catch (e) {
      falla(e);
    }
  }
</script>

<h2>Dónde se guardan tus datos</h2>
<label class="a-f"
  ><span>Almacenamiento</span><select id={pref + "-alm"} bind:value={almacen}>
    {#each opcionesAlmacen() as o (o.id)}
      <option value={o.id}>{o.n}</option>
    {/each}
  </select></label
>
<p class="a-msg">{ALMACENES[almacen].nota}</p>

<h2>Inteligencia artificial</h2>
<label class="a-f"
  ><span>Qué IA usar</span><select id={pref + "-prov"} bind:value={proveedor} onchange={eligeProveedor}>
    {#each opcionesProveedor() as o (o.id)}
      <option value={o.id}>{o.n}</option>
    {/each}
  </select></label
>
<p class="a-msg" id={pref + "-prov-nota"} role="status" aria-live="polite">{vista.nota}</p>
<div id={pref + "-propia"} hidden={!vista.propia}>
  <label class="a-f"
    ><span>Modelo</span><input
      type="text"
      id={pref + "-modelo"}
      autocomplete="off"
      placeholder={vista.placeholderModelo}
      bind:value={modelo}
    /><small>Tiene que entender imágenes para analizar fotos.</small></label
  >
  <label class="a-f"
    ><span>URL de la API</span><input
      type="url"
      id={pref + "-url"}
      autocomplete="off"
      placeholder={vista.placeholderUrl}
      bind:value={url}
    /><small>Tiene que empezar por https://</small></label
  >
</div>
{#if muestraClave}
  {#if estado === "sin-cifrar"}
    <p class="a-msg" role="status">
      Tu clave está guardada sin cifrar (de una versión anterior). Escribe una contraseña y se cifrará al
      guardar.
    </p>
  {:else if estado === "bloqueada"}
    <p class="a-msg" role="status">
      Tu clave está guardada cifrada. Escribe tu contraseña para usarla en esta sesión.
    </p>
  {:else if estado === "desbloqueada"}
    <p class="a-msg" role="status">Tu clave está guardada cifrada y desbloqueada en esta sesión.</p>
  {/if}
  {#if pideClave}
    <label class="a-f"
      ><span>Tu clave</span><input
        type="password"
        id={pref + "-clave"}
        autocomplete="off"
        bind:value={clave}
      /><small
        ><a
          id={pref + "-clave-link"}
          href={vista.enlaceClave || "#"}
          hidden={!vista.enlaceClave}
          target="_blank"
          rel="noopener">Consigue una clave ↗</a
        ></small
      ></label
    >
  {/if}
  {#if pideClave || estado === "sin-cifrar" || estado === "bloqueada"}
    <label class="a-f"
      ><span>Contraseña de tu clave</span><input
        type="password"
        id={pref + "-contrasena"}
        autocomplete="off"
        bind:value={contrasena}
      /><small
        >Cifra la clave en este navegador. No se puede recuperar: si la olvidas, tendrás que escribir la clave
        otra vez.</small
      ></label
    >
  {/if}
  <div class="a-row">
    {#if estado === "bloqueada" && !cambiando}
      <button type="button" class="a-btn ghost" id={pref + "-desbloquea"} onclick={desbloquear}
        >Desbloquear</button
      >
    {/if}
    {#if (estado === "bloqueada" || estado === "desbloqueada") && !cambiando}
      <button type="button" class="a-btn ghost" id={pref + "-cambia"} onclick={() => (cambiando = true)}
        >Cambiar clave</button
      >
    {/if}
    {#if estado === "bloqueada" || estado === "desbloqueada"}
      <button type="button" class="a-btn ghost" id={pref + "-quita"} onclick={quitar}>Quitar clave</button>
    {/if}
  </div>
{/if}
<div class="a-row">
  <button type="button" class="a-btn" id={pref + "-guarda"} onclick={guardaYSigue}>{textoGuardar}</button
  ><button type="button" class="a-btn ghost" id={pref + "-prueba"} onclick={prueba}>Probar conexión</button
  ><span class="a-msg" id={pref + "-msg"} role="status" aria-live="polite">{msg}</span>
</div>
