// Estado de la pestaña Hoy: lo que la persona ha marcado, los outfits propuestos y lo que pasa al contestar.
// Los objetos del motor no son reactivos: se guardan con $state.raw y se sustituyen enteros, nunca se mutan.
import { MESBANDA, estacionHoy } from "../data/constants.ts";
import { hayIA, preguntaJSON } from "../lib/ai.ts";
import { alternaAncla, claveDe, monta, montaConAnclas, byId, setEstado } from "../lib/engine.ts";
import {
  LIMITE_OCA,
  LIMITE_TEMP,
  alterna,
  armarioInsuficiente,
  contextoDe,
  minus,
  montaConVirtual,
  ocaInicial,
  outfitsDeIA,
  pendienteDe,
  prendaDe,
  prendaDeFotoParaGuardar,
  reemplazaPieza,
  textoPedirIA
} from "../lib/hoy.ts";
import type {
  CtxHoy,
  DatosHoy,
  EntornoTarjeta,
  Hueco,
  LookHoy,
  Modo,
  Origen,
  PrendaHoy,
  ResItem,
  ResultadoFoto,
  Seleccion
} from "../lib/hoy.ts";
import type { Entorno, Prenda, Temporada } from "../lib/tipos.ts";
import { app } from "../state.js";
import { ver, falla } from "./comun.js";
import { abreForm } from "./formPrenda.svelte.ts";
import { ponDeseo } from "./ponDeseo.js";
import { avisa } from "./puente.svelte.ts";

type UltNo = { dest: number | string; id: string | null; nombre: string };

class EstadoHoy {
  modo: Modo = $state("propon");
  ocas: string[] = $state([ocaInicial()]);
  bandas: string[] = $state([MESBANDA[new Date().getMonth()]]);
  est: Temporada = $state(estacionHoy());
  entorno: Entorno = $state("ciudad");
  lluvia = $state(false);
  viento = $state(false);
  humedad = $state(false);
  /** Prendas elegidas en «Lo monto yo». */
  yoSel: string[] = $state([]);
  /** Prendas que ya se han juzgado (null: aún no se ha pulsado «¿Pega?»). */
  yoJuzgados: string[] | null = $state.raw(null);
  /** Prendas fijas de «Con estas prendas». */
  anclas: Prenda[] = $state.raw([]);
  ideaSeed = $state(0);
  ideaAbierta: string | null = $state(null);
  ideaNo: string | null = $state(null);
  noIdea: Record<string, 1> = $state.raw({});
  anclaAviso = $state("");
  /** Outfits que se ven ahora y el contexto con el que se montaron. */
  res: ResItem[] | null = $state.raw(null);
  resCtx: CtxHoy | null = $state.raw(null);
  /** Lo que se dice cuando no hay outfits: armario corto o ningún look coherente. */
  vacio = $state(false);
  sinLooks = $state(false);
  noGen: Record<string, 1> = $state.raw({});
  ultNo: UltNo | null = $state.raw(null);
  foto: ResultadoFoto | null = $state.raw(null);
  /** Una nota sobre los outfits («Te dejo las mías») y si es un aviso que el lector de pantalla debe leer. */
  notaSalida = $state("");
  cargandoIA = $state(false);
  /** «Añadir todas» en marcha. */
  anadiendo = $state(false);
  /** Tarjeta a la que hay que llevar la vista tras repintar. */
  scrollA: number | null = $state(null);
  // Motor de outfits: no hace falta que sea reactivo
  seed = 0;
  last: string[] = [];
  lastV: string[] = [];

  get sel(): Seleccion {
    return {
      ocas: this.ocas,
      bandas: this.bandas,
      est: this.est,
      entorno: this.entorno,
      lluvia: this.lluvia,
      viento: this.viento,
      humedad: this.humedad
    };
  }
  get ctx(): CtxHoy {
    return contextoDe(this.sel);
  }
  datos(preg: Record<string, 1> = {}): DatosHoy {
    return { deseos: app.perfil?.deseos || [], D: app.D, preg };
  }
  entornoTarjeta(preg: Record<string, 1> = {}): EntornoTarjeta {
    return { datos: this.datos(preg), noGen: this.noGen, ultNo: this.ultNo, nAnclas: this.anclas.length };
  }

  /* ---------- Lo que se marca arriba ---------- */
  eligeModo(m: Modo) {
    this.modo = m;
    this.scrollA = null;
    if (m === "foto") return;
    if (m === "yo") {
      if (this.yoSel.length) this.juzgaYo();
      return;
    }
    if (m === "ancla") {
      if (this.anclas.length) this.montarAncla(false);
      else this.limpiaSalida();
    } else if (m === "refs") this.limpiaSalida();
    else this.montar(false);
  }
  /** Después de cambiar ocasión, tiempo, estación o lugar: se vuelve a calcular lo que se ve. */
  private alCambiarCtx() {
    const m = this.modo;
    if (m === "foto") return; // se recalcula sola al leer el contexto
    if (m === "yo") {
      if (this.yoSel.length) this.juzgaYo();
      return;
    }
    if (m === "ancla") {
      if (this.anclas.length) this.montarAncla(false);
    } else if (m === "refs") {
      if (this.res || this.vacio || this.sinLooks) this.montar(false);
    } else this.montar(false);
  }
  marcaOca(id: string, on: boolean) {
    this.ocas = alterna(this.ocas, id, on, LIMITE_OCA);
    this.alCambiarCtx();
  }
  marcaBanda(id: string, on: boolean) {
    this.bandas = alterna(this.bandas, id, on, LIMITE_TEMP);
    this.alCambiarCtx();
  }
  eligeEst(e: Temporada) {
    this.est = e;
    this.alCambiarCtx();
  }
  eligeEntorno(e: Entorno) {
    this.entorno = e;
    this.alCambiarCtx();
  }
  marcaCond(que: "lluvia" | "viento" | "humedad", on: boolean) {
    this[que] = on;
    this.alCambiarCtx();
  }

  /* ---------- Lo monto yo ---------- */
  juzgaYo() {
    const ids = this.yoSel.filter((id) => !!byId(id));
    this.yoJuzgados = ids.length ? ids : null;
  }
  empiezaYo() {
    this.yoSel = [];
    this.yoJuzgados = null;
  }
  pruebaCambio(ids: string[]) {
    this.yoSel = ids.slice();
    this.juzgaYo();
  }

  /* ---------- Propónme looks ---------- */
  limpiaSalida() {
    this.res = null;
    this.vacio = false;
    this.sinLooks = false;
    this.notaSalida = "";
    this.ultNo = null;
  }
  montar(otra: boolean) {
    this.limpiaSalida();
    this.scrollA = null;
    if (armarioInsuficiente()) {
      this.vacio = true;
      return;
    }
    const c = this.ctx;
    this.seed = otra ? this.seed + 1 : 0;
    const looks = monta(c.oca, c.banda, c.lluvia, this.seed, otra ? this.last : null, c.est, c.cond);
    this.last = looks.map((r) => r.key);
    if (!looks.length) {
      this.sinLooks = true;
      return;
    }
    const res: ResItem[] = looks.map((o) => ({ o, origen: "local" as Origen }));
    // La tercera opción, con algo que quizá tengas y no has subido
    const v = montaConVirtual(c, this.last.concat(otra ? this.lastV : []), this.seed, this.datos());
    if (v) {
      if (res.length >= 3) res[2] = { o: v, origen: "local" };
      else res.push({ o: v, origen: "local" });
      this.lastV = this.lastV.concat(v.key ?? "").slice(-12);
    }
    this.resCtx = c;
    this.res = res;
  }
  /** Cambia el look rechazado por otro que no estuviera ya en pantalla. */
  sustituye(idx: number, sinPrenda?: string) {
    const res = this.res,
      c = this.resCtx;
    if (!res || !res[idx] || !c) return;
    const vistos = res.map((r) => r.o.key || claveDe(r.o.ids)),
      anc = res[idx].origen === "ancla";
    let nuevo: LookHoy | null = res[idx].o.conVirtual
      ? montaConVirtual(c, vistos, this.seed, this.datos())
      : null;
    for (let sd = 0; sd < 6 && !nuevo; sd++)
      nuevo =
        (anc
          ? montaConAnclas(this.anclas, c, sd, vistos)
          : monta(c.oca, c.banda, c.lluvia, sd, vistos, c.est, c.cond)
        ).find((r) => !vistos.includes(r.key)) || null;
    const sig = res.slice();
    if (nuevo) {
      nuevo.nuevo = sinPrenda ? "Como no tienes " + minus(sinPrenda) + ", te propongo este otro." : true;
      sig[idx] = { o: nuevo, origen: anc ? "ancla" : "local" };
    } else sig.splice(idx, 1);
    this.ultNo = null;
    this.scrollA = nuevo ? idx : null;
    this.res = sig;
  }
  otraTanda() {
    if (this.modo === "ancla") this.montarAncla(true);
    else this.montar(true);
  }

  /* ---------- Con estas prendas ---------- */
  anclaToggle(p: Prenda, on: boolean) {
    const antes = this.anclas,
      nuevas = alternaAncla(antes, p, on),
      quitadas = on ? antes.filter((a) => a.id !== p.id && !nuevas.some((n) => n.id === a.id)) : [];
    this.anclas = nuevas;
    this.anclaAviso = quitadas.length
      ? "Ojo: " +
        quitadas.map((a) => a.nombre).join(", ") +
        " se quita porque ocupa el mismo sitio que " +
        p.nombre +
        "."
      : "";
    if (nuevas.length) this.montarAncla(false, true);
    else this.limpiaSalida();
  }
  quitaAnclas() {
    this.anclas = [];
    this.anclaAviso = "";
    this.limpiaSalida();
  }
  montarAncla(otra: boolean, conservaAviso = false) {
    this.limpiaSalida();
    this.scrollA = null;
    if (!conservaAviso) this.anclaAviso = "";
    if (!this.anclas.length) return;
    const c = this.ctx;
    this.seed = otra ? this.seed + 1 : 0;
    if (!otra) {
      this.ideaSeed = 0;
      this.noIdea = {};
      this.ideaAbierta = null;
    }
    const looks = montaConAnclas(this.anclas, c, this.seed, otra ? this.last : null);
    this.last = looks.map((r) => r.key);
    this.resCtx = c;
    if (!looks.length) {
      this.sinLooks = true;
      return;
    }
    this.res = looks.map((o) => ({ o, origen: "ancla" as Origen }));
  }
  otraIdea() {
    this.ideaSeed++;
    this.ideaAbierta = null;
    this.ideaNo = null;
  }
  abreIdea(id: string) {
    this.ideaAbierta = this.ideaAbierta === id ? null : id;
    this.ideaNo = null;
  }
  noTengoIdea(id: string, nombre: string) {
    this.noIdea = { ...this.noIdea, [id]: 1 };
    this.ideaAbierta = null;
    this.ideaNo = nombre;
  }

  /* ---------- Lo que pasa al contestar «¿Tienes algo así?» ---------- */
  anadeAlLook(q: Hueco, dest: number | string) {
    app.ui.pendiente = pendienteDe(q, dest);
    ver("armario");
    abreForm(
      null,
      q.pre,
      undefined,
      "Revisa los datos (y hazle una foto si quieres). Al guardar, la pongo en tu look."
    );
  }
  async noLaTengo(q: Hueco, dest: number | string) {
    if (q.id) await ponDeseo(q.id, "no");
    else this.noGen = { ...this.noGen, [q.nombre]: 1 };
    avisa();
    if (q.virtual && typeof dest === "number") {
      this.sustituye(dest, q.nombre);
      return;
    }
    this.ultNo = { dest, id: q.id, nombre: q.nombre };
  }
  /** «Añadir todas»: guarda en el armario las prendas de la foto que aún no están. */
  async anadeTodasFoto(hs: Hueco[]) {
    this.anadiendo = true;
    try {
      for (const h of hs) {
        const v = h.id ? prendaDe(h.id) : null;
        if (!h.id || !v) continue;
        const nid: string = await app.store.add("prendas", prendaDeFotoParaGuardar(v));
        const f = this.foto;
        if (f) this.foto = { ...f, ids: f.ids.map((id) => (id === h.id ? nid : id)) };
      }
    } catch (e) {
      falla(e);
    }
    this.anadiendo = false;
  }
  async quieroEnLista(id: string | null, borraUltNo = false) {
    if (!id) return;
    await ponDeseo(id, "quiero");
    if (borraUltNo) this.ultNo = null;
    avisa();
  }
  /** Lo llama el formulario al guardar una prenda nueva que venía de «¿Tienes algo así?». */
  async vuelveConPrenda(
    pd: { wid?: string | null; dest?: number | string; ancla?: boolean; virtId?: string | null },
    nid: string
  ) {
    if (pd.wid) await ponDeseo(pd.wid, "tengo");
    const p = byId(nid);
    ver("hoy");
    if (p && pd.ancla) {
      // La prenda subida sustituye a la descrita del mismo tipo (o se suma a las elegidas) y se remonta
      this.anclas = alternaAncla(
        this.anclas.filter((a: PrendaHoy) => !(a.virtual && a.cat === p.cat)),
        p,
        true
      );
      if (this.modo === "ancla") {
        this.montarAncla(false);
        return;
      }
    }
    if (pd.dest === "foto") {
      if (this.foto) {
        const f = this.foto;
        this.foto = { ...f, ids: f.ids.map((id) => (id === pd.virtId ? nid : id)) };
      }
    } else if (pd.dest === "yo") {
      this.yoSel = reemplazaPieza(this.yoSel, p, nid);
      this.juzgaYo();
    } else if (typeof pd.dest === "number" && this.res && this.res[pd.dest]) {
      const sig = this.res.slice(),
        r = sig[pd.dest];
      sig[pd.dest] = { ...r, o: { ...r.o, ids: reemplazaPieza(r.o.ids, p, nid) } };
      this.scrollA = pd.dest;
      this.res = sig;
    }
  }

  /* ---------- Pedir a la IA ---------- */
  async pedirIA() {
    this.limpiaSalida();
    if (armarioInsuficiente()) {
      this.vacio = true;
      return;
    }
    const c = this.ctx;
    this.cargandoIA = true;
    try {
      const d = await preguntaJSON(app.ajustes, {
        sistema: "Eres una estilista personal. Hablas español de España.",
        texto: textoPedirIA(c)
      });
      const res = outfitsDeIA(d);
      if (res.length) {
        this.resCtx = c;
        this.res = res;
      } else {
        this.montar(false);
        this.notaSalida = "No ha salido una propuesta clara. Te dejo las mías.";
      }
    } catch (e) {
      this.montar(false);
      this.notaSalida = (e instanceof Error ? e.message : String(e)) + " Te dejo mis propuestas.";
    }
    this.cargandoIA = false;
  }

  /** Cada vez que main.js avisa de un cambio: al llegar a la pestaña se monta lo que toque. */
  alPintar() {
    avisa();
    if (this.modo !== "propon" || this.res || this.cargandoIA) return;
    if (this.vacio || !this.sinLooks) this.montar(false);
  }
  get hayIA() {
    return hayIA(app.ajustes);
  }
}

export const hoy = new EstadoHoy();
export const vuelveConPrenda = hoy.vuelveConPrenda.bind(hoy);
export { setEstado, falla };
