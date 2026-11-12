// Adaptador de cualquier servicio con la API chat/completions de OpenAI (Mistral, Groq, OpenRouter, Gemini…).
import { llamaChat } from "./chat.ts";
import type { ProveedorIA } from "./proveedor.ts";

export interface OpcionesOpenAI {
  url: string;
  modelo: string;
  clave: string;
  imagen: "texto" | "objeto";
}

export function creaOpenAICompatible(o: OpcionesOpenAI): ProveedorIA {
  return {
    tipo: "openai-compatible",
    pregunta: (p) => llamaChat({ ...o, integrada: false }, p)
  };
}
