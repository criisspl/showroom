// Descarga un Blob como archivo (copias de seguridad).
export function descarga(blob: Blob, nombre: string): void {
  const enlace = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = enlace;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(enlace), 60000);
}
