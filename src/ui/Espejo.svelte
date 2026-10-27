<script lang="ts">
  // «Espejo, 30 segundos»: checklist de cinco preguntas, sacadas del tipo de cuerpo, para antes de salir.
  import { app } from "../state.js";
  import { preguntasEspejo, veredictoEspejo } from "../lib/espejo.ts";
  import { cambios } from "./puente.svelte.ts";

  // El perfil no es reactivo: se relee cada vez que main.js avisa de un cambio
  const preguntas = $derived.by(() => {
    void cambios.n;
    return preguntasEspejo(app.perfil);
  });
  let marcadas = $state<boolean[]>([]);
  const sies = $derived(preguntas.filter((_, i) => marcadas[i]).length);
</script>

<section class="a-verd" aria-label="Espejo, 30 segundos">
  <small>Espejo, 30 segundos</small>
  <ol class="espejo-lista">
    {#each preguntas as pregunta, i (pregunta)}
      <li>
        <label><input type="checkbox" bind:checked={marcadas[i]} /> <span>{pregunta}</span></label>
      </li>
    {/each}
  </ol>
  <p class="a-verd-t"><b>{sies}/5</b> · {veredictoEspejo(sies)}</p>
  <button type="button" class="a-btn ghost" onclick={() => (marcadas = [])}>Otro look</button>
</section>
