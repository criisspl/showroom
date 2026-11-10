// Lógica de la pantalla Análisis (sin DOM): ficha, índice, colores de cambio y búsquedas de «Inspo a la carta».
import type { ColorNombrado, Perfil } from "./tipos.ts";

/** Secciones del informe, en orden: id del bloque y texto del índice. */
export const SECCIONES: [string, string][] = [
  ["an-color", "Color"],
  ["an-cuerpo", "Cuerpo"],
  ["an-rostro", "Rostro"],
  ["an-maqui", "Maquillaje"],
  ["an-pelo", "Pelo"],
  ["an-estetica", "Estética"],
  ["an-looks", "Looks"],
  ["an-inspo", "Inspo"]
];

/** Estaciones del año para «Inspo a la carta»: id (el de Pinterest) y nombre. */
export const ESTACIONES: [string, string][] = [
  ["autumn", "Otoño"],
  ["winter", "Invierno"],
  ["spring", "Primavera"],
  ["summer", "Verano"]
];

const ESTACION_POR_MES = [
  "winter",
  "winter",
  "spring",
  "spring",
  "spring",
  "summer",
  "summer",
  "summer",
  "autumn",
  "autumn",
  "autumn",
  "winter"
];

/** Estación del año que va con un mes (0 = enero). */
export const estacionDelMes = (mes: number): string => ESTACION_POR_MES[mes];

/** Cómo se dice cada ocasión en las búsquedas de Pinterest. */
export const OCASION_EN: Record<string, string> = {
  diario: "casual everyday",
  finde: "weekend afternoon",
  oficina: "casual office",
  "oficina-formal": "business formal office",
  casa: "cozy at home",
  cita: "date night",
  noche: "night out",
  evento: "wedding guest",
  viaje: "travel",
  concierto: "concert"
};

type Color = Perfil["color"];
type Estetica = Perfil["estetica"];

/** Color y estética de un perfil guardado: pueden faltar datos en perfiles antiguos. */
export const colorDe = (p: Perfil): Partial<Color> => p.color || {};
export const esteticaDe = (p: Perfil): Partial<Estetica> => p.estetica || {};

/** Ficha de arriba: solo los datos que existen. */
export function ficha(p: Perfil): [string, string][] {
  const c = colorDe(p);
  const pares: [string, string | undefined][] = [
    ["Color", [c.estacion, c.subtono].filter(Boolean).join(", ")],
    ["Cuerpo", p.cuerpo?.tipo],
    ["Rostro", p.rostro?.forma],
    ["Estética", esteticaDe(p).nombre]
  ];
  return pares.filter((x): x is [string, string] => !!x[1]);
}

/** Texto de la tarjeta que ofrece el análisis con IA (solo si el análisis no viene de la IA). */
export const textoAnalisisIA = (origen: string): string =>
  origen === "local"
    ? "Este análisis se ha hecho en tu móvil. Si quieres más detalle (cara, cejas, gafas, cortes de pelo y una estética a tu medida), puedes hacerlo con IA."
    : "Has empezado con tu estación y tu tipo de cuerpo. Puedes hacer un análisis más completo cuando quieras.";

/** Color de la paleta o de los neutros por el que se cambia uno a evitar (o `transparent`). */
export function hexDeCambio(c: Partial<Color>, x: ColorNombrado): string {
  const nuevo = (c.paleta || []).concat(c.neutros || []).find((y) => y.n === x.cambio);
  return nuevo ? nuevo.hex : "transparent";
}

/** Colores de pelo con hex, en el formato de las muestras de color. */
export const coloresPelo = (colores: { nombre: string; hex: string }[]): ColorNombrado[] =>
  colores.filter((x) => x.hex).map((x) => ({ n: x.nombre, hex: x.hex }));

/** Las tres búsquedas de «Inspo a la carta»: consulta y texto del botón. */
export function busquedasInspo(p: Perfil, est: string | null, ocasion: string | null): [string, string][] {
  const c = colorDe(p);
  const e = esteticaDe(p);
  const oca = OCASION_EN[ocasion ?? ""] || "";
  const nombre = (e.claves || []).slice(0, 2).join(" ") || e.nombre || "";
  const cols = (c.paleta || [])
    .slice(0, 2)
    .map((x) => x.n)
    .join(" ");
  const consultas: [string, string][] = [
    [nombre + " " + oca + " " + est + " outfit", "Outfits"],
    [oca + " " + est + " outfit " + cols, "En tus colores"],
    [(c.estacion || "") + " makeup " + oca, "Maquillaje"]
  ];
  return consultas.map(([q, t]) => [q.replace(/\s+/g, " ").trim(), t]);
}
