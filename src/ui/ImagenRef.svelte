<script lang="ts">
  // Foto de una referencia de gusto, cargada de IndexedDB.
  import { app } from "../state.js";

  const { foto }: { foto: string | null } = $props();

  let url: string | null = $state(null);
  $effect(() => {
    url = null;
    if (!foto) return;
    let vigente = true;
    app.store.urlFoto(foto).then((u: string | null) => {
      if (vigente) url = u;
    });
    return () => {
      vigente = false;
    };
  });
</script>

<div class="ref-foto">
  {#if url}<img alt="" src={url} />{/if}
</div>
