<script lang="ts">
  // «¿Te lo pondrías?»: la valoración de un outfit. Con «No» pide el motivo y, si la tarjeta es de la lista, la cambia por otra.
  import { app, estado } from "../state.js";
  import { MOT } from "../data/constants.ts";
  import { byId, claveDe, setEstado } from "../lib/engine.ts";
  import { datosVoto, votoDe } from "../lib/hoy.ts";
  import type { CtxHoy, LookHoy } from "../lib/hoy.ts";
  import { falla } from "./comun.js";
  import { hoy } from "./hoyEstado.svelte.ts";

  interface Props {
    o: LookHoy;
    c: CtxHoy;
    /** Tarjeta a la que pertenece: un número si es de la lista, «yo» o «foto» si no. */
    dest: number | string;
  }
  const { o, c, dest }: Props = $props();

  const k = $derived(o.key || claveDe(o.ids));
  const previo = $derived(votoDe(k, c));
  const piezas = $derived(
    o.ids.flatMap((id) => {
      const p = byId(id);
      return p ? [{ id, nombre: p.nombre }] : [];
    })
  );
  // Hasta que la persona contesta aquí, se ve lo que dijo la última vez
  let elegido: "si" | "no" | null | undefined = $state(undefined);
  let mensaje: string | undefined = $state(undefined);
  const voto = $derived(elegido === undefined ? (previo?.voto ?? null) : elegido);
  const texto = $derived(
    mensaje ?? (previo ? (previo.voto === "si" ? "Ya dijiste que sí." : "Ya dijiste que no.") : "")
  );
  let abierto = $state(false);
  let guardando = $state(false);
  let motivos: string[] = $state([]);
  let fallan: string[] = $state([]);
  let nota = $state("");

  async function guarda(v: "si" | "no", ms: string[], ps: string[], n: string) {
    const prev = votoDe(k, c),
      d = datosVoto(o, k, c, v, ms, ps, n);
    guardando = true;
    try {
      if (prev) await app.store.del("votos", prev.id);
      const id = await app.store.add("votos", d);
      elegido = v;
      abierto = false;
      mensaje = v === "si" ? "Apuntado: buscaré más como este." : "Apuntado: no te lo vuelvo a enseñar.";
      if (v === "no" && typeof dest === "number") {
        setEstado({ V: estado.V.filter((x) => !prev || x.id !== prev.id).concat([{ ...d, id }]) });
        hoy.sustituye(dest);
      }
    } catch (e) {
      falla(e);
    }
    guardando = false;
  }
</script>

<div class="a-rate">
  <div class="a-row">
    <span class="a-rate-q">¿Te lo pondrías?</span>
    <button
      type="button"
      class="a-btn ghost"
      aria-pressed={voto === "si"}
      disabled={guardando}
      onclick={() => guarda("si", [], [], "")}>Sí</button
    >
    <button
      type="button"
      class="a-btn ghost"
      aria-pressed={voto === "no"}
      disabled={guardando}
      onclick={() => {
        abierto = !abierto;
        mensaje = "";
      }}>No</button
    >
    <span class="a-msg" role="status" aria-live="polite">{texto}</span>
  </div>
  <div class="a-rate-p" hidden={!abierto}>
    <small>¿Qué falla?</small>
    <div class="opts-r">
      {#each MOT as m (m[0])}
        <label><input type="checkbox" value={m[0]} bind:group={motivos} /><span>{m[1]}</span></label>
      {/each}
    </div>
    <small>¿Qué prenda falla?</small>
    <div class="opts-r">
      {#each piezas as p (p.id)}
        <label><input type="checkbox" value={p.id} bind:group={fallan} /><span>{p.nombre}</span></label>
      {/each}
    </div>
    <div class="a-f">
      <input
        type="text"
        maxlength="140"
        placeholder="Cuéntame más (opcional)"
        aria-label="Cuéntame qué falla"
        autocomplete="off"
        bind:value={nota}
      />
    </div>
    <div class="a-row">
      <button
        type="button"
        class="a-btn"
        disabled={guardando}
        onclick={() => guarda("no", motivos.slice(), fallan.slice(), nota.trim().slice(0, 140))}
        >Enviar</button
      >
    </div>
  </div>
</div>
