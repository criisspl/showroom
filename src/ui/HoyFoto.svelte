<script lang="ts">
  // «Foto de un look»: la IA identifica las prendas; te digo qué funciona y qué mejorar.
  import { abreImagen, imagenParaIA, preguntaJSON } from "../lib/ai.ts";
  import { byId, juzga } from "../lib/engine.ts";
  import {
    MENSAJE_SIN_IA,
    cajaRecorte,
    prendasDeFoto,
    resultadoFoto,
    sinRepetir,
    tarjetaDe,
    textoOpinion,
    textoPromptFoto
  } from "../lib/hoy.ts";
  import { app, estado } from "../state.js";
  import { hoy } from "./hoyEstado.svelte.ts";
  import HoyTarjeta from "./HoyTarjeta.svelte";
  import { cambios } from "./puente.svelte.ts";

  interface Props {
    /** Solo se ve en el modo «Foto de un look». */
    activo: boolean;
  }
  const { activo }: Props = $props();

  interface FotoElegida {
    blob: Blob;
    canvas: HTMLCanvasElement;
    url: string;
  }
  let elegida: FotoElegida | null = $state.raw(null);
  let mensaje = $state("");
  let acepto = $state(false);
  let analizando = $state(false);

  // La vista previa es un object URL: se libera al cambiar de foto y al desmontar
  $effect(() => {
    const url = elegida?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  });

  const enBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));

  async function eligeFoto(file: File | undefined) {
    if (!file) return;
    mensaje = "Abriendo la foto…";
    try {
      const img = await abreImagen(file),
        w = "naturalWidth" in img ? img.naturalWidth || img.width : img.width,
        h = "naturalHeight" in img ? img.naturalHeight || img.height : img.height,
        k = Math.min(1, 1100 / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * k);
      canvas.height = Math.round(h * k);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      if ("close" in img) img.close();
      const blob = await enBlob(canvas);
      if (!blob) throw new Error("No he podido abrir esa foto.");
      elegida = { blob, canvas, url: URL.createObjectURL(blob) };
      mensaje = hoy.hayIA ? "Foto lista. Pulsa «Analizar mi look»." : MENSAJE_SIN_IA;
    } catch (e) {
      mensaje = (e instanceof Error && e.message) || "No he podido abrir esa foto.";
    }
  }

  /** Recorte de una prenda (caja en fracciones 0-1) guardado como foto local. */
  async function recorta(caja: unknown): Promise<string | null> {
    if (!elegida) return null;
    const c = elegida.canvas,
      r = cajaRecorte(caja, c.width, c.height);
    if (!r) return null;
    const o = document.createElement("canvas"),
      k = Math.min(1, 700 / Math.max(r.W, r.H));
    o.width = Math.round(r.W * k);
    o.height = Math.round(r.H * k);
    o.getContext("2d")?.drawImage(c, r.X, r.Y, r.W, r.H, 0, 0, o.width, o.height);
    const blob = await enBlob(o);
    return blob ? app.store.putFoto(blob) : null;
  }

  async function analiza() {
    const fl = elegida;
    if (!fl) return;
    if (!hoy.hayIA) {
      mensaje = MENSAJE_SIN_IA;
      return;
    }
    if (!acepto) {
      mensaje = "Marca la casilla para aceptar el envío de la foto a la IA.";
      return;
    }
    const texto = textoPromptFoto(hoy.ctx);
    analizando = true;
    mensaje = "La IA está mirando tu look…";
    hoy.foto = null;
    try {
      const d = await preguntaJSON(app.ajustes, {
        sistema: "Eres una estilista personal. Hablas español de España.",
        texto,
        imagenes: [await imagenParaIA(fl.blob, 1024)]
      });
      if (!d || !Array.isArray(d.prendas) || !d.prendas.length) {
        mensaje = "No he visto claro el look. Prueba con una foto de cuerpo entero y buena luz.";
      } else {
        const ids: string[] = [];
        for (const x of prendasDeFoto(d)) {
          if ("id" in x) {
            if (!ids.includes(x.id)) ids.push(x.id);
            continue;
          }
          x.v.fotoId = await recorta(x.caja).catch(() => null);
          estado.virt[x.v.id] = x.v;
          ids.push(x.v.id);
        }
        hoy.foto = resultadoFoto(d, ids);
        mensaje = "";
      }
    } catch (e) {
      mensaje = e instanceof Error ? e.message : String(e);
    }
    analizando = false;
  }

  // El armario no es reactivo: se relee cada vez que main.js avisa de un cambio
  const opinion = $derived.by(() => {
    void cambios.n;
    const f = hoy.foto;
    if (!f) return null;
    const ids = f.ids.filter((id) => !!byId(id));
    if (!ids.length) return null;
    const c = hoy.ctx,
      j = juzga(ids, c);
    const vv = j && j.v === "no" ? "no" : f.mejorar.length || (j && j.mal.length) ? "quiza" : "si";
    return {
      o: { ids },
      c,
      t: tarjetaDe({ ids }, 1, c, "foto", "foto", hoy.entornoTarjeta({})),
      vv,
      resumen: f.resumen,
      bien: sinRepetir(f.bien.concat(j ? j.bien : [])),
      mal: sinRepetir(f.mejorar.concat(j ? j.mal : []))
    } as const;
  });
</script>

<div class="card a-yo" id="a-fotolook" hidden={!activo}>
  <h2>Foto de un look</h2>
  <p class="a-msg">
    Sube una foto de un outfit (de cuerpo entero, con buena luz). Te digo qué funciona, qué mejorarías y te
    añado al armario las prendas que no tengas.
  </p>
  {#if !hoy.hayIA}
    <p class="aviso">Para analizar fotos hace falta la IA: actívala en Ajustes.</p>
  {/if}
  <label class="a-btn ghost" style="position: relative; justify-self: start"
    >Hacer o elegir foto<input
      type="file"
      id="a-fl-file"
      accept="image/*"
      style="position: absolute; inset: 0; opacity: 0"
      onchange={(ev) => eligeFoto(ev.currentTarget.files?.[0])}
    /></label
  >
  <div class="a-fl-prev">
    {#if elegida}<img src={elegida.url} alt="Tu look" />{/if}
  </div>
  <label class="a-check"
    ><input type="checkbox" bind:checked={acepto} />
    <span>Acepto enviar esta foto a la IA para analizarla</span></label
  >
  <div class="a-row">
    <button type="button" class="a-btn" disabled={!elegida || analizando} onclick={analiza}
      >Analizar mi look</button
    ><span class="a-msg" role="status" aria-live="polite">{mensaje}</span>
  </div>
</div>
<div class="a-out" id="a-fl-out" aria-live="polite" hidden={!activo}>
  {#if opinion}
    <HoyTarjeta t={opinion.t} o={opinion.o} c={opinion.c} origen="foto" idx="foto">
      {#snippet cabecera()}
        <div class={"a-verd v-" + opinion.vv}>
          <small>Mi opinión</small>
          <p class="a-verd-t">{textoOpinion(opinion.vv)}</p>
          {#if opinion.resumen}<p class="a-msg">{opinion.resumen}</p>{/if}
          <div class="a-verd-cols">
            {#if opinion.bien.length}
              <div>
                <small>Lo que funciona</small>
                <ul class="lst">
                  {#each opinion.bien as x, i (i)}<li>{x}</li>{/each}
                </ul>
              </div>
            {/if}
            {#if opinion.mal.length}
              <div>
                <small>Qué mejorar</small>
                <ul class="lst">
                  {#each opinion.mal as x, i (i)}<li>{x}</li>{/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>
      {/snippet}
    </HoyTarjeta>
  {/if}
</div>
