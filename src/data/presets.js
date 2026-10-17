// Presets para usar la app sin IA: las 12 estaciones de color, los tipos de cuerpo de Kibbe
// y un catálogo base de prendas que se colorean con la paleta de cada persona.

export const ESTACIONES = {
  "primavera-clara": {
    n: "Primavera Clara",
    subtono: "cálido-neutro",
    contraste: "bajo",
    intensidad: "clara y luminosa",
    paleta: [
      {
        n: "Melocotón",
        hex: "#F7B98B"
      },
      {
        n: "Coral claro",
        hex: "#F58F7C"
      },
      {
        n: "Rosa salmón",
        hex: "#F6A28C"
      },
      {
        n: "Amarillo mantequilla",
        hex: "#F6E27F"
      },
      {
        n: "Verde menta cálido",
        hex: "#A8D5A2"
      },
      {
        n: "Verde manzana",
        hex: "#B6D96A"
      },
      {
        n: "Aguamarina",
        hex: "#7FCFC5"
      },
      {
        n: "Azul cielo cálido",
        hex: "#8EC1E6"
      },
      {
        n: "Lavanda cálida",
        hex: "#C3B1E1"
      },
      {
        n: "Turquesa claro",
        hex: "#5BC3C1"
      },
      {
        n: "Albaricoque",
        hex: "#F4B183"
      },
      {
        n: "Rosa cálido",
        hex: "#F2A3B3"
      }
    ],
    neutros: [
      {
        n: "Marfil",
        hex: "#FBF3E2"
      },
      {
        n: "Beige claro",
        hex: "#E9D8BC"
      },
      {
        n: "Camel claro",
        hex: "#D8B48A"
      },
      {
        n: "Gris cálido claro",
        hex: "#C9C0B4"
      },
      {
        n: "Azul marino claro",
        hex: "#4A6B94"
      }
    ],
    evitar: [
      {
        n: "Negro",
        hex: "#141110",
        cambio: "Azul marino claro"
      },
      {
        n: "Blanco óptico",
        hex: "#FFFFFF",
        cambio: "Marfil"
      },
      {
        n: "Granate oscuro",
        hex: "#5E1B26",
        cambio: "Coral claro"
      },
      {
        n: "Marrón chocolate",
        hex: "#4E3326",
        cambio: "Camel claro"
      },
      {
        n: "Gris marengo",
        hex: "#45474A",
        cambio: "Gris cálido claro"
      }
    ]
  },
  "primavera-calida": {
    n: "Primavera Cálida",
    subtono: "cálido",
    contraste: "medio",
    intensidad: "cálida y viva",
    paleta: [
      {
        n: "Coral",
        hex: "#F07A5A"
      },
      {
        n: "Naranja melocotón",
        hex: "#F59A5C"
      },
      {
        n: "Amarillo dorado",
        hex: "#F2C14E"
      },
      {
        n: "Verde hierba",
        hex: "#7DB548"
      },
      {
        n: "Verde oliva claro",
        hex: "#A3A84A"
      },
      {
        n: "Turquesa cálido",
        hex: "#2FB3A8"
      },
      {
        n: "Azul aguamarina",
        hex: "#4BB6C6"
      },
      {
        n: "Rojo tomate",
        hex: "#E2483A"
      },
      {
        n: "Albaricoque",
        hex: "#F4B183"
      },
      {
        n: "Amapola",
        hex: "#F25C3B"
      },
      {
        n: "Verde lima suave",
        hex: "#C3D65A"
      },
      {
        n: "Dorado",
        hex: "#D9A440"
      }
    ],
    neutros: [
      {
        n: "Crema",
        hex: "#F6EBD4"
      },
      {
        n: "Camel",
        hex: "#C99A62"
      },
      {
        n: "Marrón dorado",
        hex: "#8E6232"
      },
      {
        n: "Beige arena",
        hex: "#DCC59E"
      },
      {
        n: "Azul marino cálido",
        hex: "#2E4B6E"
      }
    ],
    evitar: [
      {
        n: "Negro",
        hex: "#141110",
        cambio: "Marrón dorado"
      },
      {
        n: "Blanco óptico",
        hex: "#FFFFFF",
        cambio: "Crema"
      },
      {
        n: "Gris frío",
        hex: "#9BA4AE",
        cambio: "Beige arena"
      },
      {
        n: "Rosa frío",
        hex: "#F3B5CF",
        cambio: "Coral"
      },
      {
        n: "Morado",
        hex: "#6A3FA0",
        cambio: "Turquesa cálido"
      }
    ]
  },
  "primavera-brillante": {
    n: "Primavera Brillante",
    subtono: "cálido-neutro",
    contraste: "alto",
    intensidad: "viva y clara",
    paleta: [
      {
        n: "Coral intenso",
        hex: "#FF6F5E"
      },
      {
        n: "Rojo amapola",
        hex: "#F03E2F"
      },
      {
        n: "Amarillo limón cálido",
        hex: "#FFD84A"
      },
      {
        n: "Verde esmeralda claro",
        hex: "#2DBE7E"
      },
      {
        n: "Turquesa",
        hex: "#1FB5C1"
      },
      {
        n: "Azul real cálido",
        hex: "#2F6FD6"
      },
      {
        n: "Fucsia cálido",
        hex: "#F0508A"
      },
      {
        n: "Naranja",
        hex: "#FF8A2A"
      },
      {
        n: "Verde lima",
        hex: "#9CD13A"
      },
      {
        n: "Violeta cálido",
        hex: "#8C5BD6"
      },
      {
        n: "Rosa sandía",
        hex: "#FF6F91"
      },
      {
        n: "Agua",
        hex: "#4FD1D9"
      }
    ],
    neutros: [
      {
        n: "Blanco roto",
        hex: "#FAF5EA"
      },
      {
        n: "Camel claro",
        hex: "#D8B48A"
      },
      {
        n: "Gris cálido",
        hex: "#9E958A"
      },
      {
        n: "Azul marino",
        hex: "#1F3557"
      },
      {
        n: "Chocolate claro",
        hex: "#7A5232"
      }
    ],
    evitar: [
      {
        n: "Gris polvoriento",
        hex: "#A8A39B",
        cambio: "Gris cálido"
      },
      {
        n: "Beige apagado",
        hex: "#CBBFA8",
        cambio: "Camel claro"
      },
      {
        n: "Mostaza oscura",
        hex: "#9C7A1E",
        cambio: "Amarillo limón cálido"
      },
      {
        n: "Marrón oscuro",
        hex: "#3E2A20",
        cambio: "Azul marino"
      },
      {
        n: "Pastel apagado",
        hex: "#D6C8D8",
        cambio: "Rosa sandía"
      }
    ]
  },
  "verano-claro": {
    n: "Verano Claro",
    subtono: "frío-neutro",
    contraste: "bajo",
    intensidad: "clara y suave",
    paleta: [
      {
        n: "Rosa empolvado",
        hex: "#E8B4C0"
      },
      {
        n: "Lavanda",
        hex: "#C7B8E3"
      },
      {
        n: "Azul cielo",
        hex: "#A9C8E8"
      },
      {
        n: "Menta fría",
        hex: "#A9DCCB"
      },
      {
        n: "Azul periwinkle",
        hex: "#9FA8DA"
      },
      {
        n: "Rosa chicle suave",
        hex: "#F2A7C3"
      },
      {
        n: "Malva claro",
        hex: "#C9A3BF"
      },
      {
        n: "Aguamarina fría",
        hex: "#8FD3D1"
      },
      {
        n: "Limón pálido",
        hex: "#F3EDA0"
      },
      {
        n: "Frambuesa clara",
        hex: "#D66F8F"
      },
      {
        n: "Azul acero claro",
        hex: "#8FA9C4"
      },
      {
        n: "Verde salvia frío",
        hex: "#A7BFB0"
      }
    ],
    neutros: [
      {
        n: "Blanco suave",
        hex: "#F7F5F2"
      },
      {
        n: "Gris perla",
        hex: "#D5D7DB"
      },
      {
        n: "Topo rosado",
        hex: "#B7A7A2"
      },
      {
        n: "Azul marino suave",
        hex: "#4F607E"
      },
      {
        n: "Gris azulado",
        hex: "#8E9AA8"
      }
    ],
    evitar: [
      {
        n: "Negro",
        hex: "#141110",
        cambio: "Azul marino suave"
      },
      {
        n: "Naranja",
        hex: "#F08A2E",
        cambio: "Rosa chicle suave"
      },
      {
        n: "Mostaza",
        hex: "#C9A227",
        cambio: "Limón pálido"
      },
      {
        n: "Marrón chocolate",
        hex: "#4E3326",
        cambio: "Topo rosado"
      },
      {
        n: "Camel",
        hex: "#C19A6B",
        cambio: "Gris perla"
      }
    ]
  },
  "verano-frio": {
    n: "Verano Frío",
    subtono: "frío",
    contraste: "medio",
    intensidad: "fría y suave",
    paleta: [
      {
        n: "Frambuesa",
        hex: "#C2456E"
      },
      {
        n: "Rosa frío",
        hex: "#E58FAE"
      },
      {
        n: "Azul medio",
        hex: "#5C86C4"
      },
      {
        n: "Azul pizarra",
        hex: "#5F7894"
      },
      {
        n: "Verde azulado frío",
        hex: "#3F8C8C"
      },
      {
        n: "Lavanda",
        hex: "#B4A3D9"
      },
      {
        n: "Ciruela",
        hex: "#7D3C6B"
      },
      {
        n: "Rojo frambuesa",
        hex: "#B23A55"
      },
      {
        n: "Azul hielo",
        hex: "#B8D4EA"
      },
      {
        n: "Menta fría",
        hex: "#9ED6C6"
      },
      {
        n: "Malva",
        hex: "#A87D9E"
      },
      {
        n: "Azul marino",
        hex: "#26375C"
      }
    ],
    neutros: [
      {
        n: "Blanco suave",
        hex: "#F5F5F3"
      },
      {
        n: "Gris piedra",
        hex: "#9B9EA6"
      },
      {
        n: "Gris carbón suave",
        hex: "#55585F"
      },
      {
        n: "Topo frío",
        hex: "#9E9293"
      },
      {
        n: "Azul marino",
        hex: "#26375C"
      }
    ],
    evitar: [
      {
        n: "Naranja",
        hex: "#F08A2E",
        cambio: "Frambuesa"
      },
      {
        n: "Camel",
        hex: "#C19A6B",
        cambio: "Topo frío"
      },
      {
        n: "Mostaza",
        hex: "#C9A227",
        cambio: "Azul hielo"
      },
      {
        n: "Verde oliva",
        hex: "#7A7B45",
        cambio: "Verde azulado frío"
      },
      {
        n: "Marrón dorado",
        hex: "#8E6232",
        cambio: "Gris carbón suave"
      }
    ]
  },
  "verano-suave": {
    n: "Verano Suave",
    subtono: "neutro-frío",
    contraste: "bajo",
    intensidad: "suave y apagada",
    paleta: [
      {
        n: "Rosa palo",
        hex: "#D9A9B0"
      },
      {
        n: "Malva",
        hex: "#B48EA5"
      },
      {
        n: "Azul grisáceo",
        hex: "#8DA3B8"
      },
      {
        n: "Salvia fría",
        hex: "#A3B5A6"
      },
      {
        n: "Lavanda grisácea",
        hex: "#ADA4C4"
      },
      {
        n: "Azul denim suave",
        hex: "#6E86A3"
      },
      {
        n: "Rosa empolvado",
        hex: "#CE9AA6"
      },
      {
        n: "Verde eucalipto",
        hex: "#86A398"
      },
      {
        n: "Ciruela suave",
        hex: "#8A5C78"
      },
      {
        n: "Frambuesa apagada",
        hex: "#B0617A"
      },
      {
        n: "Azul petróleo suave",
        hex: "#5D7F86"
      },
      {
        n: "Rosa té",
        hex: "#D8B2B1"
      }
    ],
    neutros: [
      {
        n: "Blanco roto frío",
        hex: "#EFECE6"
      },
      {
        n: "Gris topo",
        hex: "#A39A94"
      },
      {
        n: "Gris pizarra",
        hex: "#6B7079"
      },
      {
        n: "Taupe rosado",
        hex: "#B6A49F"
      },
      {
        n: "Azul marino grisáceo",
        hex: "#3E4A5E"
      }
    ],
    evitar: [
      {
        n: "Negro",
        hex: "#141110",
        cambio: "Azul marino grisáceo"
      },
      {
        n: "Blanco óptico",
        hex: "#FFFFFF",
        cambio: "Blanco roto frío"
      },
      {
        n: "Naranja vivo",
        hex: "#F2702A",
        cambio: "Rosa empolvado"
      },
      {
        n: "Amarillo limón",
        hex: "#F4F03B",
        cambio: "Salvia fría"
      },
      {
        n: "Fucsia",
        hex: "#E5399B",
        cambio: "Frambuesa apagada"
      }
    ]
  },
  "otono-suave": {
    n: "Otoño Suave",
    subtono: "neutro-cálido",
    contraste: "medio-bajo",
    intensidad: "suave y tostada",
    paleta: [
      {
        n: "Salvia",
        hex: "#A3B18A"
      },
      {
        n: "Oliva",
        hex: "#7A7B45"
      },
      {
        n: "Musgo",
        hex: "#5E6B3D"
      },
      {
        n: "Verde azulado",
        hex: "#4F7F7A"
      },
      {
        n: "Terracota",
        hex: "#C4694A"
      },
      {
        n: "Teja",
        hex: "#A8492F"
      },
      {
        n: "Naranja tostado",
        hex: "#D58A3C"
      },
      {
        n: "Mostaza",
        hex: "#C9A227"
      },
      {
        n: "Mantequilla",
        hex: "#F0DC9A"
      },
      {
        n: "Melocotón",
        hex: "#F2B895"
      },
      {
        n: "Salmón",
        hex: "#EC9A80"
      },
      {
        n: "Granate",
        hex: "#7B2D34"
      },
      {
        n: "Berenjena",
        hex: "#5A3247"
      },
      {
        n: "Vaquero",
        hex: "#5F7FA3"
      }
    ],
    neutros: [
      {
        n: "Crema",
        hex: "#F3E9D4"
      },
      {
        n: "Camel",
        hex: "#C19A6B"
      },
      {
        n: "Topo cálido",
        hex: "#9C8573"
      },
      {
        n: "Chocolate",
        hex: "#4E3326"
      },
      {
        n: "Oliva oscuro",
        hex: "#4A4A2C"
      },
      {
        n: "Petróleo",
        hex: "#2F4F5A"
      }
    ],
    evitar: [
      {
        n: "Negro junto a la cara",
        hex: "#141110",
        cambio: "Chocolate"
      },
      {
        n: "Blanco óptico",
        hex: "#FFFFFF",
        cambio: "Crema"
      },
      {
        n: "Rosa palo",
        hex: "#F3CFD6",
        cambio: "Salmón"
      },
      {
        n: "Gris frío",
        hex: "#9BA4AE",
        cambio: "Topo cálido"
      },
      {
        n: "Fucsia",
        hex: "#E5399B",
        cambio: "Granate"
      },
      {
        n: "Amarillo limón",
        hex: "#F4F03B",
        cambio: "Mantequilla"
      }
    ]
  },
  "otono-calido": {
    n: "Otoño Cálido",
    subtono: "cálido",
    contraste: "medio",
    intensidad: "cálida y rica",
    paleta: [
      {
        n: "Calabaza",
        hex: "#D2691E"
      },
      {
        n: "Óxido",
        hex: "#B5532A"
      },
      {
        n: "Mostaza",
        hex: "#C9A227"
      },
      {
        n: "Oliva",
        hex: "#7A7B45"
      },
      {
        n: "Verde musgo",
        hex: "#5E6B3D"
      },
      {
        n: "Terracota",
        hex: "#C4694A"
      },
      {
        n: "Ocre",
        hex: "#C8902E"
      },
      {
        n: "Teja",
        hex: "#A8492F"
      },
      {
        n: "Verde jade cálido",
        hex: "#3F8F6B"
      },
      {
        n: "Rojo ladrillo",
        hex: "#A33B2A"
      },
      {
        n: "Turquesa oscuro cálido",
        hex: "#2E7D74"
      },
      {
        n: "Melocotón tostado",
        hex: "#E59866"
      }
    ],
    neutros: [
      {
        n: "Crema",
        hex: "#F3E9D4"
      },
      {
        n: "Camel",
        hex: "#C19A6B"
      },
      {
        n: "Caramelo",
        hex: "#A8692F"
      },
      {
        n: "Chocolate",
        hex: "#4E3326"
      },
      {
        n: "Caqui",
        hex: "#8F8458"
      }
    ],
    evitar: [
      {
        n: "Negro",
        hex: "#141110",
        cambio: "Chocolate"
      },
      {
        n: "Blanco óptico",
        hex: "#FFFFFF",
        cambio: "Crema"
      },
      {
        n: "Rosa frío",
        hex: "#F3B5CF",
        cambio: "Melocotón tostado"
      },
      {
        n: "Azul eléctrico",
        hex: "#1F4FFF",
        cambio: "Turquesa oscuro cálido"
      },
      {
        n: "Gris frío",
        hex: "#9BA4AE",
        cambio: "Caqui"
      }
    ]
  },
  "otono-profundo": {
    n: "Otoño Profundo",
    subtono: "cálido-neutro",
    contraste: "alto",
    intensidad: "profunda y rica",
    paleta: [
      {
        n: "Granate",
        hex: "#7B2D34"
      },
      {
        n: "Berenjena",
        hex: "#5A3247"
      },
      {
        n: "Verde bosque",
        hex: "#2F5A3A"
      },
      {
        n: "Verde botella",
        hex: "#1F4D3A"
      },
      {
        n: "Teja",
        hex: "#A8492F"
      },
      {
        n: "Mostaza oscura",
        hex: "#B08A1E"
      },
      {
        n: "Petróleo",
        hex: "#1F4F5A"
      },
      {
        n: "Rojo vino",
        hex: "#6E1E2A"
      },
      {
        n: "Calabaza oscura",
        hex: "#B5561E"
      },
      {
        n: "Oliva oscuro",
        hex: "#4A4A2C"
      },
      {
        n: "Ciruela",
        hex: "#5B2A45"
      },
      {
        n: "Turquesa profundo",
        hex: "#1E6B6B"
      }
    ],
    neutros: [
      {
        n: "Chocolate",
        hex: "#3E2A20"
      },
      {
        n: "Café",
        hex: "#5A3E2B"
      },
      {
        n: "Crema tostada",
        hex: "#E8D9B8"
      },
      {
        n: "Caqui oscuro",
        hex: "#6B6342"
      },
      {
        n: "Negro marrón",
        hex: "#2A211C"
      }
    ],
    evitar: [
      {
        n: "Pastel",
        hex: "#F2D5E0",
        cambio: "Crema tostada"
      },
      {
        n: "Blanco óptico",
        hex: "#FFFFFF",
        cambio: "Crema tostada"
      },
      {
        n: "Gris claro frío",
        hex: "#C8CDD3",
        cambio: "Caqui oscuro"
      },
      {
        n: "Rosa chicle",
        hex: "#F29BC0",
        cambio: "Rojo vino"
      },
      {
        n: "Azul hielo",
        hex: "#CFE0EE",
        cambio: "Petróleo"
      }
    ]
  },
  "invierno-profundo": {
    n: "Invierno Profundo",
    subtono: "frío-neutro",
    contraste: "alto",
    intensidad: "profunda e intensa",
    paleta: [
      {
        n: "Rojo vino",
        hex: "#7A1830"
      },
      {
        n: "Rojo cereza",
        hex: "#B0153A"
      },
      {
        n: "Esmeralda",
        hex: "#0E7A55"
      },
      {
        n: "Verde botella",
        hex: "#11553D"
      },
      {
        n: "Azul tinta",
        hex: "#1A2A6C"
      },
      {
        n: "Azul real",
        hex: "#2A4FB5"
      },
      {
        n: "Berenjena",
        hex: "#4B1F4F"
      },
      {
        n: "Fucsia oscuro",
        hex: "#B0306A"
      },
      {
        n: "Petróleo",
        hex: "#155463"
      },
      {
        n: "Morado",
        hex: "#5B2A86"
      },
      {
        n: "Turquesa intenso",
        hex: "#0F8E9A"
      },
      {
        n: "Rojo frambuesa",
        hex: "#C2185B"
      }
    ],
    neutros: [
      {
        n: "Negro",
        hex: "#141110"
      },
      {
        n: "Blanco óptico",
        hex: "#FFFFFF"
      },
      {
        n: "Gris carbón",
        hex: "#36383D"
      },
      {
        n: "Chocolate amargo",
        hex: "#3B2620"
      },
      {
        n: "Azul marino",
        hex: "#1B2440"
      }
    ],
    evitar: [
      {
        n: "Camel",
        hex: "#C19A6B",
        cambio: "Gris carbón"
      },
      {
        n: "Naranja",
        hex: "#F08A2E",
        cambio: "Rojo cereza"
      },
      {
        n: "Beige",
        hex: "#D8C8A8",
        cambio: "Blanco óptico"
      },
      {
        n: "Pastel apagado",
        hex: "#D6C8D8",
        cambio: "Fucsia oscuro"
      },
      {
        n: "Mostaza",
        hex: "#C9A227",
        cambio: "Esmeralda"
      }
    ]
  },
  "invierno-frio": {
    n: "Invierno Frío",
    subtono: "frío",
    contraste: "alto",
    intensidad: "fría y nítida",
    paleta: [
      {
        n: "Rojo puro",
        hex: "#D0103A"
      },
      {
        n: "Fucsia",
        hex: "#E5399B"
      },
      {
        n: "Azul real",
        hex: "#2A4FB5"
      },
      {
        n: "Azul hielo",
        hex: "#CFE0EE"
      },
      {
        n: "Esmeralda",
        hex: "#0E7A55"
      },
      {
        n: "Morado",
        hex: "#6A3FA0"
      },
      {
        n: "Rosa hielo",
        hex: "#F3D3E3"
      },
      {
        n: "Verde pino",
        hex: "#14523F"
      },
      {
        n: "Azul cobalto",
        hex: "#1F4FD6"
      },
      {
        n: "Magenta",
        hex: "#B0137A"
      },
      {
        n: "Lila hielo",
        hex: "#DCD3F0"
      },
      {
        n: "Turquesa frío",
        hex: "#1A9DAE"
      }
    ],
    neutros: [
      {
        n: "Negro",
        hex: "#141110"
      },
      {
        n: "Blanco óptico",
        hex: "#FFFFFF"
      },
      {
        n: "Gris marengo",
        hex: "#45474A"
      },
      {
        n: "Gris perla",
        hex: "#D5D7DB"
      },
      {
        n: "Azul marino",
        hex: "#1B2440"
      }
    ],
    evitar: [
      {
        n: "Naranja",
        hex: "#F08A2E",
        cambio: "Rojo puro"
      },
      {
        n: "Camel",
        hex: "#C19A6B",
        cambio: "Gris marengo"
      },
      {
        n: "Mostaza",
        hex: "#C9A227",
        cambio: "Azul hielo"
      },
      {
        n: "Marrón dorado",
        hex: "#8E6232",
        cambio: "Azul marino"
      },
      {
        n: "Melocotón",
        hex: "#F2B895",
        cambio: "Rosa hielo"
      }
    ]
  },
  "invierno-brillante": {
    n: "Invierno Brillante",
    subtono: "frío-neutro",
    contraste: "muy alto",
    intensidad: "brillante y nítida",
    paleta: [
      {
        n: "Rojo brillante",
        hex: "#E3002B"
      },
      {
        n: "Fucsia",
        hex: "#F0168C"
      },
      {
        n: "Azul eléctrico",
        hex: "#1F4FFF"
      },
      {
        n: "Verde esmeralda brillante",
        hex: "#00A86B"
      },
      {
        n: "Turquesa",
        hex: "#00B5C8"
      },
      {
        n: "Amarillo limón",
        hex: "#F4E92A"
      },
      {
        n: "Violeta",
        hex: "#7A2DD6"
      },
      {
        n: "Rosa intenso",
        hex: "#FF4FA3"
      },
      {
        n: "Azul cobalto",
        hex: "#1F4FD6"
      },
      {
        n: "Verde menta brillante",
        hex: "#3DDC97"
      },
      {
        n: "Coral frío",
        hex: "#FF5A6E"
      },
      {
        n: "Magenta",
        hex: "#C2008F"
      }
    ],
    neutros: [
      {
        n: "Negro",
        hex: "#141110"
      },
      {
        n: "Blanco óptico",
        hex: "#FFFFFF"
      },
      {
        n: "Gris carbón",
        hex: "#36383D"
      },
      {
        n: "Azul marino",
        hex: "#1B2440"
      },
      {
        n: "Gris claro",
        hex: "#CFD2D6"
      }
    ],
    evitar: [
      {
        n: "Beige apagado",
        hex: "#CBBFA8",
        cambio: "Gris claro"
      },
      {
        n: "Camel",
        hex: "#C19A6B",
        cambio: "Gris carbón"
      },
      {
        n: "Mostaza",
        hex: "#C9A227",
        cambio: "Amarillo limón"
      },
      {
        n: "Marrón",
        hex: "#6B4A32",
        cambio: "Azul marino"
      },
      {
        n: "Pastel polvoriento",
        hex: "#D6C8D8",
        cambio: "Rosa intenso"
      }
    ]
  }
};

export const CUERPOS = {
  dramatico: {
    n: "Dramático",
    sistema: "Kibbe",
    si: ["Líneas largas y rectas", "Hombreras definidas", "Tejidos firmes", "Monocromo", "Cortes angulosos"],
    evita: ["Volantes y fruncidos", "Estampados pequeños y redondos", "Tejidos muy blandos sin estructura"],
    tips: [
      "Busca una línea vertical larga de pies a cabeza.",
      "Prefiere piezas con estructura y bordes nítidos."
    ]
  },
  "dramatico-suave": {
    n: "Dramático Suave",
    sistema: "Kibbe",
    si: [
      "Líneas largas con drapeado",
      "Cintura marcada",
      "Tejidos fluidos con peso",
      "Escotes en pico profundos",
      "Estampados grandes"
    ],
    evita: ["Cortes rígidos y cuadrados", "Estampados pequeños", "Prendas muy cortas y holgadas"],
    tips: ["Marca la cintura y deja que el tejido caiga.", "Una pieza con drapeado vale por tres."]
  },
  natural: {
    n: "Natural",
    sistema: "Kibbe",
    si: [
      "Holgado y desenfadado",
      "Tejidos con textura",
      "Capas abiertas",
      "Pantalón ancho",
      "Hombros sin estructura rígida"
    ],
    evita: ["Prendas muy ajustadas y rígidas", "Detalles muy delicados", "Simetría perfecta"],
    tips: ["Deja aire entre la ropa y el cuerpo.", "Mezcla texturas naturales."]
  },
  "natural-suave": {
    n: "Natural Suave",
    sistema: "Kibbe",
    si: [
      "Holgado pero con forma",
      "Cintura insinuada (pico metido, lazada, cruce)",
      "Tejidos con caída",
      "Tiro medio-alto",
      "Escotes abiertos"
    ],
    evita: ["Dos prendas anchas sin cintura", "Cuello cerrado rígido", "Tacón de aguja", "Hombrera dura"],
    tips: ["Mete un pico por delante para dibujar la cintura.", "Un solo volumen grande por look."]
  },
  "clasico-dramatico": {
    n: "Clásico Dramático",
    sistema: "Kibbe",
    si: [
      "Sastrería limpia",
      "Líneas simétricas",
      "Tejidos firmes de calidad",
      "Conjuntos monocromos",
      "Accesorios geométricos"
    ],
    evita: ["Volúmenes exagerados", "Muy holgado", "Detalles recargados"],
    tips: ["Busca el equilibrio: ni muy suelto ni muy ajustado.", "Un acento nítido basta."]
  },
  "clasico-suave": {
    n: "Clásico Suave",
    sistema: "Kibbe",
    si: [
      "Cortes equilibrados con curvas suaves",
      "Cintura definida",
      "Tejidos fluidos",
      "Escotes redondeados",
      "Largo a la rodilla o midi"
    ],
    evita: ["Prendas rígidas y angulosas", "Volúmenes extremos", "Estampados agresivos"],
    tips: ["Marca la cintura con suavidad.", "Prefiere líneas redondeadas a picos marcados."]
  },
  "gamine-flamboyant": {
    n: "Gamine Flamboyant",
    sistema: "Kibbe",
    si: [
      "Prendas cortas y entalladas",
      "Contrastes de color",
      "Detalles gráficos",
      "Chaquetas cortas",
      "Pantalón pitillo o tobillero"
    ],
    evita: ["Prendas largas y holgadas", "Tejidos que cuelgan sin forma", "Monocromo apagado"],
    tips: ["Corta la silueta en bloques de color.", "Mejor corto y entallado que largo y suelto."]
  },
  "gamine-suave": {
    n: "Gamine Suave",
    sistema: "Kibbe",
    si: [
      "Prendas entalladas con detalles suaves",
      "Cintura marcada",
      "Estampados pequeños",
      "Faldas por encima de la rodilla",
      "Cuellos redondeados"
    ],
    evita: ["Volúmenes grandes", "Largos maxi sin forma", "Tejidos pesados y rígidos"],
    tips: ["Entalla y añade un detalle dulce.", "Mantén las proporciones compactas."]
  },
  romantico: {
    n: "Romántico",
    sistema: "Kibbe",
    si: [
      "Cintura muy marcada",
      "Tejidos suaves y delicados",
      "Drapeados y fruncidos",
      "Escotes redondeados o en corazón",
      "Detalles ornamentados"
    ],
    evita: ["Líneas rectas y rígidas", "Prendas holgadas sin forma", "Cortes geométricos"],
    tips: ["Sigue tus curvas: cintura siempre marcada.", "Tejidos que se mueven."]
  },
  "romantico-teatral": {
    n: "Romántico Teatral",
    sistema: "Kibbe",
    si: [
      "Cintura marcada con líneas algo afiladas",
      "Drapeados con caída",
      "Detalles ornamentados",
      "Tejidos brillantes",
      "Escotes en pico"
    ],
    evita: ["Holgado sin forma", "Estampados pequeños y planos", "Tejidos rígidos y gruesos"],
    tips: ["Marca cintura y añade un detalle con brillo.", "Prefiere la caída al volumen."]
  }
};

export const CATALOGO = [
  {
    id: "w-blusa",
    n: "Blusa romántica con lazada",
    cat: "arriba",
    tipo: "blusa",
    icono: "blusa",
    corte: "fluida",
    abrigo: 1,
    formal: 2,
    top: true
  },
  {
    id: "w-jersey",
    n: "Jersey de punto calado",
    cat: "arriba",
    tipo: "jersey",
    icono: "jersey",
    corte: "amplia",
    abrigo: 2,
    formal: 1,
    top: false
  },
  {
    id: "w-cami",
    n: "Top lencero con encaje",
    cat: "arriba",
    tipo: "top",
    icono: "top",
    corte: "fluida",
    abrigo: 1,
    formal: 2,
    top: false
  },
  {
    id: "w-cruzado",
    n: "Top cruzado de manga larga",
    cat: "arriba",
    tipo: "top",
    icono: "top-cruzado",
    corte: "fluida",
    abrigo: 1,
    formal: 2,
    top: false
  },
  {
    id: "w-saten",
    n: "Falda midi de satén",
    cat: "abajo",
    tipo: "falda",
    icono: "falda-midi",
    corte: "fluida",
    abrigo: 1,
    formal: 2,
    top: true
  },
  {
    id: "w-maxi",
    n: "Falda larga de volantes",
    cat: "abajo",
    tipo: "falda",
    icono: "falda-larga",
    corte: "amplia",
    abrigo: 2,
    formal: 1,
    top: false
  },
  {
    id: "w-pana",
    n: "Pantalón de pana acampanado",
    cat: "abajo",
    tipo: "pantalón",
    icono: "pantalon-campana",
    corte: "fluida",
    abrigo: 2,
    formal: 1,
    top: true
  },
  {
    id: "w-ancho",
    n: "Pantalón ancho con caída",
    cat: "abajo",
    tipo: "pantalón",
    icono: "pantalon-ancho",
    corte: "amplia",
    abrigo: 2,
    formal: 2,
    top: false
  },
  {
    id: "w-vcruzado",
    n: "Vestido cruzado de flores",
    cat: "vestido",
    tipo: "vestido",
    icono: "vestido",
    corte: "fluida",
    abrigo: 2,
    formal: 2,
    top: false
  },
  {
    id: "w-slip",
    n: "Vestido lencero de satén",
    cat: "vestido",
    tipo: "vestido",
    icono: "vestido-lencero",
    corte: "fluida",
    abrigo: 1,
    formal: 2,
    top: false
  },
  {
    id: "w-elfo",
    n: "Vestido de terciopelo, manga campana",
    cat: "vestido",
    tipo: "vestido",
    icono: "vestido-largo",
    corte: "fluida",
    abrigo: 3,
    formal: 3,
    top: false
  },
  {
    id: "w-cardigan",
    n: "Cárdigan largo de punto gordo",
    cat: "capa",
    tipo: "cárdigan",
    icono: "cardigan",
    corte: "amplia",
    abrigo: 2,
    formal: 1,
    top: true
  },
  {
    id: "w-ante",
    n: "Chaqueta de ante con flecos",
    cat: "capa",
    tipo: "chaqueta",
    icono: "chaqueta",
    corte: "fluida",
    abrigo: 2,
    formal: 2,
    top: false
  },
  {
    id: "w-sobre",
    n: "Sobrecamisa de cuadros",
    cat: "capa",
    tipo: "sobrecamisa",
    icono: "camisa",
    corte: "amplia",
    abrigo: 2,
    formal: 1,
    top: false
  },
  {
    id: "w-abrigo",
    n: "Abrigo largo con cinturón",
    cat: "capa",
    tipo: "abrigo",
    icono: "abrigo",
    corte: "fluida",
    abrigo: 3,
    formal: 2,
    top: false
  },
  {
    id: "w-capa",
    n: "Capa de lana con capucha",
    cat: "capa",
    tipo: "capa",
    icono: "capa",
    corte: "amplia",
    abrigo: 3,
    formal: 2,
    top: false
  },
  {
    id: "w-chaleco",
    n: "Chaleco de crochet",
    cat: "capa",
    tipo: "chaleco",
    icono: "chaleco",
    corte: "fluida",
    abrigo: 1,
    formal: 1,
    top: false
  },
  {
    id: "w-botas",
    n: "Botas altas de tacón ancho",
    cat: "calzado",
    tipo: "botas",
    icono: "botas",
    corte: "ajustada",
    abrigo: 3,
    formal: 2,
    top: true
  },
  {
    id: "w-botines",
    n: "Botines de cordones",
    cat: "calzado",
    tipo: "botines",
    icono: "botines",
    corte: "ajustada",
    abrigo: 2,
    formal: 1,
    top: false
  },
  {
    id: "w-merceditas",
    n: "Merceditas de suela gruesa",
    cat: "calzado",
    tipo: "merceditas",
    icono: "zapatos",
    corte: "ajustada",
    abrigo: 2,
    formal: 2,
    top: false
  },
  {
    id: "w-cinturon",
    n: "Cinturón blando de piel",
    cat: "accesorio",
    tipo: "cinturón",
    icono: "cinturon",
    corte: "ajustada",
    abrigo: 1,
    formal: 2,
    top: true
  },
  {
    id: "w-joyas",
    n: "Joyas doradas de hojas y lunas",
    cat: "accesorio",
    tipo: "collar",
    icono: "joyas",
    corte: "ajustada",
    abrigo: 1,
    formal: 2,
    top: false
  },
  {
    id: "w-bolso",
    n: "Bolso bandolera blando",
    cat: "accesorio",
    tipo: "bolso",
    icono: "bolso",
    corte: "fluida",
    abrigo: 1,
    formal: 1,
    top: false
  },
  {
    id: "w-medias",
    n: "Medias caladas",
    cat: "accesorio",
    tipo: "medias",
    icono: "medias",
    corte: "ajustada",
    abrigo: 2,
    formal: 1,
    top: false
  }
];
