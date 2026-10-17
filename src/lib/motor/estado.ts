// Estado del motor: prendas, outfits, votos y paleta de la persona, y búsquedas básicas.
import { clasifica, familia } from "../color.ts";
import type { Cat, ColorPaleta, DatosPrenda, Familia, Outfit, Perfil, Prenda, Voto } from "../tipos.ts";

/** Lo aprendido de las valoraciones: pesos por clave y looks vetados. */
export interface Aprendido {
  par: Record<string, number>;
  veto: Record<string, 1>;
  est: Record<string, number>;
  tej: Record<string, number>;
  col: Record<string, number>;
  cor: Record<string, number>;
  pie: Record<string, number>;
  comp: Record<string, 1>;
  si: number;
  no: number;
}
interface Estado {
  /** Prendas, outfits y votos guardados. */
  P: Prenda[];
  O: Outfit[];
  V: Voto[];
  /** Paleta de trabajo de la persona. */
  PAL: ColorPaleta[];
  perfil: Perfil | null;
  /** Caché de aprende(); se invalida al cambiar los votos. */
  L: Aprendido | null;
  /** Prendas sugeridas que la persona aún no tiene, por id. */
  virt: Record<string, Prenda>;
}

export const estado: Estado = { P: [], O: [], V: [], PAL: [], perfil: null, L: null, virt: {} };
export function setEstado(patch: Partial<Estado>) {
  Object.assign(estado, patch);
  if ("V" in patch) estado.L = null;
}

export const VISTE: Partial<Record<Cat, 1>> = { arriba: 1, abajo: 1, vestido: 1, capa: 1 };
export const activas = () => estado.P.filter((p) => p.activa !== false);
export const byId = (id: string): Prenda | null =>
  estado.P.find((p) => p.id === id) || estado.virt[id] || null;
export const esVirtual = (id: string) => {
  const p = byId(id);
  return !!(p && p.virtual);
};
export const txt = (p: { nombre?: string; n?: string; tipo?: string }) =>
  ((p.nombre || p.n || "") + " " + (p.tipo || "")).toLowerCase();
export const famDe = (p: DatosPrenda): Familia => p.fam || familia(p.color || "#C19A6B");
export const palDe = (p: DatosPrenda) => clasifica(p.color || "#C19A6B", estado.PAL).tipo;
