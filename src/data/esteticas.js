// Estéticas para el análisis sin IA. Cada persona elige hasta 3 palabras con las que se identifica
// y la app combina las dos estéticas más votadas. Cada estética trae su fórmula, búsquedas de
// Pinterest (en inglés, dan mejores resultados) y las prendas clave que se proponen en «Deseos».

const P = (n, cat, icono, estilo, tejido, extra = {}) => ({
  n,
  cat,
  icono,
  estilo,
  tejido,
  corte: "fluida",
  abrigo: 2,
  ...extra
});

export const ESTETICAS = {
  romantica: {
    palabra: "Romántica",
    nombre: "Romántica",
    subtitulo: "suave, femenina y con detalles",
    palabras: ["delicada", "dulce", "femenina"],
    formula: [
      "Una prenda con detalle (lazada, volante, encaje)",
      "Tejidos que caen y se mueven",
      "Un toque de brillo suave"
    ],
    claves: ["lazada", "volantes", "encaje", "flores", "satén", "fruncido"],
    porque: ["Te atraen los detalles delicados y las prendas que se mueven al andar."],
    pinterest: ["romantic feminine outfit", "soft romantic style", "romantic outfit ideas lace"],
    looks: [
      ["Diario", ["Blusa con lazada", "Vaquero recto", "Bailarinas"]],
      ["Cita", ["Vestido de flores", "Cárdigan corto", "Botines"]],
      ["Oficina", ["Blusa fluida", "Falda midi plisada", "Zapato de tacón bajo"]]
    ],
    prendas: [
      P("Blusa con lazada", "arriba", "blusa", "arreglado", "ligero", { top: true }),
      P("Falda midi plisada", "abajo", "falda-midi", "arreglado", "ligero", { top: true }),
      P("Vestido cruzado de flores", "vestido", "vestido", "arreglado", "ligero", { abrigo: 1 }),
      P("Cárdigan corto con botones joya", "capa", "cardigan", "casual", "punto"),
      P("Top de encaje", "arriba", "top", "arreglado", "ligero", { abrigo: 1 }),
      P("Bailarinas", "calzado", "zapatos", "arreglado", "piel"),
      P("Pendientes de perla", "accesorio", "joyas", "arreglado", "algodon")
    ]
  },
  natural: {
    palabra: "Natural",
    nombre: "Natural boho",
    subtitulo: "cómoda, cálida y con textura",
    palabras: ["libre", "cálida", "auténtica"],
    formula: ["Tejidos naturales con textura (lino, punto, ante)", "Capas sueltas", "Accesorios artesanos"],
    claves: ["lino", "crochet", "punto", "ante", "flecos", "bordado"],
    porque: ["Buscas comodidad sin perder estilo y te gustan las texturas naturales."],
    pinterest: ["boho natural outfit", "earthy boho style", "relaxed boho outfit fall"],
    looks: [
      ["Diario", ["Camisa de lino", "Pantalón ancho", "Sandalias de piel"]],
      ["Finde", ["Vestido largo estampado", "Chaleco de crochet", "Botines"]],
      ["Viaje", ["Jersey de punto gordo", "Vaquero recto", "Bolso bandolera"]]
    ],
    prendas: [
      P("Vestido largo estampado", "vestido", "vestido-largo", "casual", "ligero", { top: true, abrigo: 1 }),
      P("Pantalón ancho de lino", "abajo", "pantalon-ancho", "casual", "ligero", { top: true, abrigo: 1 }),
      P("Chaleco de crochet", "capa", "chaleco", "casual", "punto"),
      P("Jersey de punto gordo", "arriba", "jersey", "casual", "punto", { abrigo: 3, corte: "amplia" }),
      P("Chaqueta de ante", "capa", "chaqueta", "casual", "piel"),
      P("Botines de ante", "calzado", "botines", "casual", "piel"),
      P("Bolso bandolera de piel", "accesorio", "bolso", "casual", "piel")
    ]
  },
  clasica: {
    palabra: "Clásica",
    nombre: "Clásica elegante",
    subtitulo: "pulida, equilibrada y atemporal",
    palabras: ["elegante", "cuidada", "segura"],
    formula: ["Básicos de buena calidad", "Una pieza estructurada", "Accesorios discretos"],
    claves: ["camisa", "blazer", "trench", "mocasín", "punto fino"],
    porque: ["Prefieres prendas que no pasan de moda y siempre se ven cuidadas."],
    pinterest: ["classic elegant outfit", "timeless capsule wardrobe", "classic chic outfit"],
    looks: [
      ["Oficina", ["Camisa blanca", "Pantalón de pinzas", "Mocasines"]],
      ["Cita", ["Vestido midi liso", "Trench", "Salones"]],
      ["Diario", ["Jersey de punto fino", "Vaquero recto", "Bailarinas"]]
    ],
    prendas: [
      P("Camisa de popelín", "arriba", "camisa", "arreglado", "algodon", { top: true, corte: "ajustada" }),
      P("Pantalón de pinzas", "abajo", "pantalon-ancho", "arreglado", "algodon", { top: true }),
      P("Gabardina (trench)", "capa", "abrigo", "arreglado", "algodon", { top: true }),
      P("Jersey de punto fino", "arriba", "jersey", "casual", "punto"),
      P("Vestido midi liso", "vestido", "vestido", "arreglado", "ligero"),
      P("Mocasines", "calzado", "zapatos", "arreglado", "piel"),
      P("Bolso estructurado", "accesorio", "bolso", "arreglado", "piel")
    ]
  },
  minimal: {
    palabra: "Minimalista",
    nombre: "Minimal",
    subtitulo: "limpia, sencilla y con buen corte",
    palabras: ["serena", "práctica", "moderna"],
    formula: ["Pocas prendas lisas que combinan entre sí", "Un corte interesante", "Un solo accesorio"],
    claves: ["liso", "recto", "oversize", "punto fino", "camiseta"],
    porque: ["Te gusta vestirte rápido y que todo combine con todo."],
    pinterest: ["minimalist outfit", "minimal capsule wardrobe", "clean minimal style"],
    looks: [
      ["Diario", ["Camiseta lisa de calidad", "Vaquero recto", "Zapatillas blancas"]],
      ["Oficina", ["Jersey de punto fino", "Pantalón ancho", "Mocasines"]],
      ["Noche", ["Top de tirantes liso", "Pantalón de traje", "Sandalias finas"]]
    ],
    prendas: [
      P("Camiseta lisa de buen algodón", "arriba", "camiseta", "casual", "algodon", { top: true }),
      P("Pantalón ancho de traje", "abajo", "pantalon-ancho", "arreglado", "algodon", { top: true }),
      P("Abrigo recto de lana", "capa", "abrigo", "arreglado", "punto", { abrigo: 3, top: true }),
      P("Vaquero recto", "abajo", "vaquero", "casual", "vaquero"),
      P("Jersey de cuello redondo", "arriba", "jersey", "casual", "punto", { abrigo: 3 }),
      P("Zapatillas blancas de piel", "calzado", "zapatillas", "casual", "piel"),
      P("Bolso de líneas simples", "accesorio", "bolso", "arreglado", "piel")
    ]
  },
  urbana: {
    palabra: "Urbana",
    nombre: "Urbana",
    subtitulo: "cómoda, actual y con actitud",
    palabras: ["desenfadada", "actual", "segura"],
    formula: ["Una prenda cómoda (sudadera, zapatilla)", "Una pieza con carácter", "Volúmenes jugados"],
    claves: ["sudadera", "cargo", "bomber", "zapatilla", "oversize"],
    porque: ["Quieres ir cómoda sin parecer que vas de chándal."],
    pinterest: ["streetwear women outfit", "urban casual outfit", "cool girl street style"],
    looks: [
      ["Diario", ["Sudadera oversize", "Vaquero ancho", "Zapatillas"]],
      ["Concierto", ["Camiseta gráfica", "Falda de vaquero", "Botas"]],
      ["Finde", ["Bomber", "Pantalón cargo", "Zapatillas"]]
    ],
    prendas: [
      P("Sudadera oversize", "arriba", "sudadera", "casual", "felpa", {
        top: true,
        corte: "amplia",
        abrigo: 3
      }),
      P("Vaquero ancho", "abajo", "vaquero", "casual", "vaquero", { top: true, corte: "amplia" }),
      P("Cazadora bomber", "capa", "chaqueta", "casual", "algodon", { top: true }),
      P("Pantalón cargo", "abajo", "pantalon-ancho", "casual", "algodon"),
      P("Camiseta gráfica", "arriba", "camiseta", "casual", "algodon", { abrigo: 1 }),
      P("Zapatillas de suela gruesa", "calzado", "zapatillas", "casual", "piel"),
      P("Gorra o bolso cruzado", "accesorio", "bolso", "casual", "algodon")
    ]
  },
  dramatica: {
    palabra: "Llamativa",
    nombre: "Dramática",
    subtitulo: "rotunda, con contraste y presencia",
    palabras: ["poderosa", "atrevida", "rotunda"],
    formula: ["Una prenda protagonista", "Líneas largas y marcadas", "Contraste de color o de tejido"],
    claves: ["blazer", "piel", "hombrera", "largo", "metal"],
    porque: ["Te gusta que tu ropa se note y transmita seguridad."],
    pinterest: ["dramatic chic outfit", "bold statement outfit", "power dressing women"],
    looks: [
      ["Noche", ["Top de satén", "Pantalón de cuero", "Botas altas"]],
      ["Oficina", ["Blazer con hombros marcados", "Pantalón recto", "Salones"]],
      ["Evento", ["Vestido largo liso", "Joyas grandes", "Sandalias de tacón"]]
    ],
    prendas: [
      P("Blazer de hombros marcados", "capa", "chaqueta", "arreglado", "algodon", {
        top: true,
        corte: "ajustada"
      }),
      P("Pantalón de cuero", "abajo", "pantalon-campana", "arreglado", "piel", {
        top: true,
        corte: "ajustada"
      }),
      P("Botas altas", "calzado", "botas", "arreglado", "piel", { top: true }),
      P("Top de satén", "arriba", "top", "fiesta", "saten", { abrigo: 1 }),
      P("Abrigo largo", "capa", "abrigo", "arreglado", "punto", { abrigo: 3 }),
      P("Vestido largo liso", "vestido", "vestido-largo", "fiesta", "saten", { abrigo: 1 }),
      P("Joyas grandes de metal", "accesorio", "joyas", "arreglado", "algodon")
    ]
  },
  vintage: {
    palabra: "Vintage",
    nombre: "Vintage",
    subtitulo: "nostálgica, con historia y personalidad",
    palabras: ["nostálgica", "única", "creativa"],
    formula: ["Una prenda de otra época (o que lo parezca)", "Estampados retro", "Accesorios con encanto"],
    claves: ["pana", "flores", "cuadros", "terciopelo", "campana", "merceditas"],
    porque: ["Te gustan las prendas con carácter y un aire de otra época."],
    pinterest: ["vintage inspired outfit", "70s style outfit women", "retro outfit ideas"],
    looks: [
      ["Diario", ["Pantalón de pana de campana", "Jersey ceñido", "Botines"]],
      ["Cita", ["Vestido de flores", "Cárdigan", "Merceditas"]],
      ["Finde", ["Falda midi de cuadros", "Camisa con cuello", "Mocasines"]]
    ],
    prendas: [
      P("Pantalón de pana de campana", "abajo", "pantalon-campana", "casual", "vaquero", { top: true }),
      P("Vestido de flores con cuello", "vestido", "vestido", "arreglado", "ligero", {
        top: true,
        abrigo: 1
      }),
      P("Merceditas", "calzado", "zapatos", "arreglado", "piel", { top: true }),
      P("Falda midi de cuadros", "abajo", "falda-midi", "arreglado", "punto"),
      P("Cárdigan ceñido", "capa", "cardigan", "casual", "punto"),
      P("Chaqueta de terciopelo", "capa", "chaqueta", "arreglado", "saten"),
      P("Pañuelo estampado", "accesorio", "joyas", "casual", "ligero")
    ]
  },
  sensual: {
    palabra: "Sexy",
    nombre: "Sensual chic",
    subtitulo: "ceñida, segura y con brillo",
    palabras: ["magnética", "segura", "glamurosa"],
    formula: ["Una prenda que marque la silueta", "Un tejido con brillo o caída", "Un tacón o un escote"],
    claves: ["ceñido", "satén", "escote", "tacón", "lencero"],
    porque: ["Te gusta sentirte guapa y que la ropa acompañe tu figura."],
    pinterest: ["chic sexy outfit", "satin slip dress outfit", "date night outfit elegant"],
    looks: [
      ["Cita", ["Vestido lencero", "Blazer", "Sandalias de tacón"]],
      ["Noche", ["Body", "Falda midi de satén", "Botas"]],
      ["Diario", ["Top ceñido", "Vaquero de tiro alto", "Botines de tacón"]]
    ],
    prendas: [
      P("Vestido lencero de satén", "vestido", "vestido-lencero", "fiesta", "saten", {
        top: true,
        abrigo: 1,
        corte: "ajustada"
      }),
      P("Falda midi de satén", "abajo", "falda-midi", "arreglado", "saten", { top: true }),
      P("Top cruzado ceñido", "arriba", "top-cruzado", "arreglado", "ligero", {
        top: true,
        corte: "ajustada"
      }),
      P("Vaquero de tiro alto", "abajo", "vaquero", "casual", "vaquero", { corte: "ajustada" }),
      P("Sandalias de tacón", "calzado", "zapatos", "fiesta", "piel", { abrigo: 1 }),
      P("Botines de tacón", "calzado", "botines", "arreglado", "piel"),
      P("Medias finas", "accesorio", "medias", "arreglado", "ligero")
    ]
  }
};

/** Maquillaje y pelo según la familia de la estación (primavera, verano, otoño, invierno). */
export const BELLEZA = {
  primavera: {
    piel: "Acabado luminoso y fresco: base ligera, iluminador dorado suave.",
    looks: [
      ["Diario", ["Base ligera o crema con color", "Colorete melocotón", "Máscara marrón", "Bálsamo coral"]],
      ["Noche", ["Sombra dorada o bronce claro", "Delineado marrón", "Labio coral o rojo amapola"]]
    ],
    gestos: ["Colorete melocotón en la parte alta de las mejillas", "Labios coral o melocotón"],
    evita: ["Labios muy oscuros o morados", "Sombras grises o negras"],
    pelo: [
      ["Rubio miel", "#C9A063"],
      ["Castaño dorado", "#8A5A2B"],
      ["Cobrizo claro", "#B8693A"]
    ],
    peloEvita: ["Rubio ceniza", "Negro azulado"]
  },
  verano: {
    piel: "Acabado satinado y suave: base fina, nada de dorados intensos.",
    looks: [
      ["Diario", ["Base ligera", "Colorete rosa frío", "Máscara gris o marrón suave", "Bálsamo rosa"]],
      ["Noche", ["Sombra malva o gris topo", "Delineado gris", "Labio frambuesa o rosa"]]
    ],
    gestos: ["Colorete rosa suave", "Labios rosa o frambuesa"],
    evita: ["Naranjas y corales intensos", "Bronceadores muy dorados"],
    pelo: [
      ["Rubio ceniza", "#B7A58A"],
      ["Castaño ceniza", "#6E5B4B"],
      ["Rubio beige", "#CDB89A"]
    ],
    peloEvita: ["Cobrizo", "Rubio dorado intenso"]
  },
  otono: {
    piel: "Acabado cálido y natural: bronceador mate suave, nada de nacarados fríos.",
    looks: [
      ["Diario", ["Base cálida", "Colorete terracota", "Máscara marrón", "Labio nude cálido"]],
      ["Noche", ["Sombras bronce, cobre u oliva", "Delineado marrón oscuro", "Labio ladrillo o teja"]]
    ],
    gestos: ["Bronceador en sienes y pómulos", "Labios terracota o ladrillo"],
    evita: ["Rosas fríos y fucsias", "Sombras plateadas"],
    pelo: [
      ["Castaño chocolate", "#5A3A26"],
      ["Cobrizo", "#9C4F2A"],
      ["Caoba suave", "#6E3226"]
    ],
    peloEvita: ["Rubio ceniza o platino", "Negro azulado"]
  },
  invierno: {
    piel: "Acabado limpio y definido: piel uniforme, contraste en ojos o labios.",
    looks: [
      ["Diario", ["Base ligera", "Colorete rosa frío", "Máscara negra", "Labio rosa o baya"]],
      ["Noche", ["Delineado negro", "Sombra gris o ciruela", "Labio rojo puro o vino"]]
    ],
    gestos: ["Máscara negra bien definida", "Labio rojo puro o baya"],
    evita: ["Naranjas y melocotones", "Bronceadores muy dorados"],
    pelo: [
      ["Castaño oscuro frío", "#3B2E2A"],
      ["Negro natural", "#1E1A1A"],
      ["Chocolate frío", "#4A3530"]
    ],
    peloEvita: ["Rubio dorado", "Cobrizo"]
  }
};
