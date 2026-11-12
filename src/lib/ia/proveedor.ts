// Contrato de un proveedor de IA. Quien llama solo ve `pregunta`; cada adaptador sabe cómo hablar con su servicio.

export interface Pregunta {
  sistema?: string;
  texto: string;
  imagenes?: string[];
  json?: boolean;
  signal?: AbortSignal;
}

/** Adaptadores que existen: cualquier servicio con la API de OpenAI y la IA integrada de la app (/api/ia). */
export type TipoProveedor = "openai-compatible" | "integrada";

export interface ProveedorIA {
  readonly tipo: TipoProveedor;
  /** Llama al modelo. `imagenes` son data URLs. Devuelve el texto; lanza Error en español si algo falla. */
  pregunta(p: Pregunta): Promise<string>;
}
