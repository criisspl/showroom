<script lang="ts">
  // Bienvenida: selfie con los colores marcados, preguntas y análisis hecho en el móvil.
  // Opcional: análisis más completo con IA (con consentimiento expreso) o perfil a mano.
  import { tick } from "svelte";
  import { app, setPerfil, repinta } from "../state.js";
  import { aviso } from "../lib/dom.js";
  import { imagenParaIA, abreImagen, hayIA } from "../lib/ai.ts";
  import { PREGUNTAS, analizaConIA, perfilManual, normaliza } from "../lib/analysis.ts";
  import type { PreguntaAnalisis } from "../lib/analysis.ts";
  import { perfilLocal } from "../lib/local.ts";
  import type { Muestras } from "../lib/local.ts";
  import {
    FOTOS_IA,
    PASOS,
    colorCss,
    medianaRgb,
    mensajeFalta,
    opcionesCuerpo,
    opcionesElige,
    opcionesEstacion,
    opcionesVarias,
    queFotoIA,
    respuestasDe,
    tamanoSelfie,
    textoPaso,
    zonaDe
  } from "../lib/bienvenida.ts";
  import { ver, falla } from "./comun.js";
  import { importaArchivo } from "./importa.js";
  import { protegeDatos, consejoIOS } from "./instala.js";
  import { peticionIA } from "./abreIA.svelte.ts";

  const estaciones = opcionesEstacion();
  const cuerpos = opcionesCuerpo();
  const preguntasMovil = PREGUNTAS.filter((p) => !p.ia);
  const preguntasIA = PREGUNTAS.filter((p) => p.ia);

  // Respuestas: texto de las preguntas de escribir o elegir, y lista de marcadas en las de varias
  const texto: Record<string, string> = $state(
    Object.fromEntries(PREGUNTAS.filter((p) => p.tipo !== "varias").map((p) => [p.id, ""]))
  );
  const varias: Record<string, string[]> = $state(
    Object.fromEntries(PREGUNTAS.filter((p) => p.tipo === "varias").map((p) => [p.id, []]))
  );

  // Selfie y marcado de colores
  let selfie: File | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let foto: HTMLImageElement | undefined = $state();
  let selfieIn: HTMLLabelElement | undefined = $state();
  let fotoSrc = $state("");
  let marcando = $state(false);
  let paso = $state(0);
  let muestras: Muestras = $state({});
  let puntos: Record<string, [number, number]> = $state({});
  const pasoActual = $derived(PASOS[paso]);

  // Fotos extra para la IA
  const fotos: Record<string, File> = {};
  const previas: Record<string, string> = $state({});

  let msg = $state("");
  let msgIA = $state("");
  let acepto = $state(false);
  let ocupado = $state(false);
  let progreso = $state("");
  let iaAbierta = $state(false);
  let detallesIA: HTMLDetailsElement | undefined = $state();

  let estacion = $state(estaciones[0]?.id ?? "");
  let cuerpo = $state(cuerpos[0]?.id ?? "");
  let estetica = $state("");

  const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e));

  // Otras pantallas piden abrir la sección de IA
  $effect(() => {
    if (peticionIA.n === 0) return;
    iaAbierta = true;
    tick().then(() => detallesIA?.scrollIntoView({ block: "start" }));
  });

  function reiniciaMarca() {
    paso = 0;
    muestras = {};
    puntos = {};
  }

  async function cargaSelfie(file: File) {
    try {
      const img = await abreImagen(file);
      const t = tamanoSelfie(
        ("naturalWidth" in img && img.naturalWidth) || img.width,
        ("naturalHeight" in img && img.naturalHeight) || img.height
      );
      const c = document.createElement("canvas");
      c.width = t.w;
      c.height = t.h;
      c.getContext("2d", { willReadFrequently: true })?.drawImage(img, 0, 0, c.width, c.height);
      if ("close" in img) img.close();
      selfie = file;
      canvas = c;
      reiniciaMarca();
      // Mostramos lo que hemos dibujado en el canvas: así lo que ve la persona coincide con lo que medimos.
      fotoSrc = c.toDataURL("image/jpeg", 0.85);
      marcando = true;
    } catch (e) {
      msg = mensajeDe(e);
    }
  }

  function eligeSelfie(ev: Event & { currentTarget: HTMLInputElement }) {
    const f = ev.currentTarget.files?.[0];
    ev.currentTarget.value = "";
    if (f) cargaSelfie(f);
  }

  function toca(ev: MouseEvent) {
    const p = PASOS[paso];
    if (!canvas || !foto || !p) return;
    const r = foto.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width,
      y = (ev.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const z = zonaDe(canvas.width, canvas.height, x, y, p.r);
    const datos = canvas
      .getContext("2d", { willReadFrequently: true })
      ?.getImageData(z.x0, z.y0, z.w, z.h).data;
    muestras[p.id] = medianaRgb(datos ?? [], z);
    puntos[p.id] = [x, y];
    paso++;
  }

  function eligeFotoIA(id: string, t: string, ev: Event & { currentTarget: HTMLInputElement }) {
    const file = ev.currentTarget.files?.[0];
    if (!file) return;
    fotos[id] = file;
    if (previas[id]) URL.revokeObjectURL(previas[id]);
    previas[id] = URL.createObjectURL(file);
  }

  function marcaVarias(p: PreguntaAnalisis, ev: Event & { currentTarget: HTMLInputElement }) {
    const i = ev.currentTarget;
    const actuales = varias[p.id];
    if (!i.checked) varias[p.id] = actuales.filter((v) => v !== i.value);
    else if (actuales.length >= (p.max ?? Infinity)) i.checked = false;
    else varias[p.id] = [...actuales, i.value];
  }

  async function terminaCon(perfil: Parameters<typeof setPerfil>[0]) {
    await app.store.kset("perfil", perfil);
    setPerfil(perfil);
    repinta();
    ver("analisis");
    protegeDatos();
    const c = consejoIOS();
    if (c) aviso(c, 9000);
  }

  async function analizaLocal() {
    const r = respuestasDe(PREGUNTAS, texto, varias);
    const falta = mensajeFalta(muestras, r);
    if (falta) {
      msg = falta;
      return;
    }
    try {
      msg = "";
      await terminaCon(normaliza(perfilLocal(muestras, r), r, "local"));
    } catch (e) {
      msg = mensajeDe(e);
      falla(e);
    }
  }

  async function analizaIA() {
    if (!acepto) {
      msgIA = "Marca la casilla para aceptar el envío de tus fotos a la IA.";
      return;
    }
    if (!selfie) {
      msgIA = "Falta tu selfie: súbelo en el paso 1.";
      selfieIn?.scrollIntoView({ block: "center" });
      return;
    }
    if (!hayIA(app.ajustes)) {
      msgIA = "La IA no está disponible ahora mismo.";
      return;
    }
    const r = respuestasDe(PREGUNTAS, texto, varias);
    ocupado = true;
    msgIA = "";
    progreso = "Preparando tus fotos…";
    try {
      const imgs = [{ que: "1) selfie con luz natural", url: await imagenParaIA(selfie, 1024) }];
      for (const f of FOTOS_IA)
        if (fotos[f.id]) imgs.push({ que: queFotoIA(f.id), url: await imagenParaIA(fotos[f.id], 1024) });
      progreso = "Haciendo tu análisis… puede tardar un minuto.";
      await terminaCon(await analizaConIA(app.ajustes, r, imgs));
    } catch (e) {
      msgIA = mensajeDe(e);
      falla(e);
    }
    progreso = "";
    ocupado = false;
  }

  async function creaManual() {
    try {
      await terminaCon(perfilManual(estacion, cuerpo, { nombre: estetica.trim() }));
    } catch (e) {
      falla(e);
    }
  }
</script>

<header class="intro">
  <p class="eyebrow">Tu asesora de imagen</p>
  <h1>Armario</h1>
  <p>
    Te hago tu análisis de imagen: tu paleta de color, tu tipo de cuerpo, tu estética y las prendas que te
    faltan. Después subes tu ropa y te monto outfits según la ocasión y el tiempo.
  </p>
  <p class="aviso">Todo se hace y se guarda en este móvil: sin cuentas, y tus fotos no salen de aquí.</p>
</header>

{#snippet pregunta(p: PreguntaAnalisis)}
  {#if p.tipo === "varias"}
    <fieldset class="pick">
      <legend>{p.t}</legend>
      <div class="opts-r varias">
        {#each opcionesVarias(p) as [id, n] (id)}
          <label
            ><input
              type="checkbox"
              name={"q-" + p.id}
              value={id}
              id={"q-" + p.id + "-" + id}
              checked={varias[p.id].includes(id)}
              onchange={(ev) => marcaVarias(p, ev)}
            /><span>{n}</span></label
          >
        {/each}
      </div>
    </fieldset>
  {:else}
    <label class="a-f"
      ><span>{p.t + (p.opc ? " · opcional" : "")}</span>
      {#if p.tipo === "elige"}
        <select id={"q-" + p.id} bind:value={texto[p.id]}>
          <option value="">Elige…</option>
          {#each opcionesElige(p) as o (o)}
            <option value={o}>{o}</option>
          {/each}
        </select>
      {:else if p.tipo === "num"}
        <input
          id={"q-" + p.id}
          type="number"
          inputmode="numeric"
          min="0"
          max="250"
          value={texto[p.id]}
          oninput={(ev) => (texto[p.id] = ev.currentTarget.value)}
        />
      {:else}
        <textarea id={"q-" + p.id} maxlength={400} bind:value={texto[p.id]}></textarea>
      {/if}
    </label>
  {/if}
{/snippet}

<div class="card paso">
  <h2><span class="n">1</span>Tu selfie</h2>
  <p class="a-msg">
    De frente, con luz natural de día (junto a una ventana), sin filtros y, si puedes, sin maquillaje.
  </p>
  <label class="foto-in selfie-in" id="b-selfie-in" hidden={marcando} bind:this={selfieIn}
    ><b>Elegir o hacer selfie</b><input
      type="file"
      id="b-selfie"
      accept="image/*"
      onchange={eligeSelfie}
    /></label
  >
  <div class="marca" id="b-marca" hidden={!marcando}>
    <p class="marca-t" id="b-marca-t">{textoPaso(paso)}</p>
    <!-- Marcar con el dedo no tiene equivalente de teclado: sin selfie se puede dar venas y joyas. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="marca-img" id="b-marca-img" onclick={toca}>
      <img id="b-marca-foto" alt="Tu selfie" src={fotoSrc || undefined} bind:this={foto} />
      {#each PASOS as q (q.id)}
        {@const m = muestras[q.id]}
        {@const pt = puntos[q.id]}
        {#if m && pt}
          <span
            class="pto"
            style:left={pt[0] * 100 + "%"}
            style:top={pt[1] * 100 + "%"}
            style:background={colorCss(m)}><b>{q.n}</b></span
          >
        {/if}
      {/each}
    </div>
    <ul class="marca-res" id="b-marca-res">
      {#each PASOS as q (q.id)}
        {@const m = muestras[q.id]}
        {#if m}
          <li><i style:background={colorCss(m)}></i><span>{q.n}</span></li>
        {/if}
      {/each}
    </ul>
    <div class="a-row">
      <button
        type="button"
        class="a-btn ghost"
        id="b-marca-salta"
        hidden={!pasoActual?.opc}
        onclick={() => (paso = PASOS.length)}>No hay nada blanco</button
      ><button type="button" class="a-btn ghost" id="b-marca-otra" onclick={reiniciaMarca}
        >Volver a marcar</button
      ><label class="a-btn ghost" style="position: relative"
        >Cambiar foto<input
          type="file"
          id="b-selfie2"
          accept="image/*"
          style="position: absolute; inset: 0; opacity: 0"
          onchange={eligeSelfie}
        /></label
      >
    </div>
  </div>
</div>

<div class="card paso">
  <h2><span class="n">2</span>Sobre ti</h2>
  <div id="b-preguntas" class="paso">
    {#each preguntasMovil as p (p.id)}
      {@render pregunta(p)}
    {/each}
  </div>
</div>

<div class="card paso">
  <h2><span class="n">3</span>Tu análisis</h2>
  <div class="a-row">
    <button type="button" class="a-btn" id="b-analiza" onclick={analizaLocal}>Hacer mi análisis</button>
  </div>
  <p class="a-msg" id="b-msg" role="alert">{msg}</p>
</div>

<details class="card paso" id="b-ia" bind:open={iaAbierta} bind:this={detallesIA}>
  <summary><b>Análisis más completo con IA</b> · opcional</summary>
  <p class="a-msg">
    La IA mira tus fotos y te da un análisis más detallado: tu cara, tus cejas, gafas, cortes de pelo,
    maquillaje y una estética con nombre propio. No necesitas cuenta ni clave.
  </p>
  <p class="aviso">
    Para hacerlo, tus fotos y respuestas se envían a un servicio de inteligencia artificial externo. Esta app
    no las guarda en ningún servidor. Para mayores de 18 años.
  </p>
  <div class="fotos" id="b-fotos">
    {#each FOTOS_IA as f (f.id)}
      <label class="foto-in"
        ><b>{f.t}</b><input type="file" accept="image/*" onchange={(ev) => eligeFotoIA(f.id, f.t, ev)} />
        {#if previas[f.id]}<img alt={f.t} src={previas[f.id]} />{/if}
      </label>
    {/each}
  </div>
  <div id="b-preguntas-ia" class="paso">
    {#each preguntasIA as p (p.id)}
      {@render pregunta(p)}
    {/each}
  </div>
  <label class="a-check"
    ><input type="checkbox" id="b-acepto" bind:checked={acepto} />
    <span>Acepto enviar mis fotos y respuestas a la IA para hacer el análisis</span></label
  >
  <div class="a-row">
    <button type="button" class="a-btn" id="b-analiza-ia" disabled={ocupado} onclick={analizaIA}
      >Hacer el análisis con IA</button
    >
  </div>
  <div class="progreso" id="b-prog" hidden={!ocupado}>
    <span class="a-msg" id="b-prog-t" role="status" aria-live="polite">{progreso || "Analizando…"}</span><span
      class="barra"><i></i></span
    >
  </div>
  <p class="a-msg" id="b-msg-ia" role="alert">{msgIA}</p>
</details>

<details class="card paso" id="b-manual">
  <summary><b>Ya sé mi estación y mi tipo de cuerpo</b></summary>
  <p class="a-msg">
    Si ya te han hecho un análisis de color, elige tu estación y tu tipo de cuerpo y empiezo con eso.
  </p>
  <label class="a-f"
    ><span>Estación de color</span><select id="m-estacion" bind:value={estacion}>
      {#each estaciones as e (e.id)}
        <option value={e.id}>{e.n}</option>
      {/each}
    </select></label
  >
  <label class="a-f"
    ><span>Tipo de cuerpo (Kibbe)</span><select id="m-cuerpo" bind:value={cuerpo}>
      {#each cuerpos as c (c.id)}
        <option value={c.id}>{c.n}</option>
      {/each}
    </select></label
  >
  <label class="a-f"
    ><span>Nombre de tu estética (opcional)</span><input
      type="text"
      id="m-estetica"
      maxlength="60"
      placeholder="Por ejemplo: romántica vintage"
      bind:value={estetica}
    /></label
  >
  <div class="a-row">
    <button type="button" class="a-btn ghost" id="m-crear" onclick={creaManual}>Crear mi perfil</button>
  </div>
</details>

<div class="card paso">
  <p class="a-msg">¿Ya tienes una copia de seguridad?</p>
  <label class="a-btn ghost" style="position: relative; justify-self: start"
    >Importar copia<input
      type="file"
      id="b-importa"
      accept="application/json,.json"
      style="position: absolute; inset: 0; opacity: 0"
      onchange={(ev) => importaArchivo(ev.currentTarget, (t: string) => (msg = t))}
    /></label
  >
</div>
