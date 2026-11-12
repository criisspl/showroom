// Registro de sugerencias de proveedor de IA: valores por defecto que la app ofrece, no una lista cerrada.
// Cada persona elige su proveedor; aquí solo se guarda qué adaptador usa cada sugerencia y sus datos de partida.

import { URL_INTEGRADA } from "./integrada.ts";
import type { TipoProveedor } from "./proveedor.ts";

export interface Sugerencia {
  /** Qué adaptador habla con este proveedor. */
  tipo: TipoProveedor;
  n: string;
  url: string;
  modelo: string;
  /** Dónde sacar la clave (vacío si no hace falta). */
  clave: string;
  nota: string;
  /** Cómo quiere el proveedor las imágenes: como texto o como objeto { url }. */
  imagen: "texto" | "objeto";
}

export const SUGERENCIAS: Record<string, Sugerencia> = {
  integrada: {
    n: "IA de la app (sin clave)",
    tipo: "integrada",
    url: URL_INTEGRADA,
    modelo: "",
    clave: "",
    nota: "No tienes que hacer nada: la app ya trae la IA. Tiene un cupo diario compartido; si se llena, prueba más tarde o usa tu propia clave.",
    imagen: "objeto"
  },
  mistral: {
    tipo: "openai-compatible",
    n: "Mistral (Francia)",
    url: "https://api.mistral.ai/v1/chat/completions",
    modelo: "mistral-small-latest",
    clave: "https://console.mistral.ai/api-keys",
    nota: "Empresa europea con plan gratuito. El modelo Small entiende fotos.",
    imagen: "texto" // Mistral acepta image_url como texto
  },
  groq: {
    tipo: "openai-compatible",
    n: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    modelo: "meta-llama/llama-4-scout-17b-16e-instruct",
    clave: "https://console.groq.com/keys",
    nota: "Plan gratuito muy rápido. Elige un modelo con visión.",
    imagen: "objeto"
  },
  openrouter: {
    tipo: "openai-compatible",
    n: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    modelo: "openrouter/free",
    clave: "https://openrouter.ai/keys",
    nota: "Da acceso a varios modelos gratuitos (los que acaban en :free). Pocas peticiones al día.",
    imagen: "objeto"
  },
  gemini: {
    tipo: "openai-compatible",
    n: "Google Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    modelo: "gemini-flash-latest",
    clave: "https://aistudio.google.com/apikey",
    nota: "Ojo: según las condiciones de Google, en la UE, Suiza y Reino Unido solo se permite el plan de pago.",
    imagen: "objeto"
  },
  otro: {
    tipo: "openai-compatible",
    n: "Otro compatible con OpenAI",
    url: "",
    modelo: "",
    clave: "",
    nota: "Cualquier servicio con la API chat/completions.",
    imagen: "objeto"
  }
};
