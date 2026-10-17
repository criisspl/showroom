<script lang="ts">
  // Miniatura de una prenda: foto si la hay (se carga de IndexedDB), si no, su color con la categoría.
  import { app } from "../state.js";
  import { CATN } from "../data/constants.ts";
  import type { Prenda } from "../lib/tipos.ts";

  const { p }: { p: Prenda | null } = $props();

  let url: string | null = $state(null);
  let sinFoto = $state(false);
  $effect(() => {
    url = null;
    sinFoto = false;
    if (!p?.foto) return;
    let vigente = true;
    app.store.urlFoto(p.foto).then((u: string | null) => {
      if (!vigente) return;
      url = u;
      sinFoto = !u;
    });
    return () => {
      vigente = false;
    };
  });
  const src = $derived(url || (!p?.foto && p?.mini) || null);
  const etiqueta = $derived(!src && (!p?.foto || sinFoto));
</script>

<div class="a-th" style:background={p?.color || "#D9C9AE"}>
  {#if src}
    <img alt="" {src} />
  {:else if etiqueta}
    <span class="a-th-l">{p ? CATN[p.cat] || "" : ""}</span>
  {/if}
</div>
