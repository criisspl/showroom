import { test, beforeEach } from "vitest";
import assert from "node:assert/strict";
import {
  LIMITE_OCA,
  LIMITE_TEMP,
  MODOS,
  MOTIVOS,
  OPCIONES_BANDA,
  OPCIONES_OCA,
  alterna,
  alternaYo,
  armarioInsuficiente,
  basicos,
  cajaRecorte,
  contextoDe,
  datosVoto,
  esPrincipal,
  etiquetaHueco,
  huecos,
  lugarDe,
  mayus,
  minus,
  montaConVirtual,
  nombreConColor,
  ocaInicial,
  outfitsDeIA,
  pendienteDe,
  pinOutfit,
  porqueDe,
  prendaDe,
  prendaDeFotoParaGuardar,
  prendaDescrita,
  prendasDeFoto,
  propuesta,
  reemplazaPieza,
  resultadoFoto,
  sinRepetir,
  sugiere,
  tarjetaDe,
  textoMejora,
  textoOpinion,
  textoPedirIA,
  textoPromptFoto,
  textoSinAncla,
  textoSinOutfit,
  textoVeredicto,
  transicion,
  virtuales,
  votoDe
} from "../src/lib/hoy.ts";
import type { DatosHoy, EntornoTarjeta, Hueco, Origen, PrendaHoy, Seleccion } from "../src/lib/hoy.ts";
import { claveDe, esVirtual, estado, ocaDe, setEstado } from "../src/lib/engine.ts";
import type { Mejora } from "../src/lib/engine.ts";
import { perfilManual } from "../src/lib/analysis.ts";
import { construyePaleta } from "../src/lib/color.ts";
import type { Deseo, Prenda, Voto } from "../src/lib/tipos.ts";

test("alterna marca y desmarca, y nunca deja la lista vacía", () => {
  assert.deepEqual(alterna(["a"], "b", true, LIMITE_OCA), ["a", "b"]);
  assert.deepEqual(alterna(["a", "b"], "a", false, LIMITE_OCA), ["b"]);
  assert.deepEqual(alterna(["a"], "a", false, LIMITE_OCA), ["a"]);
});

test("alterna respeta el máximo y quita la más antigua", () => {
  const r = alterna(["a", "b"], "c", true, LIMITE_TEMP);
  assert.equal(r.length, LIMITE_TEMP);
  assert.ok(r.includes("c"));
});

test("cajaRecorte descarta cajas que no valen y añade margen a las buenas", () => {
  assert.equal(cajaRecorte(null, 100, 100), null);
  assert.equal(cajaRecorte([0, 0, 0.01, 0.5], 100, 100), null);
  const r = cajaRecorte([0.2, 0.2, 0.5, 0.5], 100, 200);
  assert.ok(r);
  assert.ok(r.X < 20 && r.Y < 40 && r.W > 50 && r.H > 100);
});

test("resultadoFoto recorta textos y listas", () => {
  const r = resultadoFoto({ resumen: "x".repeat(400), bien: new Array(9).fill("ok"), mejorar: "no" }, ["p1"]);
  assert.equal(r.resumen.length, 240);
  assert.equal(r.bien.length, 5);
  assert.deepEqual(r.mejorar, []);
  assert.deepEqual(r.ids, ["p1"]);
});

test("sinRepetir quita duplicados y deja seis como mucho", () => {
  assert.deepEqual(sinRepetir(["a", "a", "b"]), ["a", "b"]);
  assert.equal(sinRepetir(["1", "2", "3", "4", "5", "6", "7"]).length, 6);
});

test("los textos de veredicto y opinión cubren los tres casos", () => {
  assert.equal(textoOpinion("si"), "¡Está genial!");
  assert.equal(textoOpinion("quiza"), "Está bien, con algún retoque");
  assert.equal(textoOpinion("no"), "Le cambiaría cosas");
  assert.ok(textoVeredicto("si").length > 0);
  assert.notEqual(textoVeredicto("si"), textoVeredicto("no"));
});

test("nombreConColor no repite el color si ya está en el nombre", () => {
  const a = nombreConColor({ nombre: "Falda negra", colorN: "Negro" } as Parameters<
    typeof nombreConColor
  >[0]);
  assert.ok(a.includes("Falda negra"));
});

/* ---------- Lógica que depende del armario y del estado del motor ---------- */
const ROPA: Prenda[] = [
  { id: "t1", nombre: "Camiseta de algodón", cat: "arriba", color: "#F5F0E6", formal: 1, abrigo: 1 },
  { id: "t2", nombre: "Blusa de gasa", cat: "arriba", color: "#708238", formal: 2, abrigo: 1 },
  { id: "b1", nombre: "Vaquero recto", cat: "abajo", color: "#3B5A7A", formal: 1, abrigo: 2 },
  { id: "b2", nombre: "Falda midi satén", cat: "abajo", color: "#8B5A2B", formal: 2, abrigo: 1 },
  { id: "z1", nombre: "Botines de ante", cat: "calzado", color: "#8B5A2B", formal: 2, abrigo: 2 },
  { id: "c1", nombre: "Chaqueta de punto", cat: "capa", color: "#C19A6B", formal: 1, abrigo: 2 },
  { id: "a1", nombre: "Collar dorado", cat: "accesorio", color: "#B8914A", formal: 2, abrigo: 1 }
];
const DESEOS: Deseo[] = [
  {
    id: "w-bota",
    n: "Botas de caña media",
    cat: "calzado",
    cols: [["Chocolate", "#4E3326"]],
    abrigo: 2,
    formal: 2,
    estilo: "casual"
  },
  {
    id: "w-collar",
    n: "Collar plateado",
    cat: "accesorio",
    cols: [["Plata", "#C0C0C0"]],
    abrigo: 1,
    formal: 2
  }
];
const SEL: Seleccion = {
  ocas: ["diario"],
  bandas: ["templado"],
  est: "primavera",
  entorno: "ciudad",
  lluvia: false,
  viento: false,
  humedad: false
};
const ctx = (patch: Partial<Seleccion> = {}) => contextoDe({ ...SEL, ...patch });
const datos = (patch: Partial<DatosHoy> = {}): DatosHoy => ({ deseos: DESEOS, D: {}, preg: {}, ...patch });
const entorno = (patch: Partial<EntornoTarjeta> = {}): EntornoTarjeta => ({
  datos: datos(),
  noGen: {},
  ultNo: null,
  nAnclas: 0,
  ...patch
});
const hueco = (patch: Partial<Hueco> = {}): Hueco => ({
  id: null,
  nombre: "Algo",
  cat: "arriba",
  color: "#000000",
  ...patch
});

beforeEach(() => {
  const perfil = perfilManual("otono-suave", "natural-suave");
  setEstado({
    P: ROPA.map((p) => ({ ...p })),
    O: [],
    V: [],
    perfil,
    PAL: construyePaleta(perfil)
  });
  estado.virt = {};
});

test("contextoDe rellena lo que falta y une las opciones marcadas", () => {
  const c = contextoDe({ ...SEL, ocas: [], bandas: [] });
  assert.equal(c.oca, "diario");
  assert.equal(c.banda, "templado");
  const m = ctx({ ocas: ["oficina", "cita"], bandas: ["frio", "templado"], lluvia: true });
  assert.equal(m.oca, "oficina+cita");
  assert.equal(m.banda, "frio+templado");
  assert.equal(m.lluvia, true);
  assert.equal(m.cond.entorno, "ciudad");
});

test("ocaInicial distingue el fin de semana", () => {
  assert.equal(ocaInicial(new Date(2026, 10, 14)), "finde");
  assert.equal(ocaInicial(new Date(2026, 10, 11)), "diario");
});

test("lugarDe describe el plan con sus condiciones", () => {
  const t = lugarDe(ctx({ lluvia: true, viento: true, humedad: true, entorno: "playa" }));
  assert.ok(t.includes(" con lluvia"));
  assert.ok(t.includes(" y viento"));
  assert.ok(t.includes(", húmedo"));
});

test("esPrincipal, mayus y minus", () => {
  assert.equal(esPrincipal("arriba"), true);
  assert.equal(esPrincipal("calzado"), false);
  assert.equal(mayus("falda"), "Falda");
  assert.equal(minus("Falda"), "falda");
  assert.equal(prendaDe("t1")?.id, "t1");
  assert.equal(prendaDe("nada"), null);
});

test("etiquetaHueco cubre cada estado", () => {
  const e = (estado?: string | null, virtual?: boolean) => etiquetaHueco(hueco({ estado, virtual }));
  const etiquetas = ["foto", "ancla", "quiero", "no", "tengo"].map((s) => e(s));
  assert.equal(new Set(etiquetas).size, 5);
  assert.equal(e(null, true), "¿La tienes?");
  assert.equal(e(null), "Te falta");
});

test("propuesta elige el deseo que completa el hueco y respeta lo ya contestado", () => {
  const base = [ROPA[0], ROPA[2]];
  const h = propuesta("calzado", base, ctx(), true, datos());
  assert.equal(h?.id, "w-bota");
  assert.equal(propuesta("calzado", base, ctx(), true, datos({ D: { "w-bota": { estado: "no" } } })), null);
  assert.equal(propuesta("calzado", base, ctx(), true, datos({ preg: { "w-bota": 1 } })), null);
  const q = propuesta("calzado", base, ctx(), false, datos({ D: { "w-bota": { estado: "quiero" } } }));
  assert.equal(q?.estado, "quiero");
  assert.equal(propuesta("calzado", base, ctx(), true, datos({ deseos: [] })), null);
});

test("huecos propone lo que falta y apunta que ya ha preguntado", () => {
  const d = datos();
  const hs = huecos({ ids: ["t1", "b1"] }, ctx(), d);
  assert.ok(hs.some((h) => h.cat === "calzado" && h.id === "w-bota"));
  assert.equal(d.preg["w-bota"], 1);
  assert.deepEqual(huecos({ ids: ["t1", "b1"] }, ctx({ ocas: ["casa"] }), datos()), []);
  assert.deepEqual(huecos({ ids: ["z1"] }, ctx(), datos()), []);
});

test("huecos usa prendas genéricas si no hay deseo que sirva", () => {
  const hs = huecos({ ids: ["t1", "b1"] }, ctx(), datos({ deseos: [] }));
  const cal = hs.find((h) => h.cat === "calzado");
  assert.equal(cal?.generico, true);
  assert.equal(cal?.id, null);
  assert.ok(cal?.nombre.startsWith("Un calzado cerrado en "));
});

test("huecos en «Lo monto yo» ofrece primero lo que ya tienes", () => {
  const hs = huecos({ ids: ["t1", "b1"], yo: true }, ctx(), datos());
  assert.equal(hs.find((h) => h.cat === "calzado")?.propia?.id, "z1");
});

test("sugiere pide un accesorio cuando el look ya está completo", () => {
  const d = datos();
  const s = sugiere({ ids: ["t1", "b1", "z1", "c1"] }, ctx(), d);
  assert.equal(s?.id, "w-collar");
  assert.equal(s?.porque, "Un accesorio lo remataría.");
  assert.equal(d.preg["w-collar"], 1);
  assert.equal(sugiere({ ids: ["t1", "b1"] }, ctx({ ocas: ["casa"] }), datos()), null);
  assert.equal(sugiere({ ids: ["t1", "b1", "z1", "c1", "a1"] }, ctx(), datos()), null);
});

test("basicos y virtuales: no salen los que ya tienes ni los que dijiste que no", () => {
  const todos = basicos();
  assert.equal(todos.length, 6);
  assert.ok(todos.every((b) => b.basico));
  const v = virtuales(datos());
  assert.ok(v.length > 0);
  assert.ok(v.every((x) => x.virtual));
  assert.ok(v.some((x) => x.id === "b-camiseta-clara"));
  const sin = virtuales(
    datos({ D: { "b-camiseta-clara": { estado: "no" }, "b-camisa-clara": { estado: "quiero" } } })
  );
  assert.ok(!sin.some((x) => x.id === "b-camiseta-clara" || x.id === "b-camisa-clara"));
  const tengo = virtuales(datos({ D: { "w-bota": { estado: "tengo" } } }));
  assert.ok(tengo.some((x) => x.id === "w-bota" && x.virtual));
});

test("montaConVirtual deja el armario como estaba y usa una sola prenda virtual", () => {
  const antes = estado.P;
  const r = montaConVirtual(ctx(), null, 0, datos());
  assert.equal(estado.P, antes);
  if (r) {
    assert.equal(r.conVirtual, true);
    assert.equal(r.ids.filter(esVirtual).length, 1);
  }
  const todos: DatosHoy = datos({
    D: Object.fromEntries(basicos().map((b) => [b.id, { estado: "no" }]))
  });
  assert.equal(montaConVirtual(ctx(), null, 0, todos), null);
});

test("pinOutfit resume el look para buscar en Pinterest", () => {
  const ps = ["t1", "b1", "z1"].map((id) => prendaDe(id) as PrendaHoy);
  const t = pinOutfit(ps, ctx());
  assert.ok(t.startsWith("outfit "));
  assert.ok(t.includes("casual"));
  assert.ok(pinOutfit(ps, ctx({ entorno: "montana" })).length > 0);
});

test("transicion solo habla cuando hay varias ocasiones", () => {
  assert.equal(transicion(ocaDe("diario")), null);
  assert.ok(transicion(ocaDe("oficina+cita"))?.includes("suelta el pelo"));
  assert.ok(transicion(ocaDe("cita+diario"))?.includes("ya va arreglado"));
  assert.ok(transicion(ocaDe("diario+finde"))?.includes("accesorio"));
});

test("tarjetaDe monta la vista de un look con sus piezas y su pregunta", () => {
  const t = tarjetaDe(
    { ids: ["t1", "b1"], porque: "Va bien", esquema: "e", mezcla: "m" },
    1,
    ctx(),
    "local",
    0,
    entorno()
  );
  assert.ok(t.quien.startsWith("Opción 1 · "));
  assert.equal(t.piezas.filter((p) => p.tipo === "real").length, 2);
  assert.ok(t.piezas.some((p) => p.tipo === "hueco"));
  assert.equal(t.porque, "Va bien");
  assert.equal(t.esquema, "e");
  assert.equal(t.mezcla, "m");
  assert.ok(t.pin);
  assert.equal(t.maquillaje?.ocasion, "diario");
  assert.ok(t.pregunta);
  assert.equal(t.clave, claveDe(["t1", "b1"]));
});

test("tarjetaDe cambia el encabezado según el origen", () => {
  const o = { ids: ["t1", "b1", "z1"] };
  const q = (origen: Origen, e = entorno()) => tarjetaDe(o, 2, ctx(), origen, 0, e).quien;
  assert.ok(q("ia").startsWith("Propuesta de la IA"));
  assert.ok(q("yo").startsWith("Tu look"));
  assert.ok(q("foto").startsWith("Tu look de la foto"));
  assert.ok(q("ancla").startsWith("Con tu prenda · opción 2"));
  assert.ok(q("ancla", entorno({ nAnclas: 2 })).startsWith("Con tus prendas"));
});

test("tarjetaDe avisa de las forzadas, de los looks nuevos y de lo que dijiste que no", () => {
  const e = entorno({ ultNo: { dest: 0, id: "w-otro", nombre: "Botas" } });
  const t = tarjetaDe({ ids: ["t1", "b1"], forzadas: ["t2", "b2"], nuevo: true }, 1, ctx(), "local", 0, e);
  assert.ok(t.avisos.some((a) => a.includes("no terminan")));
  assert.ok(t.avisos.some((a) => a.includes("ese no vuelve a salir")));
  assert.equal(t.ultNo?.nombre, "Botas");
  assert.equal(t.ultNo?.puedeLista, true);
  const uno = tarjetaDe(
    { ids: ["t1", "b1"], forzadas: ["t2"], nuevo: "Otro texto" },
    1,
    ctx(),
    "local",
    0,
    e
  );
  assert.ok(uno.avisos.some((a) => a.includes("no termina")));
  assert.ok(uno.avisos.includes("Otro texto"));
  const otra = tarjetaDe({ ids: ["t1", "b1"] }, 1, ctx(), "local", 5, e);
  assert.equal(otra.ultNo, null);
});

test("tarjetaDe anota los huecos que ya contestaste", () => {
  const nota = (estado: string) =>
    tarjetaDe(
      { ids: ["t1", "b1"] },
      1,
      ctx(),
      "local",
      0,
      entorno({ datos: datos({ D: { "w-bota": { estado } } }) })
    ).notas;
  assert.ok(
    nota("quiero").some((n) => n.tipo === "texto" && n.texto.includes("ya está en tu lista de deseos"))
  );
  assert.ok(nota("no").some((n) => n.tipo === "lista"));
  assert.ok(nota("tengo").some((n) => n.tipo === "ahora" && n.boton === "Añadirla ahora"));
});

test("tarjetaDe trata los huecos genéricos que ya dijiste que no tienes", () => {
  const sin = datos({ deseos: [] });
  const gen = tarjetaDe({ ids: ["t1", "b1"] }, 1, ctx(), "local", 0, entorno({ datos: sin }));
  const nombres = gen.piezas.flatMap((p) => (p.tipo === "hueco" && p.h.generico ? [p.h.nombre] : []));
  assert.ok(nombres.length > 0);
  const noGen = Object.fromEntries(nombres.map((n) => [n, 1 as const]));
  const t = tarjetaDe({ ids: ["t1", "b1"] }, 1, ctx(), "local", 0, entorno({ datos: sin, noGen }));
  assert.ok(t.notas.some((n) => n.texto.includes("Mira ideas en Deseos")));
});

test("tarjetaDe pinta las prendas virtuales según de dónde vengan", () => {
  const virt = (id: string, patch: Partial<PrendaHoy>): PrendaHoy => ({
    id,
    nombre: "Falda " + id,
    cat: "abajo",
    color: "#112233",
    virtual: true,
    ...patch
  });
  const foto = virt("v-foto", { fotoLook: true, fotoId: "f1" });
  const ancla = virt("v-ancla", { ancla: true });
  const dijo = virt("v-dijo", {});
  estado.virt = { [foto.id]: foto, [ancla.id]: ancla, [dijo.id]: dijo };
  setEstado({ P: ROPA.map((p) => ({ ...p })) });
  const e = entorno({ datos: datos({ D: { [dijo.id]: { estado: "tengo" } } }) });
  const t = tarjetaDe({ ids: ["t1", foto.id, ancla.id, dijo.id] }, 1, ctx(), "foto", 0, e);
  assert.equal(t.fotoAdd.length, 1);
  assert.ok(t.avisos.includes("Con algo que quizá tienes y no has subido."));
  assert.ok(t.notas.some((n) => n.tipo === "ahora" && n.boton === "Subirla ahora"));
  assert.ok(t.notas.some((n) => n.tipo === "ahora" && n.boton === "Añadirla ahora"));
  assert.ok(t.piezas.some((p) => p.tipo === "hueco" && p.h.estado === "foto"));
  assert.ok(t.piezas.some((p) => p.tipo === "hueco" && p.h.estado === "ancla"));
});

test("tarjetaDe añade el consejo de la capa en un día de tiempo cambiante y filtra avisos repetidos", () => {
  const t = tarjetaDe(
    { ids: ["t1", "b1", "c1"], tips: ["a", "b", "c"], warn: ["Falta calzado", "Otro aviso"] },
    1,
    ctx({ ocas: ["oficina", "cita"], bandas: ["frio", "calor"] }),
    "local",
    0,
    entorno()
  );
  assert.ok(t.tips.some((x) => x.texto.includes("quítate la capa")));
  assert.ok(t.tips.some((x) => !x.warn && x.texto.startsWith("De ")));
  assert.ok(t.tips.some((x) => x.warn && x.texto === "Otro aviso"));
  assert.ok(!t.tips.some((x) => x.texto === "Falta calzado"));
});

test("porqueDe y nombreConColor", () => {
  assert.equal(porqueDe(hueco({ porque: "Por esto" })), "Por esto");
  assert.ok(porqueDe(hueco({ cat: "calzado" })).includes("calzado"));
  assert.ok(porqueDe(hueco({ cat: "capa" })).includes("capa"));
  assert.equal(porqueDe(hueco()), "Completaría el look.");
  assert.equal(nombreConColor(hueco({ colorN: "Camel" })), "Algo, en camel");
});

test("pendienteDe decide a qué deseo apunta lo que se sube", () => {
  const q = (p: Partial<Hueco>) => hueco({ id: "w1", ...p });
  assert.deepEqual(pendienteDe(q({}), 2), { wid: "w1", dest: 2, ancla: false, virtId: "w1" });
  assert.equal(pendienteDe(q({ ancla: true }), 2).wid, null);
  assert.equal(pendienteDe(q({ foto: true }), 2).wid, null);
  assert.equal(pendienteDe(q({ wid: "otro" }), 2).wid, "otro");
  assert.equal(pendienteDe(q({ wid: null }), "yo").wid, null);
});

test("reemplazaPieza y alternaYo cambian la prenda de su categoría", () => {
  assert.deepEqual(reemplazaPieza(["t1", "b1", "z1"], ROPA[3], "nueva"), ["t1", "z1", "nueva"]);
  assert.deepEqual(reemplazaPieza(["t1", "b1"], ROPA[6], "nueva"), ["t1", "b1", "nueva"]);
  assert.deepEqual(reemplazaPieza(["t1"], null, "nueva"), ["t1", "nueva"]);
  assert.deepEqual(alternaYo(["t1", "b1"], ROPA[3], true), ["t1", "b2"]);
  assert.deepEqual(alternaYo(["t1"], ROPA[1], true), ["t1", "t2"]);
  assert.deepEqual(alternaYo(["t1", "b1"], ROPA[2], false), ["t1"]);
});

test("textoMejora cuenta los cambios y los añadidos", () => {
  const cambios = [
    { de: ROPA[2], a: ROPA[3] },
    { de: ROPA[0], a: ROPA[1] },
    { de: null, a: ROPA[6] }
  ];
  const t = textoMejora({ cambios, ids: [], v: "si" } as unknown as Mejora);
  assert.equal(
    t,
    "Cambia vaquero recto por falda midi satén y camiseta de algodón por blusa de gasa; añade collar dorado: así pega."
  );
  assert.ok(textoMejora({ cambios, ids: [], v: "quiza" } as unknown as Mejora).endsWith(": así mejora."));
});

test("datosVoto guarda el voto con los rasgos de la combinación y votoDe lo recupera", () => {
  const c = ctx();
  const ahora = new Date("2026-11-12T10:00:00Z");
  const d = datosVoto({ ids: ["t1", "b1", "z1"] }, "t1+b1", c, "no", ["color"], ["t1"], "nota", ahora);
  assert.equal(d.voto, "no");
  assert.deepEqual(d.prendas, ["t1", "b1", "z1"]);
  assert.equal(d.est.length, 2);
  assert.equal(d.fam.length, 2);
  assert.equal(d.creada, "2026-11-12T10:00:00.000Z");
  assert.equal(votoDe("t1+b1", c), null);
  setEstado({ V: [{ ...d, id: "v1" }] });
  assert.equal(votoDe("t1+b1", c)?.nota, "nota");
  assert.equal(votoDe("t1+b1", { oca: "cita", banda: c.banda }), null);
  assert.ok(MOTIVOS.length > 0);
});

test("prendaDescrita estima abrigo y color de lo que escribes", () => {
  assert.equal(prendaDescrita("   ", "arriba", "#112233"), null);
  const a = prendaDescrita("abrigo de lana", "capa", "#aabbcc", "x");
  assert.equal(a?.id, "ancla-x");
  assert.equal(a?.nombre, "Abrigo de lana");
  assert.equal(a?.abrigo, 3);
  assert.equal(a?.color, "#AABBCC");
  assert.equal(a?.ancla, true);
  assert.equal(prendaDescrita("short vaquero", "abajo", "#112233")?.abrigo, 1);
  assert.equal(prendaDescrita("camiseta", "arriba", "#112233")?.abrigo, 2);
});

test("textoPromptFoto lleva el armario y el plan", () => {
  const f = textoPromptFoto(ctx());
  assert.ok(f.includes("Camiseta de algodón"));
  assert.ok(f.includes("[x, y, ancho, alto]"));
});

test("textoPedirIA lleva el armario, el plan y las valoraciones", () => {
  setEstado({
    V: [
      { key: "t1+b1", voto: "no", motivos: ["color"], nota: "me aprieta" },
      { key: "t2+b2", voto: "si", motivos: [], nota: "" }
    ] as unknown as Voto[]
  });
  const c = ctx({ lluvia: true, viento: true, humedad: true, entorno: "montana", ocas: ["oficina", "cita"] });
  const p = textoPedirIA(c);
  assert.ok(p.includes("Camiseta de algodón"));
  assert.ok(p.includes(", llueve"));
  assert.ok(p.includes("Hace viento"));
  assert.ok(p.includes("Hay humedad"));
  assert.ok(p.includes("la montaña"));
  assert.ok(p.includes("NO se pondría"));
  assert.ok(p.includes("Camiseta de algodón + Vaquero recto"));
  assert.ok(p.includes("me aprieta"));
  assert.ok(p.includes("SÍ le gustan"));
  assert.ok(p.includes("todo el día fuera"));
  const simple = textoPedirIA(ctx());
  assert.ok(!simple.includes("Hace viento"));
  assert.ok(!simple.includes("todo el día fuera"));
});

test("prendasDeFoto separa lo que está en el armario de lo nuevo y descarta lo raro", () => {
  const r = prendasDeFoto(
    {
      prendas: [
        { id: "t1" },
        {
          id: "no-existe",
          nombre: "falda",
          cat: "abajo",
          color: "#abcdef",
          registro: "fiesta",
          tejido: "saten",
          corte: "amplia",
          abrigo: 1,
          caja: [0, 0, 1, 1],
          tipo: "falda"
        },
        { nombre: "Raro", cat: "zapatilla-mágica" },
        {
          nombre: "Sin color",
          cat: "arriba",
          color: "rojo",
          registro: "x",
          tejido: "x",
          corte: "x",
          abrigo: 9
        },
        null
      ]
    },
    "t0"
  );
  assert.equal(r.length, 3);
  assert.deepEqual(r[0], { id: "t1" });
  const nueva = r[1] as { v: PrendaHoy; caja: unknown };
  assert.equal(nueva.v.id, "foto-t0-1");
  assert.equal(nueva.v.nombre, "Falda");
  assert.equal(nueva.v.estilo, "fiesta");
  assert.equal(nueva.v.color, "#ABCDEF");
  assert.equal(nueva.v.tejido, "saten");
  assert.equal(nueva.v.corte, "amplia");
  assert.equal(nueva.v.fotoLook, true);
  assert.deepEqual(nueva.caja, [0, 0, 1, 1]);
  const def = r[2] as { v: PrendaHoy };
  assert.equal(def.v.color, "#C19A6B");
  assert.equal(def.v.estilo, "casual");
  assert.equal(def.v.abrigo, 2);
  assert.equal(def.v.tejido, "algodon");
  assert.equal(def.v.corte, "fluida");
});

test("prendaDeFotoParaGuardar prepara los datos de la prenda", () => {
  const nueva = prendasDeFoto(
    { prendas: [{ nombre: "Falda", cat: "abajo", color: "#abcdef" }] },
    "t0"
  )[0] as {
    v: PrendaHoy;
  };
  const d = prendaDeFotoParaGuardar({ ...nueva.v, fotoId: "f9" }, new Date("2026-11-12T10:00:00Z"));
  assert.equal(d.origen, "foto-look");
  assert.equal(d.foto, "f9");
  assert.equal(d.activa, true);
  assert.equal(d.creada, "2026-11-12T10:00:00.000Z");
  assert.equal(prendaDeFotoParaGuardar(nueva.v).foto, null);
});

test("outfitsDeIA solo deja prendas que existen y valida la «falta»", () => {
  const r = outfitsDeIA({
    outfits: [
      {
        prendas: ["t1", "b1", "fantasma", 7],
        porque: "Porque sí",
        consejo: "Un gesto",
        falta: { nombre: "Botas", cat: "calzado", tipo: "bota", color: "#112233", porque: "Completa" }
      },
      { prendas: ["t2"], falta: { nombre: "Algo", cat: "nada", color: "#112233" } },
      { prendas: ["b2"], falta: { nombre: "Sin color", cat: "arriba", color: "x" } },
      { prendas: ["fantasma"] },
      { prendas: ["z1"] }
    ]
  });
  assert.equal(r.length, 3);
  assert.deepEqual(r[0].o.ids, ["t1", "b1"]);
  assert.equal(r[0].origen, "ia");
  assert.equal(r[0].o.porque, "Porque sí");
  assert.deepEqual(r[0].o.tips, ["Un gesto"]);
  assert.equal(r[0].o.falta?.nombre, "Botas");
  assert.equal(r[0].o.falta?.color, "#112233");
  assert.equal(r[1].o.falta, null);
  assert.equal(r[2].o.falta?.color, "#C19A6B");
  assert.equal(r[2].o.falta?.porque, "Completaría este look.");
  assert.deepEqual(outfitsDeIA({ outfits: "no" }), []);
});

test("textoSinAncla explica por qué no sale un look", () => {
  const una = textoSinAncla([ROPA[0]], ctx());
  assert.equal(una.titulo, "Con esta prenda no me sale un look para hoy");
  const varias = textoSinAncla([ROPA[0], ROPA[1]], ctx());
  assert.equal(varias.titulo, "Con estas prendas no me sale un look para hoy");
  assert.ok(una.texto.length > 0);
  assert.ok(varias.texto.length > 0);
});

test("textoSinOutfit y armarioInsuficiente", () => {
  assert.ok(textoSinOutfit(ctx()).includes("Prefiero no proponerte nada"));
  assert.equal(armarioInsuficiente(), false);
  setEstado({ P: ROPA.filter((p) => p.cat !== "abajo") });
  assert.equal(armarioInsuficiente(), true);
  setEstado({ P: [{ ...ROPA[0], cat: "vestido" }] });
  assert.equal(armarioInsuficiente(), false);
});

test("las opciones de ocasión, tiempo y modos están completas", () => {
  assert.ok(OPCIONES_OCA.length > 3);
  assert.ok(OPCIONES_BANDA.length > 2);
  assert.equal(MODOS.length, 5);
});
