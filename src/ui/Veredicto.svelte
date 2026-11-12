<script lang="ts">
  // Veredicto de «¿Lo compro?»: a favor, en contra, con qué la llevarías y qué hacer con la prenda.
  // «Segunda opinión de la IA» envía la foto y el armario, y siempre pide permiso antes.
  import { onMount } from "svelte";
  import { app, estado, repinta } from "../state.js";
  import { activas } from "../lib/engine.ts";
  import { hayIA, imagenParaIA, preguntaJSON } from "../lib/ai.ts";
  import { textoPerfil } from "../lib/analysis.ts";
  import { avisoEnvio, DATOS_SEGUNDA_OPINION } from "../lib/permisoia.ts";
  import {
    VERD,
    armarioParaIA,
    textoOpinionIA,
    textoSegundaOpinion,
    type PrendaLeida
  } from "../lib/prendaform.ts";
  import type { Evaluacion } from "../lib/motor/compra.ts";
  import { falla } from "./comun.js";
  import { fotoParaGuardar, fotos } from "./formPrenda.svelte.ts";

  interface Props {
    d: PrendaLeida;
    r: Evaluacion;
    /** «Ya la he comprado»: la guarda como prenda del armario. */
    onComprada: () => void;
  }
  const { d, r, onComprada }: Props = $props();

  let caja: HTMLDivElement | undefined = $state();
  let msg = $state("");
  let guardando = $state(false);
  let anadida = $state(false);
  let ultimo: string | null = $state(null);
  let pidiendo = $state(false);
  let aviso = $state("");
  let opinando = $state(false);
  let si: HTMLButtonElement | undefined = $state();
  const hayOtra = hayIA(app.ajustes);

  async function guardaLista(auto: boolean) {
    guardando = true;
    msg = "Guardando…";
    try {
      const f = await fotoParaGuardar();
      ultimo = await app.store.add("deseos", {
        ...d,
        propio: true,
        estado: "quiero",
        cuando: new Date().toISOString(),
        veredicto: r.v,
        motivo: r.resumen,
        foto: f ? f.foto : null,
        mini: f ? f.mini : null
      });
      msg = auto ? "La he añadido a tu lista de Deseos." : "Añadida a tu lista de Deseos.";
      anadida = true;
      app.ui.wfil = "mia";
      repinta("deseos");
    } catch (e) {
      guardando = false;
      msg = "";
      falla(e);
    }
  }

  async function deshacer() {
    if (ultimo) await app.store.del("deseos", ultimo);
    ultimo = null;
    msg = "Quitada de tu lista.";
    anadida = false;
    guardando = false;
  }

  function yaComprada() {
    if (ultimo) app.store.del("deseos", ultimo);
    onComprada();
  }

  function pidePermiso() {
    aviso = avisoEnvio(app.ajustes, DATOS_SEGUNDA_OPINION);
    pidiendo = true;
  }
  $effect(() => {
    if (pidiendo) si?.focus();
  });

  async function segundaOpinion() {
    pidiendo = false;
    opinando = true;
    msg = "La IA está mirando la prenda…";
    const texto = textoSegundaOpinion(textoPerfil(app.perfil), armarioParaIA(activas(), estado.PAL), d, r);
    try {
      const imagenes = fotos.photo ? [await imagenParaIA(fotos.photo.blob, 768)] : [];
      msg = textoOpinionIA(await preguntaJSON(app.ajustes, { texto, imagenes }));
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e);
    }
    opinando = false;
  }

  onMount(() => {
    caja?.scrollIntoView({ block: "start" });
    if (r.v === "si") guardaLista(true);
  });
</script>

{#snippet lista(titulo: string, items: string[])}
  <div>
    <small>{titulo}</small>
    <ul class="lst">
      {#each items.length ? items : ["Nada destacable."] as x, i (i)}<li>{x}</li>{/each}
    </ul>
  </div>
{/snippet}

<div class={"a-verd v-" + r.v} id="a-verd" bind:this={caja}>
  <small>Mi veredicto</small>
  <p class="a-verd-t">{VERD[r.v]}</p>
  <p class="a-msg">{r.resumen}</p>
  <div class="a-verd-cols">
    {@render lista("A favor", r.pro)}
    {@render lista("En contra", r.contra)}
  </div>
  {#if r.socios.length}
    <small>La llevarías con</small>
    <ul class="chips mini">
      {#each r.socios as p (p.id)}<li>{p.nombre}</li>{/each}
    </ul>
  {/if}
  {#if r.ocas.length}<p class="a-msg">Te sirve para: {r.ocas.join(", ")}.</p>{/if}
  <div class="a-row">
    <button
      type="button"
      class={r.v === "no" ? "a-btn ghost" : "a-btn"}
      hidden={anadida}
      disabled={guardando}
      onclick={() => guardaLista(false)}
      >{r.v === "no" ? "Añadir a Mi lista igualmente" : "Añadir a Mi lista"}</button
    >
    <button type="button" class="a-btn ghost" onclick={yaComprada}>Ya la he comprado</button>
    {#if hayOtra}
      <button type="button" class="a-btn ghost" hidden={pidiendo} disabled={opinando} onclick={pidePermiso}
        >Segunda opinión de la IA</button
      >
      {#if pidiendo}
        <div class="ref-permiso" role="group" aria-label="Permiso para enviar a la IA">
          <p>{aviso}</p>
          <button type="button" class="a-btn" bind:this={si} onclick={segundaOpinion}>Sí, enviarlos</button>
          <button type="button" class="a-btn ghost" onclick={() => (pidiendo = false)}>No</button>
        </div>
      {/if}
    {/if}
    {#if anadida}
      <button type="button" class="a-btn ghost" onclick={deshacer}>Deshacer</button>
    {/if}
  </div>
  <p class="a-msg" role="status">{msg}</p>
</div>
