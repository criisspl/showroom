// «Maquillaje para este look»: ajusta el maquillaje de su análisis al color de la ropa y a la ocasión.
import { familia } from "./color.ts";
import { FAMN } from "../data/constants.ts";
import { BELLEZA } from "../data/esteticas.ts";
import type { Cat, Familia, Perfil } from "./tipos.ts";

export interface PiezaMaq {
  cat: Cat;
  color?: string;
}
export interface MaquillajeDeLook {
  /** [etiqueta, texto] */
  filas: [string, string][];
  notas: string[];
  /** Búsqueda de Pinterest (en inglés). */
  busqueda: string;
}

const NOCHE = ["cita", "noche", "evento", "concierto"];
const LLAMATIVAS: Familia[] = ["rojizo", "vino", "amarillo", "rosa", "morado"];
const NEUTRAS: Familia[] = ["marron", "claro", "negro", "gris", "azul", "blanco"];
const APAGAN: Familia[] = ["negro", "gris", "blanco"];

const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

type Belleza = NonNullable<Perfil["maquillaje"]>;

/** Maquillaje del análisis o, en perfiles manuales, el de la familia de su estación («Otoño Suave» → otono). */
function bellezaDe(perfil: Perfil | null): Belleza | null {
  if (!perfil) return null;
  if (perfil.maquillaje?.looks.length) return perfil.maquillaje;
  const familiaEst = perfil.color.estacion
    .split(" ")[0]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const b = BELLEZA[familiaEst];
  if (!b) return null;
  return {
    piel: b.piel,
    looks: b.looks.map(([nombre, pasos]) => ({ nombre, pasos, pinterest: `${nombre} makeup ${familiaEst}` })),
    gestos: b.gestos,
    evita: b.evita
  };
}

/** Maquillaje para un look concreto, o null si no hay de dónde sacarlo. */
export function maquillajeDeLook(
  perfil: Perfil | null,
  prendas: PiezaMaq[],
  ocasion: string
): MaquillajeDeLook | null {
  const m = bellezaDe(perfil);
  if (!m) return null;
  const noche = NOCHE.includes(ocasion);
  const base = m.looks.find((l) => l.nombre.toLowerCase() === (noche ? "noche" : "diario")) ?? m.looks[0];

  const ropa = prendas.filter((p) => p.cat !== "calzado" && p.cat !== "accesorio");
  const fams = ropa.map((p) => familia(p.color));
  const cara = ropa.find((p) => p.cat === "arriba" || p.cat === "vestido" || p.cat === "capa") ?? ropa[0];
  const famCara = cara ? familia(cara.color) : null;
  const llamativa = fams.find((f) => LLAMATIVAS.includes(f));

  const filas: [string, string][] = [
    ["Piel", m.piel],
    [noche ? "Base de noche" : "Base de día", base.pasos.join(" · ")]
  ];
  const notas: string[] = [];
  if (llamativa) {
    filas.push(["Con tu ropa", `Ojos neutros: el color ya lo pone la ropa (${FAMN[llamativa]}).`]);
    notas.push("Repite el tono de la prenda en labios o mejillas, nunca en los ojos a la vez.");
  } else if (fams.length && fams.every((f) => NEUTRAS.includes(f))) {
    filas.push(["Con tu ropa", "La ropa es neutra: el maquillaje puede ser el acento del look."]);
  }
  if (famCara && APAGAN.includes(famCara)) {
    notas.push(
      `Con ${FAMN[famCara]} junto a la cara, sube el colorete y elige un labio con color, no nude pálido.`
    );
  }
  if (m.gestos.length) filas.push(["Gesto clave", m.gestos[0]]);
  if (m.evita.length) filas.push(["Evita", minuscula(m.evita[0])]);
  return { filas, notas, busqueda: base.pinterest };
}
