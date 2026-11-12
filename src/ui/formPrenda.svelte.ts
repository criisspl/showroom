// Estado compartido del formulario de prenda (alta, edición y «¿Lo compro?») y lo que lo abre y cierra.
// Armario lo pinta en su pantalla; en modo «¿Lo compro?» lo pinta Deseos, en su hueco #w-form-slot.
import { app } from "../state.js";
import { hayIA, abreImagen } from "../lib/ai.ts";
import { COLOR_INICIAL, dominanteDe, tamanoReducido } from "../lib/prendaform.ts";
import { estiloDe, tejidoDe, temporadaDe } from "../lib/engine.ts";
import type { Evaluacion } from "../lib/motor/compra.ts";
import type { Cat, Corte, Estilo, Prenda, Tejido, Temporada } from "../lib/tipos.ts";
import type { PrendaLeida } from "../lib/prendaform.ts";

export interface VeredictoVista {
  d: PrendaLeida;
  r: Evaluacion;
}

export const form = $state({
  abierto: false,
  /** Sube cada vez que se abre el formulario: lleva la vista y el foco a él. */
  abiertoN: 0,
  editing: null as string | null,
  /** `"compra"` cuando es el «¿Lo compro?»; si no, null. */
  modo: null as string | null,
  /** Dónde se pinta: en Armario, o en Deseos si se abrió como «¿Lo compro?». No cambia hasta cerrarlo. */
  lugar: "armario" as "armario" | "deseos",
  activa: true,
  nombre: "",
  tipo: "",
  notas: "",
  color: COLOR_INICIAL,
  cat: "arriba" as Cat,
  corte: "fluida" as Corte,
  estilo: "casual" as Estilo,
  tejido: "algodon" as Tejido,
  abrigo: "2",
  temporada: [] as Temporada[],
  /** La temporada se deduce sola de lo que vas rellenando hasta que la tocas tú. */
  tempTocada: false,
  msg: "",
  autoMsg: "",
  autoVisible: false,
  delArmed: false,
  previewSrc: null as string | null,
  previewTxt: "",
  veredicto: null as VeredictoVista | null,
  verdN: 0
});

/** Lo que no es reactivo: la foto recién elegida y la que viene de otra pantalla. */
export const fotos: {
  photo: { blob: Blob } | null;
  prefoto: { foto: string | null; mini: string | null } | null;
} = { photo: null, prefoto: null };

// URL temporal de la foto recién elegida (las de la base las gestiona el store): se libera al cambiarla.
let urlPropia: string | null = null;
function pintaPrevia(src: string | null | undefined, txt?: string) {
  if (urlPropia && src !== urlPropia) {
    URL.revokeObjectURL(urlPropia);
    urlPropia = null;
  }
  form.previewSrc = src || null;
  form.previewTxt = src ? "" : txt || "";
}

/** Temporadas que se deducen de lo que hay escrito en el formulario. */
export const temporadaAuto = (): Temporada[] =>
  temporadaDe({
    nombre: form.nombre,
    tipo: form.tipo,
    cat: form.cat,
    abrigo: +(form.abrigo || 2),
    tejido: form.tejido
  }).t;

type Pre = Record<string, unknown>;

/**
 * Abre el formulario: vacío, con una prenda para editarla (`p`), prerrellenado (`pre`) o en modo «compra».
 * `msg` es el aviso que se enseña debajo (si no, el que toque según el caso).
 */
export async function abreForm(p: Prenda | null, pre?: Pre | null, modo?: string | null, msg?: string) {
  form.editing = p ? p.id : null;
  fotos.photo = null;
  form.delArmed = false;
  form.modo = modo || null;
  form.lugar = form.modo === "compra" ? "deseos" : "armario";
  fotos.prefoto =
    pre && (pre.foto || pre.mini)
      ? { foto: (pre.foto as string) || null, mini: (pre.mini as string) || null }
      : null;
  form.veredicto = null;
  form.activa = !p || p.activa !== false;
  const x = (p || pre || {}) as Partial<Prenda>;
  form.nombre = x.nombre || "";
  form.tipo = x.tipo || "";
  form.notas = (p && (p as Prenda & { notas?: string }).notas) || "";
  form.color = x.color || COLOR_INICIAL;
  form.cat = x.cat || "arriba";
  form.corte = x.corte || "fluida";
  form.abrigo = String(x.abrigo || 2);
  form.estilo = p || pre ? estiloDe(x as Prenda) : "casual";
  form.tejido = p || pre ? tejidoDe(x as Prenda) : "algodon";
  form.msg = "";
  form.autoMsg = "";
  form.autoVisible = false;
  const fid = p ? p.foto : fotos.prefoto && fotos.prefoto.foto,
    mini = p ? p.mini : fotos.prefoto && fotos.prefoto.mini;
  pintaPrevia(fid ? await app.store.urlFoto(fid) : mini);
  if (pre)
    form.msg = fotos.prefoto
      ? "He rellenado los datos. Revísalos y pulsa Guardar."
      : "He rellenado los datos. Hazle una foto, revísalos y pulsa Guardar.";
  if (form.modo === "compra")
    form.msg = "Hazle una foto (o rellena los datos a mano) y pulsa Analizar. No se guarda en tu armario.";
  if (msg) form.msg = msg;
  form.tempTocada = !!(p && Array.isArray(p.temporada) && p.temporada.length);
  form.temporada = form.tempTocada && p ? [...temporadaDe(p).t] : [];
  form.abierto = true;
  form.abiertoN++;
}

export function cierraForm() {
  form.abierto = false;
  form.editing = null;
  form.modo = null;
  fotos.photo = null;
  fotos.prefoto = null;
  app.ui.pendiente = null;
}

/** Reduce la foto elegida, saca su color dominante y la deja de vista previa. */
export async function eligeFoto(file: File | null | undefined) {
  if (!file) return;
  form.msg = "Abriendo la foto…";
  try {
    const bm = await abreImagen(file);
    const w = ("naturalWidth" in bm && bm.naturalWidth) || bm.width,
      h = ("naturalHeight" in bm && bm.naturalHeight) || bm.height;
    const t = tamanoReducido(w, h, 900);
    const grande = document.createElement("canvas");
    grande.width = t.w;
    grande.height = t.h;
    grande.getContext("2d")?.drawImage(bm, 0, 0, t.w, t.h);
    const n = 36,
      peque = document.createElement("canvas");
    peque.width = n;
    peque.height = n;
    const cx = peque.getContext("2d");
    if (!cx) throw new Error("sin canvas");
    cx.drawImage(bm, w * 0.2, h * 0.2, w * 0.6, h * 0.6, 0, 0, n, n);
    const col = dominanteDe(cx.getImageData(0, 0, n, n).data, n);
    const blob = await new Promise<Blob | null>((r) => grande.toBlob(r, "image/jpeg", 0.84));
    if ("close" in bm) bm.close();
    if (!blob) throw new Error("sin imagen");
    fotos.photo = { blob };
    const u = URL.createObjectURL(blob);
    pintaPrevia(u);
    urlPropia = u;
    form.color = col;
    form.autoVisible = hayIA(app.ajustes);
    form.msg =
      form.modo === "compra"
        ? "Foto lista. Revisa los datos y pulsa Analizar."
        : "Foto lista. Completa los datos y pulsa Guardar.";
  } catch (e) {
    form.msg = "No he podido abrir esa imagen. Prueba con otra, o sigue sin foto.";
  }
}

/** Lo que se guarda de la foto: la recién elegida (se guarda en la base) o la que venía de otra pantalla. */
export async function fotoParaGuardar(): Promise<{ foto: string | null; mini: string | null } | null> {
  if (fotos.photo) return { foto: await app.store.putFoto(fotos.photo.blob), mini: null };
  return fotos.prefoto;
}
