// Contexto de un look: una o varias ocasiones, uno o dos tiempos.
import { OCAS, BANDAS, S_OCA } from "../../data/constants.ts";
import type { Banda, Ocasion } from "../../data/constants.ts";
import type { Contexto, Estilo } from "../tipos.ts";

/** Ocasión, sencilla o combinada («oficina+finde»). */
export interface OcasionCtx extends Ocasion {
  multi?: Ocasion[];
}
/** Tiempo, sencillo o combinado («fresco+templado»): la capa para lo frío, la base para lo cálido. */
export interface BandaCtx extends Banda {
  capa?: Banda;
  calido?: Banda;
  multi?: boolean;
}

/** "oficina+finde" → ocasión combinada: solo vale lo que vale en todas, con un margen de formalidad común. */
export function ocaDe(id: string | undefined): OcasionCtx {
  let os = String(id || "diario")
    .split("+")
    .map((x) => OCAS.find((o) => o.id === x))
    .filter((o): o is Ocasion => !!o);
  if (!os.length) os = [OCAS[0]];
  if (os.length === 1) return os[0];
  const key = os.map((o) => o.id).join("+");
  if (!S_OCA[key]) {
    const so = {} as Record<Estilo, number | null>;
    (["deportivo", "casual", "arreglado", "fiesta"] as const).forEach((e) => {
      const v = os.map((o) => S_OCA[o.id][e]);
      so[e] = v.some((x) => x === null)
        ? null
        : Math.min(...(v as number[])) * 0.6 + ((v as number[]).reduce((a, b) => a + b, 0) / v.length) * 0.4;
    });
    S_OCA[key] = so;
  }
  const f0 = Math.max(...os.map((o) => o.f[0])),
    f1 = Math.max(f0, Math.min(...os.map((o) => o.f[1])));
  return {
    id: key,
    n: os.map((o) => o.n).join(" + "),
    d: "todo el día fuera, sin pasar por casa: " + os.map((o) => o.n.toLowerCase()).join(" y después "),
    f: [f0, f1],
    multi: os
  };
}
/** "fresco+templado" → la base se elige para la parte cálida y la capa para la fría. */
export function bandaDe(id: string | undefined): BandaCtx {
  let bs = String(id || "templado")
    .split("+")
    .map((x) => BANDAS.find((b) => b.id === x))
    .filter((b): b is Banda => !!b);
  if (!bs.length) bs = [BANDAS[2]];
  if (bs.length === 1) return bs[0];
  bs.sort((a, b) => a.t - b.t);
  const cal = bs[0],
    fr = bs[bs.length - 1];
  return {
    id: bs.map((b) => b.id).join("+"),
    n: "De " + fr.n.toLowerCase() + " a " + cal.n.toLowerCase(),
    s: "de " + fr.s + " a " + cal.s,
    t: cal.t * 0.7 + fr.t * 0.3,
    capa: fr,
    calido: cal,
    multi: true
  };
}
export function capaHace(c: Pick<Contexto, "banda" | "lluvia" | "cond">): boolean {
  const b = bandaDe(c.banda),
    bc = b.capa || b,
    cd = c.cond || {};
  return (
    bc.id === "frio" ||
    bc.id === "fresco" ||
    (bc.id === "templado" && c.lluvia) ||
    ((cd.viento || cd.entorno === "montana") && bc.id !== "calor")
  );
}
