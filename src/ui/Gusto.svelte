<script lang="ts">
  // Referencias de gusto: looks que te gustan. Se guardan en tu dispositivo; la IA solo los mira si la
  // dejas, foto a foto, y entonces la app aprende qué colores y estilos te atraen.
  import { SvelteSet } from "svelte/reactivity";
  import { app } from "../state.js";
  import { hayIA, imagenParaIA, preguntaJSON } from "../lib/ai.ts";
  import { destinoIA } from "../lib/permisoia.ts";
  import { PROMPT_REF, gustoDe, limpiaRef, repetidas } from "../lib/gusto.ts";
  import type { Referencia } from "../lib/tipos.ts";
  import { falla } from "./comun.js";
  import { cambios } from "./puente.svelte.ts";
  import ImagenRef from "./ImagenRef.svelte";

  const MAX_REFS = 40;

  // El estado de la app no es reactivo: se relee cada vez que main.js avisa de un cambio
  const datos = $derived.by(() => {
    void cambios.n;
    const refs: Referencia[] = app.refs;
    const g = gustoDe(refs);
    return {
      refs,
      g,
      hayIA: hayIA(app.ajustes),
      proveedor: destinoIA(app.ajustes),
      est: repetidas(g.est, g),
      pre: repetidas(g.pre, g),
      det: repetidas(g.det, g)
    };
  });

  // Qué referencia espera el permiso de envío, cuál se está analizando y cuáles piden confirmar el borrado
  let pidiendo = $state<string | null>(null);
  let analizando = $state<string | null>(null);
  let mensaje = $state("");
  const armados = new SvelteSet<string>();

  async function anade(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement;
    const archivos = [...(input.files || [])].slice(0, MAX_REFS - datos.refs.length);
    input.value = "";
    mensaje = "";
    try {
      for (const f of archivos) {
        // Se guarda reducida: pesa menos en el dispositivo y en la copia de seguridad
        const reducida = await (await fetch(await imagenParaIA(f, 1024))).blob();
        const foto = await app.store.putFoto(reducida);
        await app.store.add("refs", { foto, creada: new Date().toISOString(), analisis: null });
      }
    } catch (e) {
      falla(e);
    }
  }

  async function analiza(r: Referencia) {
    pidiendo = null;
    analizando = r.id;
    mensaje = "";
    try {
      const blob = await app.store.blobFoto(r.foto);
      if (!blob) throw new Error("No encuentro la foto de esta referencia.");
      const d = await preguntaJSON(app.ajustes, {
        sistema: "Eres una estilista personal. Hablas español de España.",
        texto: PROMPT_REF,
        imagenes: [await imagenParaIA(blob, 1024)]
      });
      const analisis = limpiaRef(d);
      if (!analisis) mensaje = "La IA no ha sacado nada claro de esa foto. Prueba con otra.";
      else await app.store.update("refs", r.id, { analisis });
    } catch (e) {
      mensaje = (e as Error)?.message || "No he podido analizar la foto.";
    } finally {
      analizando = null;
    }
  }

  async function borra(r: Referencia) {
    if (!armados.has(r.id)) {
      armados.add(r.id);
      return;
    }
    armados.delete(r.id);
    try {
      await app.store.delFoto(r.foto);
      await app.store.del("refs", r.id);
    } catch (e) {
      falla(e);
    }
  }
</script>

<section class="card" aria-label="Referencias de gusto">
  <h2>Looks que te gustan</h2>
  <p class="a-msg">
    Guarda capturas o fotos de looks que te encantan. Se quedan en tu dispositivo. Si quieres, la IA las mira
    de una en una (te pido permiso cada vez) y la app tira hacia esos colores y estilos al montar tus outfits.
  </p>
  {#if !datos.hayIA}
    <p class="aviso">Para analizarlas hace falta la IA: actívala en Ajustes. Mientras, puedes guardarlas.</p>
  {/if}
  {#if datos.g.n}
    <div class="ref-gusto" role="group" aria-label="Lo que te gusta">
      <h3>Lo que te gusta</h3>
      {#if datos.g.col.length}
        <ul class="ref-puntos" aria-label="Colores">
          {#each datos.g.col.slice(0, 12) as c, i (i)}
            <li style:background={c.hex} title={c.n}></li>
          {/each}
        </ul>
      {/if}
      {#if datos.est.length}
        <ul class="chips mini">
          {#each datos.est as e (e)}<li>{e}</li>{/each}
        </ul>
      {/if}
      {#if datos.pre.length || datos.det.length}
        <p class="a-msg">Se repite: {[...datos.pre, ...datos.det].join(", ")}.</p>
      {/if}
    </div>
  {/if}
  {#if datos.refs.length < MAX_REFS}
    <label class="a-btn ghost ref-subir">
      Añadir referencias
      <input type="file" accept="image/*" multiple onchange={anade} />
    </label>
  {:else}
    <p class="a-msg">Tienes {MAX_REFS} referencias, el máximo. Borra alguna para añadir más.</p>
  {/if}
  <p class="a-msg" role="status" aria-live="polite">{mensaje}</p>
  {#if datos.refs.length}
    <ul class="ref-rejilla">
      {#each datos.refs as r (r.id)}
        <li class="ref">
          <ImagenRef foto={r.foto} />
          {#if r.analisis}
            <p class="ref-res">{r.analisis.resumen || r.analisis.esteticas.join(", ")}</p>
          {:else if analizando === r.id}
            <p class="ref-res">La IA está mirando la foto…</p>
          {:else if pidiendo === r.id}
            <div class="ref-permiso" role="group" aria-label="Permiso para enviar la foto">
              <p>Esta foto se enviará a {datos.proveedor} para analizarla. ¿La envío?</p>
              <button type="button" class="a-btn" onclick={() => analiza(r)}>Sí, enviarla</button>
              <button type="button" class="a-btn ghost" onclick={() => (pidiendo = null)}>No</button>
            </div>
          {:else if datos.hayIA}
            <button type="button" class="a-btn ghost" onclick={() => (pidiendo = r.id)}>Analizar</button>
          {/if}
          <button type="button" class="a-btn danger" onclick={() => borra(r)}>
            {armados.has(r.id) ? "¿Seguro?" : "Borrar"}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>
