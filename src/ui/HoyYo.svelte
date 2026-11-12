<script lang="ts">
  // «Lo monto yo»: eliges prendas de tu armario y te digo si pegan con la ocasión y el tiempo marcados.
  import { CATN } from "../data/constants.ts";
  import { activas, byId, juzga, mejora } from "../lib/engine.ts";
  import { CATS_GRID, alternaYo, tarjetaDe, textoMejora, textoVeredicto } from "../lib/hoy.ts";
  import { hoy } from "./hoyEstado.svelte.ts";
  import HoyTarjeta from "./HoyTarjeta.svelte";
  import Miniatura from "./Miniatura.svelte";
  import { cambios } from "./puente.svelte.ts";

  interface Props {
    /** Solo se ve en el modo «Lo monto yo». */
    activo: boolean;
  }
  const { activo }: Props = $props();

  // El armario no es reactivo: se relee cada vez que main.js avisa de un cambio
  const grupos = $derived.by(() => {
    void cambios.n;
    const A = activas();
    return {
      vacio: !A.length,
      cats: CATS_GRID.map((cat) => ({ cat, ps: A.filter((p) => p.cat === cat) })).filter((g) => g.ps.length)
    };
  });
  const n = $derived.by(() => {
    void cambios.n;
    return hoy.yoSel.filter((id) => !!byId(id)).length;
  });
  const juicio = $derived.by(() => {
    void cambios.n;
    const ids = hoy.yoJuzgados;
    if (!ids) return null;
    const c = hoy.ctx,
      j = juzga(ids, c);
    if (!j) return null;
    return {
      o: { ids, yo: true },
      c,
      j,
      t: tarjetaDe({ ids, yo: true }, 1, c, "yo", "yo", hoy.entornoTarjeta({})),
      m: j.v !== "si" ? mejora(ids, c, j) : null
    };
  });
</script>

<div class="card a-yo" hidden={!activo}>
  <h2>Lo monto yo</h2>
  <p class="a-msg">
    Elige las prendas de tu look y te digo si pega con la ocasión y el tiempo que has marcado arriba.
  </p>
  <div>
    {#if grupos.vacio}
      <p class="a-note">Cuando subas prendas al armario, podrás montar aquí tus looks.</p>
    {/if}
    {#each grupos.cats as g (g.cat)}
      <div class="yo-cat">
        <small>{CATN[g.cat]}</small>
        <div class="yo-grid">
          {#each g.ps as p (p.id)}
            <label class="yo-p">
              <input
                type="checkbox"
                value={p.id}
                checked={hoy.yoSel.includes(p.id)}
                onchange={(ev) => (hoy.yoSel = alternaYo(hoy.yoSel, p, ev.currentTarget.checked))}
              />
              <Miniatura {p} />
              <span>{p.nombre}</span>
            </label>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <div class="a-row a-yo-bar">
    <button type="button" class="a-btn" disabled={!n} onclick={() => hoy.juzgaYo()}
      >{n ? "¿Pega? (" + n + (n === 1 ? " prenda)" : " prendas)") : "¿Pega?"}</button
    >
    <button type="button" class="a-btn ghost" onclick={() => hoy.empiezaYo()}>Empezar de nuevo</button>
  </div>
</div>
<div class="a-out" aria-live="polite" hidden={!activo}>
  {#if juicio}
    {@const { j, m } = juicio}
    <HoyTarjeta t={juicio.t} o={juicio.o} c={juicio.c} origen="yo" idx="yo">
      {#snippet cabecera()}
        <div class={"a-verd v-" + j.v}>
          <small>Mi veredicto</small>
          <p class="a-verd-t">{textoVeredicto(j.v)}</p>
          <div class="a-verd-cols">
            {#if j.bien.length}
              <div>
                <small>Lo que funciona</small>
                <ul class="lst">
                  {#each j.bien as x, i (i)}<li>{x}</li>{/each}
                </ul>
              </div>
            {/if}
            {#if j.mal.length}
              <div>
                <small>{j.v === "no" ? "Lo que falla" : "Lo que retocaría"}</small>
                <ul class="lst">
                  {#each j.mal as x, i (i)}<li>{x}</li>{/each}
                </ul>
              </div>
            {/if}
          </div>
          {#if m}
            <div class="a-row">
              <p class="a-msg">{textoMejora(m)}</p>
              <button type="button" class="a-btn ghost" onclick={() => hoy.pruebaCambio(m.ids)}
                >{m.cambios.length > 1 ? "Probar los cambios" : "Probar el cambio"}</button
              >
            </div>
          {/if}
        </div>
      {/snippet}
    </HoyTarjeta>
  {/if}
</div>
