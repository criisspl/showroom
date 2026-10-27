// «Espejo, 30 segundos»: cinco preguntas para mirarse antes de salir, sacadas del tipo de cuerpo del perfil.
import { CUERPOS } from "../data/presets.ts";
import type { Perfil } from "./tipos.ts";

/** Preguntas de reserva cuando aún no hay perfil o el tipo de cuerpo no se reconoce. */
const GENERICAS = [
  "¿Hay un solo volumen grande?",
  "¿La división cae en un tercio, no en la cadera?",
  "¿La tela cae y se mueve al caminar?",
  "¿Hay un color tuyo junto a la cara?",
  "¿Estás cómoda con lo que llevas?"
];

const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Cinco preguntas: tres de lo que sienta bien a su tipo de cuerpo, una de lo que evita y una de color. */
export function preguntasEspejo(perfil: Perfil | null): string[] {
  const cuerpo = perfil && Object.values(CUERPOS).find((c) => c.n === perfil.cuerpo.tipo);
  if (!cuerpo || cuerpo.si.length < 3 || !cuerpo.evita.length) return GENERICAS;
  return [
    ...cuerpo.si.slice(0, 3).map((s) => `¿Se ve: ${minuscula(s)}?`),
    `¿Está libre de ${minuscula(cuerpo.evita[0])}?`,
    "¿Hay un color tuyo junto a la cara?"
  ];
}

/** Lo que dice el espejo según los síes (de cinco): con cuatro se sale por la puerta. */
export function veredictoEspejo(sies: number): string {
  if (sies <= 0) return "Marca lo que cumple el look.";
  return sies >= 4 ? "Listo. Sal por la puerta." : "Cambia una sola prenda y vuelve a mirar.";
}
