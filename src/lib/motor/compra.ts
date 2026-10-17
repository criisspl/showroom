// «¿Lo compro?»: cómo encaja en el armario una prenda vista en una tienda.
import { OCAS, S_OCA, CATN } from "../../data/constants.ts";
import { clasifica, familia, harm } from "../color.ts";
import type { Cat, DatosPrenda, Deseo, Perfil, Prenda, Veredicto } from "../tipos.ts";
import { VISTE, activas, estado, famDe, txt } from "./estado.ts";
import { casan, estiloDe, tejidoDe } from "./prenda.ts";

export function tipoClave(p: { cat: Cat; nombre?: string; n?: string; tipo?: string }): string {
  const m =
    /(camiseta|top|blusa|camisa|jersey|cárdigan|cardigan|sudadera|chaleco|chaqueta|abrigo|gabardina|capa|falda|pantal|vaquero|short|bermuda|mallas|vestido|bota|botín|botin|zapatilla|zapato|merceditas|sandalia|bolso|pañuelo|bandana|cinturón|gafas|gorro|pendiente|collar)/.exec(
      txt(p)
    );
  return m ? m[1].replace("botín", "botin").replace("cárdigan", "cardigan") : p.cat;
}
const COMPI: Record<Cat, Cat[]> = {
  arriba: ["abajo"],
  abajo: ["arriba"],
  vestido: ["capa", "calzado"],
  capa: ["arriba", "abajo", "vestido"],
  calzado: ["abajo", "vestido"],
  accesorio: ["arriba", "vestido"]
};
export function companeros(n: DatosPrenda): { p: Prenda; s: number }[] {
  const cats = COMPI[n.cat] || [],
    res: { p: Prenda; s: number }[] = [];
  activas().forEach((p) => {
    if (!cats.includes(p.cat)) return;
    const c = casan(n, p);
    if (c === null) return;
    if (
      n.corte === "amplia" &&
      p.corte === "amplia" &&
      VISTE[n.cat] &&
      VISTE[p.cat] &&
      !(tejidoDe(n) === "felpa" && tejidoDe(p) === "felpa")
    )
      return;
    if (!VISTE[n.cat] && estiloDe(n) !== "deportivo" && estiloDe(p) === "deportivo") return;
    const s = c + harm(famDe(n), famDe(p)) * 0.7;
    if (s >= 0.9) res.push({ p, s });
  });
  return res.sort((a, b) => b.s - a.s);
}
/** Veredicto de «¿Lo compro?» para una prenda vista en una tienda. */
export interface Evaluacion {
  v: Veredicto;
  s: number;
  pro: string[];
  contra: string[];
  socios: Prenda[];
  ocas: string[];
  resumen: string;
}
export function evalua(n: DatosPrenda, deseos?: Deseo[]): Evaluacion {
  const pro: string[] = [],
    contra: string[] = [],
    A = activas(),
    c = clasifica(n.color, estado.PAL),
    t = txt(n);
  let s = 0;
  const cerca =
    n.cat === "arriba" || n.cat === "vestido" || /pañuelo|bandana|pendiente|collar|bufanda/.test(t);
  if (c.tipo === "ok") {
    s += 2;
    pro.push("El " + c.n.toLowerCase() + " es de tu paleta.");
  } else if (c.tipo === "neutro") {
    s += 1;
    pro.push(c.n + " es un neutro tuyo: combina con casi todo.");
  } else {
    s -= cerca ? 2.5 : 1;
    contra.push(
      c.n + " no es de tu paleta" + (cerca ? " y va junto a la cara." : "; lejos de la cara se salva.")
    );
  }
  const cuerpo: Partial<Perfil["cuerpo"]> = (estado.perfil && estado.perfil.cuerpo) || {};
  const pal = (x: string | undefined) =>
    (x || "")
      .toLowerCase()
      .split(/[^a-záéíóúñ]+/)
      .filter((w) => w.length > 3);
  const malos = (cuerpo.evita || []).flatMap(pal),
    buenos = (cuerpo.si || []).flatMap(pal),
    mias = pal(t);
  if (
    mias.some((w) => malos.includes(w)) ||
    (/l[aá]piz|tiro bajo|hombrera|aguja|r[ií]gid/.test(t) && malos.length === 0)
  ) {
    s -= 1.5;
    contra.push("Ese corte no es de los que más te favorecen.");
  } else if (mias.some((w) => buenos.includes(w)) || n.corte === "fluida") {
    s += 1;
    pro.push("La forma va con tu tipo de cuerpo.");
  }
  const est: Partial<Perfil["estetica"]> = (estado.perfil && estado.perfil.estetica) || {},
    claves = (est.claves || []).flatMap(pal);
  if (claves.length && mias.some((w) => claves.includes(w))) {
    s += 0.8;
    pro.push("Encaja con tu estética" + (est.nombre ? ": " + est.nombre.toLowerCase() : "") + ".");
  }
  const so = companeros(n),
    k = so.length;
  if (k >= 6) {
    s += 2;
    pro.push("Combina con " + k + " prendas que ya tienes.");
  } else if (k >= 3) {
    s += 1;
    pro.push("Combina con " + k + " prendas que ya tienes.");
  } else if (k === 0) {
    s -= 2;
    contra.push("No casa con nada de tu armario: te obligaría a comprar más cosas.");
  } else contra.push("Solo combina con " + k + (k === 1 ? " prenda" : " prendas") + " de tu armario.");
  const cnt = A.filter((p) => p.cat === n.cat).length;
  if (cnt <= 1) {
    s += 1.5;
    pro.push(
      "Cubre un hueco: " +
        (cnt ? "solo tienes una prenda" : "no tienes nada") +
        " de " +
        (CATN[n.cat] || n.cat).toLowerCase() +
        "."
    );
  }
  const dup = A.filter(
    (p) =>
      p.cat === n.cat &&
      famDe(p) === c.fam &&
      estiloDe(p) === estiloDe(n) &&
      tejidoDe(p) === tejidoDe(n) &&
      tipoClave(p) === tipoClave(n)
  ).sort(
    (a, b) =>
      pal(txt(b)).filter((w) => mias.includes(w)).length - pal(txt(a)).filter((w) => mias.includes(w)).length
  )[0];
  if (dup) {
    s -= 1.5;
    contra.push("Ya tienes algo muy parecido: " + dup.nombre + ".");
  }
  const w = (deseos || []).find(
    (x) =>
      x.cat === n.cat &&
      tipoClave(x) === tipoClave(n) &&
      (x.cols || []).some((kk) => familia(kk[1]) === c.fam)
  );
  if (w) {
    s += 1;
    pro.push("Es de las prendas que te faltan: " + w.n.toLowerCase() + ".");
  }
  const ocas = OCAS.filter((o) => {
    const v = S_OCA[o.id][estiloDe(n)];
    return v !== null && v > 0 && !(o.id === "casa" && (!VISTE[n.cat] || n.cat === "capa"));
  }).map((o) => o.n.toLowerCase());
  const v: Veredicto = s >= 4 ? "si" : s >= 1.5 ? "quiza" : "no";
  return {
    v,
    s,
    pro,
    contra,
    socios: so.slice(0, 4).map((x) => x.p),
    ocas,
    resumen:
      v === "si"
        ? "Merece la pena: suma más de lo que cuesta."
        : v === "quiza"
          ? "Tiene cosas buenas, pero mira bien lo que juega en contra."
          : "No te va a compensar: piensa en otra versión."
  };
}
