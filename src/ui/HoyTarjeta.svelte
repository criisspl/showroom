<script lang="ts">
  // Una tarjeta de outfit de Hoy: prendas, consejos, la pregunta «¿Tienes algo así?» y los botones para guardarlo.
  import type { Snippet } from "svelte";
  import { app } from "../state.js";
  import { CATN } from "../data/constants.ts";
  import { esVirtual } from "../lib/engine.ts";
  import { iconoSvg } from "../lib/deseos.ts";
  import { hoyISO, pinterest } from "./dom.js";
  import { etiquetaHueco, nombreConColor, porqueDe } from "../lib/hoy.ts";
  import type { CtxHoy, Hueco, LookHoy, Origen, TarjetaVista } from "../lib/hoy.ts";
  import { falla } from "./comun.js";
  import { hoy } from "./hoyEstado.svelte.ts";
  import HoyValora from "./HoyValora.svelte";
  import Maquillaje from "./Maquillaje.svelte";
  import Miniatura from "./Miniatura.svelte";

  interface Props {
    t: TarjetaVista;
    o: LookHoy;
    c: CtxHoy;
    origen: Origen;
    /** Un número si la tarjeta es de la lista; «yo» o «foto» si no. */
    idx: number | string;
    /** Lo que va justo debajo de «quién»: el veredicto, en «Lo monto yo» y en la foto. */
    cabecera?: Snippet;
  }
  const { t, o, c, origen, idx, cabecera }: Props = $props();

  // Cada botón de guardar: si se está guardando y qué pone cuando ya está
  const guardando = $state({ hoy: false, guardar: false });
  const hecho = $state({ hoy: "", guardar: "" });

  async function guarda(que: "hoy" | "guardar") {
    guardando[que] = true;
    try {
      await app.store.add("outfits", {
        prendas: t.ids.filter((id) => !esVirtual(id)),
        ocasion: c.oca,
        banda: c.banda,
        lluvia: c.lluvia,
        creada: new Date().toISOString(),
        origen,
        fav: que === "guardar",
        fecha: que === "hoy" ? hoyISO() : null
      });
      hecho[que] = que === "hoy" ? "Anotado en tu historial" : "Guardado";
    } catch (e) {
      guardando[que] = false;
      falla(e);
    }
  }
</script>

{#snippet icono(h: Hueco, clase: string)}
  {#if h.icono}
    <div class={clase} style:color={h.color}>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG fijo de la app, no viene de la persona -->
      {@html iconoSvg(h.icono)}
    </div>
  {:else}
    <div class={clase} style:background={h.color}></div>
  {/if}
{/snippet}

<article class="a-fit" data-idx={idx}>
  <p class="who">{t.quien}</p>
  {@render cabecera?.()}
  {#each t.avisos as aviso (aviso)}
    <p class="a-note hueco-n">{aviso}</p>
  {/each}
  <ul class="a-pieces">
    {#each t.piezas as z, i (i)}
      {#if z.tipo === "real"}
        <li>
          <Miniatura p={z.p} />
          <small>{z.p ? CATN[z.p.cat] : ""}</small>
          <span>{z.p ? z.p.nombre : "Prenda eliminada"}</span>
        </li>
      {:else if z.h.propia}
        <li class="hueco propia">
          <Miniatura p={z.h.propia} />
          <small>Añade la tuya</small>
          <span>{z.h.nombre}</span>
        </li>
      {:else}
        <li class="hueco">
          {@render icono(z.h, "a-th a-th-w")}
          <small>{etiquetaHueco(z.h)}</small>
          <span>{z.h.nombre + (z.h.colorN && !z.h.generico ? ", en " + z.h.colorN.toLowerCase() : "")}</span>
        </li>
      {/if}
    {/each}
  </ul>
  {#if t.esquema}
    <div class="dots">
      {#each t.puntos as color, i (i)}
        <i style:background={color}></i>
      {/each}
      <span>{t.esquema}</span>
    </div>
  {/if}
  {#if t.mezcla}<p class="a-mix">{t.mezcla}</p>{/if}
  {#if t.pin}
    <div class="a-row a-pin">
      <a class="pinbtn" href={pinterest(t.pin)} target="_blank" rel="noopener">Ver looks así en Pinterest ↗</a
      >
    </div>
  {/if}
  {#if t.maquillaje}
    <div class="a-mk">
      <Maquillaje
        prendas={t.maquillaje.prendas}
        ocasion={t.maquillaje.ocasion}
        ocasionNombre={t.maquillaje.ocasionNombre}
      />
    </div>
  {/if}
  {#if t.porque}<p class="a-msg">{t.porque}</p>{/if}
  {#if t.tips.length}
    <ul class="a-tips">
      {#each t.tips as tip, i (i)}
        <li class:warn={tip.warn}>{tip.texto}</li>
      {/each}
    </ul>
  {/if}
  {#each t.notas as n, i (i)}
    <p class="a-note hueco-n">
      {n.texto}
      {#if n.tipo === "lista"}
        <button type="button" class="a-link" onclick={() => hoy.quieroEnLista(n.h.id)}
          >Añadir a mi lista</button
        >
      {:else if n.tipo === "ahora"}
        <button type="button" class="a-link" onclick={() => hoy.anadeAlLook(n.h, idx)}>{n.boton}</button>
      {/if}
    </p>
  {/each}
  {#if t.fotoAdd.length}
    <div class="a-ask a-foto-add">
      <div class="a-ask-tx">
        <small>No están en tu armario</small>
        <b>{t.fotoAdd.map((h) => h.nombre).join(", ")}</b>
        <span>Añádelas y las tendré en cuenta en tus looks.</span>
      </div>
      <div class="a-row">
        {#each t.fotoAdd as h (h.id)}
          <button type="button" class="a-btn ghost" onclick={() => hoy.anadeAlLook(h, idx)}
            >Añadir {h.nombre.toLowerCase()}</button
          >
        {/each}
        {#if t.fotoAdd.length > 1}
          <button
            type="button"
            class="a-btn"
            disabled={hoy.anadiendo}
            onclick={() => hoy.anadeTodasFoto(t.fotoAdd)}
            >{hoy.anadiendo ? "Añadiendo…" : "Añadir todas"}</button
          >
        {/if}
      </div>
    </div>
  {/if}
  {#if t.pregunta}
    {@const q = t.pregunta}
    <div class="a-ask">
      {@render icono(q, "a-ask-pic")}
      <div class="a-ask-tx">
        <small>¿Tienes algo así?</small>
        <b>{nombreConColor(q)}</b>
        <span>{porqueDe(q)}</span>
      </div>
      <div class="a-row">
        <button type="button" class="a-btn" onclick={() => hoy.anadeAlLook(q, idx)}>Sí, la tengo</button>
        <button type="button" class="a-btn ghost" onclick={() => hoy.noLaTengo(q, idx)}>No</button>
      </div>
    </div>
  {/if}
  {#if t.ultNo}
    {@const u = t.ultNo}
    <p class="a-note hueco-n">
      Apuntado: no tienes {u.nombre.toLowerCase()}.
      {#if u.puedeLista}
        <button type="button" class="a-link" onclick={() => hoy.quieroEnLista(u.id, true)}
          >Añadir a mi lista</button
        >
      {/if}
    </p>
  {/if}
  <div class="a-row">
    <button type="button" class="a-btn" disabled={guardando.hoy} onclick={() => guarda("hoy")}
      >{hecho.hoy || "Me lo pongo hoy"}</button
    >
    <button type="button" class="a-btn ghost" disabled={guardando.guardar} onclick={() => guarda("guardar")}
      >{hecho.guardar || "Guardar"}</button
    >
  </div>
  {#if origen !== "foto"}
    <HoyValora {o} {c} dest={idx} />
  {/if}
</article>
