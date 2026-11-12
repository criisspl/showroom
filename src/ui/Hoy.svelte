<script lang="ts">
  // Pestaña Hoy: la persona marca ocasión, tiempo y lugar, y según el modo se le proponen outfits,
  // se juzga el suyo, se parte de unas prendas o de una foto.
  import { BANDAS, ENTORNOS, OCAS, TEMPORADAS } from "../data/constants.ts";
  import { claveDe } from "../lib/engine.ts";
  import { fechaLarga, hoyISO } from "../lib/dom.js";
  import { MODOS, tarjetaDe, textoSinAncla, textoSinOutfit } from "../lib/hoy.ts";
  import type { Modo } from "../lib/hoy.ts";
  import { avisoEnvio, DATOS_PEDIR_IA } from "../lib/permisoia.ts";
  import { app } from "../state.js";
  import { ver } from "./comun.js";
  import Espejo from "./Espejo.svelte";
  import Gusto from "./Gusto.svelte";
  import { hoy } from "./hoyEstado.svelte.ts";
  import HoyAncla from "./HoyAncla.svelte";
  import HoyFoto from "./HoyFoto.svelte";
  import HoyTarjeta from "./HoyTarjeta.svelte";
  import HoyYo from "./HoyYo.svelte";
  import { cambios } from "./puente.svelte.ts";

  const fecha = fechaLarga(hoyISO());

  // El estado de los controles vive en `hoy`: si no cambia (por ejemplo, no se puede dejar sin marcar),
  // el input se devuelve a lo que dice el estado
  const devuelve = (ev: { currentTarget: HTMLInputElement }, marcado: boolean) => {
    ev.currentTarget.checked = marcado;
  };

  // Permiso para enviar el armario a la IA: se pide en cada envío y el aviso se calcula al pulsar
  let aviso: string | null = $state(null);
  let grupo: HTMLDivElement | undefined = $state();
  $effect(() => {
    grupo?.querySelector("button")?.focus();
  });
  const cierraPermiso = () => (aviso = null);
  const aceptaPermiso = () => {
    aviso = null;
    hoy.pedirIA();
  };

  // Las tarjetas se calculan juntas: comparten qué preguntas «¿Tienes algo así?» ya se han hecho
  const tarjetas = $derived.by(() => {
    void cambios.n;
    const res = hoy.res,
      c = hoy.resCtx;
    if (!res || !c) return [];
    const e = hoy.entornoTarjeta({});
    return res.map((r, i) => ({
      k: i + ":" + (r.o.key || claveDe(r.o.ids)),
      o: r.o,
      origen: r.origen,
      c,
      idx: i,
      t: tarjetaDe(r.o, i + 1, c, r.origen, i, e)
    }));
  });
  const sinOutfit = $derived.by(() => {
    void cambios.n;
    if (!hoy.sinLooks) return null;
    const c = hoy.ctx;
    return hoy.modo === "ancla"
      ? textoSinAncla(hoy.anclas, c)
      : { titulo: "No me sale un outfit coherente", texto: textoSinOutfit(c) };
  });

  let salida: HTMLDivElement | undefined = $state();
  $effect(() => {
    const i = hoy.scrollA;
    if (i == null || !salida) return;
    salida.querySelector('[data-idx="' + i + '"]')?.scrollIntoView({ block: "start" });
    hoy.scrollA = null;
  });

  const modo = $derived(hoy.modo);
  const enYo = $derived(modo === "yo");
  const enFoto = $derived(modo === "foto");
</script>

<header class="a-head">
  <p class="eyebrow">{fecha}</p>
  <h1 class="a-h1">¿Qué me pongo?</h1>
</header>
<div class="opts-r a-modo" role="radiogroup" aria-label="Modo">
  {#each MODOS as [id, n] (id)}
    <label
      ><input
        type="radio"
        name="a-modo"
        value={id}
        id={"a-modo-" + id}
        checked={modo === id}
        onchange={() => hoy.eligeModo(id as Modo)}
      /><span>{n}</span></label
    >
  {/each}
</div>
<div class="card a-ctl">
  <fieldset class="pick">
    <legend>Ocasión</legend>
    <p class="pick-h">¿Todo el día fuera? Marca varias, en orden.</p>
    <div class="opts-r">
      {#each OCAS as o (o.id)}
        <label
          ><input
            type="checkbox"
            name="a-oca"
            value={o.id}
            id={"a-oca-" + o.id}
            checked={hoy.ocas.includes(o.id)}
            onchange={(ev) => {
              hoy.marcaOca(o.id, ev.currentTarget.checked);
              devuelve(ev, hoy.ocas.includes(o.id));
            }}
          /><span>{o.n}<small>{o.s}</small></span></label
        >
      {/each}
    </div>
  </fieldset>
  <fieldset class="pick">
    <legend>Estación del año</legend>
    <div class="opts-r">
      {#each TEMPORADAS as [id, n] (id)}
        <label
          ><input
            type="radio"
            name="a-est"
            value={id}
            id={"a-est-" + id}
            checked={hoy.est === id}
            onchange={() => hoy.eligeEst(id)}
          /><span>{n}</span></label
        >
      {/each}
    </div>
  </fieldset>
  <fieldset class="pick">
    <legend>Tiempo en la calle</legend>
    <p class="pick-h">Si va a cambiar, marca dos: el de la mañana y el de la tarde.</p>
    <div class="opts-r">
      {#each BANDAS as b (b.id)}
        <label
          ><input
            type="checkbox"
            name="a-temp"
            value={b.id}
            id={"a-temp-" + b.id}
            checked={hoy.bandas.includes(b.id)}
            onchange={(ev) => {
              hoy.marcaBanda(b.id, ev.currentTarget.checked);
              devuelve(ev, hoy.bandas.includes(b.id));
            }}
          /><span>{b.n}<small>{b.s}</small></span></label
        >
      {/each}
    </div>
    <div class="a-conds">
      <label class="a-check"
        ><input
          type="checkbox"
          id="a-lluvia"
          checked={hoy.lluvia}
          onchange={(ev) => hoy.marcaCond("lluvia", ev.currentTarget.checked)}
        /><span>Llueve</span></label
      ><label class="a-check"
        ><input
          type="checkbox"
          id="a-viento"
          checked={hoy.viento}
          onchange={(ev) => hoy.marcaCond("viento", ev.currentTarget.checked)}
        /><span>Viento</span></label
      ><label class="a-check"
        ><input
          type="checkbox"
          id="a-humedad"
          checked={hoy.humedad}
          onchange={(ev) => hoy.marcaCond("humedad", ev.currentTarget.checked)}
        /><span>Humedad</span></label
      >
    </div>
  </fieldset>
  <fieldset class="pick">
    <legend>Dónde vas a estar</legend>
    <div class="opts-r">
      {#each ENTORNOS as [id, n] (id)}
        <label
          ><input
            type="radio"
            name="a-entorno"
            value={id}
            id={"a-entorno-" + id}
            checked={hoy.entorno === id}
            onchange={() => hoy.eligeEntorno(id)}
          /><span>{n}</span></label
        >
      {/each}
    </div>
  </fieldset>
  <div class="a-row" hidden={modo !== "propon"}>
    <button type="button" class="a-btn" onclick={() => hoy.montar(true)}>Montar outfits</button><button
      type="button"
      class="a-btn ghost"
      hidden={!hoy.hayIA || aviso !== null}
      disabled={hoy.cargandoIA}
      onclick={() => (aviso = avisoEnvio(app.ajustes, DATOS_PEDIR_IA))}>Pedir a la IA</button
    >
  </div>
  {#if aviso !== null}
    <div class="ref-permiso" role="group" aria-label="Permiso para enviar a la IA" bind:this={grupo}>
      <p>{aviso}</p>
      <button type="button" class="a-btn" onclick={aceptaPermiso}>Sí, enviarlos</button>
      <button type="button" class="a-btn ghost" onclick={cierraPermiso}>No</button>
    </div>
  {/if}
</div>
<HoyFoto activo={enFoto} />
<div class="card a-yo" hidden={modo !== "refs"}>
  <h2>Referencias</h2>
  <p class="a-msg">
    Sube capturas de looks que te gusten. La IA las mira (solo si tú la dejas, foto a foto), apunta colores,
    estéticas y prendas, y lo uso para proponerte outfits más a tu gusto.
  </p>
  <Gusto />
  <div class="a-row">
    <button type="button" class="a-btn" onclick={() => hoy.montar(true)}>Looks como mis referencias</button>
  </div>
</div>
<HoyAncla activo={modo === "ancla"} />
<HoyYo activo={enYo} />
<div class="a-out" hidden={!enYo}>
  <Espejo />
</div>
<div class="a-out" aria-live="polite" hidden={enYo || enFoto} bind:this={salida}>
  {#if hoy.cargandoIA}
    <p class="a-note" role="status">La IA está mirando tu armario…</p>
  {/if}
  {#if hoy.notaSalida}
    <p class="a-note" role="status">{hoy.notaSalida}</p>
  {/if}
  {#if hoy.vacio}
    <div class="a-fit">
      <h3>Tu armario todavía no da para un outfit</h3>
      <p class="a-msg">
        Hace falta al menos una prenda de arriba y una de abajo, o un vestido. Sube lo que más te pones y
        vuelve aquí.
      </p>
      <button type="button" class="a-btn" onclick={() => ver("armario")}>Ir al armario</button>
    </div>
  {/if}
  {#if sinOutfit}
    <div class="a-fit">
      <h3>{sinOutfit.titulo}</h3>
      <p class="a-msg">{sinOutfit.texto}</p>
      {#if modo !== "ancla"}
        <button type="button" class="a-btn" onclick={() => ver("deseos")}>Ver prendas que te faltan</button>
      {/if}
    </div>
  {/if}
  {#each tarjetas as x (x.k)}
    <HoyTarjeta t={x.t} o={x.o} c={x.c} origen={x.origen} idx={x.idx} />
  {/each}
  {#if tarjetas.length}
    <div class="a-row">
      <button type="button" class="a-btn ghost" onclick={() => hoy.otraTanda()}>Otra tanda</button>
    </div>
  {/if}
</div>
<p class="a-foot">
  <button type="button" class="a-link" onclick={() => ver("deseos")}>Prendas que te faltan</button>
</p>
