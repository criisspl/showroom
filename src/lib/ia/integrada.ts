// Adaptador de la IA integrada de la app (/api/ia, ver worker/): sin modelo ni clave en el navegador.
import { llamaChat } from "./chat.ts";
import type { ProveedorIA } from "./proveedor.ts";

export const URL_INTEGRADA = "api/ia";

export function creaIntegrada(): ProveedorIA {
  return {
    tipo: "integrada",
    pregunta: (p) =>
      llamaChat({ url: URL_INTEGRADA, modelo: "", clave: "", imagen: "objeto", integrada: true }, p)
  };
}
