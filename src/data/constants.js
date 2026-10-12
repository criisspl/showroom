// Listas fijas y tablas de compatibilidad que usa el motor de outfits.

export const CATS = [["arriba", "Arriba"], ["abajo", "Abajo"], ["vestido", "Vestido"], ["capa", "Capa"], ["calzado", "Calzado"], ["accesorio", "Accesorio"]];
export const CATN = Object.fromEntries(CATS);
export const CORTES = [["ajustada", "Ajustada"], ["fluida", "Fluida"], ["amplia", "Amplia"]];
export const ABRIGOS = [["1", "Ligera"], ["2", "Media"], ["3", "Abrigada"]];

export const EST = [["deportivo", "Deportiva"], ["casual", "Casual"], ["arreglado", "Arreglada"], ["fiesta", "De fiesta"]];
export const ESTN = { deportivo: "Deportivo", casual: "Casual", arreglado: "Arreglado", fiesta: "De fiesta" };
export const TEJ = [["algodon", "Algodón"], ["vaquero", "Vaquero o pana"], ["punto", "Punto"], ["felpa", "Felpa"], ["saten", "Satén o brillo"], ["ligero", "Encaje, gasa o lino"], ["piel", "Piel o ante"]];
export const TEJN = { algodon: "Algodón", vaquero: "Vaquero", punto: "Punto", felpa: "Felpa", saten: "Satén", ligero: "Tejido ligero", piel: "Piel" };
export const FORMAL_DE = { deportivo: 1, casual: 1, arreglado: 2, fiesta: 3 };

export const BANDAS = [
  { id: "frio", n: "Frío", s: "menos de 10°", t: 3 },
  { id: "fresco", n: "Fresco", s: "10 a 17°", t: 2.5 },
  { id: "templado", n: "Templado", s: "18 a 24°", t: 2 },
  { id: "calor", n: "Calor", s: "25° o más", t: 1 }
];
// Tiempo por defecto según el mes (hemisferio norte)
export const MESBANDA = ["frio", "frio", "fresco", "fresco", "templado", "calor", "calor", "calor", "calor", "templado", "fresco", "frio"];

export const OCAS = [
  { id: "diario", n: "Diario", s: "lunes a jueves", d: "una tarde entre semana, casual", f: [1, 2] },
  { id: "finde", n: "Tarde de finde", s: "viernes a domingo", d: "una tarde de viernes, sábado o domingo: un punto más arreglada que a diario, sin llegar a cita", f: [1.5, 2.5] },
  { id: "oficina", n: "Oficina", f: [1.8, 2.6] },
  { id: "casa", n: "En casa", f: [1, 1.5] },
  { id: "cita", n: "Cita", f: [2, 3] },
  { id: "noche", n: "Salir de noche", f: [2, 3] },
  { id: "evento", n: "Boda o evento", f: [2.6, 3] },
  { id: "viaje", n: "Viaje", f: [1, 2] },
  { id: "concierto", n: "Concierto", f: [1, 2] }
];

function tabla(rows) { const o = {}; rows.forEach(([a, b, v]) => { o[[a, b].sort().join("|")] = v; }); return o; }
export function par(tab, x, y) { const v = tab[[x, y].sort().join("|")]; return v === undefined ? 0 : v; }

// Registro con registro. null = no se mezclan nunca.
export const S_PAR = tabla([
  ["deportivo", "deportivo", 0.6], ["deportivo", "casual", 0.2], ["deportivo", "arreglado", null], ["deportivo", "fiesta", null],
  ["casual", "casual", 0.2], ["casual", "arreglado", 0.5], ["casual", "fiesta", -0.6],
  ["arreglado", "arreglado", 0.3], ["arreglado", "fiesta", 0.4], ["fiesta", "fiesta", 0.2]
]);
// Registro de cada prenda según la ocasión. null = fuera.
export const S_OCA = {
  diario: { deportivo: -0.4, casual: 0.6, arreglado: 0.1, fiesta: -1.5 },
  finde: { deportivo: -1.5, casual: 0.2, arreglado: 0.6, fiesta: -0.4 },
  oficina: { deportivo: null, casual: 0.2, arreglado: 0.7, fiesta: null },
  casa: { deportivo: 0.8, casual: 0.3, arreglado: -1.2, fiesta: null },
  cita: { deportivo: null, casual: -0.3, arreglado: 0.7, fiesta: 0.3 },
  noche: { deportivo: null, casual: -0.6, arreglado: 0.3, fiesta: 0.9 },
  evento: { deportivo: null, casual: -1.5, arreglado: 0.5, fiesta: 0.8 },
  viaje: { deportivo: 0.5, casual: 0.5, arreglado: -0.8, fiesta: null },
  concierto: { deportivo: -1.2, casual: 0.5, arreglado: 0.2, fiesta: 0.3 }
};
// Tejido con tejido. null = no se mezclan.
export const T_PAR = tabla([
  ["felpa", "felpa", 0.5], ["felpa", "algodon", 0.3], ["felpa", "vaquero", 0.3], ["felpa", "punto", -0.3], ["felpa", "saten", null], ["felpa", "ligero", null], ["felpa", "piel", -0.3],
  ["saten", "punto", 0.7], ["saten", "algodon", 0.4], ["saten", "vaquero", 0.5], ["saten", "piel", 0.5], ["saten", "ligero", 0.3], ["saten", "saten", -0.3],
  ["ligero", "vaquero", 0.5], ["ligero", "piel", 0.4], ["ligero", "punto", 0.4], ["ligero", "algodon", 0.2], ["ligero", "ligero", 0.2],
  ["vaquero", "algodon", 0.4], ["vaquero", "punto", 0.5], ["vaquero", "piel", 0.5], ["vaquero", "vaquero", -0.2],
  ["punto", "algodon", 0.1], ["punto", "punto", -0.4], ["punto", "piel", 0.5], ["algodon", "piel", 0.3], ["piel", "piel", -0.5]
]);
// Familia de color con familia de color (armonía).
export const H_PAR = tabla([
  ["amarillo", "amarillo", 1.5], ["azul", "azul", 1.3], ["claro", "claro", 1.2], ["marron", "marron", 1.3], ["rojizo", "rojizo", 1.5], ["verde", "verde", 1.6], ["vino", "vino", 1.3],
  ["rojizo", "verde", 2], ["amarillo", "verde", 1.6], ["verde", "vino", 1.6], ["marron", "verde", 1.8], ["claro", "verde", 1.8], ["azul", "verde", 1.0],
  ["amarillo", "rojizo", 1.2], ["rojizo", "vino", 0.6], ["marron", "rojizo", 1.6], ["claro", "rojizo", 1.8], ["azul", "rojizo", 1.7],
  ["amarillo", "vino", 1.9], ["amarillo", "marron", 1.7], ["amarillo", "claro", 1.3], ["amarillo", "azul", 1.5],
  ["marron", "vino", 1.4], ["claro", "vino", 1.7], ["azul", "vino", 1.2], ["claro", "marron", 1.8], ["azul", "marron", 1.6], ["azul", "claro", 1.6],
  ["rosa", "rosa", 1.3], ["rosa", "claro", 1.6], ["rosa", "gris", 1.4], ["rosa", "azul", 1.3], ["rosa", "verde", 1.3], ["rosa", "vino", 1.4], ["rosa", "negro", 1.2], ["rosa", "marron", 1.1],
  ["morado", "morado", 1.2], ["morado", "claro", 1.5], ["morado", "gris", 1.4], ["morado", "verde", 1.3], ["morado", "amarillo", 1.5], ["morado", "rosa", 1.3],
  ["negro", "negro", 0.7], ["blanco", "blanco", 0.6], ["blanco", "negro", 1.1], ["gris", "gris", 0.6], ["blanco", "gris", 1.2], ["gris", "negro", 1.0],
  ["azul", "blanco", 1.5], ["blanco", "rojizo", 1.2], ["blanco", "verde", 1.2], ["claro", "negro", 1.2], ["gris", "azul", 1.3]
]);

export const MOT = [["estilos", "La mezcla de estilos"], ["tejidos", "Los tejidos"], ["colores", "Los colores"], ["forma", "La forma"], ["ocasion", "No es para esta ocasión"], ["tiempo", "No es para este tiempo"]];
export const FAMN = { verde: "verdes", rojizo: "rojizos", amarillo: "amarillos", vino: "granates", azul: "azules", claro: "cremas", marron: "marrones", negro: "negro", blanco: "blanco", gris: "grises", rosa: "rosas", morado: "morados" };
export const CORN = { ajustada: "ajustado", fluida: "fluido", amplia: "amplio" };
