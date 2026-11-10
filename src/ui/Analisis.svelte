<script lang="ts">
  // Pestaña Análisis: tu informe visual (color, cuerpo, rostro, maquillaje, pelo, estética y looks)
  // e «Inspo a la carta»: galerías de Pinterest según estación del año y ocasión.
  import { app } from "../state.js";
  import { pinterest } from "../lib/dom.js";
  import { OCAS } from "../data/constants.ts";
  import {
    ESTACIONES,
    SECCIONES,
    busquedasInspo,
    colorDe,
    coloresPelo,
    esteticaDe,
    estacionDelMes,
    ficha,
    hexDeCambio,
    textoAnalisisIA
  } from "../lib/analisis.ts";
  import type { ColorNombrado, NotaZona, Perfil } from "../lib/tipos.ts";
  import { ver } from "./comun.js";
  import { abreIA } from "./bienvenida.js";
  import { cambios } from "./puente.svelte.ts";

  // El estado de la app no es reactivo: se relee cada vez que main.js avisa de un cambio
  const datos = $derived.by(() => {
    void cambios.n;
    const p: Perfil | null = app.perfil;
    return p && { p, c: colorDe(p), e: esteticaDe(p), ficha: ficha(p) };
  });

  // Estación y ocasión elegidas en «Inspo a la carta»
  let est = $state(estacionDelMes(new Date().getMonth()));
  let oca = $state("diario");
  const inspo = $derived(datos ? busquedasInspo(datos.p, est, oca) : []);

  function irA(ev: MouseEvent, id: string) {
    ev.preventDefault();
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }
</script>

{#snippet pinBtn(q: string, txt: string)}
  <a class="pinbtn" href={pinterest(q)} target="_blank" rel="noopener">{txt} ↗</a>
{/snippet}

{#snippet chips(items: string[], cls = "chips")}
  <ul class={cls}>
    {#each items.filter(Boolean) as x, i (i)}
      <li>{x}</li>
    {/each}
  </ul>
{/snippet}

{#snippet swatches(lista: ColorNombrado[])}
  <div class="sws">
    {#each lista as c, i (i)}
      <div class="sw">
        <span class="c" style:background={c.hex}></span><span class="n">{c.n}</span>
      </div>
    {/each}
  </div>
{/snippet}

{#snippet legend(items: NotaZona[])}
  <ol class="legend">
    {#each items as k, i (i)}
      <li><b>{k.zona}</b><span>{k.nota}</span></li>
    {/each}
  </ol>
{/snippet}

{#snippet sub(t: string)}
  <p class="sub">{t}</p>
{/snippet}

{#if datos}
  {@const { p, c, e } = datos}
  {@const b = p.cuerpo || {}}
  <header class="a-head">
    <p class="eyebrow">Tu análisis</p>
    <h1 class="a-h1">{e.nombre || "Mi análisis"}</h1>
    {#if e.subtitulo}<p class="hand">{e.subtitulo}</p>{/if}
  </header>
  <ul class="datos">
    {#each datos.ficha as [k, v] (k)}
      <li><small>{k}</small><b>{v}</b></li>
    {/each}
  </ul>
  <!-- Sin librerías ni servidores: el navegador genera el PDF desde esta misma pantalla -->
  <button type="button" class="a-btn ghost no-print" onclick={() => window.print()}
    >Guardar mi guía en PDF</button
  >
  {#if p.resumen}<p class="a-note">{p.resumen}</p>{/if}
  {#if p.origen !== "ia"}
    <div class="card a-cta">
      <p>{textoAnalisisIA(p.origen)}</p>
      <button type="button" class="a-btn ghost" onclick={abreIA}>Análisis más completo con IA</button>
    </div>
  {/if}
  <div class="toc">
    {#each SECCIONES as [id, t] (id)}
      <a href={"#" + id} onclick={(ev) => irA(ev, id)}>{t}</a>
    {/each}
  </div>

  <!-- Color -->
  <section class="b" id="an-color">
    <h2>Color</h2>
    {#if [c.estacion, c.intensidad].filter(Boolean).join(": ")}
      <p class="verdict">{[c.estacion, c.intensidad].filter(Boolean).join(": ")}</p>
    {/if}
    {#if c.explicacion}<p>{c.explicacion}</p>{/if}
    {#if (c.alternativas || []).length && p.origen !== "ia"}
      <p class="a-note">
        Estaciones vecinas que también podrían ser las tuyas: {(c.alternativas || []).join(" y ")}.
      </p>
    {/if}
    <div class="card">
      {@render sub("Tus mejores colores")}
      {@render swatches(c.paleta || [])}
      {#if (c.neutros || []).length}
        {@render sub("Neutros")}
        {@render swatches(c.neutros || [])}
      {/if}
      {#if (c.metales || []).length}
        {@render sub("Metales")}
        {@render chips(c.metales || [], "chips mini")}
      {/if}
    </div>
    {#if (c.evitar || []).length}
      <div class="card">
        {@render sub("Mejor evitar junto a la cara · y cámbialo por")}
        <div class="swaps">
          {#each c.evitar || [] as x, i (i)}
            <div class="swap">
              <span class="c" style:background={x.hex}></span><span>→</span><span
                class="c"
                style:background={hexDeCambio(c, x)}
              ></span><span><s>{x.n}</s>{" " + (x.cambio || "")}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    {#if (c.combinaciones || []).length}
      {@render sub("Combinaciones 60 · 30 · 10")}
      <ul class="a-combos">
        {#each c.combinaciones || [] as k, i (i)}
          <li>
            <div class="a-trio">
              {#each k.hex as h, j (j)}<i style:background={h}></i>{/each}
            </div>
            <b>{k.nombre}</b>
            {#if k.uso}<span>{k.uso}</span>{/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <!-- Cuerpo -->
  <section class="b" id="an-cuerpo">
    <h2>Cuerpo</h2>
    {#if b.tipo}<p class="verdict">{b.tipo}</p>{/if}
    {#if b.explicacion}<p>{b.explicacion}</p>{/if}
    {#if (b.claves || []).length}
      <div class="card">{@render legend(b.claves || [])}</div>
    {/if}
    {#if (b.si || []).length}
      {@render sub("Te favorece")}
      {@render chips(b.si || [])}
    {/if}
    {#if (b.evita || []).length}
      {@render sub("Evita")}
      {@render chips(b.evita || [], "chips no")}
    {/if}
    {#if (b.tips || []).length}
      <ul class="a-tips">
        {#each b.tips || [] as x, i (i)}<li>{x}</li>{/each}
      </ul>
    {/if}
  </section>

  <!-- Rostro -->
  {#if p.rostro}
    {@const r = p.rostro}
    <section class="b" id="an-rostro">
      <h2>Rostro</h2>
      {#if r.forma}<p class="verdict">{r.forma}</p>{/if}
      {#if (r.rasgos || []).length}
        <div class="card">{@render legend(r.rasgos)}</div>
      {/if}
      {#if r.cejas}
        {@render sub("Cejas")}
        <p>{r.cejas}</p>
      {/if}
      {#if r.gafas && (r.gafas.si.length || r.gafas.evita.length)}
        {@render sub("Gafas")}
        {@render chips(r.gafas.si)}
        {@render chips(r.gafas.evita, "chips no")}
      {/if}
    </section>
  {/if}

  <!-- Maquillaje -->
  {#if p.maquillaje}
    {@const m = p.maquillaje}
    <section class="b" id="an-maqui">
      <h2>Maquillaje</h2>
      {#if m.piel}<p class="verdict">{m.piel}</p>{/if}
      {#if (m.looks || []).length}
        <ul class="looks">
          {#each m.looks as l, i (i)}
            <li>
              <h3>{l.nombre}</h3>
              <ol class="lst">
                {#each l.pasos as x, j (j)}<li>{x}</li>{/each}
              </ol>
              {#if l.pinterest}{@render pinBtn(l.pinterest, "Ver en Pinterest")}{/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if (m.gestos || []).length}
        {@render sub("Gestos que cambian tu cara")}
        {@render chips(m.gestos)}
      {/if}
      {#if (m.evita || []).length}{@render chips(m.evita, "chips no")}{/if}
    </section>
  {/if}

  <!-- Pelo -->
  {#if p.pelo}
    {@const h = p.pelo}
    <section class="b" id="an-pelo">
      <h2>Pelo</h2>
      {#if (h.cortes || []).length}
        <ul class="looks">
          {#each h.cortes as x, i (i)}
            <li>
              <h3>{x.nombre}</h3>
              {#if x.nota}<p class="a-msg">{x.nota}</p>{/if}
              {#if x.pinterest}{@render pinBtn(x.pinterest, "Ver en Pinterest")}{/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if (h.colores || []).length}
        {@render sub("Colores de pelo")}
        {@render swatches(coloresPelo(h.colores))}
      {/if}
      {#if (h.evita || []).length}{@render chips(h.evita, "chips no")}{/if}
    </section>
  {/if}

  <!-- Estética -->
  <section class="b" id="an-estetica">
    <h2>Tu estética</h2>
    {#if e.nombre}<p class="vibe-name">{e.nombre}</p>{/if}
    {#if (e.palabras || []).length}{@render chips(e.palabras || [], "words")}{/if}
    {#if (e.formula || []).length}
      {@render sub("Tu fórmula")}
      {@render chips(e.formula || [], "eq")}
    {/if}
    {#if (e.porque || []).length}
      <ul class="lst">
        {#each e.porque || [] as x, i (i)}<li>{x}</li>{/each}
      </ul>
    {/if}
    {#if (e.pinterest || []).length}
      <div class="a-row">
        {#each e.pinterest || [] as q, i (i)}{@render pinBtn(q, q)}{/each}
      </div>
    {/if}
    {#if !e.nombre && !(e.formula || []).length}
      <p class="a-note">Haz el análisis con IA para descubrir tu estética.</p>
    {/if}
  </section>

  <!-- Looks -->
  {#if (p.looks || []).length}
    <section class="b" id="an-looks">
      <h2>Looks para ti</h2>
      <ul class="looks">
        {#each p.looks as l, i (i)}
          <li>
            <h3>{l.ocasion}</h3>
            {@render chips(l.prendas, "chips mini")}
            {#if l.pinterest}{@render pinBtn(l.pinterest, "Ver en Pinterest")}{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <!-- Inspo a la carta -->
  <section class="b" id="an-inspo">
    <h2>Inspo a la carta</h2>
    <p class="verdict">
      Elige estación y ocasión: te abro galerías de Pinterest con tu estética y tus colores.
    </p>
    <div class="card a-ctl">
      <fieldset class="pick">
        <legend>Estación</legend>
        <div class="opts-r">
          {#each ESTACIONES as [id, n] (id)}
            <label
              ><input type="radio" name="i-est" value={id} id={"i-est-" + id} bind:group={est} /><span
                >{n}</span
              ></label
            >
          {/each}
        </div>
      </fieldset>
      <fieldset class="pick">
        <legend>Ocasión</legend>
        <div class="opts-r">
          {#each OCAS as o (o.id)}
            <label
              ><input type="radio" name="i-oca" value={o.id} id={"i-oca-" + o.id} bind:group={oca} /><span
                >{o.n}</span
              ></label
            >
          {/each}
        </div>
      </fieldset>
      <div class="a-row">
        {#each inspo as [q, t] (t)}{@render pinBtn(q, t)}{/each}
      </div>
    </div>
  </section>

  <div class="a-row" style:margin-top="28px">
    <button type="button" class="a-btn ghost no-print" onclick={() => ver("bienvenida")}
      >Rehacer mi análisis</button
    >
    <button type="button" class="a-btn ghost no-print" onclick={() => ver("ajustes")}>Ajustes</button>
  </div>
{/if}
