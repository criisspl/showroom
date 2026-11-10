<script lang="ts">
  // Pestaña Deseos: las prendas que le faltan a tu armario según tu análisis, y las que añades tú.
  import { app } from "../state.js";
  import { pinterest } from "../lib/dom.js";
  import {
    FILTROS,
    combinaCon,
    iconoSvg,
    nombreColor,
    nombreNuevo,
    notaDeArmario,
    prellenadoDe,
    prellenadoPropio,
    prendasVisibles,
    propiasDe,
    textoFiltro,
    textoVacio,
    vistaPropia
  } from "../lib/deseos.ts";
  import type { DeseoGuardado } from "../lib/store.ts";
  import type { Deseo, Perfil } from "../lib/tipos.ts";
  import { ver, falla } from "./comun.js";
  import { abreForm } from "./armario.js";
  import { ponDeseo } from "./ponDeseo.js";
  import { avisa, cambios } from "./puente.svelte.ts";
  import FotoDeseo from "./FotoDeseo.svelte";

  // El estado de la app no es reactivo: se recalcula cada vez que main.js avisa de un cambio
  const datos = $derived.by(() => {
    void cambios.n;
    const p: Perfil | null = app.perfil;
    const perfil: Deseo[] = p?.deseos || [];
    const D = app.D;
    const filtro: string = app.ui.wfil;
    const propias = propiasDe(D);
    return {
      filtro,
      nota: notaDeArmario(),
      filtros: FILTROS.map(([id, texto]) => ({ id, texto: textoFiltro(id, texto, perfil, D) })),
      propias: propias.map((d) => ({ d, vista: vistaPropia(d) })),
      tarjetas: prendasVisibles(perfil, D, filtro).map((w) => {
        const ci = Math.min(app.ui.wcol[w.id] || 0, w.cols.length - 1);
        const col = w.cols[ci];
        return {
          w,
          st: D[w.id]?.estado,
          ci,
          hex: col[1],
          nombreCol: nombreColor(col),
          compa: combinaCon(w, col[1])
        };
      })
    };
  });
  const sinPrendas = $derived(
    datos.tarjetas.length + (datos.filtro === "mia" || datos.filtro === "todo" ? datos.propias.length : 0) ===
      0
  );

  let nombre = $state("");
  let msg = $state("");
  let campo: HTMLInputElement | undefined = $state();

  function alArmario(pre: Record<string, unknown>) {
    app.ui.vuelveA = "deseos";
    ver("armario");
    abreForm(null, pre);
  }

  function eligeFiltro(id: string) {
    app.ui.wfil = id;
    avisa();
  }

  function eligeTono(w: Deseo, i: number) {
    app.ui.wcol[w.id] = i;
    avisa();
  }

  function yaLaTengo(w: Deseo) {
    const c = w.cols[Math.min(app.ui.wcol[w.id] || 0, w.cols.length - 1)];
    ponDeseo(w.id, "tengo");
    alArmario(prellenadoDe(w, c[1]));
  }

  function propiaYaLaTengo(d: DeseoGuardado) {
    app.store.del("deseos", d.id).catch(falla);
    alArmario(prellenadoPropio(d));
  }

  function quita(d: DeseoGuardado) {
    app.store.del("deseos", d.id).catch(falla);
    if (d.foto) app.store.delFoto(d.foto).catch(falla);
  }

  async function nuevoDeseo(ev: SubmitEvent) {
    ev.preventDefault();
    const n = nombreNuevo(nombre);
    if (!n) {
      msg = "Escribe qué prenda es.";
      campo?.focus();
      return;
    }
    try {
      await app.store.add("deseos", {
        propio: true,
        nombre: n,
        estado: "quiero",
        cuando: new Date().toISOString()
      });
      nombre = "";
      msg = "Añadida a tu lista.";
      app.ui.wfil = "mia";
      avisa();
    } catch (e) {
      msg = "";
      falla(e);
    }
  }
</script>

{#snippet pinterestBtn(q: string, txt: string)}
  <a class="pinbtn" href={pinterest(q)} target="_blank" rel="noopener">{txt} ↗</a>
{/snippet}

<header class="a-head">
  <p class="eyebrow">Lo que le falta a tu armario</p>
  <h1 class="a-h1">Deseos</h1>
</header>
<p class="hand" id="w-nota">{datos.nota}</p>
<div class="card w-buybox">
  <b>¿Has visto algo en una tienda?</b><span>Hazle una foto y te digo si merece la pena comprarlo.</span
  ><button type="button" class="a-btn" id="w-buy" onclick={() => abreForm(null, null, "compra")}
    >¿Lo compro?</button
  >
</div>
<div id="w-form-slot"></div>
<p class="a-note w-pin">
  Cada botón de Pinterest abre una búsqueda ya hecha para esa prenda. Toca los círculos de color para verla en
  otro tono de tu paleta.
</p>
<div class="opts-r a-filter" id="w-filter">
  {#each datos.filtros as f (f.id)}
    <label
      ><input
        type="radio"
        name="w-filter"
        value={f.id}
        id={"w-filter-" + f.id}
        checked={datos.filtro === f.id}
        onchange={() => eligeFiltro(f.id)}
      /><span>{f.texto}</span></label
    >
  {/each}
</div>
<ul class="w-list" id="w-list">
  {#if datos.filtro === "mia" || datos.filtro === "todo"}
    {#each datos.propias as { d, vista } (d.id)}
      <li class="card w-item">
        <FotoDeseo foto={d.foto} color={vista.color} />
        <div class="w-body">
          <span class="w-top">{vista.etiqueta}</span>
          <h3>{d.nombre}</h3>
          {#if vista.color}<span class="w-cn">{vista.detalle}</span>{/if}
          {#if vista.motivo}<p class="w-co">{vista.motivo}</p>{/if}
        </div>
        <div class="w-foot">
          <div class="a-row">
            {@render pinterestBtn(d.nombre ?? "", "Pinterest: la prenda")}
            {@render pinterestBtn((d.nombre ?? "") + " outfit", "Outfits con ella")}
          </div>
          <div class="a-row">
            <button type="button" class="a-btn ghost" onclick={() => propiaYaLaTengo(d)}>Ya la tengo</button>
            <button type="button" class="a-btn ghost" onclick={() => quita(d)}>Quitar</button>
          </div>
        </div>
      </li>
    {/each}
  {/if}
  {#each datos.tarjetas as t (t.w.id)}
    <li class={"card w-item" + (t.st === "tengo" ? " got" : "")}>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG fijo de la app, no viene de la persona -->
      <div class="w-pic" style:color={t.hex}>{@html iconoSvg(t.w.icono)}</div>
      <div class="w-body">
        {#if t.w.top}<span class="w-top">Empieza aquí</span>{/if}
        <h3>{t.w.n}</h3>
        <div class="w-sw">
          {#each t.w.cols as c, i (i)}
            <button
              type="button"
              style:background={c[1]}
              aria-label={"Verla en " + nombreColor(c).toLowerCase()}
              aria-pressed={i === t.ci ? "true" : "false"}
              onclick={() => eligeTono(t.w, i)}
            ></button>
          {/each}
          <span class="w-cn">{t.nombreCol}</span>
        </div>
        {#if t.w.nota}<p class="w-nota">{t.w.nota}</p>{/if}
        <p class="w-co" hidden={!t.compa}>{t.compa}</p>
      </div>
      <div class="w-foot">
        <div class="a-row">
          {@render pinterestBtn(t.w.q1 || t.w.n, "Pinterest: la prenda")}
          {@render pinterestBtn(t.w.q2 || t.w.n + " outfit", "Outfits con ella")}
        </div>
        <div class="a-row">
          {#if t.st === "tengo"}
            <span class="a-msg">Ya la tienes.</span>
            <button type="button" class="a-btn ghost" onclick={() => ponDeseo(t.w.id, null)}>Deshacer</button>
          {:else}
            <button
              type="button"
              class="a-btn ghost"
              aria-pressed={t.st === "quiero" ? "true" : "false"}
              onclick={() => ponDeseo(t.w.id, t.st === "quiero" ? null : "quiero")}
              >{t.st === "quiero" ? "En mi lista" : "La quiero"}</button
            >
            <button type="button" class="a-btn ghost" onclick={() => yaLaTengo(t.w)}>Ya la tengo</button>
          {/if}
        </div>
      </div>
    </li>
  {/each}
  {#if sinPrendas}
    <li class="a-empty">{textoVacio(datos.filtro)}</li>
  {/if}
</ul>
<form class="card w-own" id="w-own" novalidate onsubmit={nuevoDeseo}>
  <label class="a-f"
    ><span>¿Has visto algo que no está aquí?</span><input
      type="text"
      id="w-own-n"
      maxlength="60"
      placeholder="Corsé de ante camel"
      autocomplete="off"
      bind:this={campo}
      bind:value={nombre}
    /></label
  >
  <div class="a-row">
    <button type="submit" class="a-btn">Añadir a mi lista</button><span
      class="a-msg"
      id="w-own-msg"
      role="status"
      aria-live="polite">{msg}</span
    >
  </div>
</form>
