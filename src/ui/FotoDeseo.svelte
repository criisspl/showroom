<script lang="ts">
  // Imagen de una prenda propia de Deseos: su foto (de IndexedDB), o una estrella del color elegido.
  import { app } from "../state.js";
  import { ESTRELLA } from "../lib/deseos.ts";

  interface Props {
    foto: string | null | undefined;
    color: string;
  }
  const { foto, color }: Props = $props();

  let url: string | null = $state(null);
  let cargada = $state(false);
  $effect(() => {
    url = null;
    cargada = !foto;
    if (!foto) return;
    let vigente = true;
    app.store.urlFoto(foto).then((u: string | null) => {
      if (!vigente) return;
      url = u;
      cargada = true;
    });
    return () => {
      vigente = false;
    };
  });
</script>

{#if foto}
  <div class="w-pic foto">
    {#if url}
      <img alt="" src={url} />
    {:else if cargada}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG fijo de la app, no viene de la persona -->
      {@html ESTRELLA}
    {/if}
  </div>
{:else}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG fijo de la app, no viene de la persona -->
  <div class="w-pic" style:color={color || null}>{@html ESTRELLA}</div>
{/if}
