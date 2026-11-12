<script lang="ts">
  // Pantalla Armario: resumen, filtro y rejilla de prendas; el formulario se abre aquí o en Deseos.
  import { app, estado } from "../state.js";
  import { CATS } from "../data/constants.ts";
  import { activas, usos, palDe } from "../lib/engine.ts";
  import { avisoPartesDeArriba, necesitaRevision } from "../lib/armario.ts";
  import { clasifica } from "../lib/color.ts";
  import {
    prendasDelFiltro,
    textoResumen,
    textoUsos,
    textoVacio,
    tiraDeColores
  } from "../lib/armariovista.ts";
  import { ver } from "./comun.js";
  import { cambios } from "./puente.svelte.ts";
  import { abreForm, form } from "./formPrenda.svelte.ts";
  import FormPrenda from "./FormPrenda.svelte";
  import Miniatura from "./Miniatura.svelte";
  import Opciones from "./Opciones.svelte";

  let filtro = $state("todo");

  const vista = $derived.by(() => {
    void cambios.n;
    const todas = activas();
    const us = usos();
    const enPaleta = todas.filter((p) => palDe(p) !== "evita").length;
    return {
      hay: todas.length > 0,
      tira: tiraDeColores(todas),
      resumen: textoResumen(todas.length, enPaleta),
      aviso: avisoPartesDeArriba(
        todas.map((p) => ({ cat: p.cat, pal: palDe(p) })),
        estado.PAL
      ),
      lista: prendasDelFiltro(todas, filtro).map((p) => ({
        p,
        fuera: palDe(p) === "evita",
        revisar: necesitaRevision(p),
        color: clasifica(p.color, estado.PAL).n,
        usos: textoUsos(us[p.id])
      }))
    };
  });

  function anade() {
    app.ui.pendiente = null;
    abreForm(null);
  }

  function compra() {
    ver("deseos");
    abreForm(null, null, "compra");
  }
</script>

<header class="a-head">
  <p class="eyebrow">Tus prendas</p>
  <h1 class="a-h1">Armario</h1>
</header>
<div class="a-sum" id="a-sum">
  {#if vista.hay}
    <div class="a-strip">
      {#each vista.tira as c, i (i)}<i style:background={c}></i>{/each}
    </div>
    <p>{vista.resumen}</p>
    {#if vista.aviso}<p class="hand">{vista.aviso}</p>{/if}
  {/if}
</div>
<div class="a-row">
  <button type="button" class="a-btn" id="a-add" onclick={anade}>Añadir prenda</button><button
    type="button"
    class="a-btn ghost"
    id="a-buy"
    onclick={compra}>¿Lo compro?</button
  >
</div>
{#if form.abierto && form.lugar === "armario"}<FormPrenda />{/if}
<div class="opts-r a-filter" id="a-filter">
  <Opciones nombre="a-filter" items={[["todo", "Todo"], ...CATS]} bind:valor={filtro} />
</div>
<ul class="a-grid" id="a-grid">
  {#if !vista.lista.length}
    <li class="a-empty">{textoVacio(vista.hay)}</li>
  {/if}
  {#each vista.lista as it (it.p.id)}
    <li>
      <button type="button" class="a-item" onclick={() => abreForm(it.p)}>
        <Miniatura p={it.p}>
          {#if it.fuera}<span class="a-badge">Fuera de paleta</span>{:else if it.revisar}<span
              class="a-badge rev">Revisar</span
            >{/if}
        </Miniatura>
        <b>{it.p.nombre || "Sin nombre"}</b>
        <span class="meta"><i style:background={it.p.color}></i><span>{it.color} · {it.usos}</span></span>
      </button>
    </li>
  {/each}
</ul>
<p class="a-foot">
  <button type="button" class="a-link" onclick={() => ver("deseos")}>Ver qué prendas te faltan</button>
</p>
