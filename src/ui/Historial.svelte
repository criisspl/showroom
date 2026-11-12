<script lang="ts">
  // Pestaña Historial: lo que te has puesto, lo guardado, lo que la app ha aprendido y las altas.
  import { untrack } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { hoyISO, fechaLarga } from "./dom.js";
  import { app } from "../state.js";
  import { byId, estado, ocaDe, bandaDe } from "../lib/engine.ts";
  import { cifras, puestos, guardados, altasPorMes, aprendizaje } from "../lib/historial.ts";
  import type { Outfit } from "../lib/tipos.ts";
  import { falla } from "./comun.js";
  import { cambios } from "./puente.svelte.ts";
  import Miniatura from "./Miniatura.svelte";

  // El estado del motor no es reactivo: se recalcula cada vez que main.js avisa de un cambio
  const datos = $derived.by(() => {
    void cambios.n;
    return {
      cifras: cifras(),
      puestos: puestos().slice(0, 60),
      guardados: guardados(),
      aprendizaje: aprendizaje(),
      altas: altasPorMes()
    };
  });

  // Botones que piden una segunda pulsación antes de borrar, y outfits guardados ya anotados hoy
  const armados = new SvelteSet<string>();
  const anotados = new SvelteSet<string>();

  function titulo(o: Outfit) {
    const oca = o.ocasion ? ocaDe(o.ocasion) : null,
      banda = o.banda ? bandaDe(o.banda) : null;
    return (
      (o.fecha ? fechaLarga(o.fecha) + " · " : "") +
      (oca ? oca.n : "") +
      (banda ? " · " + banda.n.toLowerCase() : "") +
      (o.lluvia ? " con lluvia" : "")
    );
  }

  function meLoPongo(o: Outfit) {
    anotados.add(o.id);
    app.store
      .add("outfits", {
        prendas: o.prendas,
        ocasion: o.ocasion,
        banda: o.banda,
        lluvia: !!o.lluvia,
        fecha: hoyISO(),
        fav: false,
        creada: new Date().toISOString(),
        origen: o.origen || "local"
      })
      .catch(falla);
  }

  function quita(o: Outfit) {
    if (!armados.has(o.id)) return armados.add(o.id);
    app.store.del("outfits", o.id).catch(falla);
  }

  let borrando = $state(false);
  // Como antes, cada cambio en los datos vuelve a dejar los botones como estaban
  $effect.pre(() => {
    void cambios.n;
    untrack(() => {
      armados.clear();
      anotados.clear();
      borrando = false;
    });
  });
  async function borraValoraciones() {
    if (!armados.has("votos")) return armados.add("votos");
    borrando = true;
    for (const v of estado.V.slice()) await app.store.del("votos", v.id);
  }
</script>

{#snippet fila(o: Outfit, modo: "uso" | "fav")}
  <li class="a-fit">
    <p class="who">{titulo(o)}</p>
    <ul class="a-pieces">
      {#each o.prendas || [] as id, i (id + i)}
        {@const p = byId(id)}
        <li><Miniatura {p} /><span>{p ? p.nombre : "Prenda eliminada"}</span></li>
      {/each}
    </ul>
    <div class="a-row">
      {#if modo === "fav"}
        <button type="button" class="a-btn" disabled={anotados.has(o.id)} onclick={() => meLoPongo(o)}>
          Me lo pongo hoy
        </button>
      {/if}
      <button type="button" class="a-btn ghost" onclick={() => quita(o)}>
        {armados.has(o.id) ? "Pulsa otra vez para quitar" : "Quitar"}
      </button>
    </div>
  </li>
{/snippet}

{#snippet lista(cs: { n: string; t: string }[])}
  <ul class="a-stats">
    {#each cs as c (c.t)}
      <li><b>{c.n}</b><span>{c.t}</span></li>
    {/each}
  </ul>
{/snippet}

<header class="a-head">
  <p class="eyebrow">Lo que llevas y lo que entra</p>
  <h1 class="a-h1">Historial</h1>
</header>
<ul class="a-stats" id="a-stats">
  {#each datos.cifras as c (c.t)}
    <li><b>{c.n}</b><span>{c.t}</span></li>
  {/each}
</ul>

<h2 class="a-h2">Outfits que te has puesto</h2>
<ul class="a-log" id="a-usos">
  {#each datos.puestos as o (o.id)}
    {@render fila(o, "uso")}
  {:else}
    <li class="a-empty">Cuando pulses «Me lo pongo hoy» en un outfit, aparecerá aquí con su fecha.</li>
  {/each}
</ul>

<h2 class="a-h2">Guardados</h2>
<ul class="a-log" id="a-favs">
  {#each datos.guardados as o (o.id)}
    {@render fila(o, "fav")}
  {:else}
    <li class="a-empty">Aquí se quedan los outfits que guardes para otro día.</li>
  {/each}
</ul>

<h2 class="a-h2">Tus valoraciones</h2>
<div id="a-votos">
  {#if datos.aprendizaje}
    {@render lista(datos.aprendizaje.cifras)}
    {#if datos.aprendizaje.frases.length}
      <p class="a-month">Lo que voy aprendiendo</p>
      <ul class="chips">
        {#each datos.aprendizaje.frases as f (f)}<li>{f}</li>{/each}
      </ul>
    {/if}
    <div class="a-row" style:margin-top="12px">
      <button type="button" class="a-btn ghost" disabled={borrando} onclick={borraValoraciones}>
        {armados.has("votos") ? "Pulsa otra vez para borrarlas todas" : "Borrar valoraciones"}
      </button>
    </div>
  {:else}
    <p class="a-note">Cuando valores un outfit con «Sí» o «No», lo que aprenda de ti aparecerá aquí.</p>
  {/if}
</div>

<h2 class="a-h2">Altas en el armario</h2>
<div id="a-altas">
  {#each datos.altas as mes (mes.titulo)}
    <p class="a-month">{mes.titulo}</p>
    <ul class="a-mini">
      {#each mes.prendas as p (p.id)}
        <li class={p.activa === false ? "off" : ""}>
          <Miniatura {p} /><span>{p.nombre + (p.activa === false ? " (retirada)" : "")}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="a-note">Cada prenda que subas quedará aquí con su fecha de alta.</p>
  {/each}
</div>
