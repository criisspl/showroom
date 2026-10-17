// Tipos del dominio: lo que se guarda en IndexedDB y lo que manejan el motor y el análisis.

export type Cat = "arriba" | "abajo" | "vestido" | "capa" | "calzado" | "accesorio";
export type Estilo = "deportivo" | "casual" | "arreglado" | "fiesta";
export type Tejido = "algodon" | "vaquero" | "punto" | "felpa" | "saten" | "ligero" | "piel";
export type Corte = "ajustada" | "fluida" | "amplia";
export type Temporada = "primavera" | "verano" | "otono" | "invierno";
export type Entorno = "ciudad" | "pueblo" | "montana" | "playa";
/** Familia de color (ver familia() en color.ts). */
export type Familia =
  | "verde"
  | "rojizo"
  | "amarillo"
  | "vino"
  | "azul"
  | "claro"
  | "marron"
  | "negro"
  | "blanco"
  | "gris"
  | "rosa"
  | "morado";
/** Cómo encaja un color en la paleta de la persona. */
export type TipoColor = "ok" | "neutro" | "evita";
export type Veredicto = "si" | "quiza" | "no";

/** JSON que viene de fuera (IA, copia importada) antes de validarlo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- se valida campo a campo al normalizar
export type Crudo = any;

export interface Prenda {
  id: string;
  nombre: string;
  cat: Cat;
  /** Nombre corto que usan los deseos y las prendas virtuales. */
  n?: string;
  tipo?: string;
  color?: string;
  colorN?: string;
  fam?: Familia;
  estilo?: Estilo;
  tejido?: Tejido;
  corte?: Corte;
  /** 1 ligera, 2 media, 3 abrigada (en copias antiguas puede venir como texto). */
  abrigo?: number | string;
  /** 1 informal, 2 arreglada, 3 de fiesta. */
  formal?: number | string;
  temporada?: Temporada[];
  activa?: boolean;
  /** Prenda sugerida que la persona aún no tiene. */
  virtual?: boolean;
  foto?: string | null;
  mini?: string | null;
  creada?: string;
}

/** Datos de una prenda que puede no estar guardada todavía (p. ej. la de «¿Lo compro?»). */
export type DatosPrenda = Omit<Prenda, "id"> & { id?: string };

export interface Outfit {
  id: string;
  prendas: string[];
  ocasion: string;
  banda: string;
  lluvia: boolean;
  fecha: string | null;
  fav: boolean;
  creada: string;
  origen: string;
}

export interface Voto {
  id: string;
  /** Clave del look: id del vestido o «arriba+abajo». */
  key: string;
  prendas: string[];
  ocasion: string;
  banda: string;
  voto: "si" | "no";
  motivos: string[];
  piezas: string[];
  nota?: string;
  est: Estilo[];
  tej: Tejido[];
  fam: Familia[];
  cor: Corte[];
  creada: string;
}

/** Color con nombre; `cambio` es el color propio que lo sustituye. */
export interface ColorNombrado {
  n: string;
  hex: string;
  cambio?: string;
}

export interface Deseo {
  id: string;
  n: string;
  cat: Cat;
  tipo?: string;
  icono?: string;
  /** [nombre, hex] */
  cols: [string, string][];
  nota?: string;
  corte?: Corte;
  abrigo?: number;
  estilo?: Estilo;
  tejido?: Tejido;
  formal?: number;
  top?: boolean;
  q1?: string;
  q2?: string;
}

export interface NotaZona {
  zona: string;
  nota: string;
}

export interface Perfil {
  origen: string;
  creado: string;
  respuestas: Record<string, unknown>;
  resumen: string;
  color: {
    estacion: string;
    subtono: string;
    contraste: string;
    intensidad: string;
    explicacion: string;
    alternativas?: string[];
    paleta: ColorNombrado[];
    neutros: ColorNombrado[];
    evitar: ColorNombrado[];
    metales: string[];
    combinaciones: { nombre: string; hex: string[]; uso: string }[];
  };
  cuerpo: {
    tipo: string;
    explicacion: string;
    claves: NotaZona[];
    si: string[];
    evita: string[];
    tips: string[];
  };
  rostro: {
    forma: string;
    rasgos: NotaZona[];
    cejas: string;
    gafas: { si: string[]; evita: string[] };
  } | null;
  maquillaje: {
    piel: string;
    looks: { nombre: string; pasos: string[]; pinterest: string }[];
    gestos: string[];
    evita: string[];
  } | null;
  pelo: {
    cortes: { nombre: string; nota: string; pinterest: string }[];
    colores: { nombre: string; hex: string; nota: string }[];
    evita: string[];
  } | null;
  estetica: {
    nombre: string;
    subtitulo: string;
    palabras: string[];
    formula: string[];
    claves: string[];
    porque: string[];
    pinterest: string[];
  };
  looks: { ocasion: string; prendas: string[]; pinterest: string }[];
  deseos: Deseo[];
}

/** Color de la paleta de trabajo, ya en CIELAB. */
export interface ColorPaleta {
  n: string;
  hex: string;
  tipo: TipoColor;
  lab: Lab;
  fam: Familia;
}
export type Lab = [number, number, number];
export type Rgb = [number, number, number];

/** Condiciones del día. */
export interface Condiciones {
  viento?: boolean;
  humedad?: boolean;
  entorno?: Entorno;
}

/** Contexto de un look: ocasión y tiempo (pueden ser combinados con «+»). */
export interface Contexto {
  oca: string;
  banda: string;
  lluvia?: boolean;
  est?: Temporada;
  cond?: Condiciones;
}
