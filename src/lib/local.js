// Análisis sin IA, hecho entero en el dispositivo: colorimetría a partir de los colores que la
// persona marca en su selfie (piel, ojos, pelo y, si hay, algo blanco para corregir la luz) más
// sus respuestas; tipo de cuerpo (Kibbe) por puntos; y estética según las palabras que elige.
import { ESTACIONES, CUERPOS } from "../data/presets.js";
import { ESTETICAS, BELLEZA } from "../data/esteticas.js";

/* ---------- Color: de RGB a CIELAB ---------- */
const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
export function rgbALab([r, g, b]) {
  const R = lin(r),
    G = lin(g),
    B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047,
    y = R * 0.2126 + G * 0.7152 + B * 0.0722,
    z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
/** Corrige el color de la luz con una referencia blanca (balance de blancos sencillo, von Kries en RGB). */
export function corrigeLuz(rgb, blanco) {
  if (!blanco) return rgb;
  const ref = Math.max(...blanco);
  if (ref < 60) return rgb; // la referencia está demasiado oscura: mejor no tocar
  return rgb.map((c, i) => Math.max(0, Math.min(255, (c * ref) / Math.max(1, blanco[i]))));
}
const croma = (l) => Math.hypot(l[1], l[2]);
const tono = (l) => (Math.atan2(l[2], l[1]) * 180) / Math.PI;
const lim = (x, a = -2, b = 2) => Math.max(a, Math.min(b, x));

/* ---------- Respuestas de las preguntas → puntos ---------- */
// T: temperatura (+ cálido), V: valor (+ claro), C: croma/contraste (+ brillante)
const R = {
  venas: { "Azules o moradas": { T: -1 }, Verdes: { T: 1 } },
  joyas: { Doradas: { T: 1 }, Plateadas: { T: -1 } },
  sol: {
    "Me quemo y casi no me bronceo": { T: -0.4, V: 0.5 },
    "Me bronceo con facilidad": { T: 0.4, V: -0.3 }
  },
  ojos_color: {
    Negros: { V: -1, C: 0.6 },
    "Marrón oscuro": { V: -0.7, C: 0.2 },
    "Marrón claro o avellana": { T: 0.5, C: -0.4 },
    Verdes: { T: 0.3, C: 0.2 },
    "Azul o gris claro": { T: -0.4, V: 0.8, C: -0.3 },
    "Azul intenso": { T: -0.4, V: 0.3, C: 1 }
  },
  pelo_color: {
    Negro: { V: -2, C: 0.4 },
    "Castaño oscuro": { V: -1.1 },
    "Castaño claro": { V: 0, C: -0.5 },
    "Rubio oscuro": { V: 0.6, C: -0.6 },
    "Rubio claro": { V: 1.8 },
    Pelirrojo: { T: 1.6, C: 0.3 },
    "Canoso o gris": { T: -0.4, V: 0.6, C: -0.6 }
  }
};

/** Puntuación de color. `muestras` = { piel, ojos, pelo, blanco } en RGB [0-255] (todas opcionales). */
export function puntosColor(muestras = {}, respuestas = {}) {
  const p = { T: 0, V: 0, C: 0 },
    motivos = [];
  for (const [q, tabla] of Object.entries(R)) {
    const d = tabla[respuestas[q]];
    if (!d) continue;
    for (const k of Object.keys(d)) p[k] += d[k];
  }
  const lab = {};
  for (const k of ["piel", "ojos", "pelo"])
    if (muestras[k]) lab[k] = rgbALab(corrigeLuz(muestras[k], muestras.blanco));
  if (lab.piel) {
    // La piel cálida tira a amarillo (ángulo de tono alto); la fría, a rosa.
    const h = tono(lab.piel);
    p.T += lim((h - 57) / 7, -1.5, 1.5);
    p.V += lim((lab.piel[0] - 65) / 12, -1.5, 1.5);
    motivos.push(
      h > 60
        ? "tu piel tira a dorado"
        : h < 53
          ? "tu piel tira a rosado"
          : "tu piel está equilibrada entre rosado y dorado"
    );
  }
  if (lab.pelo) {
    p.V += lim((lab.pelo[0] - 35) / 15, -2, 2);
    p.T += lim((tono(lab.pelo) - 60) / 25, -0.6, 0.6) * Math.min(1, croma(lab.pelo) / 15);
  }
  if (lab.ojos) p.C += lim((croma(lab.ojos) - 15) / 12, -0.8, 0.8);
  if (lab.piel && lab.pelo) {
    const contraste = Math.abs(lab.piel[0] - lab.pelo[0]);
    p.C += lim((contraste - 35) / 15, -1.5, 1.5);
    motivos.push(
      contraste > 45
        ? "hay mucho contraste entre tu piel y tu pelo"
        : contraste < 25
          ? "tu piel y tu pelo tienen poco contraste"
          : "el contraste entre tu piel y tu pelo es medio"
    );
  }
  if (lab.piel) p.C += lim((croma(lab.piel) - 20) / 10, -0.5, 0.5);
  return { ...p, motivos, lab };
}

const FAM = (id) => id.split("-")[0];
// Estaciones vecinas en la rueda de las 12: las dudas típicas de cada una.
const VECINAS = {
  "primavera-clara": ["verano-claro", "primavera-calida"],
  "primavera-calida": ["otono-calido", "primavera-brillante"],
  "primavera-brillante": ["invierno-brillante", "primavera-calida"],
  "verano-claro": ["primavera-clara", "verano-frio"],
  "verano-frio": ["invierno-frio", "verano-suave"],
  "verano-suave": ["otono-suave", "verano-frio"],
  "otono-suave": ["verano-suave", "otono-calido"],
  "otono-calido": ["primavera-calida", "otono-profundo"],
  "otono-profundo": ["invierno-profundo", "otono-calido"],
  "invierno-profundo": ["otono-profundo", "invierno-frio"],
  "invierno-frio": ["verano-frio", "invierno-brillante"],
  "invierno-brillante": ["primavera-brillante", "invierno-frio"]
};
/** De los puntos a una de las 12 estaciones: manda la característica más fuerte; la segunda decide. */
export function estacionDe({ T, V, C }) {
  const dims = [
    ["claro", V, T >= 0 ? "primavera-clara" : "verano-claro"],
    ["profundo", -V, T >= 0 ? "otono-profundo" : "invierno-profundo"],
    ["calido", T, C >= 0 ? "primavera-calida" : "otono-calido"],
    ["frio", -T, C >= 0 ? "invierno-frio" : "verano-frio"],
    ["brillante", C, T >= 0 ? "primavera-brillante" : "invierno-brillante"],
    ["suave", -C, T >= 0 ? "otono-suave" : "verano-suave"]
  ].sort((a, b) => b[1] - a[1]);
  const id = dims[0][2];
  return { id, dominante: dims[0][0], alternativas: VECINAS[id] };
}

const TXT_DOM = {
  claro: "Lo que más te define es la claridad",
  profundo: "Lo que más te define es la profundidad",
  calido: "Lo que más te define es la calidez",
  frio: "Lo que más te define es tu subtono frío",
  brillante: "Lo que más te define es el contraste y la viveza",
  suave: "Lo que más te define es la suavidad"
};

export function analizaColor(muestras, respuestas) {
  const p = puntosColor(muestras, respuestas),
    e = estacionDe(p),
    est = ESTACIONES[e.id];
  const subtono =
    p.T > 0.8 ? "cálido" : p.T < -0.8 ? "frío" : p.T >= 0 ? "neutro, algo cálido" : "neutro, algo frío";
  const explicacion =
    TXT_DOM[e.dominante] +
    (p.motivos.length ? ": " + p.motivos.join(", ") + "." : ".") +
    " Si dudas, prueba también " +
    e.alternativas.map((a) => ESTACIONES[a].n).join(" o ") +
    ": pon prendas de cada paleta junto a tu cara con luz de día.";
  return {
    estacionId: e.id,
    alternativas: e.alternativas,
    subtono,
    contraste: est.contraste,
    intensidad: est.intensidad,
    explicacion,
    puntos: { T: p.T, V: p.V, C: p.C }
  };
}

/* ---------- Cuerpo (Kibbe) ---------- */
const K = {
  estructura: {
    "Huesuda y angulosa, de líneas rectas": { dramatico: 3, "clasico-dramatico": 1, "gamine-flamboyant": 1 },
    "Ancha y recta, de aspecto atlético": { natural: 3, "natural-suave": 1, "dramatico-suave": 0.5 },
    "Equilibrada: ni angulosa ni redondeada": {
      "clasico-suave": 2,
      "clasico-dramatico": 2,
      "natural-suave": 1
    },
    "Suave y con curvas": { romantico: 3, "dramatico-suave": 1, "romantico-teatral": 1, "clasico-suave": 1 },
    "Menuda y compacta": { "gamine-suave": 2, "gamine-flamboyant": 2, romantico: 0.5 }
  },
  rostro: {
    "Anguloso: pómulos y mandíbula marcados": {
      dramatico: 2,
      "clasico-dramatico": 1,
      "gamine-flamboyant": 1,
      "romantico-teatral": 1
    },
    "Equilibrado y simétrico": { "clasico-suave": 1.5, "clasico-dramatico": 1.5 },
    "Redondeado y suave": { romantico: 2, "gamine-suave": 1, "natural-suave": 1, "clasico-suave": 0.5 },
    "Una mezcla: unos rasgos marcados y otros suaves": {
      "gamine-suave": 1.5,
      "gamine-flamboyant": 1.5,
      "romantico-teatral": 1,
      "dramatico-suave": 1
    }
  },
  curvas: {
    "Cintura muy marcada y curvas": {
      romantico: 2,
      "dramatico-suave": 2,
      "romantico-teatral": 2,
      "gamine-suave": 1
    },
    "Algo de cintura": { "clasico-suave": 1, "natural-suave": 1.5, "gamine-suave": 0.5 },
    "Cuerpo más bien recto": { dramatico: 1.5, natural: 2, "gamine-flamboyant": 1.5, "clasico-dramatico": 1 }
  },
  hombros: {
    "Más anchos que la cadera": { dramatico: 1, natural: 1, "clasico-dramatico": 0.5 },
    "Más estrechos que la cadera": { romantico: 1, "romantico-teatral": 0.5, "gamine-suave": 0.5 }
  }
};
export function siluetaDe(r) {
  const b = +r.pecho,
    w = +r.cintura,
    h = +r.cadera;
  if (!(b > 40 && w > 40 && h > 40)) return null;
  if (Math.abs(b - h) <= 5 && w <= Math.min(b, h) * 0.75)
    return "Reloj de arena: pecho y cadera parecidos y cintura marcada.";
  if (h - b > 5) return "Triángulo (pera): la cadera es más ancha que el pecho.";
  if (b - h > 5) return "Triángulo invertido: el pecho o la espalda son más anchos que la cadera.";
  if (w > Math.min(b, h) * 0.85) return "Rectángulo: pecho, cintura y cadera bastante alineados.";
  return "Equilibrada: pecho y cadera parecidos, cintura suave.";
}
export function analizaCuerpo(r = {}) {
  const s = Object.fromEntries(Object.keys(CUERPOS).map((k) => [k, 0]));
  for (const [q, tabla] of Object.entries(K)) {
    const d = tabla[r[q]];
    if (d) for (const [k, v] of Object.entries(d)) s[k] += v;
  }
  const alt = +r.altura;
  if (alt >= 170) {
    s.dramatico += 1.5;
    s["dramatico-suave"] += 1.5;
    s.natural += 1;
    s["gamine-suave"] -= 2;
    s["gamine-flamboyant"] -= 2;
  } else if (alt && alt <= 158) {
    s["gamine-suave"] += 1.5;
    s["gamine-flamboyant"] += 1.5;
    s.romantico += 1;
    s.dramatico -= 2;
    s["dramatico-suave"] -= 1.5;
  }
  const orden = Object.entries(s).sort((a, b) => b[1] - a[1]);
  const id = orden[0][1] > 0 ? orden[0][0] : "clasico-suave";
  return { cuerpoId: id, alternativa: orden[1][0], silueta: siluetaDe(r) };
}

/* ---------- Estética ---------- */
export function analizaEstetica(palabras = []) {
  const ids = palabras.filter((p) => ESTETICAS[p]).slice(0, 3);
  if (!ids.length) ids.push("clasica");
  const [a, b] = ids,
    A = ESTETICAS[a],
    B = b ? ESTETICAS[b] : null;
  const nombre = B ? A.nombre + " con toque " + B.palabra.toLowerCase() : A.nombre;
  return {
    ids,
    estetica: {
      nombre,
      subtitulo: A.subtitulo + (B ? " · " + B.subtitulo : ""),
      palabras: [...new Set([...A.palabras, ...(B ? B.palabras : [])])].slice(0, 4),
      formula: [A.formula[0], A.formula[1], B ? B.formula[0] : A.formula[2]],
      claves: [...new Set([...A.claves, ...(B ? B.claves.slice(0, 3) : [])])],
      porque: [A.porque[0], ...(B ? B.porque : [])],
      pinterest: [A.pinterest[0], A.pinterest[1], ...(B ? [B.pinterest[0]] : [A.pinterest[2]])]
    }
  };
}

/* ---------- Perfil completo ---------- */
export function perfilLocal(muestras, respuestas) {
  const col = analizaColor(muestras, respuestas),
    cu = analizaCuerpo(respuestas),
    et = analizaEstetica(respuestas.estetica || []);
  const e = ESTACIONES[col.estacionId],
    b = CUERPOS[cu.cuerpoId],
    bel = BELLEZA[FAM(col.estacionId)];
  const pal = e.paleta,
    cols = (i) =>
      [pal[i % pal.length], pal[(i + 5) % pal.length], e.neutros[i % e.neutros.length]].map((c) => [
        c.n,
        c.hex
      ]);
  const prendas = [];
  et.ids.slice(0, 2).forEach((id, j) =>
    ESTETICAS[id].prendas.forEach((w) => {
      if (!prendas.some((x) => x.n === w.n)) prendas.push({ ...w, top: j === 0 && !!w.top });
    })
  );
  const deseos = prendas.map((w, i) => ({
    id:
      "w-" +
      i +
      "-" +
      w.n
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 30),
    ...w,
    tipo: w.icono,
    cols: cols(i),
    nota: "En tu paleta y con tu estética.",
    formal: { deportivo: 1, casual: 1, arreglado: 2, fiesta: 3 }[w.estilo],
    q1: w.n,
    q2: w.n + " outfit"
  }));
  const A = ESTETICAS[et.ids[0]];
  return {
    origen: "local",
    creado: new Date().toISOString(),
    respuestas,
    muestras: muestras || {},
    resumen:
      "Estación " +
      e.n +
      " (subtono " +
      col.subtono +
      "), cuerpo " +
      b.n +
      ", estética " +
      et.estetica.nombre.toLowerCase() +
      ".",
    color: {
      estacion: e.n,
      subtono: col.subtono,
      contraste: e.contraste,
      intensidad: e.intensidad,
      explicacion: col.explicacion,
      alternativas: col.alternativas.map((a) => ESTACIONES[a].n),
      paleta: e.paleta,
      neutros: e.neutros,
      evitar: e.evitar,
      metales:
        FAM(col.estacionId) === "primavera" || FAM(col.estacionId) === "otono"
          ? ["Oro", "Bronce", "Cobre"]
          : ["Plata", "Oro blanco", "Oro rosa suave"],
      combinaciones: combinaciones(e)
    },
    cuerpo: {
      tipo: b.n,
      explicacion:
        "Según tus respuestas, encajas mejor con " +
        b.n +
        " (también podrías ser " +
        CUERPOS[cu.alternativa].n +
        ").",
      claves: cu.silueta ? [{ zona: "Silueta", nota: cu.silueta }] : [],
      si: b.si,
      evita: b.evita,
      tips: b.tips
    },
    rostro: null,
    maquillaje: {
      piel: bel.piel,
      looks: bel.looks.map(([nombre, pasos]) => ({
        nombre,
        pasos,
        pinterest: e.n.split(" ")[0] + " " + nombre + " makeup"
      })),
      gestos: bel.gestos,
      evita: bel.evita
    },
    pelo: {
      cortes: [],
      colores: bel.pelo.map(([nombre, hex]) => ({ nombre, hex, nota: "" })),
      evita: bel.peloEvita
    },
    estetica: et.estetica,
    looks: A.looks.map(([ocasion, ps]) => ({
      ocasion,
      prendas: ps,
      pinterest: A.pinterest[0] + " " + ocasion
    })),
    deseos
  };
}

function combinaciones(e) {
  const p = e.paleta,
    n = e.neutros,
    out = [];
  const usos = ["Diario", "Oficina", "Cita", "Finde", "Noche", "Viaje"];
  for (let i = 0; i < 6; i++) {
    const a = n[i % n.length],
      b = p[(i * 2) % p.length],
      c = p[(i * 2 + 5) % p.length];
    out.push({
      nombre: a.n + ", " + b.n.toLowerCase() + " y " + c.n.toLowerCase(),
      hex: [a.hex, b.hex, c.hex],
      uso: usos[i]
    });
  }
  return out;
}
