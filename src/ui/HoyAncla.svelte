<script lang="ts">
  // «Con estas prendas»: eliges una o varias prendas (subidas o descritas) y te monto el look alrededor.
  import { CATN, CATS } from "../data/constants.ts";
  import { activas, delArmarioParaIdea, ocaDe, sugiereIdeas } from "../lib/engine.ts";
  import { CATS_GRID, prendaDescrita } from "../lib/hoy.ts";
  import type { Cat } from "../lib/tipos.ts";
  import { app, estado } from "../state.js";
  import { hoy } from "./hoyEstado.svelte.ts";
  import Miniatura from "./Miniatura.svelte";
  import { cambios } from "./puente.svelte.ts";

  interface Props {
    /** Solo se ve en el modo «Con estas prendas». */
    activo: boolean;
  }
  const { activo }: Props = $props();

  // El armario no es reactivo: se relee cada vez que main.js avisa de un cambio
  const cats = $derived.by(() => {
    void cambios.n;
    const A = activas();
    return CATS_GRID.map((cat) => ({ cat, ps: A.filter((p) => p.cat === cat) })).filter((g) => g.ps.length);
  });
  const ideas = $derived.by(() => {
    void cambios.n;
    if (!hoy.anclas.length) return null;
    const c = hoy.ctx;
    return {
      oca: ocaDe(c.oca).n,
      lista: sugiereIdeas(hoy.anclas, c, app.perfil?.deseos || [], hoy.ideaSeed || 0, hoy.noIdea || {}).map(
        (idea) => ({
          idea,
          mias: hoy.ideaAbierta === idea.id ? delArmarioParaIdea(idea, hoy.anclas, c) : []
        })
      )
    };
  });
  const elegidas = $derived(hoy.anclas.map((a) => a.nombre).join(", "));

  let nombre = $state("");
  let cat: Cat = $state("arriba");
  let color = $state("#c19a6b");
  let mensaje = $state("");

  function descrita() {
    const n = nombre.trim();
    if (!n) {
      mensaje = "Escribe qué prenda es, por ejemplo «falda de cuadros».";
      return;
    }
    const v = prendaDescrita(n, cat, color);
    if (!v) return;
    estado.virt[v.id] = v;
    mensaje = "";
    nombre = "";
    hoy.anclaToggle(v, true);
  }
</script>

<div class="card a-yo" hidden={!activo}>
  <h2>Con estas prendas</h2>
  <p class="a-msg">
    ¿Hoy te apetece llevar algo en concreto? Elige una o varias de tu armario y te monto el look alrededor.
  </p>
  <div>
    {#if hoy.anclaAviso}<p class="a-msg" role="status">{hoy.anclaAviso}</p>{/if}
    <div class="a-row">
      <p class="a-msg">
        {hoy.anclas.length
          ? "Elegidas: " + elegidas + "."
          : "Elige una o varias prendas, por ejemplo una camiseta y una cazadora."}
      </p>
      {#if hoy.anclas.length}
        <button type="button" class="a-btn ghost" onclick={() => hoy.quitaAnclas()}>Quitar todas</button>
      {/if}
    </div>
    {#each cats as g (g.cat)}
      <div class="yo-cat">
        <small>{CATN[g.cat]}</small>
        <div class="yo-grid">
          {#each g.ps as p (p.id)}
            <label class="yo-p">
              <input
                type="checkbox"
                name="a-ancla-p"
                value={p.id}
                checked={hoy.anclas.some((a) => a.id === p.id)}
                onchange={(ev) => hoy.anclaToggle(p, ev.currentTarget.checked)}
              />
              <Miniatura {p} />
              <span>{p.nombre}</span>
            </label>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <div class="a-ideas" aria-live="polite">
    {#if ideas}
      <h3>{ideas.lista.length ? "Lo que mejor le pega" : "No encuentro qué añadirle"}</h3>
      {#if !ideas.lista.length}
        <p class="a-msg">
          Con «{ideas.oca}» y este tiempo, lo que has elegido ya va completo o no le encuentro pareja
          coherente. Prueba con otra ocasión.
        </p>
      {/if}
      {#each ideas.lista as { idea, mias } (idea.id)}
        <div class="a-ask">
          <div class="a-ask-pic" style:background={idea.color}></div>
          <div class="a-ask-tx">
            <small>{CATN[idea.cat]} · ¿la tienes?</small>
            <b
              >{idea.nombre +
                (idea.generica || idea.nombre.toLowerCase().includes(idea.colorN.toLowerCase())
                  ? ""
                  : ", en " + idea.colorN.toLowerCase())}</b
            >
            <span>{idea.porque}</span>
          </div>
          <div class="a-row">
            <button type="button" class="a-btn" onclick={() => hoy.abreIdea(idea.id)}>Sí, la tengo</button>
            <button type="button" class="a-btn ghost" onclick={() => hoy.noTengoIdea(idea.id, idea.nombre)}
              >No</button
            >
          </div>
        </div>
        {#if hoy.ideaAbierta === idea.id}
          <div class="a-ask-armario">
            {#if !mias.length}
              <p class="a-msg">No tienes nada así en el armario que case con lo que has elegido.</p>
              <button
                type="button"
                class="a-link"
                onclick={() =>
                  hoy.anadeAlLook(
                    {
                      id: idea.id,
                      nombre: idea.nombre,
                      cat: idea.cat,
                      color: idea.color,
                      pre: idea.pre,
                      ancla: true,
                      wid: null
                    },
                    "ancla"
                  )}>Subirla ahora</button
              >
            {:else}
              <p class="a-msg">¿Cuál es? La pongo con lo que has elegido.</p>
              <div class="yo-grid">
                {#each mias as p (p.id)}
                  <button type="button" class="yo-p" onclick={() => hoy.anclaToggle(p, true)}>
                    <Miniatura {p} />
                    <span>{p.nombre}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
      {#if hoy.ideaNo}
        <p class="a-note hueco-n" role="status">
          Apuntado: no tienes {hoy.ideaNo.toLowerCase()}. Te propongo otra cosa.
        </p>
      {/if}
      {#if ideas.lista.length}
        <button type="button" class="a-btn ghost" onclick={() => hoy.otraIdea()}>Otra idea</button>
      {/if}
    {/if}
  </div>
  <details class="a-ancla-otra">
    <summary><b>¿No está en tu armario? Descríbela</b></summary>
    <label class="a-f"
      ><span>Qué prenda es</span><input
        type="text"
        maxlength="60"
        placeholder="Por ejemplo: falda de cuadros, blazer de lino"
        bind:value={nombre}
      /></label
    >
    <div class="a-row">
      <label class="a-f"
        ><span>Tipo</span><select bind:value={cat}>
          {#each CATS as [id, texto] (id)}<option value={id}>{texto}</option>{/each}
        </select></label
      ><label class="a-f"><span>Color</span><input type="color" bind:value={color} /></label>
    </div>
    <div class="a-row">
      <button type="button" class="a-btn" onclick={descrita}>Monta looks con ella</button><span
        class="a-msg"
        role="status"
        aria-live="polite">{mensaje}</span
      >
    </div>
  </details>
</div>
