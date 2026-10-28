<script lang="ts">
  // «Maquillaje para este look»: botón que despliega el maquillaje ajustado a la ropa y la ocasión de la tarjeta.
  import { app } from "../state.js";
  import { pinterest } from "../lib/dom.js";
  import { maquillajeDeLook, type PiezaMaq } from "../lib/maquillaje.ts";

  interface Props {
    prendas: PiezaMaq[];
    ocasion: string;
  }
  const { prendas, ocasion }: Props = $props();
  const id = $props.id();

  let abierto = $state(false);
  // El perfil no es reactivo: se lee al desplegar, no antes
  const datos = $derived(abierto ? maquillajeDeLook(app.perfil, prendas, ocasion) : null);
</script>

<button
  type="button"
  class="a-btn ghost"
  aria-expanded={abierto}
  aria-controls="maq-{id}"
  onclick={() => (abierto = !abierto)}
>
  Maquillaje para este look
</button>
{#if abierto}
  <div class="a-verd maq-look" id="maq-{id}">
    {#if datos}
      <dl>
        {#each datos.filas as [etiqueta, texto] (etiqueta)}
          <div>
            <dt>{etiqueta}</dt>
            <dd>{texto}</dd>
          </div>
        {/each}
      </dl>
      {#if datos.notas.length}
        <ul class="a-tips">
          {#each datos.notas as nota (nota)}
            <li>{nota}</li>
          {/each}
        </ul>
      {/if}
      <a class="pinbtn" href={pinterest(datos.busqueda)} target="_blank" rel="noopener"
        >Ver ideas en Pinterest ↗</a
      >
    {:else}
      <p class="a-msg">Haz primero tu análisis y te propongo un maquillaje para cada look.</p>
    {/if}
  </div>
{/if}
