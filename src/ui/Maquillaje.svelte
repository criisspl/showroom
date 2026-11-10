<script lang="ts">
  // «Maquillaje para este look»: botón que despliega el maquillaje ajustado a la ropa y la ocasión de la tarjeta.
  // «Afinar con la IA» envía la descripción del look y el resumen del análisis, y siempre pide permiso antes.
  import { app } from "../state.js";
  import { pinterest } from "../lib/dom.js";
  import { hayIA, preguntaJSON } from "../lib/ai.ts";
  import { avisoEnvio } from "../lib/permisoia.ts";
  import {
    aplicaAfinado,
    limpiaAfinado,
    maquillajeDeLook,
    promptAfinar,
    type MaquillajeDeLook,
    type PiezaMaq
  } from "../lib/maquillaje.ts";

  interface Props {
    prendas: PiezaMaq[];
    ocasion: string;
    /** Nombre de la ocasión, para describir el look a la IA. */
    ocasionNombre: string;
  }
  const { prendas, ocasion, ocasionNombre }: Props = $props();
  const id = $props.id();

  let abierto = $state(false);
  // El perfil y los ajustes no son reactivos: se leen al desplegar, no antes
  const base = $derived(abierto ? maquillajeDeLook(app.perfil, prendas, ocasion) : null);
  const ia = $derived(
    abierto
      ? {
          hay: hayIA(app.ajustes),
          aviso: avisoEnvio(
            app.ajustes,
            "las prendas y colores de este look, la ocasión y el resumen de tu análisis (sin fotos)"
          )
        }
      : null
  );

  let pidiendo = $state(false);
  let afinando = $state(false);
  let afinado = $state<MaquillajeDeLook | null>(null);
  let mensaje = $state("");
  const datos = $derived(afinado ?? base);

  async function afina() {
    pidiendo = false;
    afinando = true;
    mensaje = "";
    try {
      const d = await preguntaJSON(app.ajustes, {
        sistema: "Eres una maquilladora personal. Hablas español de España.",
        texto: promptAfinar(app.perfil, prendas, ocasionNombre)
      });
      const a = limpiaAfinado(d);
      if (!a || !base) mensaje = "No ha salido una propuesta clara. Prueba otra vez.";
      else afinado = aplicaAfinado(base, a);
    } catch (e) {
      mensaje = (e as Error)?.message || "No he podido consultar a la IA.";
    } finally {
      afinando = false;
    }
  }
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
      {#if afinado}
        <p class="a-msg">Afinado por la IA para este look</p>
      {/if}
      <dl>
        {#each datos.filas as [etiqueta, texto] (etiqueta)}
          <div>
            <dt>{etiqueta}</dt>
            <dd>{texto}</dd>
          </div>
        {/each}
      </dl>
      {#if datos.colores.length}
        <div class="dots" aria-hidden="true">
          {#each datos.colores as hex, i (i)}
            <i style:background={hex}></i>
          {/each}
        </div>
      {/if}
      {#if datos.notas.length}
        <ul class="a-tips">
          {#each datos.notas as nota (nota)}
            <li>{nota}</li>
          {/each}
        </ul>
      {/if}
      <div class="a-row">
        {#each datos.enlaces as [etiqueta, busqueda] (etiqueta)}
          <a class="pinbtn" href={pinterest(busqueda)} target="_blank" rel="noopener">{etiqueta} ↗</a>
        {/each}
      </div>
      {#if ia?.hay}
        {#if pidiendo}
          <div class="ref-permiso" role="group" aria-label="Permiso para enviar el look">
            <p>{ia.aviso}</p>
            <button type="button" class="a-btn" onclick={afina}>Sí, enviarlo</button>
            <button type="button" class="a-btn ghost" onclick={() => (pidiendo = false)}>No</button>
          </div>
        {:else}
          <button type="button" class="a-btn ghost" disabled={afinando} onclick={() => (pidiendo = true)}>
            {afinando ? "Pensando…" : afinado ? "Afinar otra vez con la IA" : "Afinar con la IA"}
          </button>
        {/if}
        <p class="a-msg" role="status" aria-live="polite">{mensaje}</p>
      {/if}
    {:else}
      <p class="a-msg">Haz primero tu análisis y te propongo un maquillaje para cada look.</p>
    {/if}
  </div>
{/if}
