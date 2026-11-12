<script lang="ts">
  // Copiar los datos a otro almacenamiento (fotos incluidas). El actual no se toca; un destino con datos
  // solo se reemplaza con confirmación expresa y tras descargar una copia suya.
  import { app } from "../state.js";
  import { destinosPosibles, copiaAOtroAlmacen, textoFase, textoResultado } from "../lib/almacenes.ts";
  import { ALMACENES } from "../lib/config.ts";
  import type { TipoAlmacen } from "../lib/config.ts";
  import { ErrorMigracion } from "../lib/migracion.ts";
  import { nombreCopia } from "../lib/ajustes.ts";
  import { cambios } from "./puente.svelte.ts";
  import { descarga } from "./descarga.ts";

  const actual = $derived.by(() => {
    void cambios.n;
    return app.config.almacenamiento.tipo as TipoAlmacen;
  });
  const destinos = $derived(destinosPosibles(actual));
  let elegido = $state<TipoAlmacen | "">("");
  const destino = $derived(
    destinos.some((d) => d.id === elegido) ? (elegido as TipoAlmacen) : destinos[0]?.id
  );
  let reemplazar = $state(false);
  let enCurso = $state(false);
  let escribiendo = $state(false);
  let msg = $state("");
  let control: AbortController | null = null;

  async function copia() {
    if (!destino || enCurso) return;
    enCurso = true;
    escribiendo = false;
    msg = "";
    control = new AbortController();
    try {
      const r = await copiaAOtroAlmacen(app.store, destino, {
        reemplazar,
        senal: control.signal,
        copiaPrevia: async (previa) => {
          descarga(
            new Blob([JSON.stringify(previa)], { type: "application/json" }),
            "destino-antes-" + nombreCopia()
          );
        },
        alProgreso: (p) => {
          escribiendo = p.fase === "escribiendo" || p.fase === "verificando";
          msg = textoFase(p.fase, p.paso, p.pasos);
        }
      });
      msg = textoResultado(r);
    } catch (e) {
      msg =
        e instanceof ErrorMigracion
          ? e.message
          : "No he podido copiar los datos. Tus datos de origen siguen intactos.";
    } finally {
      enCurso = false;
      control = null;
    }
  }
</script>

<div class="card paso" id="s-migra">
  <h2>Copiar a otro almacenamiento</h2>
  <p class="a-msg">
    Ahora tus datos están en: {ALMACENES[actual].n}. Puedes copiarlo todo, fotos incluidas, a otro
    almacenamiento; el actual no se toca.
  </p>
  {#if destinos.length === 0}
    <p class="a-note" id="s-migra-nada">
      Todavía no hay otro almacenamiento disponible. Cuando lo haya, podrás copiar aquí tus datos.
    </p>
  {:else}
    <div class="a-row">
      <label
        >Copiar a
        <select id="s-migra-destino" bind:value={elegido} disabled={enCurso}>
          {#each destinos as d (d.id)}
            <option value={d.id}>{d.n}</option>
          {/each}
        </select>
      </label>
    </div>
    <label class="a-msg">
      <input type="checkbox" id="s-migra-reemplaza" bind:checked={reemplazar} disabled={enCurso} />
      Si el destino ya tiene datos, reemplazarlos (antes se descarga una copia suya)
    </label>
    <div class="a-row">
      <button type="button" class="a-btn ghost" id="s-migra-go" onclick={copia} disabled={enCurso}
        >Copiar</button
      >
      <button
        type="button"
        class="a-btn ghost"
        id="s-migra-cancela"
        onclick={() => control?.abort()}
        hidden={!enCurso}
        disabled={escribiendo}>Cancelar</button
      >
    </div>
  {/if}
  <p class="a-msg" id="s-migra-msg" role="status" aria-live="polite">{msg}</p>
</div>
