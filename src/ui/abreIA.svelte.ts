// «Análisis más completo con IA» se abre desde otras pantallas: Bienvenida mira este contador.
import { ver } from "./comun.js";

export const peticionIA = $state({ n: 0 });

/** Lleva a la bienvenida y abre la sección de IA. */
export function abreIA() {
  ver("bienvenida");
  peticionIA.n++;
}
