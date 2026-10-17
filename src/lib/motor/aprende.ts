// Aprendizaje a partir de las valoraciones de la persona.
import { estado } from "./estado.ts";
import type { Aprendido } from "./estado.ts";

export const clave2 = (a: string, b: string) => [a, b].sort().join("|");

export function usos(): Record<string, number> {
  const m: Record<string, number> = {};
  estado.O.forEach((o) => {
    if (o.fecha)
      (o.prendas || []).forEach((id) => {
        m[id] = (m[id] || 0) + 1;
      });
  });
  return m;
}

/* ---------- Aprendizaje a partir de las valoraciones ---------- */
export function aprende(): Aprendido {
  const l: Aprendido = {
    par: {},
    veto: {},
    est: {},
    tej: {},
    col: {},
    cor: {},
    pie: {},
    comp: {},
    si: 0,
    no: 0
  };
  const mas = (t: Record<string, number>, k: string, d: number, lo: number, hi: number) => {
    t[k] = Math.max(lo, Math.min(hi, (t[k] || 0) + d));
  };
  estado.V.forEach((v) => {
    if (!v || !v.key) return;
    const m = v.motivos || [],
      pz = v.piezas || [],
      base = v.key.split("+");
    const dos = (v.est || []).length === 2 && (v.tej || []).length === 2 && (v.fam || []).length === 2;
    if (v.voto === "si") {
      l.si++;
      mas(l.par, v.key, 0.8, -9, 1.6);
      if (dos) {
        mas(l.est, clave2(v.est[0], v.est[1]), 0.15, -2, 0.6);
        mas(l.tej, clave2(v.tej[0], v.tej[1]), 0.15, -2, 0.6);
        mas(l.col, clave2(v.fam[0], v.fam[1]), 0.15, -2, 0.6);
      }
      return;
    }
    if (v.voto !== "no") return;
    l.no++;
    let mezcla = false;
    if (m.includes("ocasion")) {
      l.veto[v.key + "|o:" + v.ocasion] = 1;
    }
    if (m.includes("tiempo")) {
      l.veto[v.key + "|b:" + v.banda] = 1;
    }
    if (dos) {
      if (m.includes("estilos")) {
        mas(l.est, clave2(v.est[0], v.est[1]), -0.5, -2, 0.6);
        mezcla = true;
      }
      if (m.includes("tejidos")) {
        mas(l.tej, clave2(v.tej[0], v.tej[1]), -0.5, -2, 0.6);
        mezcla = true;
      }
      if (m.includes("colores")) {
        mas(l.col, clave2(v.fam[0], v.fam[1]), -0.5, -2, 0.6);
        mezcla = true;
      }
      if (m.includes("forma") && (v.cor || []).length === 2) {
        mas(l.cor, clave2(v.cor[0], v.cor[1]), -0.5, -2, 0.6);
        mezcla = true;
      }
    }
    const soloComp = pz.length > 0 && pz.every((id) => !base.includes(id));
    pz.forEach((id) => {
      if (base.includes(id)) mas(l.pie, id + "|" + v.ocasion, -1.2, -4, 0);
      else {
        l.comp[id + "|" + v.key] = 1;
        mas(l.pie, id + "|" + v.ocasion, -0.8, -4, 0);
      }
    });
    // Un «no» descarta ese look para siempre (salvo que solo fallara un complemento: entonces se cambia el complemento)
    if (!(soloComp && !mezcla)) l.veto[v.key] = 1;
  });
  return l;
}
/** Lo aprendido, calculado una vez y guardado hasta que cambien los votos. */
export const aprendido = (): Aprendido => estado.L || (estado.L = aprende());
