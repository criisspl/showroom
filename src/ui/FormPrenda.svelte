<script lang="ts">
  // Formulario de prenda: alta, edición y «¿Lo compro?». Su estado vive en formPrenda.svelte.ts
  // porque lo pinta Armario o Deseos según cómo se abra.
  import { app, estado } from "../state.js";
  import { CATS, CORTES, ABRIGOS, EST, TEJ, TEMPORADAS } from "../data/constants.ts";
  import { byId, evalua } from "../lib/engine.ts";
  import { clasifica, consejoColor } from "../lib/color.ts";
  import { imagenParaIA, preguntaJSON } from "../lib/ai.ts";
  import { PEDIDO_RELLENO, leePrenda, rellenoDe } from "../lib/prendaform.ts";
  import type { Temporada } from "../lib/tipos.ts";
  import { ver, falla } from "./comun.js";
  import { vuelveConPrenda } from "./hoy.js";
  import { cambios } from "./puente.svelte.ts";
  import { cierraForm, eligeFoto, form, fotoParaGuardar, fotos, temporadaAuto } from "./formPrenda.svelte.ts";
  import Opciones from "./Opciones.svelte";
  import Veredicto from "./Veredicto.svelte";

  let formEl: HTMLFormElement | undefined = $state();
  let archivo: HTMLInputElement | undefined = $state();
  let campoNombre: HTMLInputElement | undefined = $state();
  let guardando = $state(false);
  let rellenando = $state(false);

  // Cada vez que se abre: se vacía el selector de foto y se lleva la vista al formulario
  $effect(() => {
    void form.abiertoN;
    if (archivo) archivo.value = "";
    formEl?.scrollIntoView({ block: "start" });
  });

  const temporadaVista = $derived(form.tempTocada ? form.temporada : temporadaAuto());
  const colorInfo = $derived.by(() => {
    void cambios.n;
    const c = clasifica(form.color, estado.PAL);
    return { n: c.n, consejo: consejoColor(c, estado.PAL) };
  });
  const titulo = $derived(
    form.lugar === "deseos" ? "¿Lo compro?" : form.editing ? "Editar prenda" : "Nueva prenda"
  );

  function alternaTemporada(id: Temporada, ev: Event & { currentTarget: HTMLInputElement }) {
    const marcadas = ev.currentTarget.checked
      ? [...temporadaVista, id]
      : temporadaVista.filter((t) => t !== id);
    form.tempTocada = true;
    // Siempre queda alguna marcada
    if (!marcadas.length) ev.currentTarget.checked = true;
    form.temporada = marcadas.length ? TEMPORADAS.map(([t]) => t).filter((t) => marcadas.includes(t)) : [id];
  }

  function lee() {
    const r = leePrenda(
      {
        nombre: form.nombre,
        cat: form.cat,
        tipo: form.tipo,
        color: form.color,
        corte: form.corte,
        estilo: form.estilo,
        tejido: form.tejido,
        abrigo: form.abrigo,
        notas: form.notas,
        temporada: form.tempTocada ? form.temporada : []
      },
      form.modo,
      estado.PAL
    );
    if ("error" in r) {
      form.msg = r.error;
      campoNombre?.focus();
      return null;
    }
    return r.prenda;
  }

  async function autoIA() {
    if (!fotos.photo) return;
    rellenando = true;
    form.autoMsg = "La IA está mirando la foto…";
    try {
      const url = await imagenParaIA(fotos.photo.blob, 768);
      const d = await preguntaJSON(app.ajustes, { texto: PEDIDO_RELLENO, imagenes: [url] });
      Object.assign(form, rellenoDe(d));
      form.autoMsg = "Relleno hecho. Revisa antes de guardar.";
    } catch (e) {
      form.autoMsg = e instanceof Error ? e.message : String(e);
    }
    rellenando = false;
  }

  function envia(ev: SubmitEvent) {
    ev.preventDefault();
    guardaPrenda();
  }

  async function guardaPrenda() {
    if (form.modo === "compra") {
      analiza();
      return;
    }
    const d = lee();
    const id = form.editing;
    const viejo = id ? byId(id) : null;
    if (!d) return;
    guardando = true;
    form.msg = "Guardando…";
    let nid: string | null = null;
    try {
      const f = await fotoParaGuardar();
      if (f) {
        d.foto = f.foto;
        d.mini = f.mini;
      }
      if (id) {
        // Al revisarla y guardarla, deja de ser una prenda deducida por la IA
        if (viejo && (viejo as { origen?: string }).origen === "foto-look") d.origen = "usuario";
        await app.store.update("prendas", id, d);
        if (f && viejo && viejo.foto && viejo.foto !== f.foto) app.store.delFoto(viejo.foto);
      } else {
        Object.assign(d, {
          creada: new Date().toISOString(),
          activa: true,
          foto: d.foto || null,
          mini: d.mini || null
        });
        if (app.ui.pendiente && app.ui.pendiente.wid) d.deseo = app.ui.pendiente.wid;
        nid = await app.store.add("prendas", d);
      }
      const pd = app.ui.pendiente;
      cierraForm();
      if (pd && nid) await vuelveConPrenda(pd, nid);
      else if (app.ui.vuelveA) {
        ver(app.ui.vuelveA);
        app.ui.vuelveA = null;
      }
    } catch (e) {
      form.msg = "";
      falla(e);
    }
    guardando = false;
  }

  function analiza() {
    const d = lee();
    if (!d) return;
    form.veredicto = { d, r: evalua(d, app.perfil?.deseos ?? undefined) };
    form.verdN++;
  }

  function yaComprada() {
    form.modo = null;
    guardaPrenda();
  }

  async function retira() {
    const p = form.editing ? byId(form.editing) : null;
    if (!p) return;
    await app.store.update("prendas", p.id, { activa: p.activa === false });
    cierraForm();
  }

  async function elimina() {
    const p = form.editing ? byId(form.editing) : null;
    if (!p) return;
    if (!form.delArmed) {
      form.delArmed = true;
      return;
    }
    await app.store.del("prendas", p.id);
    if (p.foto) app.store.delFoto(p.foto);
    cierraForm();
  }

  function cancela() {
    const volver = !!app.ui.pendiente;
    cierraForm();
    if (volver) ver("hoy");
  }
</script>

<form class="card a-form" id="a-form" novalidate bind:this={formEl} onsubmit={envia}>
  <h2 id="a-form-t">{titulo}</h2>
  <p class="a-msg">La foto es opcional: sin ella también puedes guardar la prenda.</p>
  <label class="a-photo"
    ><input
      type="file"
      id="a-file"
      accept="image/*"
      bind:this={archivo}
      onchange={() => eligeFoto(archivo?.files?.[0])}
    /><span class="a-prev" id="a-prev"
      >{#if form.previewSrc}<img alt="Foto de la prenda" src={form.previewSrc} /><small
          >Toca para cambiar la foto</small
        >{:else}<b>{form.previewTxt || "Hacer o elegir foto"}</b><small
          >Sobre fondo liso se detecta mejor el color</small
        >{/if}</span
    ></label
  >
  <div class="a-row">
    <button
      type="button"
      class="a-btn ghost"
      id="a-auto"
      hidden={!form.autoVisible}
      disabled={rellenando}
      onclick={autoIA}
    >
      Rellenar con IA (envía la foto)</button
    ><span class="a-msg" id="a-auto-msg" role="status" aria-live="polite">{form.autoMsg}</span>
  </div>
  <label class="a-f"
    ><span>Nombre</span><input
      type="text"
      id="a-nombre"
      maxlength="60"
      placeholder="Falda midi de satén"
      autocomplete="off"
      bind:this={campoNombre}
      bind:value={form.nombre}
    /></label
  >
  <fieldset class="pick">
    <legend>Categoría</legend>
    <div class="opts-r" id="a-cat"><Opciones nombre="a-cat" items={CATS} bind:valor={form.cat} /></div>
  </fieldset>
  <label class="a-f"
    ><span>Tipo</span><input
      type="text"
      id="a-tipo"
      maxlength="40"
      placeholder="camiseta, vaquero, botas…"
      autocomplete="off"
      bind:value={form.tipo}
    /></label
  >
  <div class="a-f">
    <span>Color principal</span>
    <div class="a-col">
      <input type="color" id="a-color" aria-label="Color principal" bind:value={form.color} /><span
        id="a-colinfo"><b>{colorInfo.n}</b>{colorInfo.consejo}</span
      >
    </div>
  </div>
  <fieldset class="pick">
    <legend>Corte</legend>
    <div class="opts-r" id="a-corte">
      <Opciones nombre="a-corte" items={CORTES} bind:valor={form.corte} />
    </div>
  </fieldset>
  <fieldset class="pick">
    <legend>Estilo</legend>
    <div class="opts-r" id="a-estilo">
      <Opciones nombre="a-estilo" items={EST} bind:valor={form.estilo} />
    </div>
  </fieldset>
  <fieldset class="pick">
    <legend>Tejido</legend>
    <div class="opts-r" id="a-tejido">
      <Opciones nombre="a-tejido" items={TEJ} bind:valor={form.tejido} />
    </div>
  </fieldset>
  <fieldset class="pick">
    <legend>Abrigo</legend>
    <div class="opts-r" id="a-abrigo">
      <Opciones nombre="a-abrigo" items={ABRIGOS} bind:valor={form.abrigo} />
    </div>
  </fieldset>
  <fieldset class="pick">
    <legend>Temporada</legend>
    <p class="pick-h">La deduzco sola; cámbiala si no acierto.</p>
    <div class="opts-r" id="a-temporada">
      {#each TEMPORADAS as [id, n] (id)}
        <label
          ><input
            type="checkbox"
            name="a-temporada"
            value={id}
            id={"a-temporada-" + id}
            checked={temporadaVista.includes(id)}
            onchange={(ev) => alternaTemporada(id, ev)}
          /><span>{n}</span></label
        >
      {/each}
    </div>
  </fieldset>
  <label class="a-f"
    ><span>Notas</span><input
      type="text"
      id="a-notas"
      maxlength="120"
      placeholder="Opcional"
      autocomplete="off"
      bind:value={form.notas}
    /></label
  >
  <div class="a-row">
    <button type="submit" class="a-btn" id="a-save" disabled={guardando}
      >{form.modo === "compra" ? "Analizar" : "Guardar"}</button
    ><button type="button" class="a-btn ghost" id="a-cancel" onclick={cancela}>Cancelar</button>
  </div>
  <div class="a-row" id="a-edit-row" hidden={!form.editing}>
    <button type="button" class="a-btn ghost" id="a-retire" onclick={retira}
      >{form.activa ? "Retirar del armario" : "Volver a activar"}</button
    ><button type="button" class="a-btn danger" id="a-del" onclick={elimina}
      >{form.delArmed ? "Pulsa otra vez para eliminar" : "Eliminar"}</button
    >
  </div>
  <p class="a-msg" id="a-form-msg" role="status" aria-live="polite">{form.msg}</p>
  {#if form.veredicto}
    {#key form.verdN}
      <Veredicto d={form.veredicto.d} r={form.veredicto.r} onComprada={yaComprada} />
    {/key}
  {/if}
</form>
